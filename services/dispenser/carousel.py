import time
from datetime import datetime
from services.dispenser.stepper import rotate_to_slot
from services.dispenser.servo import open_hole, close_hole

PILL_FALL_TIME_SECONDS = 2.0

def dispense(slot_number):
    try:
        # 1. Rotate stepper to select the slot
        rotate_to_slot(slot_number)
        
        # 2. Open the fixed hole cover
        open_hole()
        
        # 3. Wait for pill to fall
        time.sleep(PILL_FALL_TIME_SECONDS)
        
        # 4. Close the hole cover
        close_hole()
        
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "slot": slot_number
        }
    except Exception as e:
        print(f"Error during dispense: {e}")
        return {
            "success": False,
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "slot": slot_number
        }
