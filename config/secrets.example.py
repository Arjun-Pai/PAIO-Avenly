"""
Avenly Hub - Secrets & Configuration Example
Copy this file to config/secrets.py and populate with your credentials.
"""

import os
import json

# Google Service Account & Sheets Integration
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "config/service_account.json")
GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "")
GOOGLE_CLOUD_PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT_ID", "")

# AI Reasoning Engines
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_LIVE_API_KEY = os.getenv("GEMINI_LIVE_API_KEY", "")

# Real-Time & WebRTC Calling
WEBRTC_SIGNALING_URL = os.getenv("WEBRTC_SIGNALING_URL", "wss://rms.metered.ca/v1?key=pk_live_default")

# Free Open Media APIs (Replaced Spotify and Kindle - No approval / session tokens required)
RADIO_BROWSER_API_URL = os.getenv("RADIO_BROWSER_API_URL", "https://de1.api.radio-browser.info")
OPEN_LIBRARY_API_URL = os.getenv("OPEN_LIBRARY_API_URL", "https://openlibrary.org")
GOOGLE_BOOKS_API_KEY = os.getenv("GOOGLE_BOOKS_API_KEY", "")

# System Preferences & Hardware Pins
ASSISTANT_WAKE_NAME = os.getenv("ASSISTANT_WAKE_NAME", "Hey Avenly")
CAROUSEL_SLOT_COUNT = int(os.getenv("CAROUSEL_SLOT_COUNT", "20"))

try:
    GPIO_PIN_MAP = json.loads(os.getenv("GPIO_PIN_MAP_JSON", '{"stepper": [17, 27, 22, 23], "servo": 13, "led": 26}'))
except Exception:
    GPIO_PIN_MAP = {"stepper": [17, 27, 22, 23], "servo": 13, "led": 26}
