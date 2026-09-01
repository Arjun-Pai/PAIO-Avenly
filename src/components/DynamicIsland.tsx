import React, { useState, useEffect, useRef } from "react";
import {
  Pill,
  Phone,
  ShieldAlert,
  Sparkles,
  X,
  Check,
  Volume2,
  AlertTriangle,
  RotateCw,
  MessageSquare,
  Calendar as CalendarIcon,
  WifiOff,
  BellRing,
  HelpCircle,
  PhoneCall,
  PhoneOff,
  Radio,
  Clock,
  ArrowRight,
  RefreshCw,
  Flame,
  CheckCircle2,
  Mic,
  Cpu
} from "lucide-react";
import { DynamicIslandNotification, DynamicIslandState } from "../types";

interface DynamicIslandProps {
  notification: DynamicIslandNotification | null;
  onClear: () => void;
  onAction: (actionType: string, payload?: any) => void;
  systemTime?: string;
  isOffline?: boolean;
  hasUnreadMessage?: boolean;
  nextMedicationText?: string;
  onOpenSOS?: () => void;
  onOpenAI?: () => void;
  onOpenChats?: () => void;
  onOpenCalendar?: () => void;
  onOpenMedication?: () => void;
}

// Priority values (higher number = higher priority)
const PRIORITY_MAP: Record<DynamicIslandState, number> = {
  sos_panic: 100,
  missed_dose: 90,
  medication_reminder: 85,
  incoming_call: 80,
  dispense_in_progress: 70,
  refill_reminder: 60,
  caregiver_message: 50,
  calendar_reminder: 40,
  system_status: 30,
  onboarding_tip: 25,
  ai_assistant: 20,
  idle: 10
};

