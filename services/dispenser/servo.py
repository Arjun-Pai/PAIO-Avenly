import time
import json
import os

# Simulated mode fallback
SIMULATED_MODE = False
try:
    import RPi.GPIO as GPIO
except (ImportError, RuntimeError):
    SIMULATED_MODE = True
    print("[simulated hardware] RPi.GPIO not found, running servo in simulated mode")

# Constants
SERVO_PIN = 12
PWM_FREQ = 50 # 50Hz for standard servos
CLOSED_ANGLE_DUTY = 2.5 # ~0 degrees depending on servo
OPEN_ANGLE_DUTY = 12.5 # ~180 degrees depending on servo

pwm = None

def setup_servo():
    global SERVO_PIN, pwm
    try:
        pin_map_str = os.environ.get("GPIO_PIN_MAP_JSON", "{}")
        pin_map = json.loads(pin_map_str)
        SERVO_PIN = pin_map.get("servo", 12) # Default if not provided
        
        if not SIMULATED_MODE:
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(SERVO_PIN, GPIO.OUT)
            pwm = GPIO.PWM(SERVO_PIN, PWM_FREQ)
            pwm.start(CLOSED_ANGLE_DUTY)
            time.sleep(0.5)
            # We can change duty cycle to 0 to stop sending pulses when holding
            pwm.ChangeDutyCycle(0)
    except Exception as e:
        print(f"[simulated hardware] Error setting up servo pin: {e}")

setup_servo()

def set_angle(duty):
    if SIMULATED_MODE:
        return
    if pwm:
        pwm.ChangeDutyCycle(duty)
        time.sleep(0.5) # Time to move
        pwm.ChangeDutyCycle(0) # Stop jitter

def open_hole():
    if SIMULATED_MODE:
        print("[simulated hardware] Servo opening hole")
        time.sleep(0.5)
        return True
    
    set_angle(OPEN_ANGLE_DUTY)
    return True

def close_hole():
    if SIMULATED_MODE:
        print("[simulated hardware] Servo closing hole")
        time.sleep(0.5)
        return True
        
    set_angle(CLOSED_ANGLE_DUTY)
    return True
