const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceHub.tsx', 'utf8');

// Add imports
if (!code.includes('deleteGoogleCalendarEvent')) {
  code = code.replace(
    /import \{\s*fetchGoogleCalendarEvents,\s*createGoogleCalendarEvent/g,
    'import { fetchGoogleCalendarEvents, createGoogleCalendarEvent, deleteGoogleCalendarEvent, updateGoogleCalendarEvent'
  );
}

// Ensure icons
if (!code.includes('Trash2')) {
  code = code.replace(/import \{([\s\S]*?)\} from "lucide-react";/, (m, g1) => {
    return 'import { ' + g1 + ', Trash2, Edit2, ChevronLeft, ChevronRight } from "lucide-react";';
  });
}

// We need to add state for editing and view
code = code.replace(
  /const \[newAppt, setNewAppt\] = useState\(\{[\s\S]*?\}\);/,
  `const [newAppt, setNewAppt] = useState({
    id: "",
    summary: "",
    location: "",
    dateStr: "",
    timeStr: "",
    description: "",
  });
  const [calendarView, setCalendarView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());`
);

// We need to modify handleCreateAppointment to handle updates too
const newCreateHandler = `  const handleCreateAppointment = async (e: FormEvent) => {
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
`;

code = code.replace(/const handleCreateAppointment = async \(e: FormEvent\) => \{[\s\S]*?finally \{\s*setLoading\(false\);\s*\}\s*\};/, newCreateHandler);

// Rewrite renderCalendarGrid
const renderGridStart = code.indexOf('const renderCalendarGrid = () => {');
const renderGridEnd = code.indexOf('// 3. GOOGLE CHAT TAB', renderGridStart);

const newRenderGrid = `
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
    const timeMatch = evt.startDateTime?.match(/T(\\d{2}:\\d{2})/);
    const time = timeMatch ? timeMatch[1] : '';
    return (
      <div key={evt.id} className="text-[10px] bg-blue-500/20 text-blue-200 p-1.5 rounded mb-1 border border-blue-500/30 group relative transition-all hover:bg-blue-500/40">
        <div className="font-bold flex justify-between items-start">
          <span className="truncate">{time} {evt.summary}</span>
        </div>
        <div className="absolute top-1 right-1 hidden group-hover:flex gap-1 bg-black/60 backdrop-blur rounded p-0.5">
          <button onClick={(e) => { e.stopPropagation(); handleEditAppointment(evt); }} className="p-1 hover:bg-white/20 rounded text-zinc-200"><Edit2 className="w-3 h-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); handleDeleteAppointment(evt.id); }} className="p-1 hover:bg-white/20 rounded text-red-400"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
    );
  };

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStrPrefix = \`\${year}-\${String(month + 1).padStart(2, '0')}\`;
    
    let content;

    if (calendarView === "month") {
      const daysInMonth = getDaysInMonth(currentDate);
      const firstDay = getFirstDayOfMonth(currentDate);
      const days = [];
      const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (let i = 0; i < firstDay; i++) {
        days.push(<div key={\`empty-\${i}\`} className="h-24 bg-black/20 rounded-xl border border-white/5" />);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = \`\${year}-\${String(month + 1).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`;
        const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
        
        const dayEvents = calendarEvents.filter(evt => evt.startDateTime?.startsWith(dateStr));

        days.push(
          <div key={\`day-\${day}\`} className={\`h-24 flex flex-col p-2 rounded-xl border transition-all relative overflow-hidden \${
            isToday ? 'bg-blue-900/30 border-blue-500/50 shadow-md shadow-blue-500/20' : 'bg-white/5 border-white/10'
          }\`}>
            <span className={\`text-xs font-bold font-mono mb-1 \${isToday ? 'text-blue-400' : 'text-zinc-400'}\`}>
              {day}
            </span>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
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
        const dStr = \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`;
        const dayEvents = calendarEvents.filter(evt => evt.startDateTime?.startsWith(dStr));
        const isToday = dStr === new Date().toISOString().split('T')[0];
        
        days.push(
          <div key={i} className={\`flex-1 flex flex-col p-2 rounded-xl border min-h-[300px] \${isToday ? 'bg-blue-900/20 border-blue-500/50' : 'bg-white/5 border-white/10'}\`}>
             <div className="text-center mb-2 pb-2 border-b border-white/10">
               <span className={\`block text-[10px] uppercase \${isToday ? 'text-blue-400' : 'text-zinc-500'}\`}>{d.toLocaleDateString('en-US', {weekday: 'short'})}</span>
               <span className={\`block text-lg font-bold \${isToday ? 'text-blue-400' : 'text-white'}\`}>{d.getDate()}</span>
             </div>
             <div className="flex-1 overflow-y-auto space-y-1">
               {dayEvents.map(evt => renderEvent(evt))}
             </div>
          </div>
        )
      }
      content = <div className="flex gap-2">{days}</div>;
    } else if (calendarView === "day") {
      const dStr = \`\${currentDate.getFullYear()}-\${String(currentDate.getMonth() + 1).padStart(2, '0')}-\${String(currentDate.getDate()).padStart(2, '0')}\`;
      const dayEvents = calendarEvents.filter(evt => evt.startDateTime?.startsWith(dStr));
      content = (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-h-[300px]">
          <h3 className="text-xl font-bold text-white mb-4">{currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
          <div className="space-y-2">
            {dayEvents.length === 0 ? <p className="text-zinc-500 text-sm">No appointments scheduled for this day.</p> : dayEvents.map(evt => renderEvent(evt))}
          </div>
        </div>
      );
    } else if (calendarView === "year") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      content = (
        <div className="grid grid-cols-3 gap-4">
          {months.map((m, idx) => {
            const mPrefix = \`\${year}-\${String(idx + 1).padStart(2, '0')}\`;
            const monthEvents = calendarEvents.filter(evt => evt.startDateTime?.startsWith(mPrefix));
            return (
              <div key={m} onClick={() => { setCalendarView('month'); const d = new Date(currentDate); d.setMonth(idx); setCurrentDate(d); }} className="bg-white/5 border border-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/10 transition-all">
                <h4 className="text-sm font-bold text-white mb-2">{m}</h4>
                <p className="text-[10px] text-zinc-400">{monthEvents.length} events</p>
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
                className={\`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all \${calendarView === v.toLowerCase() ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}\`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => changeDate(-1)} className="p-1 hover:bg-white/10 rounded-full text-zinc-300"><ChevronLeft className="w-5 h-5" /></button>
             <span className="text-sm font-bold text-white min-w-[120px] text-center">
               {calendarView === "year" ? year : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
             </span>
             <button onClick={() => changeDate(1)} className="p-1 hover:bg-white/10 rounded-full text-zinc-300"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
        {content}
      </div>
    );
  };
`;

code = code.substring(0, renderGridStart) + newRenderGrid + "\n      " + code.substring(renderGridEnd);

fs.writeFileSync('src/components/WorkspaceHub.tsx', code);
