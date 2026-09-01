import React, { useState } from "react";
import {
  Pill,
  Plus,
  Trash2,
  Clock,
  Calendar,
  Layers,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
  X,
  FileSpreadsheet
} from "lucide-react";
import { MedicationRecord } from "../types";
import { addMedicationsToSheet, ensureGoogleAccessToken } from "../lib/workspace";

interface FormMedItem {
  id: string;
  name: string;
  dosage: string;
  times: string[];
  customTimeInput: string;
  daysMode: "daily" | "custom";
  customDays: string[];
  pills_remaining: number;
  refill_threshold: number;
}

const COMMON_PRESETS = [
  { name: "Atorvastatin", dosage: "20mg - 1 tablet", time: "08:00 AM" },
  { name: "Metformin", dosage: "500mg - 1 tablet", time: "12:30 PM" },
  { name: "Lisinopril", dosage: "10mg - 1 tablet", time: "06:00 PM" },
  { name: "Amlodipine", dosage: "5mg - 1 tablet", time: "08:00 AM" },
  { name: "Vitamin D3", dosage: "1000IU - 1 capsule", time: "09:00 PM" },
  { name: "Calcium & Mag", dosage: "500mg - 1 chewable", time: "02:00 PM" },
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TIME_PRESETS = [
  { label: "Morning", time: "08:00 AM" },
  { label: "Noon", time: "12:30 PM" },
  { label: "Evening", time: "06:00 PM" },
  { label: "Bedtime", time: "09:00 PM" },
];

interface AddMedicationFormProps {
  onComplete: (savedMeds: MedicationRecord[]) => void;
  onSkip?: () => void;
  onCancel?: () => void;
  isEmbedded?: boolean;
}

export default function AddMedicationForm({
  onComplete,
  onSkip,
  onCancel,
  isEmbedded = false
}: AddMedicationFormProps) {
  const [medCards, setMedCards] = useState<FormMedItem[]>([
    {
      id: `med-form-${Date.now()}`,
      name: "",
      dosage: "",
      times: ["08:00 AM"],
      customTimeInput: "08:00",
      daysMode: "daily",
      customDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      pills_remaining: 30,
      refill_threshold: 5
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // Add a new blank medication card
  const handleAddCard = () => {
    setMedCards(prev => [
      ...prev,
      {
        id: `med-form-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: "",
        dosage: "",
        times: ["08:00 AM"],
        customTimeInput: "08:00",
        daysMode: "daily",
        customDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        pills_remaining: 30,
        refill_threshold: 5
      }
    ]);
  };

  // Remove a medication card
  const handleRemoveCard = (cardId: string) => {
    if (medCards.length <= 1) {
      // Clear instead of removing last card
      setMedCards([{
        id: `med-form-${Date.now()}`,
        name: "",
        dosage: "",
        times: ["08:00 AM"],
        customTimeInput: "08:00",
        daysMode: "daily",
        customDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        pills_remaining: 30,
        refill_threshold: 5
      }]);
      return;
    }
    setMedCards(prev => prev.filter(c => c.id !== cardId));
  };

  // Update specific field on a card
  const updateCard = (cardId: string, updates: Partial<FormMedItem>) => {
    setMedCards(prev =>
      prev.map(c => (c.id === cardId ? { ...c, ...updates } : c))
    );
  };

  // Add time to a card's times array
  const handleAddTime = (cardId: string, timeToAdd: string) => {
    const card = medCards.find(c => c.id === cardId);
    if (!card) return;
    const cleanTime = timeToAdd.trim();
    if (!cleanTime) return;
    if (card.times.includes(cleanTime)) return;
    updateCard(cardId, { times: [...card.times, cleanTime] });
  };

  // Remove time from a card
  const handleRemoveTime = (cardId: string, timeToRemove: string) => {
    const card = medCards.find(c => c.id === cardId);
    if (!card) return;
    updateCard(cardId, { times: card.times.filter(t => t !== timeToRemove) });
  };

  // Toggle custom day selection
  const handleToggleDay = (cardId: string, day: string) => {
    const card = medCards.find(c => c.id === cardId);
    if (!card) return;
    const current = card.customDays;
    const nextDays = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    updateCard(cardId, { customDays: nextDays.length > 0 ? nextDays : [day] });
  };

  // Quick preset apply
  const handleApplyPreset = (cardId: string, preset: typeof COMMON_PRESETS[0]) => {
    updateCard(cardId, {
      name: preset.name,
      dosage: preset.dosage,
      times: [preset.time]
    });
  };

  // Form Submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    // Validate that at least one valid medication is filled
    const validCards = medCards.filter(c => c.name.trim() !== "");
    if (validCards.length === 0) {
      setErrorMessage("Please enter a name for at least one medication, or select 'Skip for now'.");
      return;
    }

    setIsSubmitting(true);
    try {
      const recordsToSave: MedicationRecord[] = validCards.map((c, index) => {
        const medId = `med-${c.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}-${index}`;
        const daysActive = c.daysMode === "daily" ? "daily" : c.customDays.join(",");
        const timesList = c.times.length > 0 ? c.times : ["08:00 AM"];

        return {
          med_id: medId,
          name: c.name.trim(),
          dosage: c.dosage.trim() || "1 dose",
          times: timesList,
          days_active: daysActive,
          pills_remaining: Number(c.pills_remaining) || 30,
          refill_threshold: Number(c.refill_threshold) || 5,
          start_date: new Date().toISOString().split("T")[0],
          active: true
        };
      });

      // Write directly to Google Sheets & Server Backend
      await addMedicationsToSheet(recordsToSave);

      setSuccessCount(recordsToSave.length);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

      setTimeout(() => {
        onComplete(recordsToSave);
      }, 900);
    } catch (err: any) {
      console.error("Failed to write medications to Google Sheets:", err);
      setErrorMessage("Could not save to Google Sheets. Please check network connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Title & Instructions */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
              <Pill className="w-4 h-4 text-white" />
            </span>
            <div>
              <h2 className="text-xl font-bold font-display text-white tracking-tight">Add Your Medications</h2>
              <p className="text-xs text-zinc-400">
                Data writes directly to your Google Sheet <span className="font-mono text-zinc-300">"Medications"</span> tab.
              </p>
            </div>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successCount !== null && (
        <div className="bg-white/10 border border-white/20 text-white px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
          <span>Successfully synchronized {successCount} medication{successCount === 1 ? "" : "s"} to Google Sheet!</span>
        </div>
      )}

      {/* Repeatable Medication Cards List */}
      <div className="space-y-5">
        {medCards.map((card, idx) => (
          <div
            key={card.id}
            className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-5 md:p-6 space-y-5 relative shadow-xl backdrop-blur-xl transition-all"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-white/10 text-white font-mono font-bold text-xs flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  {card.name ? card.name : `Medication #${idx + 1}`}
                </span>
              </div>

              {medCards.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveCard(card.id)}
                  className="px-2.5 py-1 text-xs text-zinc-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-xl border border-white/5 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            {/* Quick Preset Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Quick Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(card.id, preset)}
                    className="px-2.5 py-1 text-[11px] font-medium bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white rounded-lg border border-white/10 transition-all active:scale-95"
                  >
                    + {preset.name} ({preset.dosage})
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Inputs: Name & Dosage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-white" />
                  Medication Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Metformin, Atorvastatin"
                  value={card.name}
                  onChange={e => updateCard(card.id, { name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-white/40"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  Dosage & Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. 500mg - 1 tablet with food"
                  value={card.dosage}
                  onChange={e => updateCard(card.id, { dosage: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-white/40"
                />
              </div>
            </div>

            {/* Time(s) of Day - Multi-Add */}
            <div className="space-y-2.5 bg-black/30 p-4 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-white" />
                  Scheduled Time(s) of Day (Multi-Add)
                </label>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {card.times.length} dose{card.times.length === 1 ? "" : "s"} / day
                </span>
              </div>

              {/* Active Selected Time Chips */}
              <div className="flex flex-wrap gap-2 items-center">
                {card.times.map(t => (
                  <div
                    key={t}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-black font-bold font-mono text-xs rounded-xl shadow-sm"
                  >
                    <Clock className="w-3 h-3 text-black" />
                    <span>{t}</span>
                    {card.times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTime(card.id, t)}
                        className="hover:opacity-70 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick Time Add Buttons + Custom Input */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                <span className="text-[10px] text-zinc-400 font-mono">Quick add:</span>
                {TIME_PRESETS.map(tp => (
                  <button
                    key={tp.label}
                    type="button"
                    onClick={() => handleAddTime(card.id, tp.time)}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white text-xs font-mono rounded-lg border border-white/10 transition-all active:scale-95"
                  >
                    + {tp.label} ({tp.time})
                  </button>
                ))}

                <div className="flex items-center gap-1.5 ml-auto">
                  <input
                    type="time"
                    value={card.customTimeInput}
                    onChange={e => updateCard(card.id, { customTimeInput: e.target.value })}
                    className="px-2 py-1 bg-black/50 border border-white/15 rounded-lg text-white font-mono text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!card.customTimeInput) return;
                      const [hStr, mStr] = card.customTimeInput.split(":");
                      let h = parseInt(hStr, 10);
                      const m = parseInt(mStr, 10);
                      const mer = h >= 12 ? "PM" : "AM";
                      h = h % 12 || 12;
                      const formatted = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${mer}`;
                      handleAddTime(card.id, formatted);
                    }}
                    className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-lg border border-white/20 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Days Selection: Daily vs Custom Days */}
            <div className="space-y-2.5 bg-black/30 p-4 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-white" />
                  Active Days
                </label>

                <div className="flex items-center bg-black/50 p-0.5 rounded-xl border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => updateCard(card.id, { daysMode: "daily" })}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      card.daysMode === "daily"
                        ? "bg-white text-black shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCard(card.id, { daysMode: "custom" })}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      card.daysMode === "custom"
                        ? "bg-white text-black shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Custom Days
                  </button>
                </div>
              </div>

              {card.daysMode === "custom" && (
                <div className="flex items-center gap-1.5 pt-1">
                  {DAYS_OF_WEEK.map(day => {
                    const isSelected = card.customDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(card.id, day)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                          isSelected
                            ? "bg-white text-black border-white shadow-sm"
                            : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pill Count On Hand & Refill Threshold */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/30 p-4 rounded-2xl border border-white/10 space-y-2">
                <label className="text-xs font-bold text-zinc-200 block">
                  Pill Count On Hand (Remaining)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCard(card.id, { pills_remaining: Math.max(0, card.pills_remaining - 5) })}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm flex items-center justify-center transition-all"
                  >
                    -5
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={card.pills_remaining}
                    onChange={e => updateCard(card.id, { pills_remaining: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    className="flex-1 px-3 py-1.5 bg-black/60 border border-white/15 rounded-xl text-center text-white font-mono text-base font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateCard(card.id, { pills_remaining: card.pills_remaining + 5 })}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm flex items-center justify-center transition-all"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCard(card.id, { pills_remaining: card.pills_remaining + 30 })}
                    className="px-2.5 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center transition-all"
                  >
                    +30
                  </button>
                </div>
              </div>

              <div className="bg-black/30 p-4 rounded-2xl border border-white/10 space-y-2">
                <label className="text-xs font-bold text-zinc-200 block">
                  Refill Alert Threshold (Pills)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateCard(card.id, { refill_threshold: Math.max(1, card.refill_threshold - 1) })}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm flex items-center justify-center transition-all"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={card.refill_threshold}
                    onChange={e => updateCard(card.id, { refill_threshold: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className="flex-1 px-3 py-1.5 bg-black/60 border border-white/15 rounded-xl text-center text-white font-mono text-base font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateCard(card.id, { refill_threshold: card.refill_threshold + 1 })}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm flex items-center justify-center transition-all"
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Another Medication Button */}
      <button
        type="button"
        onClick={handleAddCard}
        className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-3xl text-zinc-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
      >
        <Plus className="w-4 h-4 text-white" />
        <span>Add Another Medication</span>
      </button>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10 gap-3">
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="px-5 py-2.5 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Skip for now
          </button>
        ) : <div />}

        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-2xl text-xs font-bold border border-white/10 transition-all"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="px-7 py-3 bg-white hover:bg-zinc-200 text-black rounded-2xl text-xs font-bold uppercase tracking-wider shadow-2xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>Writing to Google Sheet...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 text-black" />
                <span>Save to Google Sheet</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-2xl">
      {content}
    </div>
  );
}
