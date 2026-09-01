"""
Radio Browser API Client for Avenly Hub
Free, open-source radio station API (api.radio-browser.info).
No API key required. Perfect for ambient music and radio for elderly care.
"""

import urllib.request
import json
from config.secrets import RADIO_BROWSER_API_URL

def fetch_top_ambient_stations(limit=10):
    """
    Fetches top ambient, classical, and relaxing radio streams.
    """
    endpoint = f"{RADIO_BROWSER_API_URL}/json/stations/search?tag=ambient,classical,relaxing&limit={limit}&order=clickcount&reverse=true"
    req = urllib.request.Request(endpoint, headers={'User-Agent': 'AvenlyHub/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                stations = []
                for s in data:
                    stations.append({
                        "id": s.get("stationuuid"),
                        "name": s.get("name", "Ambient Station").strip(),
                        "url": s.get("url_resolved") or s.get("url"),
                        "favicon": s.get("favicon") or "",
                        "tags": s.get("tags", ""),
                        "country": s.get("country", "")
                    })
                return stations
    except Exception as e:
        print(f"Radio Browser API error: {e}")
    
    # Fallback curated station list for offline/error mode
    return [
        {
            "id": "rad-1",
            "name": "Classic FM Soothing Light",
            "url": "https://stream.live.vc.bbcmedia.co.uk/bbc_radio_three",
            "favicon": "",
            "tags": "classical, ambient",
            "country": "UK"
        },
        {
            "id": "rad-2",
            "name": "Relaxing Nature & Lofi Radio",
            "url": "https://stream.zeno.fm/f3wvbbqmdg8uv",
            "favicon": "",
            "tags": "relaxing, nature",
            "country": "Global"
        },
        {
            "id": "rad-3",
            "name": "Calm Meditation Waves",
            "url": "https://stream.zeno.fm/0r0xa792kwzuv",
            "favicon": "",
            "tags": "meditation, calm",
            "country": "Global"
        }
    ]
