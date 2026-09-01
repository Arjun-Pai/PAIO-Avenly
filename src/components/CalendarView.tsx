import React, { useState, useEffect, FormEvent } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { fetchGoogleCalendarEvents, createGoogleCalendarEvent, CalendarAppointment } from "../lib/workspace";
import { getTranslation } from "../lib/translations";

interface CalendarViewProps {
  userLanguage?: string;
  doctorName?: string;
}

export default function CalendarView({ userLanguage, doctorName }: CalendarViewProps) {
  const t = getTranslation(userLanguage);
  const [events, setEvents] = useState<CalendarAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  const defaultDoctor = doctorName ? `Dr. ${doctorName} Appointment` : "Dr. Rajesh Sharma Cardiologist";

  const [formData, setFormData] = useState({
    summary: defaultDoctor,
    description: "Routine checkup",
    location: "City Clinic",
    dateStr: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    timeStr: "10:30",
  });

  useEffect(() => {
    // Sync default form data if doctor name changes
    setFormData(prev => ({
      ...prev,
      summary: doctorName ? `Dr. ${doctorName} Appointment` : prev.summary
    }));
  }, [doctorName]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const list = await fetchGoogleCalendarEvents();
      setEvents(list);
    } catch (err: any) {
      console.warn("Failed to load calendar events", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);
    try {
      const created = await createGoogleCalendarEvent(formData);
      setStatusMsg({ type: "success", text: `Appointment "${created.summary}" saved to Google Calendar!` });
      setShowAddForm(false);
      await loadEvents();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to create appointment in Google Calendar." });
    } finally {
      setLoading(false);
    }
  };

  // Calendar Grid Calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Map events to day numbers
  const getEventsForDay = (dayNum: number) => {
    return events.filter(evt => {
      const d = new Date(evt.startDateTime);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === dayNum;
    });
  };

  const selectedDayEvents = getEventsForDay(selectedDay);

  return (
    <div className="w-full animate-fadeIn flex flex-col font-sans select-none pb-6">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-2xl text-blue-400 backdrop-blur-md">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider font-mono">{t.calendarTitle}</span>
              <h2 className="text-xl font-bold font-display text-white">{monthName} {year}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              <button onClick={prevMonth} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold px-3 text-white">{monthName.slice(0, 3)}</span>
              <button onClick={nextMonth} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={loadEvents}
              disabled={loading}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 transition-all"
              title="Refresh Calendar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{t.addAppointment}</span>
            </button>
          </div>
        </div>

        {/* Status notification */}
        {statusMsg && (
          <div
            className={`p-3.5 rounded-2xl mb-4 text-xs font-medium flex items-center justify-between border animate-fadeIn ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-zinc-400 hover:text-white text-xs">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Add Appointment Modal Form */}
        {showAddForm && (
          <form onSubmit={handleCreateAppointment} className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl mb-5 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 font-mono uppercase">
                <Stethoscope className="w-4 h-4 text-blue-400" />
                <span>New Google Calendar Doctor Appointment</span>
              </div>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-400 font-mono block mb-1 uppercase">Title / Doctor Name</label>
                <input
                  type="text"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 font-mono block mb-1 uppercase">Clinic Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. City Care Cardiology"
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 font-mono block mb-1 uppercase">Date</label>
                <input
                  type="date"
                  value={formData.dateStr}
                  onChange={(e) => setFormData({ ...formData, dateStr: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 font-mono block mb-1 uppercase">Time</label>
                <input
                  type="time"
                  value={formData.timeStr}
                  onChange={(e) => setFormData({ ...formData, timeStr: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 font-mono block mb-1 uppercase">Medical Notes / Purpose</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Prescription review, vitals summary..."
                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl text-xs text-white outline-none focus:border-blue-500 h-16"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Save to Google Calendar
              </button>
            </div>
          </form>
        )}

        {/* 7-COLUMN MONTHLY CALENDAR GRID */}
        <div className="grid grid-cols-7 gap-1.5 bg-black/40 border border-zinc-800/80 p-3 rounded-2xl backdrop-blur-md mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
            <div key={dayName} className="text-center text-[11px] font-bold text-zinc-400 py-1 uppercase tracking-wider font-mono">
              {dayName}
            </div>
          ))}

          {/* Blank Padding cells before day 1 */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`blank-${i}`} className="h-16 rounded-xl bg-zinc-900/20 border border-transparent" />
          ))}

          {/* Days of Month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayEvts = getEventsForDay(dayNum);
            const isToday = dayNum === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            const isSelected = dayNum === selectedDay;

            return (
              <div
                key={dayNum}
                onClick={() => setSelectedDay(dayNum)}
                className={`h-16 rounded-xl p-1.5 border flex flex-col justify-between cursor-pointer transition-all ${
                  isSelected
                    ? "bg-blue-600/25 border-blue-400 text-white shadow-lg scale-102 z-10"
                    : isToday
                    ? "bg-zinc-800/80 border-blue-500/50 text-blue-300"
                    : "bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/50 text-zinc-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold font-mono ${isToday ? "bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]" : ""}`}>
                    {dayNum}
                  </span>
                  {dayEvts.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  )}
                </div>

                <div className="overflow-hidden space-y-0.5">
                  {dayEvts.slice(0, 2).map((evt, idx) => (
                    <div key={idx} className="text-[9px] bg-blue-500/20 border border-blue-400/30 text-blue-200 px-1 py-0.5 rounded truncate font-medium">
                      {evt.summary}
                    </div>
                  ))}
                  {dayEvts.length > 2 && (
                    <div className="text-[8px] text-zinc-400 font-mono">+{dayEvts.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Day Agenda View */}
        <div className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Agenda for {monthName} {selectedDay}, {year}</span>
            </h3>
            <span className="text-xs text-zinc-400 font-mono">{selectedDayEvents.length} Event(s)</span>
          </div>

          {selectedDayEvents.length === 0 ? (
            <p className="text-xs text-zinc-500 py-3 text-center">No scheduled appointments on this date.</p>
          ) : (
            selectedDayEvents.map((evt, idx) => (
              <div key={idx} className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white">{evt.summary}</h4>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono mt-1">
                    <span className="flex items-center gap-1 text-blue-300">
                      <Clock className="w-3 h-3" />
                      {new Date(evt.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {evt.location && (
                      <span className="flex items-center gap-1 text-zinc-400">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        {evt.location}
                      </span>
                    )}
                  </div>
                </div>

                {evt.htmlLink && (
                  <a
                    href={evt.htmlLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1"
                  >
                    <span>View</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-zinc-900 text-center">
        <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
          Avenly Google Calendar Interactive Grid - Synchronized with Google Workspace
        </span>
      </div>
    </div>
  );
}
