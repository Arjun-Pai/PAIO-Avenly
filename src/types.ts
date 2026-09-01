export type TabType = "Home" | "Health" | "Calendar" | "Chats" | "Meet" | "Entertainment" | "Medication" | "AIChat" | "Calls" | "Caregiver" | "Settings" | "Security";

export interface VitalsState {
  heartRate: number | string;
  bloodOxygen: number | string;
  skinTemperature: number | string;
  bloodPressure?: string;
  glucose?: number | string;
  roomTemperature?: number | string;
  sleep: string;
  sleepHours: number | string;
  hydration: number | string;
  steps: number | string;
  mood: string;
  overallScore: number | string;
  isFallDetected: boolean;
  blynkConfigured?: boolean;
  isStale?: boolean;
  inactivityMinutes?: number;
  lastMovement?: string;
}

export interface MedicalIDInfo {
  bloodType: string;
  allergies: string[];
  dnrStatus: string;
  chronicConditions?: string[];
  conditions?: string[];
  medicationsSummary?: string;
  primaryPhysician?: string;
  primaryDoctor?: string;
  physicianPhone?: string;
  doctorPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  homeAddress?: string;
}

export interface GeofenceState {
  isInsideSafeZone?: boolean;
  status?: "inside" | "outside";
  zoneName?: string;
  safeZoneName?: string;
  currentLat?: number;
  currentLng?: number;
  distanceFromHomeMeters?: number;
  currentDistanceMeters?: number;
  radiusMeters?: number;
  lastGpsPing?: string;
  lastUpdate?: string;
}

export interface SymptomLogEntry {
  id: string;
  feeling: "great" | "good" | "neutral" | "unwell" | "pain";
  title: string;
  timestamp: string;
  reportedToCaregiver: boolean;
}

export interface MedicationRecord {
  med_id: string;
  name: string;
  dosage: string;
  times: string[];
  days_active: string;
  pills_remaining: number;
  refill_threshold: number;
  start_date: string;
  active: boolean;
}

export interface MedicationLogRecord {
  log_id: string;
  med_id: string;
  scheduled_time: string;
  status: "taken" | "skipped" | "missed";
  actual_time?: string;
  notes?: string;
}

export interface TimelineDoseItem {
  id: string;
  med_id: string;
  name: string;
  dosage: string;
  scheduled_time: string;
  time: string;
  status: "Upcoming" | "Due Now" | "Taken" | "Skipped" | "Missed";
  actual_time?: string;
  pills_remaining: number;
  refill_threshold: number;
  days_active: string;
  active: boolean;
  instructions?: string;
  notes?: string;
}

export interface MedicationItem {
  id: string;
  name: string;
  dosage?: string;
  time: string;
  instructions: string;
  status: "Taken" | "Upcoming" | "Pending" | "Missed" | "Due Now" | "Skipped";
  timestamp: string;
  currentQty?: number;
  refillThreshold?: number;
  capacity?: number;
  description?: string;
}

export interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  camera?: string;
  event?: string;
  time: string;
  image: string;
  imageUrl?: string;
}

export interface ChatMessage {
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

export interface CallState {
  active: boolean;
  contactName: string;
  type: "audio" | "video";
  duration: string;
}

export interface ConversationThread {
  id: string;
  topic: string;
  snippet: string;
  time: string;
  type: "health" | "companion" | "news" | "recipe";
}

export interface MedicalDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  uploadDate: string;
  category: "Prescription" | "Lab Report" | "Cardiology" | "Insurance" | "General";
  summary: string;
  fileUrl?: string;
  encryptedData?: string;
  iv?: string;
  key?: string;
}

export interface AccessibilitySettings {
  fontSizeScale: "standard" | "large" | "extraLarge";
  highContrast: boolean;
  soundFeedback: boolean;
  screenReader: boolean;
  voiceInputDefault: boolean;
}

export interface UserProfile {
  fullName: string;
  dateOfBirth: string;
  age: number | string;
  gender: string;
  avatarUrl: string;
  primaryPhone: string;
  language?: string;
  accessibilitySettings?: AccessibilitySettings;
  googleAccount: {
    connected: boolean;
    email: string;
    syncCalendar: boolean;
    syncDrive: boolean;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  primaryDoctor: {
    name: string;
    clinic: string;
    phone: string;
  };
  medicalDocs: MedicalDocument[];
  onboarded: boolean;
}

export type DynamicIslandState =
  | "idle"
  | "ai_assistant"
  | "medication_reminder"
  | "missed_dose"
  | "refill_reminder"
  | "incoming_call"
  | "sos_panic"
  | "caregiver_message"
  | "calendar_reminder"
  | "dispense_in_progress"
  | "system_status"
  | "onboarding_tip";

export interface DynamicIslandNotification {
  type: DynamicIslandState;
  title?: string;
  description?: string;
  payload?: {
    medId?: string;
    medName?: string;
    dosage?: string;
    time?: string;
    contactName?: string;
    callType?: "audio" | "video";
    callerAvatar?: string;
    sender?: string;
    messageText?: string;
    eventTitle?: string;
    eventTime?: string;
    eventLocation?: string;
    remainingDoses?: number;
    isSimulatedDispense?: boolean;
    isOffline?: boolean;
    syncError?: string;
    tipStep?: number;
    aiPhase?: "listening" | "thinking" | "speaking";
    aiTranscript?: string;
    countdown?: number;
    [key: string]: any;
  };
  timestamp?: number;
  priority?: number;
}

