"""
Google Sheets Client for Avenly Hub - Medication & Log Integration
Reads and writes directly to Google Sheets for Medications and MedicationLog tabs.
"""

import os
import json
import uuid
from datetime import datetime

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False

MEDICATIONS_HEADER = [
    "med_id", "name", "dosage", "times", "days_active", 
    "pills_remaining", "refill_threshold", "start_date", "active"
]

MEDICATION_LOG_HEADER = [
    "log_id", "med_id", "scheduled_time", "status", "actual_time", "notes"
]

def get_sheets_service():
    """Builds and returns the Google Sheets API service object if credentials exist."""
    if not GOOGLE_API_AVAILABLE:
        return None
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "config/service_account.json")
    if not os.path.exists(creds_path):
        return None
    try:
        creds = service_account.Credentials.from_service_account_file(
            creds_path, scopes=["https://www.googleapis.com/auth/spreadsheets"]
        )
        return build("sheets", "v4", credentials=creds)
    except Exception as e:
        print(f"Error initializing Sheets client in Python: {e}")
        return None

def ensure_medication_sheets(service, spreadsheet_id):
    """Ensures Medications and MedicationLog tabs exist with proper header rows."""
    if not service or not spreadsheet_id:
        return False
    try:
        spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheet_titles = [s['properties']['title'] for s in spreadsheet.get('sheets', [])]
        
        requests = []
        if 'Medications' not in sheet_titles:
            requests.append({'addSheet': {'properties': {'title': 'Medications'}}})
        if 'MedicationLog' not in sheet_titles:
            requests.append({'addSheet': {'properties': {'title': 'MedicationLog'}}})
            
        if requests:
            service.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id,
                body={'requests': requests}
            ).execute()
            
        # Ensure headers
        if 'Medications' not in sheet_titles:
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range='Medications!A1:I1',
                valueInputOption='USER_ENTERED',
                body={'values': [MEDICATIONS_HEADER]}
            ).execute()
            
        if 'MedicationLog' not in sheet_titles:
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range='MedicationLog!A1:F1',
                valueInputOption='USER_ENTERED',
                body={'values': [MEDICATION_LOG_HEADER]}
            ).execute()
            
        return True
    except Exception as e:
        print(f"Error ensuring medication sheets: {e}")
        return False

def get_medications(spreadsheet_id=None):
    """Reads all active medications from the Medications tab."""
    sheet_id = spreadsheet_id or os.getenv("GOOGLE_SHEET_ID")
    service = get_sheets_service()
    if not service or not sheet_id:
        return []
    
    try:
        res = service.spreadsheets().values().get(
            spreadsheetId=sheet_id,
            range="Medications!A2:I"
        ).execute()
        rows = res.get("values", [])
        meds = []
        for r in rows:
            if not r or len(r) == 0:
                continue
            active_val = str(r[8]).lower() if len(r) > 8 else "true"
            is_active = active_val in ["true", "1", "yes"]
            if not is_active:
                continue
            
            meds.append({
                "med_id": r[0] if len(r) > 0 else f"med-{uuid.uuid4().hex[:6]}",
                "name": r[1] if len(r) > 1 else "Medication",
                "dosage": r[2] if len(r) > 2 else "1 dose",
                "times": [t.strip() for t in str(r[3]).split(",") if t.strip()] if len(r) > 3 else ["08:00"],
                "days_active": r[4] if len(r) > 4 else "daily",
                "pills_remaining": int(r[5]) if len(r) > 5 and str(r[5]).isdigit() else 30,
                "refill_threshold": int(r[6]) if len(r) > 6 and str(r[6]).isdigit() else 5,
                "start_date": r[7] if len(r) > 7 else datetime.now().strftime("%Y-%m-%d"),
                "active": is_active
            })
        return meds
    except Exception as e:
        print(f"Error reading medications from Sheets: {e}")
        return []

def get_medication_logs(spreadsheet_id=None, date_filter=None):
    """Reads medication logs from the MedicationLog tab."""
    sheet_id = spreadsheet_id or os.getenv("GOOGLE_SHEET_ID")
    service = get_sheets_service()
    if not service or not sheet_id:
        return []
    
    try:
        res = service.spreadsheets().values().get(
            spreadsheetId=sheet_id,
            range="MedicationLog!A2:F"
        ).execute()
        rows = res.get("values", [])
        logs = []
        for r in rows:
            if not r or len(r) == 0:
                continue
            log_item = {
                "log_id": r[0] if len(r) > 0 else "",
                "med_id": r[1] if len(r) > 1 else "",
                "scheduled_time": r[2] if len(r) > 2 else "",
                "status": r[3] if len(r) > 3 else "taken",
                "actual_time": r[4] if len(r) > 4 else "",
                "notes": r[5] if len(r) > 5 else ""
            }
            if date_filter:
                if date_filter in str(log_item["scheduled_time"]) or date_filter in str(log_item["actual_time"]):
                    logs.append(log_item)
            else:
                logs.append(log_item)
        return logs
    except Exception as e:
        print(f"Error reading medication logs from Sheets: {e}")
        return []

def log_medication_dose(med_id, scheduled_time, status, actual_time=None, notes="", spreadsheet_id=None):
    """Logs a dose (taken/skipped/missed) and decrements pill count if taken."""
    sheet_id = spreadsheet_id or os.getenv("GOOGLE_SHEET_ID")
    service = get_sheets_service()
    if not service or not sheet_id:
        return False
    
    try:
        ensure_medication_sheets(service, sheet_id)
        log_id = f"log-{uuid.uuid4().hex[:8]}"
        now_iso = actual_time or datetime.now().isoformat()
        
        # 1. Append log row
        service.spreadsheets().values().append(
            spreadsheetId=sheet_id,
            range="MedicationLog!A:F",
            valueInputOption="USER_ENTERED",
            body={
                "values": [[
                    log_id, med_id, scheduled_time, status, now_iso, notes
                ]]
            }
        ).execute()
        
        # 2. If status is taken or skipped, update pills_remaining on medication row
        if status.lower() == "taken":
            # Find row in Medications tab
            res = service.spreadsheets().values().get(
                spreadsheetId=sheet_id,
                range="Medications!A2:I"
            ).execute()
            rows = res.get("values", [])
            for idx, r in enumerate(rows):
                if len(r) > 0 and r[0] == med_id:
                    row_number = idx + 2
                    current_pills = int(r[5]) if len(r) > 5 and str(r[5]).isdigit() else 30
                    new_pills = max(0, current_pills - 1)
                    service.spreadsheets().values().update(
                        spreadsheetId=sheet_id,
                        range=f"Medications!F{row_number}",
                        valueInputOption="USER_ENTERED",
                        body={"values": [[new_pills]]}
                    ).execute()
                    break
        return True
    except Exception as e:
        print(f"Error logging medication dose in Sheets: {e}")
        return False
