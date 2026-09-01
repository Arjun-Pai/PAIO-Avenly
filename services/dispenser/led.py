import time
import json
import os

# Simulated mode fallback
SIMULATED_MODE = False
try:
    import RPi.GPIO as GPIO
except (ImportError, RuntimeError):
    SIMULATED_MODE = True
    print("[simulated hardware] RPi.GPIO not found, running LED in simulated mode")

LED_PIN = 18
PWM_FREQ = 1000

pwm = None

def setup_led():
    global LED_PIN, pwm
    try:
        pin_map_str = os.environ.get("GPIO_PIN_MAP_JSON", "{}")
        pin_map = json.loads(pin_map_str)
        LED_PIN = pin_map.get("led", 18) # Default
        
        if not SIMULATED_MODE:
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(LED_PIN, GPIO.OUT)
            pwm = GPIO.PWM(LED_PIN, PWM_FREQ)
            pwm.start(0)
    except Exception as e:
        print(f"[simulated hardware] Error setting up LED pin: {e}")

setup_led()

def set_led(on, brightness=100):
    if SIMULATED_MODE:
        return
        
    if not on:
        brightness = 0
        
    if pwm:
        pwm.ChangeDutyCycle(brightness)

def pulse_led():
    if SIMULATED_MODE:
        # print("[simulated hardware] Pulsing LED")
        return
        
    if not pwm:
        return
        
    # Fade up
    for dc in range(0, 101, 5):
        pwm.ChangeDutyCycle(dc)
        time.sleep(0.05)
        
    # Fade down
    for dc in range(100, -1, -5):
        pwm.ChangeDutyCycle(dc)
        time.sleep(0.05)
