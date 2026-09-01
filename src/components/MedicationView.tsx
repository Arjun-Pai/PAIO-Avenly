import React, { useState, useEffect, useCallback } from "react";
import {
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Clock,
  Pill,
  Calendar,
  Layers,
  CheckCircle2,
  Plus,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  Package,
  Activity
} from "lucide-react";
import {
  MedicationRecord,
  MedicationLogRecord,
  TimelineDoseItem,
  MedicationItem
} from "../types";
import {
  fetchMedicationsFromSheet,
  fetchMedicationLogsFromSheet,
  logMedicationDoseToSheet,
  computeTodayMedicationTimeline
} from "../lib/workspace";
import { playAudioFeedback } from "../lib/audioFeedback";
import AddMedicationForm from "./AddMedicationForm";

interface MedicationViewProps {
  medications?: MedicationItem[];
  onDispense?: (medId: string) => void;
  onResetMeds?: () => void;
  onRefill?: () => void;
  userName?: string;
  userLanguage?: string;
  caregiverName?: string;
  isCaregiverMode?: boolean;
}

export default function MedicationView({
  userName,
  userLanguage,
  caregiverName,
  isCaregiverMode = false
}: MedicationViewProps) {
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [logs, setLogs] = useState<MedicationLogRecord[]>([]);
  const [timelineItems, setTimelineItems] = useState<TimelineDoseItem[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoggingDose, setIsLoggingDose] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Status feedback state
  const [justLoggedToast, setJustLoggedToast] = useState<{
    name: string;
    status: "taken" | "skipped";
    time: string;
  } | null>(null);

  // Core Data Fetcher from Google Sheets Backend
  const loadSheetData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [fetchedMeds, fetchedLogs] = await Promise.all([
        fetchMedicationsFromSheet(),
        fetchMedicationLogsFromSheet()
      ]);

      setMedications(fetchedMeds);
      setLogs(fetchedLogs);

      const timeline = computeTodayMedicationTimeline(fetchedMeds, fetchedLogs);
      setTimelineItems(timeline);
      
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      console.error("Error loading medications from Sheet:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial Load & 20s Polling Interval
  useEffect(() => {
    loadSheetData(false);

    const interval = setInterval(() => {
      loadSheetData(true);
    }, 20000);

    return () => clearInterval(interval);
  }, [loadSheetData]);

  // Handle Mark as Taken or Skip
  const handleAction = async (item: TimelineDoseItem, actionStatus: "taken" | "skipped") => {
    const doseKey = `${item.med_id}-${item.scheduled_time}`;
    setIsLoggingDose(doseKey);

    if (actionStatus === "taken") {
      playAudioFeedback("medication_taken");
    } else {
      playAudioFeedback("tap");
    }

    if (navigator.vibrate) {
      if (actionStatus === "taken") navigator.vibrate([80, 40, 80]);
      else navigator.vibrate([50]);
    }

    const actualTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Optimistic UI Update
    setTimelineItems(prev =>
      prev.map(t => {
        if (t.med_id === item.med_id && t.scheduled_time === item.scheduled_time) {
          return {
            ...t,
            status: actionStatus === "taken" ? "Taken" : "Skipped",
            actual_time: actualTime,
            pills_remaining: actionStatus === "taken" ? Math.max(0, t.pills_remaining - 1) : t.pills_remaining
          };
        }
        return t;
      })
    );

    // Show instant toast
    setJustLoggedToast({
      name: item.name,
      status: actionStatus,
      time: actualTime
    });
    setTimeout(() => setJustLoggedToast(null), 3500);

    try {
      // Direct write to Google Sheet MedicationLog tab & decrement Medications tab
      await logMedicationDoseToSheet(item.med_id, item.scheduled_time, actionStatus);
      
      // Refresh sheet data quietly to sync any server-side counter updates
      loadSheetData(true);
    } catch (err) {
      console.error("Failed to log dose to Google Sheet:", err);
    } finally {
      setIsLoggingDose(null);
    }
  };

  // Compute Adherence & Stats
  const totalDosesToday = timelineItems.length;
  const takenDosesToday = timelineItems.filter(t => t.status === "Taken").length;
  const skippedDosesToday = timelineItems.filter(t => t.status === "Skipped").length;
  const missedDosesToday = timelineItems.filter(t => t.status === "Missed").length;
  const dueNowCount = timelineItems.filter(t => t.status === "Due Now").length;

  const adherencePercent = totalDosesToday > 0 ? Math.round((takenDosesToday / totalDosesToday) * 100) : 0;

  // Refill Alerts
  const criticalRefillMeds = medications.filter(m => m.active && m.pills_remaining <= 2);
  const lowRefillMeds = medications.filter(m => m.active && m.pills_remaining > 2 && m.pills_remaining <= m.refill_threshold);

  // Status Badge Component
  const renderStatusBadge = (status: TimelineDoseItem["status"], actualTime?: string) => {
    switch (status) {
      case "Due Now":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-black animate-pulse shadow-md">
            <Clock className="w-3.5 h-3.5 text-black" />
            <span>Due Now</span>
          </span>
        );
      case "Taken":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white border border-white/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            <span>Taken {actualTime ? `at ${actualTime}` : ""}</span>
          </span>
        );
      case "Skipped":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
            <X className="w-3.5 h-3.5 text-zinc-400" />
            <span>Skipped {actualTime ? `at ${actualTime}` : ""}</span>
          </span>
        );
      case "Missed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span>Missed</span>
          </span>
        );
      case "Upcoming":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-zinc-300 border border-white/10">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Upcoming</span>
          </span>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#121212] text-zinc-100 overflow-hidden font-sans select-none">
      
      {/* TOP STATUS / ADHERENCE BANNER */}
      <div className="bg-[#1C1C1E] border-b border-white/10 px-6 py-4 shrink-0 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Title & Sheet Backend Sync Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white shadow-sm">
              <Pill className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-display text-white tracking-tight">
                  Today's Medication Timeline
                </h1>
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold bg-white/10 text-white px-2 py-0.5 rounded-full border border-white/15">
                  <FileSpreadsheet className="w-3 h-3 text-white" />
                  Google Sheets Live
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {timelineItems.length > 0
                  ? `${takenDosesToday} of ${totalDosesToday} doses logged today • ${dueNowCount > 0 ? `${dueNowCount} due now` : "All on schedule"}`
                  : "Syncing schedule from Google Sheet"}
              </p>
            </div>
          </div>

          {/* Adherence Progress Bar & Controls */}
          <div className="flex items-center gap-4">
            {totalDosesToday > 0 && (
              <div className="bg-black/40 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3 min-w-[200px]">
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] font-bold text-zinc-300 mb-1">
                    <span>Adherence</span>
                    <span className="font-mono text-white">{adherencePercent}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-white h-full transition-all duration-500 rounded-full"
                      style={{ width: `${adherencePercent}%` }}
                    />
                  </div>
                </div>
                <Activity className="w-4 h-4 text-white shrink-0" />
              </div>
            )}

            {/* Refresh Button */}
            {isCaregiverMode && (
              <button
                onClick={() => loadSheetData(true)}
                disabled={isRefreshing}
                className="p-2.5 bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white rounded-2xl border border-white/10 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
                title="Refresh from Google Sheets"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-white" : ""}`} />
                <span className="hidden sm:inline">Sync</span>
              </button>
            )}

            {/* Add Medication Modal Trigger */}
            {isCaregiverMode && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-black" />
                <span>Add Med</span>
              </button>
            )}
          </div>
        </div>

        {/* Persistent Critical Refill Banner (<=2 pills remaining) */}
        {criticalRefillMeds.length > 0 && (
          <div className="mt-3 bg-red-500/15 border border-red-500/30 text-red-200 px-4 py-2.5 rounded-2xl text-xs flex items-center justify-between backdrop-blur-md animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-bold">
                Critical Refill Warning: {criticalRefillMeds.map(m => `${m.name} (${m.pills_remaining} left)`).join(", ")}.
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase bg-red-500/20 px-2 py-0.5 rounded-lg border border-red-500/30">
              Refill Needed
            </span>
          </div>
        )}
      </div>

      {/* Instant Action Toast */}
      {justLoggedToast && (
        <div className="fixed top-20 right-8 z-50 bg-white text-black font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs animate-bounce border border-black/10">
          <CheckCircle2 className="w-4 h-4 text-black" />
          <span>
            {justLoggedToast.name} marked as {justLoggedToast.status} at {justLoggedToast.time}!
          </span>
        </div>
      )}

      {/* MAIN TIMELINE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        
        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <RefreshCw className="w-8 h-8 text-white animate-spin" />
            <p className="text-xs text-zinc-400 font-mono">Reading prescription records from Google Sheets...</p>
          </div>
        ) : timelineItems.length === 0 ? (
          
          /* EMPTY STATE - FRIENDLY PROMPT ROUTING TO ADD MEDICATION FORM */
          <div className="bg-[#1C1C1E] border border-dashed border-white/20 rounded-3xl p-12 text-center max-w-xl mx-auto flex flex-col items-center justify-center space-y-5 shadow-2xl backdrop-blur-2xl">
            <div className="w-16 h-16 rounded-3xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
              <Pill className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-display text-white">No medications set up yet</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed">
                Your daily schedule is empty. Add your prescription medications to write directly to your Google Sheet <span className="font-mono text-zinc-300">"Medications"</span> tab.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider rounded-2xl shadow-xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-black" />
              <span>Add Your Medications</span>
            </button>
          </div>

        ) : (

          /* TIMELINE LIST OF SQUIRCLE DOSE CARDS */
          <div className="space-y-4 max-w-4xl mx-auto">
            {timelineItems.map((item, idx) => {
              const isCompleted = item.status === "Taken" || item.status === "Skipped";
              const isDueNow = item.status === "Due Now";
              const isMissed = item.status === "Missed";
              const isLowRefill = item.pills_remaining <= item.refill_threshold;
              const isCriticalRefill = item.pills_remaining <= 2;
              const doseKey = `${item.med_id}-${item.scheduled_time}`;
              const isPending = isLoggingDose === doseKey;

              return (
                <div
                  key={`${item.med_id}-${item.scheduled_time}-${idx}`}
                  className={`border rounded-3xl p-6 transition-all duration-300 shadow-xl backdrop-blur-xl ${
                    isCompleted
                      ? "bg-[#161618]/60 border-white/5 opacity-60"
                      : isDueNow
                      ? "bg-[#1C1C1E] border-white/40 ring-1 ring-white/20 shadow-2xl"
                      : isMissed
                      ? "bg-[#1C1C1E] border-red-500/30"
                      : "bg-[#1C1C1E] border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    
                    {/* Left: Scheduled Time & Pill Details */}
                    <div className="flex items-start gap-5">
                      
                      {/* Scheduled Time (Large Font, Legible from 3 Feet) */}
                      <div className="flex flex-col items-center justify-center bg-black/50 border border-white/10 rounded-2xl px-4 py-3 min-w-[110px] text-center shadow-inner">
                        <Clock className="w-4 h-4 text-zinc-400 mb-1" />
                        <span className="text-2xl md:text-3xl font-mono font-bold text-white tracking-tight leading-none">
                          {item.scheduled_time.split(" ")[0]}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-zinc-400 mt-1 uppercase">
                          {item.scheduled_time.split(" ")[1] || ""}
                        </span>
                      </div>

                      {/* Medication Info & Refill Badge */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className={`text-xl font-bold font-display ${isCompleted ? "text-zinc-400 line-through" : "text-white"}`}>
                            {item.name}
                          </h3>
                          {renderStatusBadge(item.status, item.actual_time)}
                        </div>

                        <p className="text-xs text-zinc-300 flex items-center gap-2">
                          <span className="font-semibold text-white">{item.dosage}</span>
                          <span className="text-zinc-500">•</span>
                          <span className="text-zinc-400 font-mono">
                            {item.days_active === "daily" ? "Daily" : `Days: ${item.days_active}`}
                          </span>
                        </p>

                        {/* Pill Inventory & Refill Warnings */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[11px] text-zinc-400 font-mono bg-black/40 px-2.5 py-1 rounded-xl border border-white/5">
                            {item.pills_remaining} pills on hand
                          </span>

                          {isCriticalRefill ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-300 bg-red-500/20 px-2.5 py-1 rounded-xl border border-red-500/30">
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              Refill Urgent ({item.pills_remaining} left)
                            </span>
                          ) : isLowRefill ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-xl border border-amber-500/25">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              Refill soon ({item.pills_remaining} left)
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions (Mark as Taken / Skip) - Dimmed & Hidden when Completed */}
                    {!isCompleted ? (
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Skip Button (Secondary) */}
                        <button
                          type="button"
                          onClick={() => handleAction(item, "skipped")}
                          disabled={isPending}
                          className="min-h-[52px] px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-2xl text-xs sm:text-sm font-bold border-2 border-white/15 transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50 touch-target-senior"
                        >
                          <X className="w-5 h-5 text-zinc-400" />
                          <span>Skip</span>
                        </button>

                        {/* Mark as Taken Button (Prominent) */}
                        <button
                          type="button"
                          onClick={() => handleAction(item, "taken")}
                          disabled={isPending}
                          className={`min-h-[52px] px-6 py-3 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-2xl flex items-center gap-2.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50 touch-target-senior ${
                            isDueNow
                              ? "bg-white text-black hover:bg-zinc-200 border-2 border-white shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                              : "bg-white text-black hover:bg-zinc-200 border-2 border-white/80"
                          }`}
                        >
                          {isPending ? (
                            <>
                              <RefreshCw className="w-5 h-5 animate-spin text-black" />
                              <span>Logging...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-5 h-5 text-black stroke-[3]" />
                              <span>Mark as Taken</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-zinc-300 text-xs sm:text-sm font-mono font-bold bg-black/60 px-5 py-3 rounded-2xl border border-white/15">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>Logged in Google Sheet</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD MEDICATION MODAL (Reuses <AddMedicationForm />) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 animate-fadeIn">
          <div className="bg-[#121212] border border-white/15 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl">
            <AddMedicationForm
              onComplete={(savedMeds) => {
                setShowAddModal(false);
                loadSheetData(false);
              }}
              onCancel={() => setShowAddModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
