import { TabType, VitalsState, MedicationItem } from "../types";
import { speakText, playAudioFeedback } from "./audioFeedback";

export interface VoiceCommandResult {
  action: 
    | "navigate" 
    | "action_taken_meds" 
    | "action_hydrate" 
    | "action_sos" 
    | "action_read_screen" 
    | "action_tell_time" 
    | "action_vitals" 
    | "action_settings" 
    | "action_contrast" 
    | "action_font_size" 
    | "action_ai_query"
    | "action_help"
    | "unknown";
  targetTab?: TabType;
  direction?: "next" | "prev";
  aiQuery?: string;
  feedbackText: string;
}

export const SWIPEABLE_TABS: TabType[] = [
  "Home",
  "Health",
  "Calendar",
  "Chats",
  "Entertainment",
  "AIChat",
  "Medication",
  "Calls"
];

export function parseVoiceCommand(
  rawTranscript: string, 
  activeTab: TabType,
  vitals?: VitalsState,
  medications?: MedicationItem[]
): VoiceCommandResult {
  const text = rawTranscript.toLowerCase().trim();

  // 1. Emergency SOS commands (Highest priority)
  if (
    text.includes("sos") ||
    text.includes("emergency") ||
    text.includes("call 911") ||
    text.includes("help me") ||
    text.includes("i fell") ||
    text.includes("fall detected") ||
    text.includes("ambulance")
  ) {
    return {
      action: "action_sos",
      feedbackText: "Emergency help requested. Opening emergency dispatch."
    };
  }

  // 2. Navigation Commands (Direct Tabs)
  if (
    text === "home" ||
    text.includes("go home") ||
    text.includes("main screen") ||
    text.includes("dashboard") ||
    text.includes("start screen") ||
    text === "go to home"
  ) {
    return { action: "navigate", targetTab: "Home", feedbackText: "Opening Home Screen" };
  }

  if (
    text.includes("health") ||
    text.includes("vitals") ||
    text.includes("heart rate") ||
    text.includes("pulse") ||
    text.includes("oxygen") ||
    text.includes("body status") ||
    text.includes("biometrics")
  ) {
    // If asking for reading vitals specifically
    if (text.includes("what is my") || text.includes("check my") || text.includes("tell me my")) {
      return { action: "action_vitals", feedbackText: "Reading your latest vitals." };
    }
    return { action: "navigate", targetTab: "Health", feedbackText: "Opening Health & Vitals" };
  }

  if (
    text.includes("calendar") ||
    text.includes("schedule") ||
    text.includes("appointment") ||
    text.includes("appointments") ||
    text.includes("my day") ||
    text.includes("events")
  ) {
    return { action: "navigate", targetTab: "Calendar", feedbackText: "Opening Calendar & Appointments" };
  }

  if (
    text.includes("chat") ||
    text.includes("chats") ||
    text.includes("messages") ||
    text.includes("message") ||
    text.includes("google chat") ||
    text.includes("text family")
  ) {
    return { action: "navigate", targetTab: "Chats", feedbackText: "Opening Family Chats" };
  }

  if (
    text.includes("entertainment") ||
    text.includes("music") ||
    text.includes("radio") ||
    text.includes("games") ||
    text.includes("game") ||
    text.includes("puzzle") ||
    text.includes("brain games") ||
    text.includes("kindle") ||
    text.includes("books") ||
    text.includes("fun")
  ) {
    return { action: "navigate", targetTab: "Entertainment", feedbackText: "Opening Entertainment & Music" };
  }

  if (
    text.includes("assistant") ||
    text.includes("ai chat") ||
    text.includes("talk to avenly") ||
    text.includes("ask avenly") ||
    text.includes("gemini")
  ) {
    return { action: "navigate", targetTab: "AIChat", feedbackText: "Opening Avenly AI Assistant" };
  }

  if (
    text.includes("medication") ||
    text.includes("medications") ||
    text.includes("pills") ||
    text.includes("pill") ||
    text.includes("medicine") ||
    text.includes("prescription") ||
    text.includes("dispenser")
  ) {
    // If asking about taking meds
    if (text.includes("took") || text.includes("take") || text.includes("log") || text.includes("mark")) {
      return { action: "action_taken_meds", feedbackText: "Logging medication dose as taken." };
    }
    return { action: "navigate", targetTab: "Medication", feedbackText: "Opening Medication Tracker" };
  }

  if (
    text.includes("calls") ||
    text.includes("call") ||
    text.includes("video call") ||
    text.includes("phone") ||
    text.includes("contacts") ||
    text.includes("call doctor") ||
    text.includes("call family")
  ) {
    return { action: "navigate", targetTab: "Calls", feedbackText: "Opening Video Calls & Contacts" };
  }

  // 3. Screen Travel / Carousel (Swipe) Voice Commands
  if (
    text.includes("next screen") ||
    text.includes("next page") ||
    text.includes("next tab") ||
    text.includes("swipe left") ||
    text.includes("go forward") ||
    text === "next"
  ) {
    const currentIndex = SWIPEABLE_TABS.indexOf(activeTab);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % SWIPEABLE_TABS.length;
    const target = SWIPEABLE_TABS[nextIndex];
    return { action: "navigate", targetTab: target, direction: "next", feedbackText: `Swiping to ${target}` };
  }

  if (
    text.includes("previous screen") ||
    text.includes("previous page") ||
    text.includes("previous tab") ||
    text.includes("swipe right") ||
    text.includes("go back") ||
    text === "back" ||
    text === "previous"
  ) {
    const currentIndex = SWIPEABLE_TABS.indexOf(activeTab);
    const prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + SWIPEABLE_TABS.length) % SWIPEABLE_TABS.length;
    const target = SWIPEABLE_TABS[prevIndex];
    return { action: "navigate", targetTab: target, direction: "prev", feedbackText: `Swiping to ${target}` };
  }

  // 4. Direct Senior Health & Care Actions
  if (
    text.includes("i drank water") ||
    text.includes("log water") ||
    text.includes("drink water") ||
    text.includes("drank water") ||
    text.includes("add water") ||
    text.includes("hydration")
  ) {
    return { action: "action_hydrate", feedbackText: "Logging 1 glass of water." };
  }

  if (
    text.includes("i took my medication") ||
    text.includes("i took my pills") ||
    text.includes("i took my meds") ||
    text.includes("took pills") ||
    text.includes("mark as taken") ||
    text.includes("pill taken")
  ) {
    return { action: "action_taken_meds", feedbackText: "Marking your scheduled medication as taken." };
  }

  // 5. Utility & Information
  if (
    text.includes("what time is it") ||
    text.includes("current time") ||
    text.includes("tell me the time") ||
    text.includes("what's the time")
  ) {
    return { action: "action_tell_time", feedbackText: "Checking the current time." };
  }

  if (
    text.includes("read screen") ||
    text.includes("what's on screen") ||
    text.includes("what is on this screen") ||
    text.includes("summarize screen") ||
    text.includes("read to me")
  ) {
    return { action: "action_read_screen", feedbackText: "Reading active screen contents." };
  }

  // 6. Settings & Accessibility
  if (
    text.includes("open settings") ||
    text.includes("settings") ||
    text.includes("control center") ||
    text.includes("hardware lab")
  ) {
    return { action: "action_settings", feedbackText: "Opening Settings & Accessibility Panel" };
  }

  if (
    text.includes("high contrast on") ||
    text.includes("turn on high contrast") ||
    text.includes("dark contrast") ||
    text.includes("high contrast")
  ) {
    return { action: "action_contrast", feedbackText: "Toggling High Contrast Mode" };
  }

  if (
    text.includes("bigger text") ||
    text.includes("large text") ||
    text.includes("larger font") ||
    text.includes("increase text")
  ) {
    return { action: "action_font_size", feedbackText: "Increasing text size" };
  }

  if (
    text.includes("help with voice") ||
    text.includes("voice guide") ||
    text.includes("what can i say") ||
    text.includes("voice commands") ||
    text.includes("voice help")
  ) {
    return { action: "action_help", feedbackText: "Opening Voice Guide & Instructions" };
  }

  // 7. Conversational Fallback to AI Assistant
  // If it's a question or statement like "tell me a joke", "how to bake cookies", "why is the sky blue"
  if (
    text.startsWith("why") ||
    text.startsWith("how") ||
    text.startsWith("what") ||
    text.startsWith("who") ||
    text.startsWith("when") ||
    text.startsWith("where") ||
    text.includes("tell me") ||
    text.includes("explain") ||
    text.includes("joke") ||
    text.includes("recipe") ||
    text.includes("weather") ||
    text.includes("story")
  ) {
    return {
      action: "action_ai_query",
      aiQuery: rawTranscript,
      feedbackText: `Asking Avenly: "${rawTranscript}"`
    };
  }

  return {
    action: "unknown",
    feedbackText: `Heard "${rawTranscript}". Say "Help" for voice commands.`
  };
}

