import React, { useState, useEffect } from "react";
import { 
  Heart, 
  Activity, 
  Droplet, 
  Footprints, 
  Pill, 
  ShieldCheck, 
  Sun, 
  Sparkles, 
  Lock,
  Wifi,
  Battery
} from "lucide-react";
import { VitalsState, MedicationItem } from "../types";

interface StandbyScreenProps {
  vitals: VitalsState;
  nextMedication?: MedicationItem;
  onWake: () => void;
  systemTime: string;
}

export default function StandbyScreen({ vitals, nextMedication, onWake, systemTime }: StandbyScreenProps) {
  const [currentDateStr, setCurrentDateStr] = useState("");

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    setCurrentDateStr(new Date().toLocaleDateString("en-US", options));
  }, []);

  const hrVal = typeof vitals.heartRate === "number" ? vitals.heartRate : parseInt(String(vitals.heartRate)) || 72;
  const spo2Val = typeof vitals.bloodOxygen === "number" ? vitals.bloodOxygen : parseInt(String(vitals.bloodOxygen)) || 98;
  const stepsVal = typeof vitals.steps === "number" ? vitals.steps : parseInt(String(vitals.steps)) || 4281;
  const hydrationVal = typeof vitals.hydration === "number" ? vitals.hydration : parseFloat(String(vitals.hydration)) || 1.75;

  return (
    <div 
      onClick={onWake}
      className="fixed inset-0 z-50 bg-[#040507] text-zinc-100 flex flex-col justify-between p-8 cursor-pointer select-none overflow-hidden animate-fadeIn backdrop-blur-3xl"
    >
      {/* Background ambient glowing soft gradient circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-900/15 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-rose-900/10 blur-[120px] pointer-events-none animate-pulse" />

      {/* TOP STANDBY DYNAMIC ISLAND BAR */}
      <div className="relative z-10 flex items-center justify-between">
        {/* Dynamic Island Status Pill */}
        <div className="mx-auto bg-zinc-900/90 border border-zinc-800/80 rounded-full px-5 py-2 flex items-center gap-3 shadow-2xl backdrop-blur-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-bold font-mono text-zinc-200">
            Avenly Health Shield Active
          </span>
          <span className="text-[10px] text-zinc-500 font-mono border-l border-zinc-800 pl-3">
            Standby Mode
          </span>
        </div>

        {/* Small battery & wifi icons */}
        <div className="absolute right-0 flex items-center gap-3 text-zinc-500 text-xs font-mono">
          <Wifi className="w-4 h-4 text-emerald-400" />
          <Battery className="w-4 h-4 text-indigo-400" />
        </div>
      </div>

      {/* CENTER LARGE TYPOGRAPHIC CLOCK & DATE */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto text-center">
        {/* Time display */}
        <h1 className="text-7xl sm:text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 via-zinc-200 to-zinc-500 font-display">
          {systemTime || "10:42 AM"}
        </h1>

        {/* Full Date */}
        <p className="text-lg sm:text-xl font-medium text-amber-300/80 mt-2 font-sans tracking-wide">
          {currentDateStr || "Monday, August 10, 2026"}
        </p>

        {/* Subtitle hint */}
        <span className="text-xs text-zinc-500 font-mono mt-3 flex items-center gap-1.5 bg-zinc-900/50 px-3 py-1 rounded-full border border-zinc-800/60">
          <Lock className="w-3 h-3 text-amber-400" /> Touch screen anywhere to wake Avenly Hub
        </span>
      </div>

      {/* BOTTOM LIVE HEALTH METRIC PROGRESS BARS */}
      <div className="relative z-10 max-w-4xl mx-auto w-full bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            Live Vitals Telemetry
          </span>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Continuous Monitoring
          </span>
        </div>

        {/* 4 Health Bars Grid */}
        <div className="grid grid-cols-4 gap-4">
          {/* Heart Rate Bar */}
          <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-2xl p-3">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-zinc-300 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                Heart Rate
              </span>
              <span className="font-mono font-bold text-rose-400">{hrVal} bpm</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-rose-500 to-red-400 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(10, (hrVal / 160) * 100))}%` }} 
              />
            </div>
            <span className="text-[9px] text-zinc-500 mt-1 block font-mono">Resting range</span>
          </div>

          {/* Blood Oxygen Bar */}
          <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-2xl p-3">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-zinc-300 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                SpO2 Oxygen
              </span>
              <span className="font-mono font-bold text-indigo-300">{spo2Val}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full transition-all duration-500" 
                style={{ width: `${spo2Val}%` }} 
              />
            </div>
            <span className="text-[9px] text-zinc-500 mt-1 block font-mono">Optimal blood oxygen</span>
          </div>

          {/* Steps Bar */}
          <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-2xl p-3">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-zinc-300 flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5 text-amber-400" />
                Daily Steps
              </span>
              <span className="font-mono font-bold text-amber-300">{stepsVal.toLocaleString()}</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (stepsVal / 5000) * 100)}%` }} 
              />
            </div>
            <span className="text-[9px] text-zinc-500 mt-1 block font-mono">Goal: 5,000 steps</span>
          </div>

          {/* Next Medication Bar */}
          <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-2xl p-3">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-zinc-300 flex items-center gap-1">
                <Pill className="w-3.5 h-3.5 text-cyan-400" />
                Next Pill
              </span>
              <span className="font-mono font-bold text-cyan-300 truncate max-w-[90px]">
                {nextMedication ? nextMedication.name : "Metformin"}
              </span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full w-3/4" />
            </div>
            <span className="text-[9px] text-zinc-500 mt-1 block font-mono">
              Scheduled {nextMedication ? nextMedication.time : "02:00 PM"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
