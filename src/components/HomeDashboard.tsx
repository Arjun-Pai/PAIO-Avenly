import { useState, useEffect } from "react";
import { 
  Heart, 
  Pill, 
  Footprints, 
  Moon, 
  Droplets, 
  Smile, 
  ChevronRight, 
  Activity as ActivityIcon, 
  User, 
  Volume2, 
  CheckCircle2, 
  Thermometer,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Phone,
  MessageCircle,
  Calendar as CalendarIcon
} from "lucide-react";
import { VitalsState, MedicationItem, UserProfile } from "../types";
import { getTranslation, getLocaleCode, formatNumberToLocale, localizeDataString } from "../lib/translations";
import { playAudioFeedback, speakText, stopSpeaking } from "../lib/audioFeedback";
import config from "../config.json";

interface HomeDashboardProps {
  vitals: VitalsState;
  medications: MedicationItem[];
  userProfile?: UserProfile;
  checkedInToday?: boolean;
  onCheckIn?: () => void;
  onOpenSymptomLogger?: () => void;
  onReadScreen?: () => void;
  onNavigate: (tab: "Health" | "Medication" | "AIChat" | "Calls" | "Calendar" | "Entertainment") => void;
  onHydrate: () => void;
}

export default function HomeDashboard({
  vitals,
  medications,
  userProfile,
  checkedInToday = false,
  onCheckIn,
  onOpenSymptomLogger,
  onReadScreen,
  onNavigate,
  onHydrate,
}: HomeDashboardProps) {
  const [timeStr, setTimeStr] = useState("10:28 AM");
  const [dateStr, setDateStr] = useState("");
  const [periodStr, setPeriodStr] = useState("Morning");
  const [greeting, setGreeting] = useState("Good Morning");
  const isOnline = config.hubConnected ?? true;

  const t = getTranslation(userProfile?.language);
  const localeCode = getLocaleCode(userProfile?.language);

  const displayName = userProfile?.fullName ? userProfile.fullName.trim().split(" ")[0] : "";

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      // Formatting time
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? (t.pmString || "PM") : (t.amString || "AM");
      hours = hours % 12 || 12; // convert to 12h format
      setTimeStr(`${hours}:${minutes} ${ampm}`);

      // Formatting date according to locale
      const options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };
      setDateStr(now.toLocaleDateString(localeCode, options));

      // Dementia-friendly period calculation (e.g. Friday Morning, Thursday Afternoon)
      const dayName = now.toLocaleDateString(localeCode, { weekday: "long" });
      const hr = now.getHours();
      let p = "Morning";
      if (hr >= 12 && hr < 17) p = "Afternoon";
      else if (hr >= 17 && hr < 21) p = "Evening";
      else if (hr >= 21 || hr < 5) p = "Night";
      setPeriodStr(`${dayName} ${p}`);

      // Greeting based on time
      if (hr < 12) setGreeting(t.greetingMorning);
      else if (hr < 17) setGreeting(t.greetingAfternoon);
      else setGreeting(t.greetingEvening);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [localeCode, userProfile?.language]);

  // Compute Health Score
  const hr = Number(vitals.heartRate);
  const spo2 = Number(vitals.bloodOxygen);
  
  let healthScore = 0;
  let healthStatus = t.notAvailable || "N/A";
  let healthDesc = t.noHealthData || "No health data recorded yet.";
  
  if (vitals.isFallDetected) {
    healthStatus = `${t.fallDetectorTitle}`;
    healthDesc = t.emergencyAttentionDesc || t.fallDetectedAlert;
    healthScore = 0;
  } else if (!isNaN(hr) && !isNaN(spo2)) {
    healthScore = Math.max(0, 100 - (Math.abs(hr - 70) * 0.5) - (Math.abs(spo2 - 98) * 2));
    if (healthScore < 70) {
      healthStatus = t.needsAttention;
      healthDesc = t.needsAttention;
    } else if (healthScore < 85) {
      healthStatus = t.goodHealth;
      healthDesc = t.goodHealth;
    } else {
      healthStatus = t.excellentHealth;
      healthDesc = t.goodHealthDesc || "All vital ranges normal";
    }
  }

  // Find the next upcoming medication
  const nextMed = medications.find(m => m.status === "Upcoming") || medications.find(m => m.status === "Pending") || medications[0];

  const handleReadDashboardAloud = () => {
    playAudioFeedback("chime");
    const summary = `${greeting} ${displayName || "there"}. Today is ${periodStr}, ${dateStr}. The current time is ${timeStr}. Your health status is ${healthStatus}. ${nextMed ? `Your next medication is ${nextMed.name} scheduled for ${nextMed.time}.` : "You have no upcoming medications scheduled."}`;
    speakText(summary, userProfile?.language === "Spanish" ? "es-ES" : "en-US");
  };

  return (
    <div className="w-full h-full flex flex-col justify-between select-none overflow-hidden">
      
      {/* Top Profile Greetings Bar & Accessibility Controls */}
      <div className="flex items-center justify-between pb-3 min-w-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative cursor-pointer shrink-0">
            {userProfile?.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt="Profile Avatar"
                className="w-14 h-14 rounded-full border-2 border-white/20 object-cover shadow-xl transition-all duration-300 hover:scale-105"
              />
            ) : (
              <div className="w-14 h-14 rounded-full border-2 border-white/20 bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-xl">
                <User className="w-7 h-7" />
              </div>
            )}
            <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#050609] ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase font-mono">{t.appTitle}</span>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 truncate">
              {greeting}{displayName ? `, ${displayName}` : ""}
            </h2>
          </div>
        </div>

        {/* Top Right Ergonomic Action Pills */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Daily "I'm OK" Check-in Button */}
          {onCheckIn && (
            <button
              onClick={() => {
                playAudioFeedback("success");
                onCheckIn();
              }}
              className={`min-h-[48px] px-5 rounded-2xl flex items-center gap-2.5 font-bold text-xs sm:text-sm tracking-tight transition-all duration-300 shadow-lg active:scale-95 cursor-pointer ${
                checkedInToday
                  ? "bg-emerald-950/60 text-emerald-200 border-2 border-emerald-500/60"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-900/30 animate-pulse border-2 border-amber-300/40"
              }`}
              title="Reassure your family with daily check-in"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{checkedInToday ? "I'm OK (Checked In)" : "Daily Check-In: I'm OK"}</span>
            </button>
          )}

          {/* Symptom Logger Button */}
          {onOpenSymptomLogger && (
            <button
              onClick={() => {
                playAudioFeedback("tap");
                onOpenSymptomLogger();
              }}
              className="min-h-[48px] px-4 bg-white/10 hover:bg-white/20 text-white border-2 border-white/20 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-md cursor-pointer"
              title="Log how you feel today"
            >
              <Smile className="w-5 h-5 text-emerald-400" />
              <span className="hidden sm:inline">How I Feel</span>
            </button>
          )}

          {/* Audio Description / Read Screen aloud */}
          <button
            onClick={handleReadDashboardAloud}
            className="min-h-[48px] min-w-[48px] px-3.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border-2 border-indigo-500/40 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-md cursor-pointer"
            title="Read screen aloud (Voice Summary for low-vision)"
          >
            <Volume2 className="w-5 h-5 text-indigo-300" />
            <span className="sr-only">Read Aloud</span>
          </button>
        </div>
      </div>

      {/* Center Layout with Oversized Typographic Dementia-Friendly Clock & Side Widgets */}
      <div className="flex-1 grid grid-cols-12 gap-6 items-center my-4 relative min-w-0">
        
        {/* Left Side Widget: Health Status Card */}
        <div
          onClick={() => {
            playAudioFeedback("tap");
            onNavigate("Health");
          }}
          className={`col-span-3 h-full bg-white/5 backdrop-blur-xl hover:bg-white/15 rounded-[2rem] p-5 sm:p-6 flex flex-col justify-between cursor-pointer border-2 transition-all duration-300 ease-out hover:scale-[1.02] shadow-xl min-w-0 ${
            vitals.isFallDetected 
              ? "border-red-500 bg-red-950/40 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.4)]" 
              : "border-white/15 hover:border-rose-400/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              vitals.isFallDetected ? "bg-red-500 text-white" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
            }`}>
              <Heart className={`w-6 h-6 ${vitals.isFallDetected ? "fill-white animate-bounce" : "fill-rose-400/30"}`} />
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
          </div>
          <div className="mt-4 flex flex-col gap-1.5 min-w-0">
            <span className="text-xs text-zinc-300 font-bold uppercase tracking-wider">{t.healthActivity}</span>
            <h3 className={`text-xl sm:text-2xl font-black truncate ${
              vitals.isFallDetected ? "text-red-400 uppercase tracking-tight" : "text-emerald-400"
            }`}>
              {healthStatus}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed line-clamp-2">
              {healthDesc}
            </p>
          </div>
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden mt-4 border border-white/10">
            <div className={`h-full rounded-full ${
              vitals.isFallDetected ? "w-full bg-red-500 animate-pulse" : "bg-emerald-400 transition-all duration-1000"
            }`} style={{ width: vitals.isFallDetected ? "100%" : (healthStatus === "N/A" ? "0%" : `${healthScore}%`) }} />
          </div>
        </div>

        {/* Center: Beautiful Oversized Dementia-Friendly Clock Display */}
        <div className="col-span-6 flex flex-col items-center justify-center text-center h-full relative px-6 py-4 min-w-0">
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-4/5 h-24 bg-gradient-to-t from-purple-500/15 to-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />
          
          {/* Dementia-Friendly Day & Period Header (e.g. Friday Morning) */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-indigo-600/30 border-2 border-indigo-400/40 text-indigo-200 text-sm sm:text-base font-black tracking-wide uppercase mb-2 shadow-lg backdrop-blur-md">
            <span>{periodStr}</span>
          </div>

          <h1 className="text-6xl lg:text-8xl font-black tracking-tight text-white my-1 select-text drop-shadow-2xl flex items-baseline justify-center">
            {formatNumberToLocale(timeStr.split(" ")[0], localeCode)}
            <span className="text-2xl lg:text-3xl font-bold tracking-normal text-zinc-300 ml-2">
              {timeStr.split(" ")[1]}
            </span>
          </h1>

          <p className="text-zinc-100 text-sm sm:text-base font-bold tracking-wide bg-white/10 backdrop-blur-lg px-6 py-2.5 rounded-full border-2 border-white/20 shadow-xl mt-2 max-w-full truncate">
            {formatNumberToLocale(dateStr, localeCode)}
          </p>
        </div>

        {/* Right Side Widget: Next Medication Card */}
        <div
          onClick={() => {
            playAudioFeedback("tap");
            onNavigate("Medication");
          }}
          className="col-span-3 h-full bg-white/5 backdrop-blur-xl hover:bg-white/15 rounded-[2rem] p-5 sm:p-6 flex flex-col justify-between cursor-pointer border-2 border-white/15 hover:border-cyan-400/50 shadow-xl hover:scale-[1.02] transition-all duration-300 ease-out min-w-0"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0 shadow-md">
              <Pill className="w-6 h-6" />
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
          </div>
          <div className="mt-4 flex flex-col gap-1.5 min-w-0">
            <span className="text-xs text-zinc-300 font-bold uppercase tracking-wider">{t.nextMedication}</span>
            <h3 className="text-lg sm:text-xl font-black text-cyan-300 break-words line-clamp-2">
              {nextMed ? nextMed.name : t.noneScheduled}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-200 font-bold truncate">
              {nextMed ? localizeDataString(`${nextMed.time} (${nextMed.instructions || t.oneTablet || "1 tablet"})`, t, localeCode) : ""}
            </p>
            <span className="inline-block self-start text-xs text-purple-300 font-mono font-black bg-purple-500/20 px-3 py-1 rounded-full mt-1 border border-purple-400/40 truncate max-w-full shadow-sm">
              {nextMed ? nextMed.status : t.allClear}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Status Widgets Row (Sleep, Hydration, Activity, Mood, Climate & Room) */}
      <div className="grid grid-cols-5 gap-4 my-1 min-w-0">
        {/* Sleep Widget */}
        <div className="bg-white/5 backdrop-blur-xl border-2 border-white/10 rounded-2xl p-3.5 flex items-center gap-3 min-w-0 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
            <Moon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-zinc-300 font-bold uppercase block truncate">{t.sleep}</span>
            <span className="text-sm font-black text-white block truncate">{localizeDataString(vitals.sleep, t, localeCode)}</span>
            <span className="text-[9px] text-indigo-300 block font-mono font-bold truncate">
              {vitals.sleep === "N/A" ? t.waitingForData : t.restfulData}
            </span>
          </div>
        </div>

        {/* Hydration Widget */}
        <div className="bg-white/5 backdrop-blur-xl border-2 border-white/10 rounded-2xl p-3.5 flex items-center justify-between min-w-0 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
              <Droplets className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-zinc-300 font-bold uppercase block truncate">{t.hydration}</span>
              <span className="text-sm font-black text-white block truncate">{localizeDataString(vitals.hydration, t, localeCode)}</span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              playAudioFeedback("success");
              onHydrate();
            }}
            className="min-h-[44px] px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl border border-blue-400 shadow-md transition-all shrink-0 ml-1 active:scale-95 cursor-pointer"
            title="Log Water (+0.25L)"
          >
            +{formatNumberToLocale("0.25", localeCode)}L
          </button>
        </div>

        {/* Activity Widget */}
        <div 
          onClick={() => {
            playAudioFeedback("tap");
            onNavigate("Health");
          }}
          className="bg-white/5 backdrop-blur-xl border-2 border-white/10 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer hover:bg-white/15 transition-colors min-w-0 shadow-md"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
            <Footprints className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-zinc-300 font-bold uppercase block truncate">{t.dailySteps}</span>
            <span className="text-sm font-black text-white block truncate">{localizeDataString(vitals.steps, t, localeCode)}</span>
            <span className="text-[9px] text-amber-300 block font-mono font-bold truncate">
              {vitals.steps === "N/A" ? t.waitingForData : localizeDataString(t.targetSteps || "Target: 5,000", t, localeCode)}
            </span>
          </div>
        </div>

        {/* Room Climate & Temperature */}
        <div className="bg-white/5 backdrop-blur-xl border-2 border-white/10 rounded-2xl p-3.5 flex items-center gap-3 min-w-0 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
            <Thermometer className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-zinc-300 font-bold uppercase block truncate">Room Temp</span>
            <span className="text-sm font-black text-white block truncate">{vitals.roomTemperature || 72}°F (22°C)</span>
            <span className="text-[9px] text-emerald-300 block font-mono font-bold truncate">
              Comfort Range Safe
            </span>
          </div>
        </div>

        {/* AI Companion Status Widget */}
        <div 
          onClick={() => {
            playAudioFeedback("tap");
            onNavigate("AIChat");
          }}
          className="bg-white/5 backdrop-blur-xl border-2 border-white/10 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer hover:bg-white/15 transition-colors min-w-0 shadow-md"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center shrink-0">
            <ActivityIcon className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-zinc-300 font-bold uppercase block truncate">{t.aiCompanion}</span>
            <span className="text-sm font-black text-purple-300 block truncate">{t.avenlyReady}</span>
            <span className="text-[9px] text-purple-300 block font-mono font-bold truncate">{t.voiceChatActive}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