export function getScreenVoiceSummary(
  activeTab: TabType,
  vitals?: VitalsState,
  medications?: MedicationItem[]
): string {
  switch (activeTab) {
    case "Home": {
      const upMed = medications?.find(m => m.status === "Upcoming");
      const medText = upMed ? `Your next medication is ${upMed.name} at ${upMed.time}.` : "You have no upcoming medications right now.";
      const hrText = vitals?.heartRate && vitals.heartRate !== "N/A" ? `Your heart rate is ${vitals.heartRate} beats per minute.` : "";
      return `You are on the Home Dashboard. ${hrText} ${medText} You can swipe left or right to visit other screens, or say Go to Health, Medication, Calendar, or Calls.`;
    }
    case "Health": {
      const hr = vitals?.heartRate || "72";
      const spo2 = vitals?.bloodOxygen || "98%";
      const steps = vitals?.steps || "3420";
      return `You are on the Health Status Screen. Heart rate is ${hr} beats per minute. Blood oxygen is ${spo2}. You have walked ${steps} steps today. You can tap the Log Hydration button or say Log Water.`;
    }
    case "Medication": {
      const pendingCount = medications?.filter(m => m.status !== "Taken").length || 0;
      return `You are on the Medication Schedule. You have ${pendingCount} doses scheduled for today. Say: Mark as Taken to record your current dose.`;
    }
    case "Calendar":
      return "You are viewing your Calendar and Appointments. You can see your upcoming doctor visits and family schedules synced with Google Calendar.";
    case "Chats":
      return "You are on Family Chats. You can send messages and photos with your loved ones and caregivers via Google Chat.";
    case "Entertainment":
      return "You are on Entertainment. You can listen to classical music, vintage radio, play brain games, or read large-print books.";
    case "AIChat":
      return "You are on the Avenly Voice Assistant. Tap the microphone or speak any question to get comforting answers and companionship.";
    case "Calls":
      return "You are on Video Calls and Contacts. You can tap Call Family, Call Doctor, or Start a Google Meet consultation.";
    default:
      return `You are on the ${activeTab} screen. You can swipe left or right to switch screens.`;
  }
}
