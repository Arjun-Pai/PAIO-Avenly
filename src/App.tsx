import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import {
  Home as HomeIcon,
  Heart,
  Shield,
  Pill,
  MessageCircle,
  Phone,
  Settings as SettingsIcon,
  Wifi,
  Bluetooth,
  Battery,
  ShieldAlert,
  Sparkles,
  Mic,
  UserCheck,
  Calendar as CalendarIcon,
  MessageSquare,
  ArrowLeft,
  AlertTriangle,
  Volume2,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { playAudioFeedback, speakText } from "./lib/audioFeedback";

import { TabType, VitalsState, MedicationItem, SecurityAlert, CallState, UserProfile, DynamicIslandNotification } from "./types";
import HomeDashboard from "./components/HomeDashboard";
import HealthStatus from "./components/HealthStatus";
import CaregiverView from "./components/CaregiverView";
import Entertainment from "./components/Entertainment";
import AIChat from "./components/AIChat";
import MedicationView from "./components/MedicationView";
import CallsView from "./components/CallsView";
import SettingsView from "./components/SettingsView";
import DynamicIsland from "./components/DynamicIsland";
import OnboardingView from "./components/OnboardingView";
import StandbyScreen from "./components/StandbyScreen";
import CalendarView from "./components/CalendarView";
import ChatsView from "./components/ChatsView";
import VoiceNavigator from "./components/VoiceNavigator";
import { SWIPEABLE_TABS } from "./lib/voiceCommands";
import { fetchMedicationsFromGoogleSheets, fetchVitalsFromGoogleSheets } from "./lib/workspace";
import { getTranslation, getLocaleCode, formatNumberToLocale, localizeDataString } from "./lib/translations";
import config from "./config.json";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("Home");
  const [systemTime, setSystemTime] = useState("");
  const [isCaregiverMode, setIsCaregiverMode] = useState(false);
  
  // App states
  const [vitals, setVitals] = useState<VitalsState>({
    heartRate: "N/A",
    bloodOxygen: "N/A",
    skinTemperature: "N/A",
    steps: "N/A",
    hydration: "N/A",
    sleepHours: "N/A",
    sleep: "N/A",
    mood: "N/A",
    overallScore: "N/A",
    isFallDetected: false
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [callState, setCallState] = useState<CallState>({
    active: false,
    contactName: "",
    type: "video",
    duration: "00:00"
  });

  // Physical Dispenser state
  const [dispenseState, setDispenseState] = useState<"standby" | "pulsing" | "dispensing" | "dispensed" | "skipped">("standby");
  const [activePillName, setActivePillName] = useState("Metformin 500mg");

  // Dynamic Island notification state
  const [notification, setNotification] = useState<DynamicIslandNotification | null>(null);

  const [fallCountdown, setFallCountdown] = useState<number>(30);
  const [deviceState, setDeviceState] = useState({
    battery: config.batteryPercentage || "85%",
    wifi: config.wifi5g ?? true,
    bluetooth: true,
    bandConnected: config.bandConnected ?? true,
    hubConnected: config.hubConnected ?? true
  });

  // Onboarding & Profile State
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    return localStorage.getItem("avenly_onboarded") !== "true";
  });

  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(() => {
    const saved = localStorage.getItem("avenly_user_profile");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return undefined;
  });

  // Language Translation Sync
  const t = getTranslation(userProfile?.language);

  // Senior Accessibility States
  const [fontSizeScale, setFontSizeScale] = useState<"standard" | "large" | "extraLarge">(() => {
    return (localStorage.getItem("avenly_font_scale") as any) || "large";
  });
  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => {
    return localStorage.getItem("avenly_high_contrast") === "true";
  });
  const [isSoundFeedback, setIsSoundFeedback] = useState<boolean>(() => {
    return localStorage.getItem("avenly_sound_feedback") !== "false";
  });
  const [isSOSConfirmOpen, setIsSOSConfirmOpen] = useState<boolean>(false);

  // Sync Google Translate cookie smoothly without reloading page
  useEffect(() => {
    if (userProfile?.language) {
      const langMap: Record<string, string> = {
        "English": "en", "Hindi": "hi", "Bengali": "bn", "Marathi": "mr", 
        "Telugu": "te", "Tamil": "ta", "Gujarati": "gu", "Urdu": "ur", 
        "Kannada": "kn", "Odia": "or", "Malayalam": "ml", "Spanish": "es", 
        "French": "fr", "German": "de", "Mandarin": "zh-CN"
      };
      const code = langMap[userProfile.language];
      if (code && code !== "en") {
        const targetValue = `/en/${code}`;
        document.cookie = `googtrans=${targetValue}; path=/`;
      } else if (code === "en") {
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
    }
  }, [userProfile?.language]);

  // Drag-to-open Settings state
  const dragStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    // Only register drag if initiated near top of screen
    if (clientY < 100) {
      dragStartY.current = clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragStartY.current === null) return;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - dragStartY.current;

    // Drag down from top opens settings
    if (deltaY > 40 && !isSettingsOpen) {
      setIsSettingsOpen(true);
      dragStartY.current = null;
    }
    // Drag up closes settings
    else if (deltaY < -40 && isSettingsOpen) {
      setIsSettingsOpen(false);
      dragStartY.current = null;
    }
  };

  const handleTouchEnd = () => {
    dragStartY.current = null;
  };

  // Screen Swiping & Voice Navigation States
  const [aiInitialQuery, setAiInitialQuery] = useState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | "none">("none");

  // Swipe Carousel Navigation
  const handleSwipeNavigate = (direction: "next" | "prev") => {
    const currentIndex = SWIPEABLE_TABS.indexOf(activeTab);
    let nextIndex = 0;
    if (direction === "next") {
      nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % SWIPEABLE_TABS.length;
      setSwipeDirection("left");
    } else {
      nextIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + SWIPEABLE_TABS.length) % SWIPEABLE_TABS.length;
      setSwipeDirection("right");
    }
    const nextTab = SWIPEABLE_TABS[nextIndex];
    playAudioFeedback("tap");
    setActiveTab(nextTab);
  };

  const handleVoiceNavigate = (tab: TabType, direction?: "next" | "prev") => {
    if (direction) {
      setSwipeDirection(direction === "next" ? "left" : "right");
    } else {
      setSwipeDirection("none");
    }
    playAudioFeedback("tap");
    setActiveTab(tab);
  };

  // Touch and pointer swipe handlers for screen viewport
  const screenTouchStartX = useRef<number | null>(null);
  const screenTouchStartY = useRef<number | null>(null);

  const handleScreenTouchStart = (e: React.TouchEvent) => {
    screenTouchStartX.current = e.touches[0].clientX;
    screenTouchStartY.current = e.touches[0].clientY;
  };

  const handleScreenTouchEnd = (e: React.TouchEvent) => {
    if (screenTouchStartX.current === null || screenTouchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - screenTouchStartX.current;
    const deltaY = e.changedTouches[0].clientY - screenTouchStartY.current;
    screenTouchStartX.current = null;
    screenTouchStartY.current = null;

    // Detect intentional horizontal swipe (minimum 45px, more horizontal than vertical)
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
      if (deltaX < 0) {
        handleSwipeNavigate("next");
      } else {
        handleSwipeNavigate("prev");
      }
    }
  };

  // Keyboard Left / Right arrow navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === "ArrowRight") {
        handleSwipeNavigate("next");
      } else if (e.key === "ArrowLeft") {
        handleSwipeNavigate("prev");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab]);

  // Voice Action: Log medication as taken
  const handleMarkMedicationTakenByVoice = () => {
    const dueMed = medications.find(m => m.status === "Upcoming" || m.status === "Pending") || medications[0];
    if (dueMed) {
      handleDispenseMedication(dueMed.id);
    } else {
      handleManualDispense();
    }
  };

  // Voice Action: Forward question to AI Assistant
  const handleAskAIByVoice = (query: string) => {
    setAiInitialQuery(query);
    setActiveTab("AIChat");
  };

  // Standby & Inactivity State
  const [isStandby, setIsStandby] = useState<boolean>(false);
  const [standbyTimeout, setStandbyTimeout] = useState<number>(() => {
    const saved = localStorage.getItem("avenly_standby_timeout");
    return saved ? parseInt(saved, 10) : 5; // Default 5 minutes
  });

  // Inactivity Detection Timer
  useEffect(() => {
    if (standbyTimeout <= 0 || isStandby || isOnboardingOpen) return;

    let timeoutId: any;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsStandby(true);
      }, standbyTimeout * 60 * 1000);
    };

    resetTimer();

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "click", "scroll"];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [standbyTimeout, isStandby, isOnboardingOpen]);
  
  // Socket.IO for WebRTC Signaling
  const socketRef = useRef<any>(null);
  const fetchVitalsRef = useRef<any>(null);

  // Poll for state from the Express backend
  useEffect(() => {
    // Setup Socket.IO for real-time signaling
    socketRef.current = io();
    socketRef.current.on("connect", () => {
      console.log("WebRTC signaling connected");
      socketRef.current.emit("join-call", "hub-room-primary");
    });
    
    socketRef.current.on("offer", (data: any) => {
      setNotification({
        type: "incoming_call",
        title: "Incoming Video Call",
        description: "Preeti (Daughter) is calling",
        payload: { contactName: "Preeti (Daughter)", callType: "video" }
      });
    });

    fetchVitals();
    fetchMedications();
    fetchAlerts();
    fetchCallState();

    // Small status bar clocks
    const timer = setInterval(() => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      setSystemTime(`${hours}:${minutes} ${ampm}`);
    }, 1000);

    // Moved vitalInterval to a separate useEffect

    // Poll settings from localStorage to sync with settings panel
    const pollSettings = () => {
      const wifiEnabled = localStorage.getItem("paio_wifi_enabled") !== "false";
      const btEnabled = localStorage.getItem("paio_bt_enabled") !== "false";
      const isOnline = navigator.onLine;

      setDeviceState(prev => ({
        ...prev,
        wifi: wifiEnabled && isOnline,
        bluetooth: btEnabled,
        bandConnected: btEnabled,
        hubConnected: isOnline
      }));
    };

    pollSettings();
    const settingsInterval = setInterval(pollSettings, 2000);

    // Get real battery
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          setDeviceState(prev => ({
            ...prev,
            battery: Math.round(battery.level * 100) + "%"
          }));
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
      }).catch(() => {
        setDeviceState(prev => ({ ...prev, battery: "98%" }));
      });
    } else {
      setDeviceState(prev => ({ ...prev, battery: "98%" }));
    }

    const handleOnline = () => pollSettings();
    const handleOffline = () => pollSettings();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Continuous background listening for wake word "Hey Aven"
    let recognition: any = null;
    const initVoiceWake = () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;

          recognition.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
            if (transcript.includes("hey aven")) {
              // Found wake word! Extract command
              const command = transcript.split("hey aven")[1].trim();
              if (command.length > 0) {
                // Have a command already, switch to tab and process
                setActiveTab("AIChat");
                setNotification(null);
                recognition.stop();
                processVoiceCommand(command).finally(() => {
                  setTimeout(() => {
                    try { recognition.start(); } catch(e){}
                  }, 1000);
                });
              } else {
                // Just said Hey Aven, wait for command
                setActiveTab("AIChat");
                setNotification(null);
                recognition.stop();
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('avenly-wake-word'));
                }, 500);
              }
            }
          };

          recognition.onend = () => {
             // Restart to keep continuous listening
             try { recognition.start(); } catch(e){}
          };

          recognition.start();
        } catch (e) {
          console.error("Speech recognition error:", e);
        }
      }
    };
    
    initVoiceWake();

    return () => {
      clearInterval(timer);

      clearInterval(settingsInterval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (recognition) {
        recognition.onend = null;
        try { recognition.stop(); } catch(e){}
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const isFirstLoad = useRef(true);
  
  // Set up custom notifications based on schedule state
  useEffect(() => {
    const upcomingMed = medications.find(m => m.status === "Upcoming");
    if (upcomingMed && dispenseState === "standby") {
      setDispenseState("pulsing");
      setActivePillName(upcomingMed.name);
      
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
      } else {
        setNotification({
          type: "medication_reminder",
          title: "Dose Time Reminder",
          description: `Time for ${upcomingMed.name}. ${upcomingMed.instructions}`,
          payload: { medId: upcomingMed.id, medName: upcomingMed.name, time: upcomingMed.time }
        });
      }
    }
  }, [medications]);

  // Persistent Medication Alarm Audio Loop
  useEffect(() => {
    let intervalId: any = null;
    if (notification && (notification.type === "medication_reminder" || notification.type === "missed_dose")) {
      const playMedAlarm = () => {
        if ('speechSynthesis' in window) {
           window.speechSynthesis.cancel();
           const msg = new SpeechSynthesisUtterance(`Reminder. It is time to take your ${notification.payload?.medName || "medication"}. Please mark as taken or skip.`);
           msg.rate = 0.9;
           window.speechSynthesis.speak(msg);
        }
      };
      
      // Play immediately, then repeat every 15 seconds
      playMedAlarm();
      intervalId = setInterval(playMedAlarm, 15000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
      if ('speechSynthesis' in window) {
         window.speechSynthesis.cancel();
      }
    };
  }, [notification]);

  useEffect(() => {
    fetchVitalsRef.current = fetchVitals;
  });

  // Slow natural live heartbeat & vitals fluctuation (+1, +2, max +3 BPM smoothly)
  useEffect(() => {
    const liveTelemetryInterval = setInterval(() => {
      setVitals(prev => {
        if (prev.isFallDetected) return prev;

        // Heart rate: resting base around 70-76, slowly drift by -1, +1, +2, or +3 BPM
        const currentHr = typeof prev.heartRate === "number" ? prev.heartRate : (parseInt(String(prev.heartRate) || "72", 10) || 72);
        const deltaHr = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
        const direction = Math.random() > 0.45 ? 1 : -1;
        let nextHr = currentHr + (deltaHr * direction);
        if (nextHr < 68) nextHr = 69 + Math.floor(Math.random() * 2);
        if (nextHr > 77) nextHr = 75 - Math.floor(Math.random() * 2);

        // Oxygen: 98 <-> 99%
        const currentSpo2 = typeof prev.bloodOxygen === "number" ? prev.bloodOxygen : (parseInt(String(prev.bloodOxygen) || "98", 10) || 98);
        const nextSpo2 = Math.random() > 0.65 ? (currentSpo2 === 98 ? 99 : 98) : currentSpo2;

        // Temperature: 36.6 <-> 36.8 °C
        const currentTemp = typeof prev.skinTemperature === "number" ? prev.skinTemperature : (parseFloat(String(prev.skinTemperature) || "36.7") || 36.7);
        const tempShift = (Math.random() * 0.2 - 0.1);
        const nextTemp = Math.min(37.1, Math.max(36.4, parseFloat((currentTemp + tempShift).toFixed(1))));

        // Steps: +1 or +2 steps occasionally
        const currentSteps = typeof prev.steps === "number" ? prev.steps : (parseInt(String(prev.steps) || "4280", 10) || 4280);
        const stepInc = Math.random() > 0.5 ? (Math.random() > 0.5 ? 1 : 2) : 0;
        const nextSteps = currentSteps + stepInc;

        return {
          ...prev,
          heartRate: nextHr,
          bloodOxygen: nextSpo2,
          skinTemperature: nextTemp,
          steps: nextSteps,
          isStale: false
        };
      });
    }, 3500);

    const vitalInterval = setInterval(() => {
      if (fetchVitalsRef.current) fetchVitalsRef.current();
    }, 10000);

    return () => {
      clearInterval(liveTelemetryInterval);
      clearInterval(vitalInterval);
    };
  }, []);

  const fetchVitals = async () => {
    console.log("Fetching latest vitals at", new Date().toLocaleTimeString());
    try {
      let data;
      // Try to fetch from user's personal Google Sheet first if they are authenticated and have created one
      try {
        const sheetsData = await fetchVitalsFromGoogleSheets();
        if (sheetsData) {
          data = sheetsData;
        }
      } catch(sheetErr) {
        console.warn("Failed to fetch from user's personal Google Sheet, falling back to default.", sheetErr);
      }
      
      // Fallback to default API if Google Sheets data isn't available
      if (!data) {
        const res = await fetch(`/api/vitals?_cb=${Date.now()}`, { cache: 'no-store' });
        data = await res.json();
      }

      setVitals(prev => ({ ...prev, ...data }));
      if (data.batteryPercentage) {
        setDeviceState(prev => ({
          ...prev,
          battery: data.batteryPercentage
        }));
      }
      if (data.isFallDetected) {
        setNotification({
          type: "sos_panic",
          title: "Fall Detected!",
          description: "Avenly protective band registered a sudden orientation shift. Emergency response triggers soon.",
          payload: { isSos: true }
        });
      }
    } catch (e) {
      // Offline fallback
    }
  };

  const fetchMedications = async () => {
    try {
      if (userProfile?.googleAccount?.connected) {
        try {
          const meds = await fetchMedicationsFromGoogleSheets();
          setMedications(meds);
          return;
        } catch (err) {
          console.error("Failed to fetch meds from Sheets:", err);
        }
      }
      const res = await fetch("/api/medication");
      const data = await res.json();
      setMedications(data);
    } catch (e) {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchMedications();
  }, [userProfile?.googleAccount?.connected]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/security/alerts");
      const data = await res.json();
      setAlerts(data);
    } catch (e) {
      // Offline fallback
    }
  };

  const fetchCallState = async () => {
    try {
      const res = await fetch("/api/calls/state");
      const data = await res.json();
      setCallState(data);
    } catch (e) {
      // Offline fallback
    }
  };

  // Action: Dispense medication
  const handleDispenseMedication = async (medId: string) => {
    setDispenseState("dispensing");
    setNotification({
      type: "dispense_in_progress",
      title: "Carousel Motor Active",
      description: "Stepper motor rotating carousel tray into collection chute.",
      payload: { medName: activePillName, isSimulatedDispense: true }
    });
    try {
      // Voice instruction
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance("Dispensing. Please take your tablet with water.");
        u.rate = 1.0;
        window.speechSynthesis.speak(u);
      }

      await fetch(`/api/medication/dispense/${medId}`, { method: "POST" });
      setTimeout(async () => {
        setDispenseState("dispensed");
        setNotification(null);
        await fetchMedications();
        await fetchAlerts();
      }, 2500);
    } catch (e) {
      setDispenseState("standby");
      setNotification(null);
    }
  };

  const handleSkipMedication = async (medId?: string) => {
    setDispenseState("skipped");
    setNotification(null);
    if (medId) {
      try {
        await fetch(`/api/medication/skip/${medId}`, { method: "POST" });
        await fetchMedications();
      } catch (e) {}
    }
  };

  // Action: Manual dispense physical cartridge bypass
  const handleManualDispense = () => {
    const upcoming = medications.find(m => m.status === "Upcoming") || medications.find(m => m.status === "Pending");
    if (upcoming) {
      handleDispenseMedication(upcoming.id);
    } else {
      // Dispense a generic dose
      setDispenseState("dispensing");
      setTimeout(() => {
        setDispenseState("dispensed");
      }, 2500);
    }
  };

  const handleResetMedications = async () => {
    try {
      await fetch("/api/medication/reset", { method: "POST" });
      setDispenseState("standby");
      setNotification(null);
      await fetchMedications();
    } catch (e) {
      // Ignore
    }
  };

  // Action: Increment Hydration cup
  const handleTrackHydration = async () => {
    try {
      const nextHydration = parseFloat(((Number(vitals.hydration) || 0) + 0.25).toFixed(2));
      await fetch("/api/vitals/hydrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hydration: nextHydration })
      });
      await fetchVitals();
      
      // Sound cue
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2); // A5
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) {}
    } catch (e) {}
  };

  // Emergency beep alarm and countdown triggers
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (vitals.isFallDetected) {
      setFallCountdown(30);
      interval = setInterval(() => {
        setFallCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval!);
            handleAutoDispatchEmergency();
            return 0;
          }
          // Warning sound and vocal warning every 5s
          if (prev % 5 === 0) {
            playEmergencyBeep();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setFallCountdown(30);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [vitals.isFallDetected]);

  const playEmergencyBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Fall detected. Calling emergency services shortly unless dismissed.");
      u.rate = 1.05;
      u.volume = 0.5;
      window.speechSynthesis.speak(u);
    }
  };

  const handleAutoDispatchEmergency = async () => {
    const pName = userProfile?.fullName || "User";
    try {
      await handleStartCall("Avenly Emergency Response Team", "video");
      await fetch(`/api/security/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Emergency Dispatched",
          description: `Avenly protective band initiated automated EMS (911) dispatch. ${pName} is unresponsive.`
        })
      });
      await fetchAlerts();
      setNotification({
        type: "sos_panic",
        title: "Paramedics Dispatched",
        description: `Emergency responders and caregiver have been summoned automatically to ${pName}'s address.`,
        payload: { isSos: true }
      });
    } catch (e) {}
  };

  // Action: Trigger Fall simulation
  const handleTriggerFall = async () => {
    const pName = userProfile?.fullName || "User";
    try {
      await fetch("/api/security/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Fall Detected",
          description: `${pName}'s protective care band registered a potential fall near the kitchen.`
        })
      });
      await fetchVitals();
      await fetchAlerts();
      
      // Initial auditory alarm trigger
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } catch (e) {}
    } catch (e) {}
  };

  const handleResetFall = async () => {
    try {
      await fetch("/api/security/trigger/reset", { method: "POST" });
      setNotification(null);
      await fetchVitals();
      await fetchAlerts();
      
      // Say confirmation
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance("Fall alarm dismissed. Rest assured.");
        u.rate = 1.0;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {}
  };

  const handleClearAlerts = async () => {
    try {
      await fetch("/api/security/alerts/clear", { method: "POST" });
      await fetchAlerts();
    } catch (e) {}
  };

  // Action: Call management
  const handleStartCall = async (contactName: string, type: "audio" | "video", phone?: string) => {
    if (type === "audio" && phone && phone !== "No phone set") {
      window.location.href = `tel:${phone.replace(/[^0-9+]/g, '')}`;
      return;
    }
    
    if (type === "video") {
      try {
        const { createGoogleMeetCall } = await import("./lib/workspace");
        const result = await createGoogleMeetCall();
        if (result.meetUrl) {
          window.open(result.meetUrl, "_blank");
          return;
        }
      } catch (e) {
        console.warn("Failed to create Meet", e);
      }
    }

    // Fallback UI mock
    try {
      await fetch("/api/calls/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName, type })
      });
      setActiveTab("Calls");
      await fetchCallState();
    } catch (e) {}
  };

  const handleEndCall = async () => {
    try {
      await fetch("/api/calls/end", { method: "POST" });
      await fetchCallState();
    } catch (e) {}
  };

  const handleVoiceWake = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = getLocaleCode(userProfile?.language);
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = () => {
          setNotification({
            type: "ai_assistant",
            title: t.listening,
            description: "Avenly is listening to your request.",
            payload: { aiPhase: "listening" }
          });
        };
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          processVoiceCommand(transcript);
        };
        
        recognition.onerror = () => {
           setActiveTab("AIChat");
        };
        
        recognition.onend = () => {
          if (notification?.type === "ai_assistant" && notification?.payload?.aiPhase === "listening") {
            setNotification(null);
          }
        };
        
        recognition.start();
      } catch (e) {
        setActiveTab("AIChat");
      }
    } else {
      setActiveTab("AIChat");
    }
  };

  const processVoiceCommand = async (textToSend: string) => {
    setNotification({
      type: "ai_assistant",
      title: t.thinking,
      description: "Avenly is processing your request.",
      payload: { aiPhase: "thinking", aiTranscript: textToSend }
    });

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend, language: userProfile?.language || "English" })
      });
      const data = await response.json();
      const responseText = data.response;

      const wordCount = responseText.split(" ").length;
      
      if (wordCount > 100) {
        // Smoothly expand to entire screen
        setActiveTab("AIChat");
        setNotification(null);
      } else {
        // Dynamic Island
        setNotification({
          type: "ai_assistant",
          title: "Avenly Assistant",
          description: responseText,
          payload: { aiPhase: "speaking" }
        });
        
        // Speak
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(responseText);
          u.lang = getLocaleCode(userProfile?.language);
          window.speechSynthesis.speak(u);
        }
      }
    } catch (e) {
      setActiveTab("AIChat");
    }
  };

  // Dynamic Island Action callbacks
  const handleDynamicIslandAction = (actionType: string, payload?: any) => {
    if (actionType === "dispense_medication") {
      const medId = payload?.medId || medications.find(m => m.status === "Upcoming" || m.status === "Pending")?.id || "med-0";
      handleDispenseMedication(medId);
    } else if (actionType === "skip_medication") {
      handleSkipMedication(payload?.medId);
    } else if (actionType === "snooze_medication" || actionType === "dismiss_missed_dose") {
      setDispenseState("standby");
      setNotification(null);
    } else if (actionType === "cancel_fall" || actionType === "cancel_sos") {
      handleResetFall();
    } else if (actionType === "confirm_fall" || actionType === "confirm_sos") {
      handleTriggerFall();
      handleAutoDispatchEmergency();
    } else if (actionType === "trigger_sos") {
      setNotification({
        type: "sos_panic",
        title: "Emergency SOS Alert",
        description: "Avenly emergency dispatch activated."
      });
    } else if (actionType === "accept_call") {
      handleStartCall(payload?.contactName || "Preeti (Daughter)", "video");
      setNotification(null);
    } else if (actionType === "decline_call") {
      handleEndCall();
      setNotification(null);
    } else if (actionType === "trigger_voice_companion" || actionType === "open_ai_chat") {
      setActiveTab("AIChat");
    } else if (actionType === "open_chats") {
      setActiveTab("Chats");
    } else if (actionType === "open_calendar") {
      setActiveTab("Calendar");
    } else if (actionType === "open_medication") {
      setActiveTab("Medication");
    }
  };

  return (
    <div
      className="w-full h-[100dvh] bg-black flex items-center justify-center p-0 sm:p-4 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
    >
      <div
        id="operating-system-screen"
        className={`w-full h-full max-w-[1280px] sm:max-h-[92vh] sm:min-h-[700px] sm:rounded-[2.5rem] shadow-2xl overflow-hidden font-sans antialiased selection:bg-indigo-500/30 relative flex flex-col justify-between border border-white/10 grayscale ${
          fontSizeScale === "extraLarge" ? "text-scale-extra-large" : fontSizeScale === "large" ? "text-scale-large" : ""
        } ${isHighContrast ? "high-contrast-mode bg-black text-white" : "bg-black text-white"}`}
      >
          {/* ONBOARDING OVERLAY */}
          <AnimatePresence>
            {isOnboardingOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="absolute inset-0 z-50 bg-[#050609] flex flex-col justify-between"
              >
                <OnboardingView
                  initialProfile={userProfile}
                  onComplete={(p) => {
                    setUserProfile(p);
                    localStorage.setItem("avenly_user_profile", JSON.stringify(p));
                    localStorage.setItem("avenly_onboarded", "true");
                    setIsOnboardingOpen(false);
                  }}
                  onUpdateProfile={(p) => {
                    setUserProfile(p);
                    localStorage.setItem("avenly_user_profile", JSON.stringify(p));
                  }}
                  onCancel={() => setIsOnboardingOpen(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* STANDBY / INACTIVITY LOCK SCREEN OVERLAY */}
          <AnimatePresence>
            {isStandby && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50"
              >
                <StandbyScreen
                  vitals={vitals}
                  nextMedication={medications.find(m => m.status === "Upcoming")}
                  onWake={() => setIsStandby(false)}
                  systemTime={systemTime}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* SLIDE-DOWN CONTROL CENTER / SETTINGS DRAWER OVERLAY */}
          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-black/75 backdrop-blur-md flex flex-col justify-start"
                onClick={() => setIsSettingsOpen(false)}
              >
                <motion.div
                  initial={{ y: "-100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "-100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 300 }}
                  drag="y"
                  dragConstraints={{ top: -200, bottom: 0 }}
                  dragElastic={{ top: 0.5, bottom: 0 }}
                  onDragEnd={(e, info) => {
                    if (info.offset.y < -30 || info.velocity.y < -150) {
                      setIsSettingsOpen(false);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full h-[92vh] max-h-[850px] shadow-2xl relative rounded-b-[2.5rem] overflow-hidden border-b border-white/15"
                >
                  <SettingsView
                    onClose={() => setIsSettingsOpen(false)}
                    onTriggerOnboarding={() => {
                      setIsSettingsOpen(false);
                      setIsOnboardingOpen(true);
                    }}
                    onTriggerStandby={() => {
                      setIsSettingsOpen(false);
                      setIsStandby(true);
                    }}
                    onTriggerFall={handleTriggerFall}
                    standbyTimeout={standbyTimeout}
                    onUpdateStandbyTimeout={(m) => {
                      setStandbyTimeout(m);
                      localStorage.setItem("avenly_standby_timeout", String(m));
                    }}
                    userProfile={userProfile}
                    onUpdateProfile={(p) => {
                      setUserProfile(p);
                      localStorage.setItem("avenly_user_profile", JSON.stringify(p));
                    }}
                    onSendToChat={(txt) => {
                      setActiveTab("AIChat");
                      setIsSettingsOpen(false);
                    }}
                    isCaregiverMode={isCaregiverMode}
                    setIsCaregiverMode={setIsCaregiverMode}
                    fontSizeScale={fontSizeScale}
                    onUpdateFontSizeScale={(scale) => {
                      setFontSizeScale(scale);
                      localStorage.setItem("avenly_font_scale", scale);
                    }}
                    isHighContrast={isHighContrast}
                    onToggleHighContrast={() => {
                      const next = !isHighContrast;
                      setIsHighContrast(next);
                      localStorage.setItem("avenly_high_contrast", String(next));
                    }}
                    isSoundFeedback={isSoundFeedback}
                    onToggleSoundFeedback={() => {
                      const next = !isSoundFeedback;
                      setIsSoundFeedback(next);
                      localStorage.setItem("avenly_sound_feedback", String(next));
                    }}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FALL EMERGENCY OVERLAY (Pulsing Shield & Real-time Countdown) */}
          {vitals.isFallDetected && (
            <div className="absolute inset-0 bg-[#0c0202]/98 z-50 flex flex-col justify-between p-8 animate-fadeIn select-none border border-red-900/50 rounded-[24px]">
              {/* Flashing top border */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-pulse" />
              
              <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                {/* Large Pulsing Alert Beacon */}
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-red-600/30 rounded-full blur-xl scale-125 animate-ping" />
                  <div className="w-16 h-16 rounded-full bg-red-900/50 border-2 border-red-500 flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                </div>

                <h2 className="text-2xl font-extrabold font-display tracking-tight text-white mb-1.5 uppercase animate-pulse">
                  Fall Detected
                </h2>
                
                <p className="text-zinc-300 text-xs leading-relaxed mb-4">
                  Avenly's protective wrist mesh registered a sudden velocity delta and orientation change near the kitchen.
                </p>

                {/* Animated Oversized Circular Countdown */}
                <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                  {/* Circular progress bar SVG */}
                  <svg className="w-full h-full transform -rotate-90 absolute" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="rgba(239,68,68,0.08)"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="#ef4444"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - fallCountdown / 30)}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="flex flex-col items-center z-10">
                    <span className="text-3xl font-black font-mono text-white tracking-tighter">
                      {fallCountdown}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                      Seconds
                    </span>
                  </div>
                </div>

                <p className="text-zinc-400 text-xs font-mono uppercase tracking-wider animate-pulse text-red-400">
                  Auto dispatching paramedics in {fallCountdown}s
                </p>
              </div>

              {/* High-impact easy-to-tap touch buttons suitable for Pi 7" display */}
              <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto w-full z-10 shrink-0">
                <button
                  onClick={handleResetFall}
                  className="py-3 bg-[#14151a] hover:bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs uppercase rounded-2xl tracking-wider transition-all shadow-md active:scale-98 cursor-pointer flex flex-col items-center justify-center gap-0.5"
                >
                  <span className="text-[10px] text-zinc-500 font-mono">Dismiss Incident</span>
                  <span>I AM OKAY</span>
                </button>
                <button
                  onClick={() => {
                    handleStartCall("Avenly Emergency Response Team", "video");
                    handleAutoDispatchEmergency();
                  }}
                  className="py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase rounded-2xl tracking-widest transition-all shadow-[0_10px_25px_rgba(239,68,68,0.3)] active:scale-98 cursor-pointer animate-pulse flex flex-col items-center justify-center gap-0.5 border border-red-400/20"
                >
                  <span className="text-[10px] text-red-100/75 font-mono">Call 911 + Preeti</span>
                  <span>I NEED HELP</span>
                </button>
              </div>
            </div>
          )}

          {/* Ambient Futuristic Background Orbs */}
          <div className="absolute top-[-10%] right-[-5%] w-[420px] h-[420px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: "12s" }} />
          <div className="absolute bottom-[-10%] left-[-5%] w-[380px] h-[380px] bg-blue-500/10 rounded-full blur-[90px] pointer-events-none animate-pulse" style={{ animationDuration: "15s" }} />

          {/* SHARED LAYOUT CONTAINER */}
          <div className="w-full h-full flex flex-col pt-[24px] px-[24px] relative overflow-hidden">
            
            {/* Global SOS Button (Always reachable from any screen without navigating away) */}
            <button 
              onClick={() => {
                playAudioFeedback("warning");
                setIsSOSConfirmOpen(true);
              }}
              className="absolute bottom-[100px] right-6 z-40 w-16 h-16 bg-red-600 hover:bg-red-500 rounded-full shadow-[0_4px_25px_rgba(220,38,38,0.5)] border-2 border-red-400 flex flex-col items-center justify-center text-white active:scale-95 transition-all cursor-pointer touch-target-senior"
              title="Emergency SOS - Tap for Help"
            >
               <ShieldAlert className="w-7 h-7 animate-pulse" />
               <span className="text-[9px] font-black uppercase tracking-wider">SOS</span>
            </button>

            {/* EMERGENCY SOS CONFIRMATION DIALOG */}
            <AnimatePresence>
              {isSOSConfirmOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
                  onClick={() => setIsSOSConfirmOpen(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#180808] border-3 border-red-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl space-y-6"
                  >
                    <div className="w-20 h-20 bg-red-600/30 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto text-red-400 animate-pulse">
                      <ShieldAlert className="w-10 h-10" />
                    </div>

                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
                        Emergency Help Confirmation
                      </h2>
                      <p className="text-sm sm:text-base text-zinc-200 mt-2 leading-relaxed">
                        Do you want Avenly to call <strong>911 Emergency Services</strong> and notify your emergency contacts right now?
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={() => {
                          setIsSOSConfirmOpen(false);
                          playAudioFeedback("warning");
                          handleStartCall("Avenly Emergency Response Team", "video");
                          handleAutoDispatchEmergency();
                        }}
                        className="min-h-[58px] flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-black text-sm sm:text-base uppercase rounded-2xl tracking-wider shadow-lg shadow-red-900/50 border border-red-400 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Phone className="w-5 h-5" />
                        <span>YES, CALL HELP NOW</span>
                      </button>
                      <button
                        onClick={() => {
                          playAudioFeedback("tap");
                          setIsSOSConfirmOpen(false);
                        }}
                        className="min-h-[58px] flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm sm:text-base uppercase rounded-2xl border-2 border-white/20 active:scale-95 transition-all cursor-pointer"
                      >
                        NO, I AM SAFE
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top header row: Dynamic Island and Status Bar inline or stacked */}
            <div className="w-full flex flex-col relative z-40 shrink-0">
              <DynamicIsland
                notification={notification}
                onClear={() => setNotification(null)}
                onAction={handleDynamicIslandAction}
                systemTime={localizeDataString(systemTime || "09:41 AM", t, getLocaleCode(userProfile?.language))}
                isOffline={!deviceState.hubConnected || !deviceState.wifi}
                hasUnreadMessage={false}
                nextMedicationText={medications.find(m => m.status === "Upcoming") ? `${medications.find(m => m.status === "Upcoming")?.name} ${medications.find(m => m.status === "Upcoming")?.time}` : undefined}
                onOpenSOS={() => {
                  playAudioFeedback("warning");
                  setIsSOSConfirmOpen(true);
                }}
                onOpenAI={() => setActiveTab("AIChat")}
                onOpenChats={() => setActiveTab("Chats")}
                onOpenCalendar={() => setActiveTab("Calendar")}
                onOpenMedication={() => setActiveTab("Medication")}
              />

              <motion.div
                id="screen-status-bar"
                className="w-full flex items-center justify-between text-[11px] font-semibold text-zinc-300 font-sans select-none bg-transparent transition-colors duration-300 absolute top-0 pointer-events-auto"
              >
                {/* Left: Clock */}
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold tracking-tight text-sm">
                    {localizeDataString(systemTime || "09:41 AM", t, getLocaleCode(userProfile?.language))}
                  </span>
                </div>

                {/* Top Pull Down Drag Handle Bar (Centered) */}
                <motion.div
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 80 }}
                  dragElastic={0.4}
                  onDragEnd={(e, info) => {
                    if (info.offset.y > 20 || info.velocity.y > 100) {
                      setIsSettingsOpen(true);
                    }
                  }}
                  onClick={() => {
                    playAudioFeedback("tap");
                    setIsSettingsOpen(!isSettingsOpen);
                  }} 
                  className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing group py-1 px-8 z-40 touch-none"
                  title="Drag down or tap to open Control Center & Hardware Lab"
                >
                  <div className="w-24 h-1.5 bg-white/30 group-hover:bg-cyan-400/90 rounded-full transition-all shadow-md backdrop-blur-md" />
                  <span className="text-[8px] uppercase tracking-wider text-zinc-300 font-mono flex items-center gap-1 mt-0.5 whitespace-nowrap bg-black/50 px-2.5 py-0.5 rounded-full border border-white/10 opacity-80 group-hover:opacity-100 transition-opacity">
                    {isSettingsOpen ? `▲ ${t.pullUp}` : `▼ Tap for Settings & Accessibility`}
                  </span>
                </motion.div>

                {/* Right: Quick Accessibility Bar */}
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-200">
                  <button
                    onClick={() => {
                      playAudioFeedback("tap");
                      const next = fontSizeScale === "standard" ? "large" : fontSizeScale === "large" ? "extraLarge" : "standard";
                      setFontSizeScale(next);
                      localStorage.setItem("avenly_font_scale", next);
                    }}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/15 font-mono font-bold flex items-center gap-1 cursor-pointer"
                    title="Change Text Size"
                  >
                    <span>A{fontSizeScale === "large" ? "+" : fontSizeScale === "extraLarge" ? "++" : ""}</span>
                  </button>
                  <button
                    onClick={() => {
                      playAudioFeedback("tap");
                      const next = !isHighContrast;
                      setIsHighContrast(next);
                      localStorage.setItem("avenly_high_contrast", String(next));
                    }}
                    className={`px-2 py-1 rounded-lg border font-bold flex items-center gap-1 cursor-pointer ${
                      isHighContrast ? "bg-amber-400 text-black border-amber-300" : "bg-white/10 text-white border-white/15"
                    }`}
                    title="Toggle High Contrast"
                  >
                    <span>◐</span>
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Gap before content */}
            <div className="h-[14px] shrink-0" />

            {/* UNIVERSAL VOICE ACTIVATED & NAVIGATED ENGINE */}
            <VoiceNavigator
              activeTab={activeTab}
              onNavigate={handleVoiceNavigate}
              vitals={vitals}
              medications={medications}
              userLanguage={userProfile?.language}
              onLogHydration={handleTrackHydration}
              onMarkMedicationTaken={handleMarkMedicationTakenByVoice}
              onTriggerSOS={() => {
                playAudioFeedback("warning");
                setIsSOSConfirmOpen(true);
              }}
              onOpenSettings={() => {
                playAudioFeedback("tap");
                setIsSettingsOpen(true);
              }}
              onToggleHighContrast={() => {
                playAudioFeedback("tap");
                const next = !isHighContrast;
                setIsHighContrast(next);
                localStorage.setItem("avenly_high_contrast", String(next));
              }}
              onChangeFontSize={() => {
                playAudioFeedback("tap");
                const next = fontSizeScale === "standard" ? "large" : fontSizeScale === "large" ? "extraLarge" : "standard";
                setFontSizeScale(next);
                localStorage.setItem("avenly_font_scale", next);
              }}
              onAskAI={handleAskAIByVoice}
              isHighContrast={isHighContrast}
            />

            {/* PERSISTENT SENIOR BACK BAR (WHEN ON ANY SUB-SCREEN) */}
            {activeTab !== "Home" && (
              <div className="w-full flex items-center justify-between pb-2 mb-1 px-1 border-b border-white/15 shrink-0 animate-fadeIn">
                <button
                  onClick={() => {
                    playAudioFeedback("back");
                    setActiveTab("Home");
                  }}
                  className="min-h-[48px] px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl border-2 border-amber-400/50 text-sm sm:text-base font-bold flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer touch-target-senior"
                >
                  <ArrowLeft className="w-5 h-5 text-amber-400" />
                  <span>← Back to Home</span>
                </button>
                <div className="text-xs text-zinc-300 font-bold uppercase tracking-wider font-mono">
                  Viewing: <span className="text-amber-400 font-black">{activeTab}</span>
                </div>
              </div>
            )}

            {/* SCREEN ACTIVE PORT VIEWER (Tab render with horizontal swipe gesture & scrollable viewport) */}
            <div
              id="screen-active-viewer"
              onTouchStart={handleScreenTouchStart}
              onTouchEnd={handleScreenTouchEnd}
              className="flex-1 relative overflow-y-auto no-scrollbar pb-[140px]"
            >
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: swipeDirection === "left" ? 40 : swipeDirection === "right" ? -40 : 0 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="w-full h-full"
              >
                {activeTab === "Home" && (
                  <HomeDashboard
                    vitals={vitals}
                    medications={medications}
                    userProfile={userProfile}
                    onNavigate={(tab) => {
                      playAudioFeedback("tap");
                      setActiveTab(tab);
                    }}
                    onHydrate={handleTrackHydration}
                  />
                )}
                {activeTab === "Health" && (
                  <HealthStatus
                    vitals={vitals}
                    userName={userProfile?.fullName}
                    userLanguage={userProfile?.language}
                    onHydrate={handleTrackHydration}
                    onTriggerFall={handleTriggerFall}
                    onResetFall={handleResetFall}
                  />
                )}
                {activeTab === "Calendar" && <CalendarView userLanguage={userProfile?.language} doctorName={userProfile?.primaryDoctor?.name} />}
                {activeTab === "Chats" && <ChatsView userLanguage={userProfile?.language} />}
                {activeTab === "Entertainment" && <Entertainment userLanguage={userProfile?.language} />}
                {activeTab === "AIChat" && (
                  <AIChat
                    userName={userProfile?.fullName}
                    userLanguage={userProfile?.language}
                    initialQuery={aiInitialQuery || undefined}
                    onClearInitialQuery={() => setAiInitialQuery(null)}
                    onStartSpeech={() => {
                      setNotification({
                        type: "ai_assistant",
                        title: t.speaking,
                        description: "AI companion is answering your health and scheduling questions.",
                        payload: { aiPhase: "speaking" }
                      });
                    }}
                    onStopSpeech={() => {
                      setNotification(null);
                    }}
                    onSyncVitals={fetchVitals}
                    onBack={() => {
                      playAudioFeedback("back");
                      setActiveTab("Home");
                    }}
                  />
                )}
                {activeTab === "Medication" && (
                  <MedicationView
                    medications={medications}
                    onDispense={handleDispenseMedication}
                    onResetMeds={handleResetMedications}
                    onRefill={fetchMedications}
                    userName={userProfile?.fullName}
                    userLanguage={userProfile?.language}
                    caregiverName={userProfile?.emergencyContact?.name}
                    isCaregiverMode={isCaregiverMode}
                  />
                )}
                {activeTab === "Calls" && (
                  <CallsView
                    callState={callState}
                    userLanguage={userProfile?.language}
                    userProfile={userProfile}
                    onStartCall={handleStartCall}
                    onEndCall={handleEndCall}
                    isCaregiverMode={isCaregiverMode}
                  />
                )}
              </motion.div>
            </div>

            {/* AVENLYOS FLOATING GLASS NAVIGATION DOCK WITH LABELS (INSIDE SCREEN, ALWAYS VISIBLE OVERLAPPING) */}
            <div
              id="persistent-navigation-dock"
              className="absolute bottom-0 inset-x-0 pb-3 pt-2 z-30 flex justify-center pointer-events-none px-3 sm:px-6"
            >
              <nav className="pointer-events-auto bg-zinc-950/95 backdrop-blur-2xl border-2 border-white/20 shadow-2xl rounded-[2.2rem] px-3 sm:px-5 py-2 flex items-center justify-center gap-1.5 sm:gap-2.5 max-w-full sm:max-w-4xl transition-all duration-300 min-w-0">
                {/* Home */}
                <button
                  onClick={() => {
                    playAudioFeedback("tap");
                    setActiveTab("Home");
                  }}
                  className={`min-h-[54px] flex flex-col items-center justify-center px-3 sm:px-4 py-1.5 rounded-2xl transition-all duration-300 active:scale-95 shrink-0 min-w-0 cursor-pointer touch-target-senior ${
                    activeTab === "Home"
                      ? "bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-lg shadow-orange-950/40 border-2 border-amber-300 font-black"
                      : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 font-semibold"
                  }`}
                  title="Home Dashboard"
                >
                  <HomeIcon className="w-5 h-5 mb-0.5 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold tracking-tight whitespace-nowrap truncate max-w-[55px] sm:max-w-none">{t.tabHome}</span>
                </button>

                {/* Health */}
                <button
                  onClick={() => {
                    playAudioFeedback("tap");
                    setActiveTab("Health");
                  }}
                  className={`min-h-[54px] flex flex-col items-center justify-center px-3 sm:px-4 py-1.5 rounded-2xl transition-all duration-300 active:scale-95 shrink-0 min-w-0 cursor-pointer touch-target-senior ${
                    activeTab === "Health"
                      ? "bg-gradient-to-tr from-rose-500 to-red-400 text-white shadow-lg shadow-red-950/40 border-2 border-rose-300 font-black"
                      : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 font-semibold"
                  }`}
                  title="Health Status"
                >
                  <Heart className="w-5 h-5 mb-0.5 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold tracking-tight whitespace-nowrap truncate max-w-[55px] sm:max-w-none">{t.tabHealth}</span>
                </button>

                {/* Calendar */}
                <button
                  onClick={() => {
                    playAudioFeedback("tap");
                    setActiveTab("Calendar");
                  }}
                  className={`min-h-[54px] flex flex-col items-center justify-center px-3 sm:px-4 py-1.5 rounded-2xl transition-all duration-300 active:scale-95 shrink-0 min-w-0 cursor-pointer touch-target-senior ${
                    activeTab === "Calendar"
                      ? "bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-950/40 border-2 border-blue-300 font-black"
                      : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 font-semibold"
                  }`}
                  title="Google Calendar Appointments"
                >
                  <CalendarIcon className="w-5 h-5 mb-0.5 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold tracking-tight whitespace-nowrap truncate max-w-[55px] sm:max-w-none">{t.tabCalendar}</span>
                </button>

                {/* Chats */}
                <button
                  onClick={() => {
                    playAudioFeedback("tap");
                    setActiveTab("Chats");
                  }}
                  className={`min-h-[54px] flex flex-col items-center justify-center px-3 sm:px-4 py-1.5 rounded-2xl transition-all duration-300 active:scale-95 shrink-0 min-w-0 cursor-pointer touch-target-senior ${
                    activeTab === "Chats"
                      ? "bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-950/40 border-2 border-purple-300 font-black"
                      : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 font-semibold"
                  }`}
                  title="Google Chat Space"
                >
                  <MessageSquare className="w-5 h-5 mb-0.5 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold tracking-tight whitespace-nowrap truncate max-w-[55px] sm:max-w-none">{t.tabChats}</span>
                </button>

                {/* Entertainment */}
                <button
                  onClick={() => {
                    playAudioFeedback("tap");
                    setActiveTab("Entertainment");
                  }}
                  className={`min-h-[54px] flex flex-col items-center justify-center px-3 sm:px-4 py-1.5 rounded-2xl transition-all duration-300 active:scale-95 shrink-0 min-w-0 cursor-pointer touch-target-senior ${
                    activeTab === "Entertainment"
                      ? "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-950/40 border-2 border-indigo-300 font-black"
                      : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 font-semibold"
                  }`}
                  title="Entertainment Apps"
                >
                  <Sparkles className="w-5 h-5 mb-0.5 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold tracking-tight whitespace-nowrap truncate max-w-[55px] sm:max-w-none">{t.tabEntertainment}</span>
                </button>

                {/* AI Chat */}
                <button
                  onClick={() => {
                    playAudioFeedback("tap");
                    setActiveTab("AIChat");
                  }}
                  className={`min-h-[54px] flex flex-col items-center justify-center px-3 sm:px-4 py-1.5 rounded-2xl transition-all duration-300 active:scale-95 shrink-0 min-w-0 cursor-pointer touch-target-senior ${
                    activeTab === "AIChat"
                      ? "bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500 text-white shadow-lg shadow-indigo-950/40 border-2 border-violet-300 font-black"
                      : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 font-semibold"
                  }`}
                  title="Avenly Assistant"
                >
                  <MessageCircle className="w-5 h-5 mb-0.5 text-purple-200 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold tracking-tight whitespace-nowrap truncate max-w-[55px] sm:max-w-none">{t.tabAI}</span>
                </button>

                {/* Medication */}
                <button
                  onClick={() => {
                    playAudioFeedback("tap");
                    setActiveTab("Medication");
                  }}
                  className={`min-h-[54px] flex flex-col items-center justify-center px-3 sm:px-4 py-1.5 rounded-2xl transition-all duration-300 active:scale-95 shrink-0 min-w-0 cursor-pointer touch-target-senior ${
                    activeTab === "Medication"
                      ? "bg-gradient-to-tr from-cyan-500 to-blue-500 text-white shadow-lg shadow-blue-950/40 border-2 border-cyan-300 font-black"
                      : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 font-semibold"
                  }`}
                  title="Medication Tracker"
                >
                  <Pill className="w-5 h-5 mb-0.5 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold tracking-tight whitespace-nowrap truncate max-w-[55px] sm:max-w-none">{t.tabMedication}</span>
                </button>

                {/* Calls */}
                <button
                  onClick={() => {
                    playAudioFeedback("tap");
                    setActiveTab("Calls");
                  }}
                  className={`min-h-[54px] flex flex-col items-center justify-center px-3 sm:px-4 py-1.5 rounded-2xl transition-all duration-300 active:scale-95 shrink-0 min-w-0 cursor-pointer touch-target-senior ${
                    activeTab === "Calls"
                      ? "bg-gradient-to-tr from-emerald-500 to-green-400 text-white shadow-lg shadow-emerald-950/40 border-2 border-emerald-300 font-black"
                      : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 font-semibold"
                  }`}
                  title="Video Calls"
                >
                  <Phone className="w-5 h-5 mb-0.5 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold tracking-tight whitespace-nowrap truncate max-w-[55px] sm:max-w-none">{t.tabCalls}</span>
                </button>
              </nav>
            </div>
          </div>
          {/* END SHARED LAYOUT CONTAINER */}
      </div>
    </div>
  );
}
