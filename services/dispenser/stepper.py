import time
import json
import os

# Simulated mode fallback
SIMULATED_MODE = False
try:
    import RPi.GPIO as GPIO
except (ImportError, RuntimeError):
    SIMULATED_MODE = True
    print("[simulated hardware] RPi.GPIO not found, running stepper in simulated mode")

# Global position after calibration
current_half_step_pos = 0

# The standard 8-step half-step sequence for 28BYJ-48
HALF_STEP_SEQ = [
    [1, 0, 0, 0],
    [1, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 1],
    [0, 0, 0, 1],
    [1, 0, 0, 1]
]

# Constants
STEPS_PER_REV = 2048 # typical for 28BYJ-48 half-steps per rev is 4096 or 2048? Wait, usually 4096 or 512, but user said: "2048 / CAROUSEL_SLOT_COUNT". Okay, 2048.
STEP_SLEEP = 0.002 # 2ms per step for torque

# Initialize GPIO pins
STEPPER_PINS = []
CAROUSEL_SLOT_COUNT = 20

def setup_pins():
    global STEPPER_PINS, CAROUSEL_SLOT_COUNT
    try:
        # Assuming GPIO_PIN_MAP_JSON is passed as env var or we read from config
        pin_map_str = os.environ.get("GPIO_PIN_MAP_JSON", "{}")
        pin_map = json.loads(pin_map_str)
        STEPPER_PINS = pin_map.get("stepper", [17, 18, 27, 22]) # Defaults if not provided
        CAROUSEL_SLOT_COUNT = int(os.environ.get("CAROUSEL_SLOT_COUNT", 20))
        
        if not SIMULATED_MODE:
            GPIO.setmode(GPIO.BCM)
            for pin in STEPPER_PINS:
                GPIO.setup(pin, GPIO.OUT)
                GPIO.output(pin, 0)
    except Exception as e:
        print(f"[simulated hardware] Error setting up stepper pins: {e}")

setup_pins()

def get_slot_target(slot_index):
    # Precompute a cumulative target-position table for every slot as round(slot_index * (2048 / CAROUSEL_SLOT_COUNT))
    return round(slot_index * (2048 / CAROUSEL_SLOT_COUNT))

def rotate_to_slot(n):
    global current_half_step_pos
    target_pos = get_slot_target(n)
    
    delta = target_pos - current_half_step_pos
    
    if SIMULATED_MODE:
        print(f"[simulated hardware] Stepper moving {delta} steps to slot {n} (pos {target_pos})")
        time.sleep(abs(delta) * 0.001) # Simulate time taken
        current_half_step_pos = target_pos
        return True
        
    if delta == 0:
        return True
        
    direction = 1 if delta > 0 else -1
    steps = abs(delta)
    
    for _ in range(steps):
        # determine which step of the 8-step sequence to use
        # we update current_half_step_pos incrementally to keep track of the sequence phase
        current_half_step_pos += direction
        seq_idx = current_half_step_pos % 8
        pattern = HALF_STEP_SEQ[seq_idx]
        
        for pin_idx in range(4):
            GPIO.output(STEPPER_PINS[pin_idx], pattern[pin_idx])
            
        time.sleep(STEP_SLEEP)
        
    # Ensure current position is EXACTLY the target pos, not relying on +=
    current_half_step_pos = target_pos
    
    # Turn off coils to prevent overheating
    for pin in STEPPER_PINS:
        GPIO.output(pin, 0)
        
    return True

def calibrate():
    global current_half_step_pos
    current_half_step_pos = 0
    print("[simulated hardware] Stepper calibrated to pos 0")
    return True
