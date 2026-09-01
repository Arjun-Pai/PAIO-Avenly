import { useState, useEffect } from "react";
import {
  Shield,
  Eye,
  Lock,
  Unlock,
  Lightbulb,
  Bell,
  UserCheck,
  ShieldAlert,
  PhoneCall,
  CheckCircle,
  MapPin,
  Volume2,
  Mic,
  AlertTriangle,
  Heart,
  Clock,
  Radio,
  FileText,
  Activity
} from "lucide-react";
import { SecurityAlert, MedicalIDInfo, GeofenceState } from "../types";

interface CaregiverViewProps {
  alerts: SecurityAlert[];
  onTriggerFall: () => void;
  onClearAlerts: () => void;
}

export default function CaregiverView({
  alerts,
  onTriggerFall,
  onClearAlerts,
}: CaregiverViewProps) {
  const [isLocked, setIsLocked] = useState(true);
  const [isLightOn, setIsLightOn] = useState(false);
  const [isLidClosed, setIsLidClosed] = useState(true);
  const [activeSpeech, setActiveSpeech] = useState<string | null>(null);
  const [isRingingDevice, setIsRingingDevice] = useState(false);
  const [activeTab, setActiveTab] = useState<"security" | "geofence" | "medical_id" | "voice_notes">("security");

  const [geofence, setGeofence] = useState<GeofenceState>({
    status: "inside",
    safeZoneName: "Home (742 Evergreen Terr)",
    currentDistanceMeters: 14,
    radiusMeters: 250,
    lastUpdate: "Just now",
  });

  const [medicalId, setMedicalId] = useState<MedicalIDInfo | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<string>("OK today at 8:15 AM");

  useEffect(() => {
    fetch("/api/medical-id")
      .then((res) => res.json())
      .then((data) => {
        if (data.medicalId) setMedicalId(data.medicalId);
      })
      .catch(() => {});

    fetch("/api/geofence")
      .then((res) => res.json())
      .then((data) => {
        if (data) setGeofence(data);
      })
      .catch(() => {});
  }, []);

  const triggerRingDevice = () => {
    setIsRingingDevice(true);
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
      // Ignore
    }
    setTimeout(() => setIsRingingDevice(false), 3000);
  };

  const speakPresetMessage = (messageText: string) => {
    setActiveSpeech(messageText);
    try {
      const u = new SpeechSynthesisUtterance(messageText);
      u.rate = 1.0;
      window.speechSynthesis.speak(u);
    } catch (e) {
      // Ignore
    }
    setTimeout(() => {
      setActiveSpeech(null);
    }, 4000);
  };

  return (
    <div className="w-full h-full p-6 animate-fadeIn select-none flex flex-col justify-between">
      
      {/* View Tabs */}
      <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("security")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === "security"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Home & Security
          </button>
          <button
            onClick={() => setActiveTab("geofence")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === "geofence"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            GPS Geofence
          </button>
          <button
            onClick={() => setActiveTab("medical_id")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === "medical_id"
                ? "bg-rose-600 text-white shadow-md shadow-rose-900/20"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Medical ID Card
          </button>
          <button
            onClick={() => setActiveTab("voice_notes")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === "voice_notes"
                ? "bg-purple-600 text-white shadow-md shadow-purple-900/20"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            Voice Broadcast
          </button>
        </div>

        {/* Inactivity & Check-In Badges */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Check-in: <strong>{checkInStatus}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Motion: <strong>Active 8m ago</strong></span>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "security" && (
        <div className="grid grid-cols-12 gap-5 items-stretch">
          
          {/* Live Front Door Camera Monitor feed */}
          <div className="col-span-7 glass-card rounded-3xl p-4 border border-zinc-800 flex flex-col justify-between h-[210px] relative overflow-hidden">
            
            {/* Simulated Video feed of Front Door */}
            <div className="absolute inset-0 bg-black relative">
              <img
                src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&fit=crop"
                alt="Front Door Stream"
                className="w-full h-full object-cover opacity-50 blur-[0.5px]"
                referrerPolicy="no-referrer"
              />
              {/* Delivery Man Overlay Figure */}
              <div className="absolute top-[28%] left-[45%] w-24 h-36 flex flex-col items-center justify-center animate-pulse">
                <div className="w-10 h-10 rounded-full bg-amber-200 border-2 border-zinc-800" />
                <div className="w-14 h-24 bg-blue-600 rounded-xl border border-zinc-800 mt-1 flex items-center justify-center text-[10px] text-white font-bold uppercase">
                  DHL Delivery
                </div>
              </div>

              {/* Subtle overlay elements */}
              <div className="absolute top-3 left-3 bg-red-600/80 text-white font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded tracking-widest animate-pulse">
                ● Live Feed
              </div>
              <div className="absolute top-3 right-3 bg-black/60 text-zinc-300 font-mono text-[9px] px-2 py-0.5 rounded border border-zinc-800">
                Cam 01: Front Porch
              </div>

              {/* Talk audio overlay subtitles */}
              {activeSpeech && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-black/85 border border-zinc-800 text-amber-300 font-medium px-4 py-1.5 rounded-xl text-xs max-w-sm text-center">
                  Speaking: "{activeSpeech}"
                </div>
              )}
            </div>

            {/* Video Control Overlays at bottom of camera feed */}
            <div className="z-10 flex gap-2 w-full">
              <button
                onClick={() => speakPresetMessage("Please leave the package on the front table, thank you.")}
                className="flex-1 py-1.5 bg-black/75 hover:bg-black/90 text-white rounded-lg text-[10px] font-bold border border-zinc-800 transition-colors"
              >
                🎤 "Leave package"
              </button>
              <button
                onClick={() => speakPresetMessage("I am inside, please wait just a moment.")}
                className="flex-1 py-1.5 bg-black/75 hover:bg-black/90 text-white rounded-lg text-[10px] font-bold border border-zinc-800 transition-colors"
              >
                🎤 "Wait one moment"
              </button>
              <button
                onClick={() => setIsLightOn(!isLightOn)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                  isLightOn ? "bg-amber-500/20 border-amber-500/30 text-amber-300" : "bg-black/75 border-zinc-800 text-zinc-400"
                }`}
              >
                <Lightbulb className="w-3 h-3" />
                {isLightOn ? "Lights ON" : "Lights OFF"}
              </button>
            </div>
          </div>

          {/* Smart Home connected statuses */}
          <div className="col-span-5 glass-card rounded-3xl p-5 border border-zinc-800 flex flex-col justify-between h-[210px]">
            <div>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Shield className="w-4.5 h-4.5 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Avenly Safe Home</span>
              </div>
              <h3 className="text-sm font-semibold text-zinc-300 mt-1">Smart Device Controls</h3>
            </div>

            <div className="space-y-2">
              {/* Front door lock */}
              <div className="flex items-center justify-between p-2 bg-[#17181e] rounded-xl border border-zinc-900">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isLocked ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                    {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-bold text-zinc-300">Front Door Lock</span>
                </div>
                <button
                  onClick={() => setIsLocked(!isLocked)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    isLocked ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-red-950/40 text-red-400 border border-red-900/30"
                  }`}
                >
                  {isLocked ? "Unlock Door" : "Lock Door"}
                </button>
              </div>

              {/* Ring / Siren Locator Button */}
              <div className="flex items-center justify-between p-2 bg-[#17181e] rounded-xl border border-zinc-900">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-zinc-300">Lost Hub Finder</span>
                </div>
                <button
                  onClick={triggerRingDevice}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    isRingingDevice ? "bg-amber-500 text-black animate-bounce" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  }`}
                >
                  {isRingingDevice ? "Ringing..." : "Ring Hub Siren"}
                </button>
              </div>
            </div>

            <button
              onClick={onTriggerFall}
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-red-900/10 flex items-center justify-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
              Trigger Fall Safety Alarm
            </button>
          </div>

        </div>
      )}

      {/* GPS Geofence Tab */}
      {activeTab === "geofence" && (
        <div className="glass-card rounded-3xl p-5 border border-zinc-800 h-[210px] flex items-center justify-between gap-6">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <Radio className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Active GPS Geofence Safe Zone</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              Status: <span className="text-emerald-400">Inside Safe Boundary</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Safe Zone: <strong className="text-zinc-200">{geofence.safeZoneName}</strong>
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-mono">Current Distance</span>
                <p className="font-bold text-white mt-0.5">{geofence.currentDistanceMeters}m from center</p>
              </div>
              <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-mono">Safe Perimeter</span>
                <p className="font-bold text-white mt-0.5">{geofence.radiusMeters}m radius</p>
              </div>
              <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-mono">GPS Accuracy</span>
                <p className="font-bold text-emerald-400 mt-0.5">High (±3 meters)</p>
              </div>
            </div>
          </div>

          {/* Radar Visualization */}
          <div className="w-40 h-40 rounded-full border border-emerald-500/30 bg-emerald-950/20 relative flex items-center justify-center shrink-0 overflow-hidden">
            <div className="absolute inset-2 rounded-full border border-emerald-500/20" />
            <div className="absolute inset-8 rounded-full border border-dashed border-emerald-500/40" />
            {/* Center Home */}
            <div className="w-3 h-3 bg-blue-500 rounded-full z-10 shadow-lg shadow-blue-500/50" />
            {/* Person pin */}
            <div className="absolute top-[42%] left-[54%] w-3 h-3 bg-emerald-400 rounded-full z-10 animate-ping" />
            <div className="absolute top-[42%] left-[54%] w-3 h-3 bg-emerald-400 rounded-full z-10" />
            {/* Radar sweep */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-500/10 to-transparent animate-spin duration-3000 origin-center" />
          </div>
        </div>
      )}

      {/* Medical ID Tab */}
      {activeTab === "medical_id" && (
        <div className="glass-card rounded-3xl p-5 border border-zinc-800 h-[210px] overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2 text-rose-400">
              <Heart className="w-4 h-4 fill-rose-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Paramedic Emergency Medical ID</span>
            </div>
            <span className="text-xs text-zinc-400 font-mono">DNR: <strong className="text-amber-400">{medicalId?.dnrStatus || "No (Full Code)"}</strong></span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Blood Type</span>
              <p className="font-bold text-rose-400 text-sm mt-0.5">{medicalId?.bloodType || "A+"}</p>
            </div>
            <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Allergies</span>
              <p className="font-bold text-amber-300 mt-0.5">{medicalId?.allergies?.join(", ") || "Penicillin, Shellfish"}</p>
            </div>
            <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Primary Physician</span>
              <p className="font-bold text-zinc-200 mt-0.5">{medicalId?.primaryDoctor || "Dr. Rajesh Sharma"}</p>
              <p className="text-[10px] text-zinc-500 font-mono">{medicalId?.doctorPhone || "(555) 234-5678"}</p>
            </div>
            <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Emergency Contact</span>
              <p className="font-bold text-zinc-200 mt-0.5">{medicalId?.emergencyContactName || "Sarah (Daughter)"}</p>
              <p className="text-[10px] text-zinc-500 font-mono">{medicalId?.emergencyContactPhone || "(555) 987-6543"}</p>
            </div>
          </div>

          <div className="mt-3 p-2.5 bg-zinc-900/40 rounded-xl border border-zinc-800/80 text-xs flex items-center justify-between">
            <span className="text-zinc-400">Conditions: <strong className="text-zinc-200">{medicalId?.conditions?.join(", ") || "Hypertension, Mild Osteoarthritis"}</strong></span>
            <span className="text-[10px] text-zinc-500 font-mono">Synced to local NFC tag</span>
          </div>
        </div>
      )}

      {/* Voice Notes Tab */}
      {activeTab === "voice_notes" && (
        <div className="glass-card rounded-3xl p-5 border border-zinc-800 h-[210px] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-purple-400">
              <Mic className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Family Voice Encouragement Broadcast</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Send an uplifting voice note directly to Margret's Avenly Hub speaker with one click.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => speakPresetMessage("Good morning mom! Have a wonderful day, we love you so much!")}
              className="p-3 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-800/40 rounded-xl text-left transition-colors"
            >
              <span className="text-xs font-bold text-purple-200 block">🌅 Morning Greeting</span>
              <span className="text-[10px] text-purple-400 mt-1 block">"Good morning mom! Have a wonderful day..."</span>
            </button>
            <button
              onClick={() => speakPresetMessage("Hi grandma! Just wanted to say I aced my math test today! See you on Sunday!")}
              className="p-3 bg-blue-950/30 hover:bg-blue-900/40 border border-blue-800/40 rounded-xl text-left transition-colors"
            >
              <span className="text-xs font-bold text-blue-200 block">👧 Granddaughter Update</span>
              <span className="text-[10px] text-blue-400 mt-1 block">"Hi grandma! Just wanted to say..."</span>
            </button>
            <button
              onClick={() => speakPresetMessage("Don't forget to drink a fresh glass of water and enjoy your garden walk today!")}
              className="p-3 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-800/40 rounded-xl text-left transition-colors"
            >
              <span className="text-xs font-bold text-emerald-200 block">💧 Hydration & Walk Note</span>
              <span className="text-[10px] text-emerald-400 mt-1 block">"Don't forget to drink a fresh glass..."</span>
            </button>
          </div>

          <div className="text-[10px] text-zinc-500 text-center font-mono">
            Transmits high-fidelity natural TTS audio to hub speaker immediately
          </div>
        </div>
      )}

      {/* Security Alerts timeline log list */}
      <div className="flex-1 flex flex-col justify-between mt-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-500 font-medium">Activity Monitoring</span>
            <h4 className="text-sm font-bold text-zinc-300 mt-0.5">Recent Security & Care Events</h4>
          </div>

          {alerts.length > 0 && (
            <button
              onClick={onClearAlerts}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 underline font-semibold"
            >
              Clear Logs
            </button>
          )}
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-hidden no-scrollbar space-y-1.5 my-2 max-h-[110px] pr-1">
          {alerts.length === 0 ? (
            <div className="h-16 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl text-zinc-600 text-xs">
              <CheckCircle className="w-5 h-5 mb-1 text-zinc-700" />
              <span>No alerts or security events registered today</span>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-2.5 bg-[#13151a] border border-zinc-900 hover:border-zinc-800 rounded-xl flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-zinc-200 select-text">{alert.title}</h5>
                    <p className="text-[10px] text-zinc-500 mt-0.5 select-text">{alert.description}</p>
                  </div>
                </div>

                <span className="text-[9px] text-zinc-600 font-mono font-medium shrink-0 ml-1">{alert.time}</span>
              </div>
            ))
          )}
        </div>

        {/* Bottom instructions */}
        <div className="text-[10px] text-zinc-500 text-center uppercase tracking-wider select-none font-mono">
          Caregiver logs are encrypted and synchronized instantly to the companion portal
        </div>

      </div>

    </div>
  );
}
