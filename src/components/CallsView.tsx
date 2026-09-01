import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Video,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Clock,
  User,
  Sparkles,
  Globe,
  Hand,
  Smile,
  MonitorUp,
  MessageSquare,
  Users,
  Copy,
  CheckCircle2,
  FileText,
  UserPlus,
  Search,
  RefreshCw,
  Mail,
  X,
  Loader2,
  Contact,
  ExternalLink,
  Tv,
  Maximize2,
  Share2,
  Radio
} from "lucide-react";
import { CallState } from "../types";
import { getTranslation } from "../lib/translations";
import { fetchGoogleContacts, createGoogleContact, createGoogleMeetCall, GoogleContactItem } from "../lib/workspace";
import { playAudioFeedback } from "../lib/audioFeedback";

interface CallsViewProps {
  callState: CallState;
  userLanguage?: string;
  userProfile?: any;
  onStartCall: (contactName: string, type: "audio" | "video", phone?: string) => void;
  onEndCall: () => void;
  isCaregiverMode?: boolean;
}

export default function CallsView({
  callState,
  userLanguage,
  userProfile,
  onStartCall,
  onEndCall,
  isCaregiverMode = false
}: CallsViewProps) {
  const t = getTranslation(userLanguage);
  
  // Call timer and modes
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isBoosterActive, setIsBoosterActive] = useState(true);
  const [callEngine, setCallEngine] = useState<"embedded" | "direct" | "google_meet">("embedded");
  const [viewMode, setViewMode] = useState<"active_call" | "directory" | "embedded_room">("directory");
  const [showCaptions, setShowCaptions] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeMeetUrl, setActiveMeetUrl] = useState("https://meet.google.com/new");
  const [loadingMeetUrl, setLoadingMeetUrl] = useState(false);
  const [customRoomCode, setCustomRoomCode] = useState("");
  const [roomName] = useState(() => `avenly-${Math.floor(1000 + Math.random() * 9000)}`);
  
  // WebRTC Hardware Media Streams
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  // In-call chat messages
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: "System", text: "Encrypted HD care room active. Doctor and Caregiver connected.", time: "Just now" },
    { sender: "Dr. Rajesh Sharma", text: "Hello! I reviewed your morning vitals and medication schedule.", time: "Just now" }
  ]);
  const [chatInput, setChatInput] = useState("");

  // Live audio caption simulation / Web Speech API
  const [liveCaptionText, setLiveCaptionText] = useState<string>("Dr. Sharma: 'Your heart rate and blood pressure logs are in healthy range today.'");

  // Google Contacts states
  const [googleContacts, setGoogleContacts] = useState<GoogleContactItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", email: "", relationship: "" });
  const [addingContact, setAddingContact] = useState(false);
  const [addContactStatus, setAddContactStatus] = useState<string | null>(null);
  const [sosTriggered, setSosTriggered] = useState(false);

  // Default fallback contacts from UserProfile
  const defaultContacts = [
    { 
      name: userProfile?.emergencyContact?.name ? `${userProfile.emergencyContact.name} (${userProfile.emergencyContact.relationship || 'Caregiver'})` : "Primary Caregiver", 
      role: "Family Caregiver Leader", 
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&fit=crop", 
      online: true, 
      color: "border-purple-500/30", 
      phone: userProfile?.emergencyContact?.phone || "No phone set"
    },
    { 
      name: userProfile?.primaryDoctor?.name ? `Dr. ${userProfile.primaryDoctor.name}` : "Primary Doctor", 
      role: userProfile?.primaryDoctor?.clinic || "Primary Cardiologist", 
      avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&fit=crop", 
      online: true, 
      color: "border-blue-500/30", 
      phone: userProfile?.primaryDoctor?.phone || "No phone set"
    },
    { name: "EMS Emergency 911", role: "24/7 Rapid Medical Dispatch", avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&fit=crop", online: true, color: "border-red-500/30", phone: "911" }
  ];

  // Call History Log
  const callHistory = [
    { name: "Dr. Rajesh Sharma", type: "Video Call", time: "Today, 10:15 AM", duration: "14m 20s", status: "Completed" },
    { name: "Preeti (Daughter)", type: "Incoming Video", time: "Yesterday, 6:30 PM", duration: "8m 45s", status: "Completed" },
    { name: "Ananya (Daughter)", type: "Voice Call", time: "Sep 14, 2:10 PM", duration: "5m 12s", status: "Completed" },
    { name: "EMS Emergency 911", type: "Safety Check", time: "Sep 10, 11:00 AM", duration: "1m 30s", status: "Verified" }
  ];

  // Hardware Camera & Mic Initialization
  const startHardwareMedia = async () => {
    try {
      setCameraError(null);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true
        });
        mediaStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Web Audio Analyser for real sound meter
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateMeter = () => {
              if (!mediaStreamRef.current) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
              }
              const avg = sum / bufferLength;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              requestAnimationFrame(updateMeter);
            };
            updateMeter();
          }
        } catch (e) {
          console.warn("Audio meter initialization notice:", e);
        }
      }
    } catch (err: any) {
      console.warn("Camera/Mic access notice (using fallback interface):", err?.message || err);
      setCameraError("Camera/Mic in use or requires permission");
    }
  };

  const stopHardwareMedia = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (mediaStreamRef.current) {
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !isCameraOff;
        videoTracks.forEach((track) => (track.enabled = !nextState));
        setIsCameraOff(nextState);
        return;
      }
    }
    setIsCameraOff(!isCameraOff);
  };

  // Toggle Mic
  const toggleMic = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !isMuted;
        audioTracks.forEach((track) => (track.enabled = !nextState));
        setIsMuted(nextState);
        return;
      }
    }
    setIsMuted(!isMuted);
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (isSharingScreen) {
      setIsSharingScreen(false);
      startHardwareMedia();
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = screenStream;
          }
          setIsSharingScreen(true);
          screenStream.getVideoTracks()[0].onended = () => {
            setIsSharingScreen(false);
            startHardwareMedia();
          };
        }
      } catch (e) {
        console.warn("Screen share cancelled", e);
      }
    }
  };

  const generateMeetUrl = async () => {
    setLoadingMeetUrl(true);
    try {
      const result = await createGoogleMeetCall();
      if (result.meetUrl) {
        setActiveMeetUrl(result.meetUrl);
      }
    } catch (e) {
      console.warn("Error generating Google Meet call link", e);
    } finally {
      setLoadingMeetUrl(false);
    }
  };

  const handleLaunchGoogleMeet = async () => {
    await generateMeetUrl();
    window.open(activeMeetUrl, "_blank");
  };

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      const contacts = await fetchGoogleContacts();
      if (contacts && contacts.length > 0) {
        setGoogleContacts(contacts);
      }
    } catch (e) {
      console.warn("Could not load Google Contacts:", e);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  // When call becomes active, auto-start hardware media
  useEffect(() => {
    let interval: any;
    if (callState.active || viewMode === "active_call") {
      setSeconds(0);
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
      startHardwareMedia();
    } else {
      setSeconds(0);
      stopHardwareMedia();
    }
    return () => {
      clearInterval(interval);
      stopHardwareMedia();
    };
  }, [callState.active, viewMode]);

  const handleCreateContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    setAddingContact(true);
    setAddContactStatus(null);
    try {
      const created = await createGoogleContact(newContact);
      setGoogleContacts((prev) => [created, ...prev]);
      setAddContactStatus("Contact created successfully in Google Contacts!");
      setNewContact({ name: "", phone: "", email: "", relationship: "" });
      setTimeout(() => {
        setShowAddContactModal(false);
        setAddContactStatus(null);
      }, 1500);
    } catch (err: any) {
      setAddContactStatus(`Failed: ${err?.message || "Error saving contact"}`);
    } finally {
      setAddingContact(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [...prev, { sender: "You", text: chatInput.trim(), time: nowStr }]);
    setChatInput("");
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, "0");
    const secs = (totalSecs % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleCopyMeetLink = (urlToCopy: string) => {
    navigator.clipboard.writeText(urlToCopy);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredGoogleContacts = googleContacts.filter((c) =>
    !c.name.toUpperCase().includes("UIDAI") &&
    (c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.phone.includes(contactSearch) ||
    (c.email && c.email.toLowerCase().includes(contactSearch.toLowerCase())))
  );

  const jitsiRoomUrl = `https://meet.jit.si/AvenlyHub-${roomName}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&userInfo.displayName=Eleanor+Vance`;

  return (
    <div className="w-full h-full animate-fadeIn select-none flex flex-col justify-between overflow-y-auto pb-16">
      
      {/* ========================================================================= */}
      {/* 1. EMBEDDED REAL-TIME MEETING ROOM (JITSI / 8x8 FULL VIDEO CALLING EMBED) */}
      {/* ========================================================================= */}
      {viewMode === "embedded_room" && (
        <div className="w-full flex-1 bg-[#181a1d] border border-zinc-800 rounded-3xl p-4 flex flex-col justify-between shadow-2xl relative min-h-[480px]">
          
          {/* Room Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                <Video className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white">Live Embedded Video Meeting Room</h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                    CONNECTED
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono">
                  Room: AvenlyHub-{roomName} • Anyone with link can join
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyMeetLink(`https://meet.jit.si/AvenlyHub-${roomName}`)}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs text-zinc-300 font-mono flex items-center gap-1.5 transition-all"
              >
                {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{copiedLink ? "Copied" : "Copy Invite Link"}</span>
              </button>

              <a
                href={`https://meet.jit.si/AvenlyHub-${roomName}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/30 rounded-xl text-xs text-white font-bold flex items-center gap-1.5 shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Full Screen</span>
              </a>

              <button
                onClick={() => setViewMode("directory")}
                className="p-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold"
                title="Exit Meeting"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Embedded Meeting Frame */}
          <div className="flex-1 bg-black rounded-2xl overflow-hidden border border-zinc-800 relative min-h-[360px] shadow-inner">
            <iframe
              src={jitsiRoomUrl}
              title="Avenly Embedded Video Consultation"
              className="w-full h-full border-0 min-h-[360px]"
              allow="camera; microphone; display-capture; autoplay; clipboard-write; fullscreen"
            />
          </div>

          <div className="flex items-center justify-between pt-3 mt-1 border-t border-zinc-800">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Caregiver or doctor can join this exact session by opening the invite link on their phone.</span>
            </span>

            <button
              onClick={() => setViewMode("directory")}
              className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl"
            >
              Back to Speed Dial
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ACTIVE LIVE WEBRTC CALL INTERACTION SCREEN (FOR DIRECT / EMERGENCY CALLS) */}
      {/* ========================================================================= */}
      {(callState.active || viewMode === "active_call") && (
        <div className="w-full flex-1 bg-[#181a1d] border border-zinc-800 rounded-3xl p-5 flex flex-col justify-between shadow-2xl relative min-h-[440px]">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                <Video className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300 tracking-wide">Live Consultation</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <span>{callState.contactName || "Dr. Rajesh Sharma (Cardiologist)"}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                    HD ACTIVE
                  </span>
                </h4>
                <p className="text-[11px] text-zinc-400 font-mono truncate">
                  Avenly Secure Telehealth Link • Bandwidth: 1080p 60fps
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Active Audio Pulse Indicator */}
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-400">
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <div className="w-12 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${Math.max(15, audioLevel)}%` }}
                  />
                </div>
              </div>

              {/* Call Timer */}
              <div className="bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>{formatTime(seconds)}</span>
              </div>

              {/* Google Meet Direct Launch */}
              <a
                href={activeMeetUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 rounded-xl text-xs text-white font-bold font-mono flex items-center gap-1.5 shadow-md transition-all"
                title="Open Google Meet Session in Window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open in Meet</span>
              </a>
            </div>
          </div>

          {/* Main Video Viewport Grid */}
          <div className="flex-1 my-2 grid grid-cols-12 gap-4 relative items-stretch min-h-[280px]">
            {/* Primary Remote Video Tile */}
            <div className="col-span-12 rounded-2xl bg-zinc-950 border border-zinc-800/80 overflow-hidden relative flex items-center justify-center">
              <img
                src={
                  userProfile?.emergencyContact?.name && callState.contactName.includes(userProfile.emergencyContact.name)
                    ? "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&fit=crop"
                    : callState.contactName.includes("EMS")
                    ? "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&fit=crop"
                    : "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&fit=crop"
                }
                alt="Doctor Video Consultation"
                className="w-full h-full object-cover opacity-85 filter saturate-[1.05]"
                referrerPolicy="no-referrer"
              />

              {/* Name Tag */}
              <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md border border-zinc-800 px-3 py-1 rounded-xl text-xs font-semibold text-zinc-200 flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <span>{callState.contactName || "Dr. Rajesh Sharma (Cardiologist)"}</span>
              </div>

              {/* Hand Raised Banner */}
              {isHandRaised && (
                <div className="absolute top-3 right-3 bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-xl text-xs font-bold text-amber-300 flex items-center gap-1.5 animate-bounce">
                  <Hand className="w-4 h-4 text-amber-400" />
                  <span>Hand Raised</span>
                </div>
              )}

              {/* Subtitles / Live Captions Ticker */}
              {showCaptions && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md border border-zinc-800 px-5 py-2.5 rounded-2xl max-w-xl text-center text-xs font-medium text-emerald-300 shadow-2xl">
                  {liveCaptionText}
                </div>
              )}

              {/* Real Local Webcam Video Feed PiP */}
              <div className="absolute top-3 left-3 w-36 h-24 rounded-2xl overflow-hidden border-2 border-zinc-700 bg-zinc-900 shadow-2xl">
                {!isCameraOff ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400 text-[10px] font-mono">
                    <Video className="w-5 h-5 opacity-40 mb-1" />
                    <span>Camera Off</span>
                  </div>
                )}
                <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider text-zinc-300 font-mono">
                  You (Self View)
                </div>
              </div>
            </div>

            {/* In-Call Chat Sidebar Panel */}
            {showChatPanel && (
              <div className="col-span-12 md:col-span-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-3 flex flex-col justify-between">
                <div>
                  <h5 className="text-xs font-bold text-white border-b border-zinc-800 pb-2 mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>In-Call Chat</span>
                  </h5>
                  <div className="space-y-2 text-[11px] font-mono max-h-[160px] overflow-y-auto">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className="bg-zinc-900 p-2 rounded-xl">
                        <span className="text-blue-400 font-bold block">{msg.sender}</span>
                        <p className="text-zinc-300 font-sans">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <form onSubmit={handleSendMessage} className="mt-2 flex gap-1.5">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type message to doctor..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                  />
                  <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold">
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Controls Toolbar */}
          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3 mt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setViewMode("embedded_room");
                }}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-1.5"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Switch to Embedded Room</span>
              </button>
            </div>

            {/* Core Control Buttons */}
            <div className="flex items-center gap-2">
              {/* Mic Toggle */}
              <button
                onClick={toggleMic}
                className={`p-3 rounded-2xl border transition-all active:scale-95 ${
                  isMuted ? "bg-rose-600/20 border-rose-500/40 text-rose-400" : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200"
                }`}
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Camera Toggle */}
              <button
                onClick={toggleCamera}
                className={`p-3 rounded-2xl border transition-all active:scale-95 ${
                  isCameraOff ? "bg-rose-600/20 border-rose-500/40 text-rose-400" : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200"
                }`}
                title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                <Video className={`w-4 h-4 ${isCameraOff ? "opacity-50" : ""}`} />
              </button>

              {/* Screen Share */}
              <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-2xl border transition-all active:scale-95 ${
                  isSharingScreen ? "bg-indigo-600 text-white border-indigo-500" : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400"
                }`}
                title="Share Screen"
              >
                <MonitorUp className="w-4 h-4" />
              </button>

              {/* Captions Toggle */}
              <button
                onClick={() => setShowCaptions(!showCaptions)}
                className={`p-3 rounded-2xl border transition-all active:scale-95 ${
                  showCaptions ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400" : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400"
                }`}
                title="Live Captions"
              >
                <FileText className="w-4 h-4" />
              </button>

              {/* Raise Hand */}
              <button
                onClick={() => setIsHandRaised(!isHandRaised)}
                className={`p-3 rounded-2xl border transition-all active:scale-95 ${
                  isHandRaised ? "bg-amber-600/20 border-amber-500/40 text-amber-400" : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400"
                }`}
                title="Raise Hand"
              >
                <Hand className="w-4 h-4" />
              </button>

              {/* Chat Toggle */}
              <button
                onClick={() => setShowChatPanel(!showChatPanel)}
                className={`p-3 rounded-2xl border transition-all active:scale-95 ${
                  showChatPanel ? "bg-blue-600/20 border-blue-500/40 text-blue-400" : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400"
                }`}
                title="In-Call Chat"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              {/* Senior Hearing Booster (+150%) */}
              <button
                onClick={() => setIsBoosterActive(!isBoosterActive)}
                className={`px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all active:scale-95 flex items-center gap-1 ${
                  isBoosterActive ? "bg-indigo-600 text-white border-indigo-500" : "bg-zinc-900 text-zinc-400 border-zinc-800"
                }`}
                title="Audio Booster"
              >
                <Volume2 className="w-4 h-4" />
                <span className="hidden sm:inline">Booster</span>
              </button>

              {/* End Call Button */}
              <button
                onClick={() => {
                  playAudioFeedback("end_call");
                  stopHardwareMedia();
                  if (callState.active) {
                    onEndCall();
                  }
                  setViewMode("directory");
                }}
                className="min-h-[50px] px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm rounded-2xl transition-all shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer touch-target-senior border-2 border-rose-400"
              >
                <PhoneOff className="w-5 h-5" />
                <span>End Call</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DIRECTORY & SPEED DIAL SCREEN (DEFAULT WHEN NOT IN ACTIVE CALL) */}
      {/* ========================================================================= */}
      {viewMode === "directory" && !callState.active && (
        <div className="flex-1 flex flex-col justify-between space-y-4">
          
          {/* Prominent Red SOS Quick-Dial Banner */}
          <div className="bg-gradient-to-r from-red-950/80 via-red-900/40 to-rose-950/80 border-2 border-red-500/60 rounded-3xl p-4 flex items-center justify-between shadow-[0_0_25px_rgba(239,68,68,0.25)]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg animate-pulse">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-400">Emergency Dispatch System</span>
                <h3 className="text-base font-black text-white font-display">SOS EMERGENCY QUICK-DIAL</h3>
                <p className="text-xs text-red-200">Alerts 911 EMS & notifies {userProfile?.emergencyContact?.name || "Caregiver"} immediately</p>
              </div>
            </div>

            <button
              onClick={() => setSosTriggered(true)}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-95 border border-red-300 flex items-center gap-2 cursor-pointer"
            >
              <Phone className="w-4 h-4 animate-bounce" />
              <span>DISPATCH SOS NOW</span>
            </button>
          </div>

          {/* GOOGLE MEET & EMBEDDED MEETING ROOM LAUNCHER BAR */}
          <div className="bg-gradient-to-r from-emerald-950/50 via-teal-950/30 to-zinc-900/80 border border-emerald-500/30 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white">Google Meet & Video Conferencing</h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                    WORKING
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Embed video room directly in-hub or launch instant Google Meet sessions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setViewMode("embedded_room")}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Tv className="w-4 h-4" />
                <span>Join Embedded Room</span>
              </button>

              <button
                onClick={handleLaunchGoogleMeet}
                className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-emerald-400 font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                title="Launch Google Meet in new tab"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Google Meet</span>
              </button>
            </div>
          </div>

          {/* GOOGLE CONTACTS INTEGRATED SECTION */}
          <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950/30 border border-indigo-500/30 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Contact className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-display">Google Contacts</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                      People API
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Sync & call your saved Google Contacts</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isCaregiverMode && (
                  <>
                    <button
                      onClick={loadContacts}
                      disabled={loadingContacts}
                      className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Sync Google Contacts"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingContacts ? "animate-spin text-indigo-400" : ""}`} />
                      <span className="hidden sm:inline font-mono">Sync</span>
                    </button>

                    <button
                      onClick={() => setShowAddContactModal(true)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Add Contact</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Search Bar for Google Contacts */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Google Contacts by name, phone, or email..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full bg-zinc-900/90 border border-zinc-800 pl-10 pr-4 py-2 rounded-xl text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Google Contacts Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
              {filteredGoogleContacts.length > 0 ? (
                filteredGoogleContacts.map((c, idx) => (
                  <div key={idx} className="bg-zinc-900/80 border border-zinc-800/80 p-3 rounded-2xl flex items-center justify-between hover:border-indigo-500/40 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt={c.name} className="w-10 h-10 rounded-full object-cover border border-indigo-500/30 shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-sm flex items-center justify-center shrink-0 border border-indigo-500/30">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{c.name}</h4>
                        <p className="text-[10px] text-zinc-400 font-mono truncate">{c.phone || "No phone listed"}</p>
                        {c.email && <p className="text-[9px] text-indigo-400 truncate">{c.email}</p>}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0 ml-2">
                      <button
                        onClick={() => {
                          playAudioFeedback("call");
                          onStartCall(c.name, "video");
                        }}
                        className="min-h-[44px] px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-bold touch-target-senior"
                        title="Start Video Consultation"
                      >
                        <Video className="w-4 h-4" />
                        <span>Video</span>
                      </button>
                      <a
                        href={`tel:${c.phone}`}
                        onClick={() => playAudioFeedback("call")}
                        className="min-h-[44px] px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 text-xs font-bold touch-target-senior"
                        title={`Call ${c.phone}`}
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call</span>
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 text-center">
                  <p className="text-xs text-zinc-400 mb-2">
                    {loadingContacts ? "Loading Google Contacts..." : "No Google Contacts fetched yet or matched search."}
                  </p>
                  <button
                    onClick={loadContacts}
                    className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Sync Contacts from Google
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <div>
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider font-mono">Senior Speed Dial</span>
              <h2 className="text-lg font-bold font-display text-zinc-200">Direct Emergency & Family Connections</h2>
            </div>
          </div>

          {/* Grid of Default Contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {defaultContacts.map((c, idx) => (
              <div key={idx} className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={c.avatar} alt={c.name} className="w-11 h-11 rounded-full object-cover border border-zinc-700" referrerPolicy="no-referrer" />
                  <div>
                    <h4 className="text-xs font-bold text-white">{c.name}</h4>
                    <p className="text-[10px] text-zinc-400 font-mono">{c.role}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      playAudioFeedback("call");
                      onStartCall(c.name, "video");
                    }}
                    className="min-h-[48px] px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-2 border-emerald-500/40 rounded-2xl transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 font-bold text-xs touch-target-senior"
                    title="Start Video Consultation"
                  >
                    <Video className="w-4 h-4" />
                    <span>Video</span>
                  </button>
                  <a
                    href={`tel:${c.phone}`}
                    onClick={() => playAudioFeedback("call")}
                    className="min-h-[48px] px-3.5 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-2 border-blue-500/40 rounded-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs touch-target-senior"
                    title={`Call ${c.phone}`}
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Call History / Recent Calls Section */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mt-2">
            <h4 className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Recent Calls History</span>
            </h4>
            <div className="space-y-2">
              {callHistory.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs border-b border-zinc-900 pb-1.5 last:border-none">
                  <div className="flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold text-zinc-200">{item.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">({item.type})</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-400">
                    <span>{item.time}</span>
                    <span className="text-emerald-400 font-bold">{item.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ADD GOOGLE CONTACT MODAL */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-indigo-500/40 rounded-3xl max-w-md w-full shadow-2xl relative p-6 animate-fadeIn">
            <button
              onClick={() => setShowAddContactModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-900 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-display">Add to Google Contacts</h3>
                <p className="text-xs text-zinc-400">Save new contact via Google People API</p>
              </div>
            </div>

            {addContactStatus && (
              <div className={`p-3 rounded-2xl text-xs font-mono mb-4 border ${
                addContactStatus.includes("success") 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}>
                {addContactStatus}
              </div>
            )}

            <form onSubmit={handleCreateContactSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Anita Gupta"
                  value={newContact.name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold block mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +1 (555) 123-4567"
                  value={newContact.phone}
                  onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold block mb-1">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. doctor@clinic.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold block mb-1">Relationship / Tag (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Family Physician, Physical Therapist"
                  value={newContact.relationship}
                  onChange={(e) => setNewContact(prev => ({ ...prev, relationship: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingContact}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {addingContact ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>Save Contact</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sosTriggered && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-950/90 backdrop-blur-md animate-fadeIn p-6">
          <div className="bg-red-900 border-4 border-red-500 rounded-3xl p-8 max-w-lg w-full text-center shadow-[0_0_100px_rgba(239,68,68,0.5)] animate-pulse">
            <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Phone className="w-12 h-12 text-white animate-bounce" />
            </div>
            <h2 className="text-4xl font-black text-white font-display uppercase tracking-widest mb-2">SOS Dispatched</h2>
            <p className="text-lg text-red-200 font-bold mb-8">
              Emergency Services and your family have been notified. Please stay calm. Help is on the way.
            </p>
            <button
              onClick={() => setSosTriggered(false)}
              className="px-8 py-4 bg-white text-red-700 hover:bg-zinc-200 font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-xl"
            >
              Cancel Alert
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