export default function DynamicIsland({
  notification,
  onClear,
  onAction,
  systemTime = "09:41 AM",
  isOffline = false,
  hasUnreadMessage = false,
  nextMedicationText,
  onOpenSOS,
  onOpenAI,
  onOpenChats,
  onOpenCalendar,
  onOpenMedication
}: DynamicIslandProps) {
  const [sosCountdown, setSosCountdown] = useState<number>(5);
  const [sosArmed, setSosArmed] = useState<boolean>(false);
  const [dispenseProgress, setDispenseProgress] = useState<number>(0);
  const audioIntervalRef = useRef<any>(null);

  const activeType: DynamicIslandState = notification?.type || (isOffline ? "system_status" : "idle");
  const isExpanded = notification !== null && notification !== undefined && activeType !== "idle";

  // Audio synthesize feedback helper
  const playIslandTone = (type: "alarm" | "chime" | "ping" | "ring" | "cancel" | "ack") => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === "alarm" || type === "ring") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "chime" || type === "ack") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === "cancel") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      // Audio not permitted or not supported
    }
  };

  // Rule: Auto-dismiss ONLY for #2 (AI Assistant) and #9 (Calendar Reminder)
  useEffect(() => {
    if (!notification) return;

    if (notification.type === "calendar_reminder") {
      const timer = setTimeout(() => {
        onClear();
      }, 10000); // 10s auto-collapse
      return () => clearTimeout(timer);
    }

    if (notification.type === "caregiver_message") {
      const timer = setTimeout(() => {
        onClear(); // Collapses to badge dot on idle pill
      }, 7000);
      return () => clearTimeout(timer);
    }

    if (notification.type === "refill_reminder") {
      // Allowed to dismiss on timer if ignored or single tap
      const timer = setTimeout(() => {
        onClear();
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Audio repetition for medication reminder / missed dose / incoming call / SOS
  useEffect(() => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }

    if (activeType === "medication_reminder" || activeType === "missed_dose") {
      playIslandTone("alarm");
      audioIntervalRef.current = setInterval(() => {
        playIslandTone("alarm");
      }, 4000);
    } else if (activeType === "incoming_call") {
      playIslandTone("ring");
      audioIntervalRef.current = setInterval(() => {
        playIslandTone("ring");
      }, 2500);
    }

    return () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
    };
  }, [activeType]);

  // SOS Countdown logic
  useEffect(() => {
    let timer: any;
    if (activeType === "sos_panic") {
      setSosCountdown(5);
      setSosArmed(true);
      timer = setInterval(() => {
        setSosCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Dispatch SOS alert
            onAction("confirm_sos", notification?.payload);
            playIslandTone("alarm");
            return 0;
          }
          playIslandTone("alarm");
          return prev - 1;
        });
      }, 1000);
    } else {
      setSosArmed(false);
      setSosCountdown(5);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeType]);

  // Dispense Stepper Progress simulation
  useEffect(() => {
    if (activeType === "dispense_in_progress") {
      setDispenseProgress(0);
      const interval = setInterval(() => {
        setDispenseProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              playIslandTone("ack");
              onClear();
            }, 800);
            return 100;
          }
          return prev + 20;
        });
      }, 400);
      return () => clearInterval(interval);
    }
  }, [activeType]);

  // 1. IDLE CLICK: Open AI Assistant
  const handleIdleClick = () => {
    playIslandTone("chime");
    if (onOpenAI) {
      onOpenAI();
    } else {
      onAction("open_ai_chat");
    }
  };

  // SOS Trigger from Idle affordance
  const handleTriggerSOS = (e: React.MouseEvent) => {
    e.stopPropagation();
    playIslandTone("alarm");
    if (onOpenSOS) {
      onOpenSOS();
    } else {
      onAction("trigger_sos");
    }
  };

  return (
    <div className="relative z-50 flex justify-center w-full select-none">
      <div
        id="dynamic-island-shell"
        className={`bg-zinc-950/95 text-white border backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden flex flex-col justify-center ${
          isExpanded
            ? activeType === "sos_panic"
              ? "w-full max-w-xl rounded-[28px] p-5 border-red-500 bg-red-950/95 shadow-[0_12px_40px_rgba(239,68,68,0.35)] ring-4 ring-red-500/20"
              : activeType === "missed_dose"
              ? "w-full max-w-lg rounded-[28px] p-5 border-amber-500 bg-[#160d05]/95 shadow-[0_12px_36px_rgba(245,158,11,0.25)] ring-4 ring-amber-500/20"
              : activeType === "medication_reminder"
              ? "w-full max-w-lg rounded-[28px] p-5 border-cyan-500 bg-[#061424]/95 shadow-[0_12px_36px_rgba(6,182,212,0.25)] ring-4 ring-cyan-500/20"
              : activeType === "incoming_call"
              ? "w-full max-w-lg rounded-[28px] p-5 border-emerald-500 bg-[#051a11]/95 shadow-[0_12px_36px_rgba(16,185,129,0.25)] ring-4 ring-emerald-500/20"
              : activeType === "dispense_in_progress"
              ? "w-full max-w-md rounded-[28px] p-5 border-purple-500 bg-zinc-950/95 shadow-2xl"
              : activeType === "refill_reminder"
              ? "w-full max-w-md rounded-[28px] p-5 border-amber-500/50 bg-zinc-950/95 shadow-2xl"
              : activeType === "caregiver_message"
              ? "w-full max-w-md rounded-[28px] p-5 border-purple-500/60 bg-zinc-950/95 shadow-2xl"
              : activeType === "calendar_reminder"
              ? "w-full max-w-md rounded-[28px] p-5 border-blue-500/60 bg-zinc-950/95 shadow-2xl"
              : activeType === "onboarding_tip"
              ? "w-full max-w-md rounded-[28px] p-5 border-indigo-400 bg-indigo-950/90 shadow-2xl ring-4 ring-indigo-500/30"
              : "w-full max-w-md rounded-[28px] p-5 border-violet-500 bg-zinc-950/95 shadow-2xl"
            : "w-[300px] sm:w-[340px] h-10 px-3.5 py-1 rounded-full border-white/15 shadow-[0_10px_25px_rgba(0,0,0,0.6)] cursor-pointer hover:border-white/30 hover:scale-[1.02]"
        }`}
      >
        {/* ========================================================= */}
        {/* 1. IDLE / DEFAULT COMPACT PILL STATE                      */}
        {/* ========================================================= */}
        {!isExpanded && (
          <div
            onClick={handleIdleClick}
            className="w-full h-full flex items-center justify-between gap-2"
            title="Tap to talk with Avenly AI Assistant"
          >
            {/* Left: Glanceable status / Next med / Online indicator */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isOffline ? "bg-amber-400" : "bg-emerald-400"
                }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  isOffline ? "bg-amber-500" : "bg-emerald-500"
                }`} />
              </span>

              {isOffline ? (
                <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1">
                  <WifiOff className="w-3 h-3" /> Offline Sync
                </span>
              ) : nextMedicationText ? (
                <span className="text-[10px] font-mono text-cyan-300 font-semibold truncate max-w-[130px] flex items-center gap-1">
                  <Pill className="w-3 h-3 text-cyan-400 shrink-0" />
                  {nextMedicationText}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-zinc-300 tracking-wider uppercase font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Hey Avenly
                </span>
              )}
            </div>

            {/* Right: Unread Caregiver Dot + Time + Small Persistent SOS Affordance */}
            <div className="flex items-center gap-2 shrink-0">
              {hasUnreadMessage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChats ? onOpenChats() : onAction("open_chats");
                  }}
                  className="w-5 h-5 rounded-full bg-purple-600/30 border border-purple-400/40 text-purple-300 flex items-center justify-center relative hover:scale-110"
                  title="Caregiver message pending"
                >
                  <MessageSquare className="w-2.5 h-2.5" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                </button>
              )}

              <span className="text-[10px] font-mono font-bold text-zinc-300">
                {systemTime}
              </span>

              {/* Persistent SOS Affordance (Rule #7) */}
              <button
                onClick={handleTriggerSOS}
                className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-[9px] font-black tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(239,68,68,0.5)] active:scale-90 flex items-center gap-0.5"
                title="Immediate Emergency SOS"
              >
                <ShieldAlert className="w-2.5 h-2.5" />
                SOS
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. AI ASSISTANT ACTIVE ("Hey Avenly")                      */}
        {/* ========================================================= */}
        {isExpanded && activeType === "ai_assistant" && (
          <div className="w-full flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5 text-purple-400 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider">
                    {notification?.payload?.aiPhase === "thinking"
                      ? "Avenly Thinking"
                      : notification?.payload?.aiPhase === "speaking"
                      ? "Avenly Speaking"
                      : "Avenly Listening"}
                  </span>
                  <h4 className="text-sm font-bold text-white leading-tight">
                    {notification?.title || "How can I help you today?"}
                  </h4>
                </div>
              </div>

              <button
                onClick={onClear}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Clean Audio Waveform (No emoji glyphs) */}
            <div className="flex items-center justify-between gap-3 bg-zinc-900/80 border border-white/5 rounded-2xl px-4 py-2.5">
              <span className="text-xs text-zinc-300 line-clamp-1 flex-1 font-medium">
                {notification?.description || notification?.payload?.aiTranscript || "Listening for your question..."}
              </span>
              <div className="flex items-end gap-1 h-5 shrink-0">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1 bg-gradient-to-t from-violet-500 to-purple-400 rounded-full animate-pulse"
                    style={{
                      height: `${Math.floor(Math.sin((i + Date.now() / 200)) * 10 + 12)}px`,
                      animationDelay: `${i * 0.08}s`
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-zinc-400 font-mono">
                Auto-dismisses when exchange completes
              </span>
              <button
                onClick={() => {
                  onClear();
                  if (onOpenAI) onOpenAI();
                }}
                className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
              >
                Full Assistant
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. MEDICATION REMINDER (Persistent, Audible, LED Pulse)   */}
        {/* ========================================================= */}
        {isExpanded && activeType === "medication_reminder" && (
          <div className="w-full flex flex-col gap-3.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 flex items-center justify-center shrink-0 animate-pulse">
                  <Pill className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-cyan-400 animate-ping" />
                    Dose Time Alarm — Dispenser Ready
                  </span>
                  <h4 className="text-base font-extrabold text-white">
                    {notification?.title || notification?.payload?.medName || "Metformin 500mg"}
                  </h4>
                </div>
              </div>

              <div className="px-2.5 py-1 bg-cyan-950/60 border border-cyan-500/30 rounded-xl text-[10px] font-mono text-cyan-300 font-bold">
                {notification?.payload?.time || "DUE NOW"}
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-black/40 border border-cyan-900/30 p-2.5 rounded-xl">
              {notification?.description || "Take 1 tablet with a glass of water after your meal. Carousel tray 1 unlocked."}
            </p>

            {/* Big Action Touch Targets (Single Tap Confirmation) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => {
                  playIslandTone("ack");
                  onAction("dispense_medication", notification?.payload);
                  onClear();
                }}
                className="h-14 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>Mark as Taken</span>
              </button>

              <button
                onClick={() => {
                  playIslandTone("cancel");
                  onAction("skip_medication", notification?.payload);
                  onClear();
                }}
                className="h-14 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <X className="w-4 h-4 text-zinc-400" />
                <span>Skip Dose</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. MISSED DOSE ALERT (Escalated, Emergency Alert logged)  */}
        {/* ========================================================= */}
        {isExpanded && activeType === "missed_dose" && (
          <div className="w-full flex flex-col gap-3.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border-2 border-amber-500 text-amber-400 flex items-center justify-center shrink-0 animate-bounce">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                    Escalation: Missed Medication Dose
                  </span>
                  <h4 className="text-base font-bold text-white">
                    {notification?.title || "Metformin 500mg Unacknowledged"}
                  </h4>
                </div>
              </div>

              <span className="text-[10px] font-mono px-2.5 py-1 bg-amber-950/80 text-amber-300 border border-amber-500/40 rounded-xl font-bold">
                Logged to Caregiver
              </span>
            </div>

            <p className="text-xs text-amber-200/90 leading-relaxed bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-xl">
              {notification?.description || "Dose was scheduled over 45 minutes ago. Caregiver Rudra notified via Google Sheet relay."}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => {
                  playIslandTone("ack");
                  onAction("dispense_medication", notification?.payload);
                  onClear();
                }}
                className="h-14 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>Take Dose Now</span>
              </button>

              <button
                onClick={() => {
                  playIslandTone("cancel");
                  onAction("dismiss_missed_dose", notification?.payload);
                  onClear();
                }}
                className="h-14 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-zinc-400" />
                <span>Acknowledge</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. REFILL REMINDER (Informational, Single tap dismiss)    */}
        {/* ========================================================= */}
        {isExpanded && activeType === "refill_reminder" && (
          <div className="w-full flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <RotateCw className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                    Low Supply Refill Notice
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    {notification?.title || "Metformin 500mg Low Stock"}
                  </h4>
                </div>
              </div>

              <button
                onClick={onClear}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {notification?.description || "Only 3 doses remain in carousel slot 1. Tap below to review or reorder prescription."}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={onClear}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  onClear();
                  if (onOpenMedication) onOpenMedication();
                }}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <span>View Refill Card</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. INCOMING CALL / VIDEO CALL (Google Meet)               */}
        {/* ========================================================= */}
        {isExpanded && activeType === "incoming_call" && (
          <div className="w-full flex flex-col gap-3.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shrink-0 animate-pulse">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-400 animate-ping" />
                    Incoming Video Call - Google Meet
                  </span>
                  <h4 className="text-base font-extrabold text-white">
                    {notification?.title || notification?.payload?.contactName || "Preeti (Daughter)"}
                  </h4>
                </div>
              </div>

              <span className="text-[10px] font-mono px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold animate-pulse">
                Ringing...
              </span>
            </div>

            {/* TWO LARGE SINGLE-TAP BUTTONS (>=64px height) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => {
                  playIslandTone("ack");
                  onAction("accept_call", notification?.payload);
                  onClear();
                }}
                className="h-16 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2.5 active:scale-95 transition-all"
              >
                <Phone className="w-6 h-6" />
                <span>Accept Call</span>
              </button>

              <button
                onClick={() => {
                  playIslandTone("cancel");
                  onAction("decline_call", notification?.payload);
                  onClear();
                }}
                className="h-16 bg-red-950/60 hover:bg-red-900/60 border border-red-800 text-red-300 font-bold text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <PhoneOff className="w-5 h-5 text-red-400" />
                <span>Decline</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 7. SOS / PANIC CONFIRMATION & COUNTDOWN                   */}
        {/* ========================================================= */}
        {isExpanded && activeType === "sos_panic" && (
          <div className="w-full flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 animate-ping">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-red-300 uppercase tracking-widest">
                    Emergency SOS Countdown
                  </span>
                  <h4 className="text-lg font-black text-white">
                    Dispatching Help in {sosCountdown}s
                  </h4>
                </div>
              </div>

              <div className="w-10 h-10 rounded-full border-2 border-red-400 flex items-center justify-center font-mono font-black text-lg text-white">
                {sosCountdown}
              </div>
            </div>

            <p className="text-xs text-red-100 font-medium">
              Dialing 911 dispatch, alerting caregiver Rudra, and broadcasting medical telemetry.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => {
                  playIslandTone("cancel");
                  onAction("cancel_sos");
                  onClear();
                }}
                className="h-14 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>I AM OKAY (CANCEL)</span>
              </button>

              <button
                onClick={() => {
                  playIslandTone("alarm");
                  onAction("confirm_sos", notification?.payload);
                  onClear();
                }}
                className="h-14 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-red-950 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <ShieldAlert className="w-5 h-5" />
                <span>DISPATCH NOW</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 8. CAREGIVER MESSAGE / CHAT                               */}
        {/* ========================================================= */}
        {isExpanded && activeType === "caregiver_message" && (
          <div className="w-full flex flex-col gap-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider">
                    New Caregiver Message
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    {notification?.payload?.sender || "Rudra (Caregiver)"}
                  </h4>
                </div>
              </div>

              <button
                onClick={onClear}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-200 line-clamp-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
              "{notification?.payload?.messageText || notification?.description || "Hello! Hope you had lunch and drank enough water today."}"
            </p>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-zinc-500 font-mono">
                Auto-minimizes to badge dot
              </span>
              <button
                onClick={() => {
                  onClear();
                  if (onOpenChats) onOpenChats();
                }}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <span>Open Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 9. CALENDAR / EVENT REMINDER                              */}
        {/* ========================================================= */}
        {isExpanded && activeType === "calendar_reminder" && (
          <div className="w-full flex flex-col gap-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-300 flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider">
                    Upcoming Calendar Event
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    {notification?.title || "Doctor Appointment"}
                  </h4>
                </div>
              </div>

              <button
                onClick={onClear}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-zinc-300 flex items-center gap-3 font-mono bg-black/30 p-2.5 rounded-xl border border-white/5">
              <span className="text-blue-300 font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {notification?.payload?.eventTime || "10:30 AM"}
              </span>
              {notification?.payload?.eventLocation && (
                <span className="text-zinc-400 truncate">
                  {notification.payload.eventLocation}
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={onClear}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  onClear();
                  if (onOpenCalendar) onOpenCalendar();
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1"
              >
                <span>View in Calendar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 10. DISPENSE IN PROGRESS (Stepper rotating, servo cycling) */}
        {/* ========================================================= */}
        {isExpanded && activeType === "dispense_in_progress" && (
          <div className="w-full flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0">
                  <RotateCw className="w-5 h-5 text-purple-400 animate-spin" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3 h-3 text-purple-400" />
                    Stepper Motor Rotating...
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    Dispensing {notification?.payload?.medName || "Metformin 500mg"}
                  </h4>
                </div>
              </div>

              {/* Simulated dispense honesty badge */}
              <span className="text-[9px] font-mono px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-400 rounded-lg">
                Simulated Dispense
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full transition-all duration-300"
                style={{ width: `${dispenseProgress}%` }}
              />
            </div>

            <span className="text-[10px] text-zinc-400 text-center font-mono">
              Servo cycling tray 1 into collection cup. Please hold on...
            </span>
          </div>
        )}

        {/* ========================================================= */}
        {/* 11. SYSTEM STATUS (Offline / Syncing / Error folded)      */}
        {/* ========================================================= */}
        {isExpanded && activeType === "system_status" && (
          <div className="w-full flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-white">Offline Mode Active</h5>
                <p className="text-[10px] text-zinc-400 font-mono">Local cache preserving all schedules & alarms</p>
              </div>
            </div>
            <button
              onClick={onClear}
              className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-mono font-bold"
            >
              OK
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* 12. ONBOARDING TIP (First-run Highlight)                   */}
        {/* ========================================================= */}
        {isExpanded && activeType === "onboarding_tip" && (
          <div className="w-full flex flex-col gap-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-400 text-indigo-300 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase tracking-wider">
                    Welcome to Avenly OS
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    This is your Dynamic Island
                  </h4>
                </div>
              </div>
              <button
                onClick={onClear}
                className="p-1 rounded-full hover:bg-indigo-900 text-indigo-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-indigo-100 leading-relaxed">
              Your medication dose reminders, family video calls, calendar appointments, and emergency alerts will seamlessly surface right here.
            </p>

            <div className="flex justify-end pt-1">
              <button
                onClick={onClear}
                className="px-4 py-1.5 bg-white text-black font-bold text-xs rounded-xl shadow-md"
              >
                Got It!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
