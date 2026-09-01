import React, { useState, useEffect, FormEvent } from "react";
import { 
  FileSpreadsheet, 
  Calendar, 
  MessageSquare, 
  Users, 
  Video, 
  Plus, 
  RefreshCw, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Phone,
  Clock,
  Heart,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  syncVitalsToGoogleSheets,
  fetchVitalsFromGoogleSheets,
  fetchGoogleCalendarEvents,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  fetchGoogleContacts,
  createGoogleContact,
  sendGoogleChatMessage,
  fetchGoogleChatMessages,
  createGoogleMeetCall,
  CalendarAppointment,
  GoogleContactItem
} from "../lib/workspace";
import { VitalsState } from "../types";

interface WorkspaceHubProps {
  vitals?: VitalsState;
  onStartCall?: (contactName: string, type: "audio" | "video") => void;
  initialTab?: "sheets" | "calendar" | "chat" | "contacts" | "meet";
  userName?: string;
}

export default function WorkspaceHub({
  vitals,
  onStartCall,
  initialTab = "sheets",
  userName = "User",
}: WorkspaceHubProps) {
  const [activeTab, setActiveTab] = useState<"sheets" | "calendar" | "chat" | "contacts" | "meet">(initialTab);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sheets state
  const [sheetsResult, setSheetsResult] = useState<{ spreadsheetId: string; spreadsheetUrl: string; syncedVitals?: any } | null>(null);
  const [customVitalsInput, setCustomVitalsInput] = useState({
    heartRate: vitals?.heartRate !== "N/A" && vitals?.heartRate ? String(vitals.heartRate) : "74",
    bloodOxygen: vitals?.bloodOxygen !== "N/A" && vitals?.bloodOxygen ? String(vitals.bloodOxygen) : "98",
    skinTemperature: vitals?.skinTemperature !== "N/A" && vitals?.skinTemperature ? String(vitals.skinTemperature) : "36.7",
    hydration: vitals?.hydration !== "N/A" && vitals?.hydration ? String(vitals.hydration) : "1.8",
    steps: vitals?.steps !== "N/A" && vitals?.steps ? String(vitals.steps) : "4500",
    mood: vitals?.mood !== "N/A" && vitals?.mood ? vitals.mood : "Calm & Cheerful"
  });

  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState<CalendarAppointment[]>([]);
  const [showAddAppt, setShowAddAppt] = useState(false);
  const [newAppt, setNewAppt] = useState({
    id: "",
    summary: "",
    location: "",
    dateStr: "",
    timeStr: "",
    description: "",
  });
  const [calendarView, setCalendarView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Chat state - 0 pre-messages initial state
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ sender: string; text: string; time: string; avatar?: string }[]>([]);

  // Contacts state
  const [contacts, setContacts] = useState<GoogleContactItem[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "Dr. Ananya Roy",
    phone: "+1 555-019-2834",
    email: "ananya.roy@healthclinic.org",
    relationship: "Physiotherapist",
  });

  // Meet state
  const [meetUrl, setMeetUrl] = useState<string | null>(null);

  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  // Auto-fetch data on tab switch
  useEffect(() => {
    if (activeTab === "calendar") {
      loadCalendarEvents();
    } else if (activeTab === "contacts") {
      loadContacts();
    } else if (activeTab === "chat") {
      loadChatMessages();
    } else if (activeTab === "sheets") {
      loadSheetsData();
    }
  }, [activeTab]);

  const loadChatMessages = async () => {
    setLoading(true);
    try {
      const msgs = await fetchGoogleChatMessages();
      setChatHistory(msgs);
    } catch (err: any) {
      console.warn("Google Chat fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSheetsData = async () => {
    setLoading(true);
    try {
      const sheetsVitals = await fetchVitalsFromGoogleSheets();
      if (sheetsVitals) {
        setCustomVitalsInput({
          heartRate: String(sheetsVitals.heartRate || 74),
          bloodOxygen: String(sheetsVitals.bloodOxygen || 98),
          skinTemperature: String(sheetsVitals.skinTemperature || 36.7),
          hydration: String(sheetsVitals.hydration || 1.8),
          steps: String(sheetsVitals.steps || 4500),
          mood: sheetsVitals.mood || "Calm & Cheerful"
        });
      }
    } catch (err) {
      console.warn("Google Sheets fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarEvents = async () => {
    setLoading(true);
    try {
      const events = await fetchGoogleCalendarEvents();
      setCalendarEvents(events);
    } catch (err: any) {
      console.warn("Google Calendar fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    setLoading(true);
    try {
      const list = await fetchGoogleContacts();
      setContacts(list);
    } catch (err: any) {
      console.warn("Google Contacts fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncVitals = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const vitalsPayload = {
        heartRate: isNaN(Number(customVitalsInput.heartRate)) ? customVitalsInput.heartRate : Number(customVitalsInput.heartRate),
        oxygen: isNaN(Number(customVitalsInput.bloodOxygen)) ? customVitalsInput.bloodOxygen : Number(customVitalsInput.bloodOxygen),
        skinTemperature: isNaN(Number(customVitalsInput.skinTemperature)) ? customVitalsInput.skinTemperature : Number(customVitalsInput.skinTemperature),
        hydration: isNaN(Number(customVitalsInput.hydration)) ? customVitalsInput.hydration : Number(customVitalsInput.hydration),
        steps: isNaN(Number(customVitalsInput.steps)) ? customVitalsInput.steps : Number(customVitalsInput.steps),
        mood: customVitalsInput.mood,
        isFallDetected: vitals?.isFallDetected || false,
      };
      
      const res = await syncVitalsToGoogleSheets(vitalsPayload);
      setSheetsResult(res);
      setStatusMsg({ type: "success", text: "Successfully logged custom vitals to Google Sheets!" });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to log vitals to Google Sheets." });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAppt.summary || !newAppt.dateStr || !newAppt.timeStr) return;
    setLoading(true);
    try {
      if (newAppt.id) {
        await updateGoogleCalendarEvent(newAppt.id, newAppt);
        setStatusMsg({ type: "success", text: "Appointment updated!" });
      } else {
        await createGoogleCalendarEvent(newAppt);
        setStatusMsg({ type: "success", text: "Appointment created!" });
      }
      setShowAddAppt(false);
      setNewAppt({ id: "", summary: "", location: "", dateStr: "", timeStr: "", description: "" });
      loadCalendarEvents();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to save appointment." });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;
    setLoading(true);
    try {
      await deleteGoogleCalendarEvent(id);
      setStatusMsg({ type: "success", text: "Appointment deleted!" });
      loadCalendarEvents();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to delete appointment." });
    } finally {
      setLoading(false);
    }
  };

  const handleEditAppointment = (evt: any) => {
    const startObj = new Date(evt.startDateTime);
    const dateStr = startObj.toISOString().split('T')[0];
    const timeStr = startObj.toTimeString().substring(0, 5);
    
    setNewAppt({
      id: evt.id || "",
      summary: evt.summary,
      location: evt.location || "",
      description: evt.description || "",
      dateStr,
      timeStr
    });
    setShowAddAppt(true);
  };

  const handleSendChatMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setLoading(true);
    try {
      await sendGoogleChatMessage(chatMessage);
      setChatHistory((prev) => [
        ...prev,
        { sender: "You", text: chatMessage, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
      setChatMessage("");
      setStatusMsg({ type: "success", text: "Message posted to Google Chat." });
      setTimeout(loadChatMessages, 1000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to send message." });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContact = async (e: FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    setLoading(true);
    try {
      await createGoogleContact(newContact);
      setStatusMsg({ type: "success", text: "Google Contact created!" });
      setShowAddContact(false);
      loadContacts();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to create Google Contact." });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeet = async () => {
    setLoading(true);
    try {
      const res = await createGoogleMeetCall();
      setMeetUrl(res.meetUrl);
      setStatusMsg({ type: "success", text: "Google Meet call created successfully." });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Failed to create Google Meet call." });
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const changeDate = (amount: number) => {
    const newDate = new Date(currentDate);
    if (calendarView === "month") newDate.setMonth(newDate.getMonth() + amount);
    if (calendarView === "week") newDate.setDate(newDate.getDate() + amount * 7);
    if (calendarView === "day") newDate.setDate(newDate.getDate() + amount);
    if (calendarView === "year") newDate.setFullYear(newDate.getFullYear() + amount);
    setCurrentDate(newDate);
  };

  const renderEvent = (evt: any) => {
    const timeMatch = evt.startDateTime?.match(/T(\d{2}:\d{2})/);
    const time = timeMatch ? timeMatch[1] : '';
    return (
      <div key={evt.id} className="text-[10px] bg-blue-500/20 text-blue-200 p-1.5 rounded mb-1 border border-blue-500/30 group relative transition-all hover:bg-blue-500/40 cursor-pointer">
        <div className="font-bold flex justify-between items-start">
          <span className="truncate pr-4">{time} {evt.summary}</span>
        </div>
        <div className="absolute top-1 right-1 hidden group-hover:flex gap-1 bg-black/60 backdrop-blur rounded p-0.5">
          <button onClick={(e) => { e.stopPropagation(); handleEditAppointment(evt); }} className="p-1 hover:bg-white/20 rounded text-zinc-200" title="Edit"><Edit2 className="w-3 h-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); handleDeleteAppointment(evt.id); }} className="p-1 hover:bg-white/20 rounded text-red-400" title="Delete"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
    );
  };

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStrPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    let content;

    if (calendarView === "month") {
      const daysInMonth = getDaysInMonth(currentDate);
      const firstDay = getFirstDayOfMonth(currentDate);
      const days = [];
      const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-24 bg-black/20 rounded-xl border border-white/5" />);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
        
        const dayEvents = calendarEvents.filter(evt => evt.startDateTime?.startsWith(dateStr));

        days.push(
          <div key={`day-${day}`} className={`h-24 flex flex-col p-2 rounded-xl border transition-all relative overflow-hidden ${
            isToday ? 'bg-blue-900/30 border-blue-500/50 shadow-md shadow-blue-500/20' : 'bg-white/5 border-white/10'
          }`}>
            <span className={`text-xs font-bold font-mono mb-1 ${isToday ? 'text-blue-400' : 'text-zinc-400'}`}>
              {day}
            </span>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 pr-1">
              {dayEvents.map(evt => renderEvent(evt))}
            </div>
          </div>
        );
      }

      content = (
        <div>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days}
          </div>
        </div>
      );
    } else if (calendarView === "week") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const days = [];
      for(let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayEvents = calendarEvents.filter(evt => evt.startDateTime?.startsWith(dStr));
        const isToday = dStr === new Date().toISOString().split('T')[0];
        
        days.push(
          <div key={i} className={`flex-1 flex flex-col p-2 rounded-xl border min-h-[300px] ${isToday ? 'bg-blue-900/20 border-blue-500/50' : 'bg-white/5 border-white/10'}`}>
             <div className="text-center mb-2 pb-2 border-b border-white/10">
               <span className={`block text-[10px] uppercase ${isToday ? 'text-blue-400' : 'text-zinc-500'}`}>{d.toLocaleDateString('en-US', {weekday: 'short'})}</span>
               <span className={`block text-lg font-bold ${isToday ? 'text-blue-400' : 'text-white'}`}>{d.getDate()}</span>
             </div>
             <div className="flex-1 overflow-y-auto space-y-1 pr-1">
               {dayEvents.map(evt => renderEvent(evt))}
             </div>
          </div>
        )
      }
      content = <div className="flex gap-2 overflow-x-auto">{days}</div>;
    } else if (calendarView === "day") {
      const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const dayEvents = calendarEvents.filter(evt => evt.startDateTime?.startsWith(dStr));
      content = (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-h-[300px]">
          <h3 className="text-xl font-bold text-white mb-4">{currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
          <div className="space-y-2">
            {dayEvents.length === 0 ? <p className="text-zinc-500 text-sm font-mono">No appointments scheduled for this day.</p> : dayEvents.map(evt => renderEvent(evt))}
          </div>
        </div>
      );
    } else if (calendarView === "year") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      content = (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {months.map((m, idx) => {
            const mPrefix = `${year}-${String(idx + 1).padStart(2, '0')}`;
            const monthEvents = calendarEvents.filter(evt => evt.startDateTime?.startsWith(mPrefix));
            const hasEvents = monthEvents.length > 0;
            return (
              <div 
                key={m} 
                onClick={() => { setCalendarView('month'); const d = new Date(currentDate); d.setMonth(idx); setCurrentDate(d); }} 
                className={`border rounded-xl p-4 cursor-pointer transition-all ${hasEvents ? 'bg-blue-900/10 border-blue-500/20 hover:bg-blue-900/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
              >
                <h4 className="text-sm font-bold text-white mb-2">{m}</h4>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-zinc-400 font-mono">{monthEvents.length} events</p>
                  {hasEvents && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                </div>
              </div>
            )
          })}
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
            {["Day", "Week", "Month", "Year"].map(v => (
              <button 
                key={v}
                onClick={() => setCalendarView(v.toLowerCase())}
                className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${calendarView === v.toLowerCase() ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => changeDate(-1)} className="p-1 hover:bg-white/10 rounded-full text-zinc-300"><ChevronLeft className="w-5 h-5" /></button>
             <span className="text-sm font-bold text-white min-w-[120px] text-center font-mono">
               {calendarView === "year" ? year : currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
             </span>
             <button onClick={() => changeDate(1)} className="p-1 hover:bg-white/10 rounded-full text-zinc-300"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
        {content}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
      {/* Dynamic Status Alert Top */}
      {statusMsg && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold animate-fadeIn shadow-lg ${
          statusMsg.type === "success" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"
        }`}>
          {statusMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {statusMsg.text}
        </div>
      )}

      <div className="p-4 bg-white/5 border-b border-white/5 flex gap-2 overflow-x-auto no-scrollbar pb-3">
        <button
          onClick={() => setActiveTab("sheets")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "sheets" ? "bg-emerald-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Google Sheets</span>
        </button>

        <button
          onClick={() => setActiveTab("calendar")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "calendar" ? "bg-blue-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Google Calendar</span>
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "chat" ? "bg-purple-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Google Chat</span>
        </button>

        <button
          onClick={() => setActiveTab("contacts")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "contacts" ? "bg-amber-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Contacts</span>
        </button>

        <button
          onClick={() => setActiveTab("meet")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "meet" ? "bg-rose-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Google Meet</span>
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {/* 1. GOOGLE SHEETS TAB */}
        {activeTab === "sheets" && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Google Sheets Health Vitals Sync</h4>
                    <p className="text-xs text-zinc-400">Export or customize health readings stored directly in Google Sheets (Spreadsheet: 1MDfS...).</p>
                  </div>
                </div>
                <button
                  onClick={loadSheetsData}
                  disabled={loading}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-300 text-xs font-mono font-bold flex items-center gap-1.5"
                  title="Fetch latest values from Google Sheets"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>Fetch From Sheets</span>
                </button>
              </div>

              {/* Custom Data Input Grid */}
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono block">
                  Data Values To Log / Sync
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 font-medium block mb-1">Heart Rate (BPM)</label>
                    <input
                      type="text"
                      value={customVitalsInput.heartRate}
                      onChange={(e) => setCustomVitalsInput({ ...customVitalsInput, heartRate: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 font-medium block mb-1">Blood Oxygen (SpO2 %)</label>
                    <input
                      type="text"
                      value={customVitalsInput.bloodOxygen}
                      onChange={(e) => setCustomVitalsInput({ ...customVitalsInput, bloodOxygen: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 font-medium block mb-1">Skin Temp (°C)</label>
                    <input
                      type="text"
                      value={customVitalsInput.skinTemperature}
                      onChange={(e) => setCustomVitalsInput({ ...customVitalsInput, skinTemperature: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 font-medium block mb-1">Hydration (L)</label>
                    <input
                      type="text"
                      value={customVitalsInput.hydration}
                      onChange={(e) => setCustomVitalsInput({ ...customVitalsInput, hydration: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 font-medium block mb-1">Daily Steps</label>
                    <input
                      type="text"
                      value={customVitalsInput.steps}
                      onChange={(e) => setCustomVitalsInput({ ...customVitalsInput, steps: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 font-medium block mb-1">Mood Status</label>
                    <input
                      type="text"
                      value={customVitalsInput.mood}
                      onChange={(e) => setCustomVitalsInput({ ...customVitalsInput, mood: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSyncVitals}
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Sync & Export Vitals Data to Google Sheets</span>
              </button>
              
              {sheetsResult && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">Data Synced Successfully!</span>
                    <a 
                      href={sheetsResult.spreadsheetUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      Open Google Sheets
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[11px] font-mono text-zinc-300 pt-1 border-t border-emerald-500/20">
                    <div>HR: <strong className="text-white">{customVitalsInput.heartRate} BPM</strong></div>
                    <div>SpO2: <strong className="text-white">{customVitalsInput.bloodOxygen}%</strong></div>
                    <div>Temp: <strong className="text-white">{customVitalsInput.skinTemperature}°C</strong></div>
                    <div>Water: <strong className="text-white">{customVitalsInput.hydration}L</strong></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. GOOGLE CALENDAR TAB */}
        {activeTab === "calendar" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  Google Calendar 
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">Manage doctor appointments and care schedules.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={loadCalendarEvents} disabled={loading} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-300">
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => {
                    setNewAppt({ id: "", summary: "", location: "", dateStr: "", timeStr: "", description: "" });
                    setShowAddAppt(!showAddAppt);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddAppt ? "Cancel" : "Add Appointment"}</span>
                </button>
              </div>
            </div>

            {showAddAppt && (
              <form onSubmit={handleCreateAppointment} className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-2xl space-y-3 animate-fadeIn mb-4">
                <h5 className="text-xs font-bold text-blue-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  {newAppt.id ? "Edit Appointment Details" : "New Appointment Details"}
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" placeholder="Appointment Title" value={newAppt.summary} onChange={(e) => setNewAppt({ ...newAppt, summary: e.target.value })} className="bg-black/50 border border-white/10 px-3 py-2 rounded-xl text-xs text-white outline-none" required />
                  <input type="text" placeholder="Location" value={newAppt.location} onChange={(e) => setNewAppt({ ...newAppt, location: e.target.value })} className="bg-black/50 border border-white/10 px-3 py-2 rounded-xl text-xs text-white outline-none" />
                  <input type="date" value={newAppt.dateStr} onChange={(e) => setNewAppt({ ...newAppt, dateStr: e.target.value })} className="bg-black/50 border border-white/10 px-3 py-2 rounded-xl text-xs text-white outline-none" required />
                  <input type="time" value={newAppt.timeStr} onChange={(e) => setNewAppt({ ...newAppt, timeStr: e.target.value })} className="bg-black/50 border border-white/10 px-3 py-2 rounded-xl text-xs text-white outline-none" required />
                </div>
                <textarea placeholder="Description / Medical notes" value={newAppt.description} onChange={(e) => setNewAppt({ ...newAppt, description: e.target.value })} className="w-full bg-black/50 border border-white/10 px-3 py-2 rounded-xl text-xs text-white outline-none h-16" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddAppt(false)} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl">Cancel</button>
                  <button type="submit" disabled={loading} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md">
                    {newAppt.id ? "Update Event" : "Save to Google Calendar"}
                  </button>
                </div>
              </form>
            )}

            <div className="bg-black/20 p-4 rounded-2xl border border-white/10">
              {renderCalendarGrid()}
            </div>
          </div>
        )}

        {/* 3. GOOGLE CHAT TAB */}
        {activeTab === "chat" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  Google Chat
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">Post health updates and view family space conversations.</p>
              </div>
              <button
                onClick={loadChatMessages}
                disabled={loading}
                className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
                title="Refresh Google Chat space messages"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh Chats</span>
              </button>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-4 h-48 overflow-y-auto space-y-2 text-xs">
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500 font-mono">
                  <MessageSquare className="w-6 h-6 mb-2 text-purple-400/50" />
                  <p className="text-xs text-zinc-400 font-sans font-medium">0 previous messages in Google Chat space.</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Type a message below to post to the space, or click Refresh Chats.</p>
                </div>
              ) : (
                chatHistory.map((msg, idx) => (
                  <div key={idx} className="p-2.5 bg-white/5 rounded-xl border border-white/5 flex gap-2.5 items-start">
                    {msg.avatar ? (
                      <img src={msg.avatar} alt={msg.sender} className="w-7 h-7 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center font-bold text-purple-300 text-[10px] shrink-0">
                        {msg.sender.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[10px] text-purple-300 font-bold mb-0.5">
                        <span className="truncate">{msg.sender}</span>
                        <span className="text-zinc-500 font-mono shrink-0">{msg.time}</span>
                      </div>
                      <p className="text-zinc-200 text-xs font-sans leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChatMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Type message for Google Chat space..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 px-4 py-2.5 rounded-xl text-xs text-white outline-none focus:border-purple-500 transition-all"
              />
              <button
                type="submit"
                disabled={loading || !chatMessage.trim()}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 shrink-0 disabled:opacity-50"
              >
                Post to Google Chat
              </button>
            </form>
          </div>
        )}

        {/* 4. GOOGLE CONTACTS TAB */}
        {activeTab === "contacts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Google Contacts
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">Manage emergency & doctor contacts.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={loadContacts} disabled={loading} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-300">
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button onClick={() => setShowAddContact(!showAddContact)} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md">
                  <Plus className="w-4 h-4" />
                  <span>Add Contact</span>
                </button>
              </div>
            </div>

            {showAddContact && (
              <form onSubmit={handleCreateContact} className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3 animate-fadeIn">
                <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">New Google Contact</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" placeholder="Full Name" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} className="bg-black/50 border border-white/10 px-3 py-2 rounded-xl text-xs text-white outline-none" required />
                  <input type="text" placeholder="Relationship / Specialty" value={newContact.relationship} onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })} className="bg-black/50 border border-white/10 px-3 py-2 rounded-xl text-xs text-white outline-none" />
                  <input type="tel" placeholder="Phone Number" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} className="bg-black/50 border border-white/10 px-3 py-2 rounded-xl text-xs text-white outline-none" required />
                  <input type="email" placeholder="Email Address" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} className="bg-black/50 border border-white/10 px-3 py-2 rounded-xl text-xs text-white outline-none" />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddContact(false)} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl">Cancel</button>
                  <button type="submit" disabled={loading} className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md">Save to Google Contacts</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contacts.length === 0 ? (
                <div className="col-span-2 bg-white/5 border border-white/10 p-6 rounded-2xl text-center">
                  <p className="text-xs text-zinc-400">Click "Refresh" or add contacts to sync.</p>
                </div>
              ) : (
                contacts.map((c, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 p-3.5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-bold text-amber-300">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">{c.name}</h5>
                        <p className="text-[11px] text-zinc-400 font-mono">{c.phone || c.email}</p>
                      </div>
                    </div>
                    {onStartCall && c.phone && (
                      <button onClick={() => onStartCall(c.name, "video")} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30" title="Video Call">
                        <Phone className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 5. GOOGLE MEET TAB */}
        {activeTab === "meet" && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center space-y-4">
              <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/30 rounded-3xl flex items-center justify-center mx-auto text-rose-400">
                <Video className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">Google Meet Virtual Care</h4>
                <p className="text-xs text-zinc-400">Generate an instant meeting link for doctor consultations.</p>
              </div>
              <button
                onClick={handleCreateMeet}
                disabled={loading}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 mx-auto shadow-lg shadow-rose-900/20 transition-all active:scale-95"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Generate Meet Link
              </button>
              
              {meetUrl && (
                <div className="pt-4 border-t border-white/10">
                  <span className="text-[10px] text-zinc-400 font-mono block">Active Meet Link:</span>
                  <a href={meetUrl} target="_blank" rel="noreferrer" className="text-xs font-mono text-rose-400 hover:underline flex items-center justify-center gap-1 mt-1">
                    {meetUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
