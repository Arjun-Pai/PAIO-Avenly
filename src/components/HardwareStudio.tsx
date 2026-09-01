import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Copy,
  Trash2,
  Sliders,
  Maximize2,
  Sun,
  Moon,
  Zap,
  Download,
  Check,
  ArrowRight,
  Radio,
  Share2
} from "lucide-react";
import { getLocaleCode } from "../lib/translations";

interface HardwareStudioProps {
  userLanguage?: string;
  userName?: string;
  onSendToChat?: (text: string) => void;
  onSetAvatar?: (url: string) => void;
}

export default function HardwareStudio({
  userLanguage = "English",
  userName = "User",
  onSendToChat,
  onSetAvatar
}: HardwareStudioProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "mic" | "dictation" | "speaker">("camera");

  // CAMERA STATE
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"none" | "contrast" | "warm" | "mono">("none");
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [streamResolution, setStreamResolution] = useState<{ width: number; height: number; fps: number }>({ width: 0, height: 0, fps: 30 });
  const [copiedPhotoIdx, setCopiedPhotoIdx] = useState<number | null>(null);

  // MICROPHONE STATE
  const [micActive, setMicActive] = useState(false);
  const [micLoading, setMicLoading] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0); // 0 to 100
  const [spectrumData, setSpectrumData] = useState<number[]>(new Array(24).fill(5));
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [micGain, setMicGain] = useState<number>(1.0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // ECHO / LOOPBACK TEST STATE
  const [isRecordingEcho, setIsRecordingEcho] = useState(false);
  const [echoCountdown, setEchoCountdown] = useState(3);
  const [echoAudioUrl, setEchoAudioUrl] = useState<string | null>(null);
  const [isPlayingEcho, setIsPlayingEcho] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // DICTATION STATE
  const [isDictating, setIsDictating] = useState(false);
  const [dictationTranscript, setDictationTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [dictationWordCount, setDictationWordCount] = useState(0);
  const [dictationDuration, setDictationDuration] = useState(0);
  const [isSpeakingBack, setIsSpeakingBack] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const recognitionRef = useRef<any>(null);
  const dictationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Enumerate devices on mount
  useEffect(() => {
    const listDevices = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const vList = devices.filter(d => d.kind === "videoinput");
          const aList = devices.filter(d => d.kind === "audioinput");
          setVideoDevices(vList);
          setAudioDevices(aList);
          if (vList.length > 0 && !selectedVideoDevice) setSelectedVideoDevice(vList[0].deviceId);
          if (aList.length > 0 && !selectedAudioDevice) setSelectedAudioDevice(aList[0].deviceId);
        }
      } catch (e) {
        console.warn("Device enumeration error:", e);
      }
    };
    listDevices();
  }, []);

  // CAMERA LOGIC
  const startCamera = async (deviceId?: string) => {
    setCameraLoading(true);
    setCameraError(null);
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video play error:", e));
      }

      // Track resolution
      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        setStreamResolution({
          width: settings.width || 1280,
          height: settings.height || 720,
          fps: Math.round(settings.frameRate || 30)
        });
      }
    } catch (err: any) {
      console.warn("Camera init error:", err);
      setCameraError(err.name === "NotAllowedError" ? "Camera permission was denied. Please allow camera access." : `Camera error: ${err.message || "Device unavailable"}`);
      setCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // Apply active filter to snapshot canvas
    if (activeFilter === "contrast") {
      ctx.filter = "contrast(140%) brightness(110%)";
    } else if (activeFilter === "warm") {
      ctx.filter = "sepia(20%) saturate(130%)";
    } else if (activeFilter === "mono") {
      ctx.filter = "grayscale(100%) contrast(120%)";
    }

    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedPhotos(prev => [dataUrl, ...prev.slice(0, 5)]);

    // Sound effect
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  };

  // MICROPHONE LOGIC
  const startMic = async (deviceId?: string) => {
    setMicLoading(true);
    setMicError(null);
    stopMic();

    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setAudioStream(stream);
      setMicActive(true);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Average level
        let sum = 0;
        const bars: number[] = [];
        const step = Math.floor(bufferLength / 24) || 1;

        for (let i = 0; i < 24; i++) {
          const val = dataArray[i * step] || 0;
          bars.push(Math.max(6, Math.min(100, Math.round((val / 255) * 100 * micGain))));
          sum += val;
        }

        const avg = Math.min(100, Math.round((sum / bufferLength / 255) * 100 * micGain * 1.5));
        setAudioLevel(avg);
        setSpectrumData(bars);

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (err: any) {
      console.warn("Mic init error:", err);
      setMicError(err.name === "NotAllowedError" ? "Microphone permission was denied. Please grant microphone access." : `Microphone error: ${err.message || "Device unavailable"}`);
      setMicActive(false);
    } finally {
      setMicLoading(false);
    }
  };

  const stopMic = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioStream) {
      audioStream.getTracks().forEach(t => t.stop());
      setAudioStream(null);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMicActive(false);
    setAudioLevel(0);
    setSpectrumData(new Array(24).fill(5));
  };

  // ECHO / LOOPBACK RECORDER
  const startEchoTest = async () => {
    if (isRecordingEcho) return;
    setEchoAudioUrl(null);
    setIsRecordingEcho(true);
    setEchoCountdown(3);
    audioChunksRef.current = [];

    try {
      const stream = audioStream || (await navigator.mediaDevices.getUserMedia({ audio: true }));
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setEchoAudioUrl(url);
        setIsRecordingEcho(false);

        // Auto playback echo
        playEchoAudio(url);
      };

      recorder.start();

      let secondsLeft = 3;
      const countInterval = setInterval(() => {
        secondsLeft -= 1;
        setEchoCountdown(secondsLeft);
        if (secondsLeft <= 0) {
          clearInterval(countInterval);
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
          }
        }
      }, 1000);
    } catch (e: any) {
      setIsRecordingEcho(false);
      setMicError("Microphone access needed for Echo test.");
    }
  };

  const playEchoAudio = (url?: string) => {
    const targetUrl = url || echoAudioUrl;
    if (!targetUrl) return;
    setIsPlayingEcho(true);
    const audio = new Audio(targetUrl);
    audio.onended = () => setIsPlayingEcho(false);
    audio.onerror = () => setIsPlayingEcho(false);
    audio.play().catch(() => setIsPlayingEcho(false));
  };

  // DICTATION LOGIC
  const startDictation = () => {
    setDictationError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setDictationError("Web Speech Recognition API is not supported in this browser. You can test synthetic voice dictation below.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = getLocaleCode(userLanguage);
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsDictating(true);
        setDictationDuration(0);
        dictationTimerRef.current = setInterval(() => {
          setDictationDuration(prev => prev + 1);
        }, 1000);
      };

      recognition.onresult = (event: any) => {
        let finalTrans = "";
        let interimTrans = "";

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTrans += result[0].transcript + " ";
          } else {
            interimTrans += result[0].transcript;
          }
        }

        if (finalTrans) {
          setDictationTranscript(prev => {
            const combined = (prev + " " + finalTrans).trim();
            setDictationWordCount(combined.split(/\s+/).filter(Boolean).length);
            return combined;
          });
        }
        setInterimTranscript(interimTrans);
      };

      recognition.onerror = (event: any) => {
        console.warn("Dictation error:", event.error);
        if (event.error === "not-allowed") {
          setDictationError("Microphone permission denied. Click Allow in browser address bar.");
        } else if (event.error === "network") {
          setDictationError("Speech network offline. Check internet connection.");
        } else if (event.error !== "no-speech") {
          setDictationError(`Dictation status: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsDictating(false);
        setInterimTranscript("");
        if (dictationTimerRef.current) {
          clearInterval(dictationTimerRef.current);
          dictationTimerRef.current = null;
        }
      };

      recognition.start();
    } catch (err: any) {
      setDictationError(`Failed to start speech recognition: ${err.message}`);
      setIsDictating(false);
    }
  };

  const stopDictation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsDictating(false);
    setInterimTranscript("");
    if (dictationTimerRef.current) {
      clearInterval(dictationTimerRef.current);
      dictationTimerRef.current = null;
    }
  };

  const speakBackText = (text: string) => {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeakingBack(true);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = getLocaleCode(userLanguage);
    u.rate = 0.95;
    u.onend = () => setIsSpeakingBack(false);
    u.onerror = () => setIsSpeakingBack(false);
    window.speechSynthesis.speak(u);
  };

  // SPEAKER CHIMES
  const playDiagnosticChime = (type: "harmonic" | "alert" | "subtle") => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;

      if (type === "harmonic") {
        // C-E-G-C Chord
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((f, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(f, now + idx * 0.1);
          gain.gain.setValueAtTime(0.06, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.6);
        });
      } else if (type === "alert") {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(660, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(659.25, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {}
  };

  const playVoiceGreeting = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const greetings: Record<string, string> = {
      English: `Hello ${userName}. All Avenly microphone, camera, and speaker systems are operating normally.`,
      Hindi: `नमस्ते ${userName}, एवेनली का कैमरा और माइक्रोफ़ोन सामान्य रूप से काम कर रहे हैं।`,
      Spanish: `Hola ${userName}. Todos los sistemas de audio y cámara de Avenly están funcionando correctamente.`,
      French: `Bonjour ${userName}. Les systèmes audio et caméra d'Avenly fonctionnent parfaitement.`
    };
    const text = greetings[userLanguage] || greetings["English"];
    const u = new SpeechSynthesisUtterance(text);
    u.lang = getLocaleCode(userLanguage);
    window.speechSynthesis.speak(u);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopMic();
      stopDictation();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col space-y-4 animate-fadeIn text-zinc-100">
      
      {/* Header bar with Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            Hardware & Dictation Studio
          </h3>
          <p className="text-[11px] text-zinc-400">
            Real-time diagnostics and testing for Webcam, Microphone, Audio Loopback, and Voice Dictation.
          </p>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex bg-black/50 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab("camera")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "camera"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Camera
          </button>
          <button
            onClick={() => setActiveTab("mic")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "mic"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Mic className="w-3.5 h-3.5" /> Microphone & Echo
          </button>
          <button
            onClick={() => setActiveTab("dictation")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "dictation"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Radio className="w-3.5 h-3.5" /> Live Dictation
          </button>
          <button
            onClick={() => setActiveTab("speaker")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "speaker"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" /> Speakers & TTS
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CAMERA STUDIO */}
      {/* ========================================================= */}
      {activeTab === "camera" && (
        <div className="space-y-4 animate-fadeIn">
          {cameraError && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-xs font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{cameraError}</span>
              </div>
              <button onClick={() => startCamera(selectedVideoDevice)} className="px-2.5 py-1 bg-red-500/30 hover:bg-red-500/50 text-white rounded-lg text-[10px] font-bold">
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-12 gap-4">
            {/* Viewfinder Main Column */}
            <div className="col-span-8 bg-black/60 border border-white/10 rounded-2xl p-3 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px] shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full max-h-[280px] rounded-xl object-contain bg-zinc-950 ${
                  isMirrored ? "transform -scale-x-100" : ""
                } ${
                  activeFilter === "contrast"
                    ? "contrast-125 brightness-105"
                    : activeFilter === "warm"
                    ? "sepia-[0.25] saturate-125"
                    : activeFilter === "mono"
                    ? "grayscale contrast-125"
                    : ""
                }`}
              />

              {!cameraActive && !cameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 text-center p-6 space-y-3 z-10">
                  <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Video className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Camera is Standby / Inactive</h4>
                    <p className="text-xs text-zinc-400 max-w-xs mt-1">Tap the button below to initialize the camera stream and test real-time video.</p>
                  </div>
                  <button
                    onClick={() => startCamera(selectedVideoDevice)}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    <Play className="w-4 h-4" /> Start Camera Preview
                  </button>
                </div>
              )}

              {cameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
                  <span className="text-xs font-bold text-zinc-300">Connecting video device...</span>
                </div>
              )}

              {/* Viewfinder Overlay telemetry */}
              {cameraActive && (
                <div className="absolute top-5 left-5 right-5 flex items-center justify-between pointer-events-none z-20">
                  <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>LIVE FEED • {streamResolution.width}x{streamResolution.height} @ {streamResolution.fps}fps</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] text-zinc-300 font-mono">
                    <span>Filter: {activeFilter.toUpperCase()}</span>
                  </div>
                </div>
              )}

              {/* Bottom camera controls */}
              {cameraActive && (
                <div className="w-full flex items-center justify-between pt-3 z-20">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsMirrored(!isMirrored)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        isMirrored ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "bg-white/5 border-white/10 text-zinc-400"
                      }`}
                    >
                      Flip Mirror
                    </button>
                    <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                      {(["none", "contrast", "warm", "mono"] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setActiveFilter(f)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            activeFilter === f ? "bg-white/20 text-white" : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={takeSnapshot}
                      className="px-4 py-2 bg-white text-black hover:bg-zinc-200 font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      title="Take still snapshot"
                    >
                      <Camera className="w-3.5 h-3.5" /> Capture Snapshot
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold text-xs rounded-xl transition-all"
                    >
                      <VideoOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Settings & Gallery Sidebar */}
            <div className="col-span-4 bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-200 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Video Settings
                </h4>

                {/* Device Selector */}
                {videoDevices.length > 0 && (
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Select Camera Device</label>
                    <select
                      value={selectedVideoDevice}
                      onChange={(e) => {
                        setSelectedVideoDevice(e.target.value);
                        if (cameraActive) startCamera(e.target.value);
                      }}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 outline-none"
                    >
                      {videoDevices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Snapshots Gallery */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold">Captured Snapshots</span>
                    {capturedPhotos.length > 0 && (
                      <button onClick={() => setCapturedPhotos([])} className="text-[9px] text-zinc-500 hover:text-red-400">
                        Clear
                      </button>
                    )}
                  </div>

                  {capturedPhotos.length === 0 ? (
                    <div className="p-4 bg-black/30 border border-dashed border-white/10 rounded-xl text-center text-zinc-500 text-[11px]">
                      Take a snapshot to test photo capture.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {capturedPhotos.map((photoUrl, idx) => (
                        <div key={idx} className="group relative rounded-lg overflow-hidden border border-white/15 aspect-square bg-black">
                          <img src={photoUrl} alt="Snapshot" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                            <a
                              href={photoUrl}
                              download={`avenly-snapshot-${Date.now()}.jpg`}
                              className="p-1 bg-white/20 hover:bg-white/40 text-white rounded-md"
                              title="Download"
                            >
                              <Download className="w-3 h-3" />
                            </a>
                            {onSetAvatar && (
                              <button
                                onClick={() => onSetAvatar(photoUrl)}
                                className="p-1 bg-emerald-500/40 hover:bg-emerald-500 text-white rounded-md"
                                title="Set as Profile Avatar"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-[10px] text-cyan-200">
                💡 <strong className="text-white">Tip:</strong> Camera feed is processed 100% locally in your browser for total senior privacy.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MICROPHONE & ECHO STUDIO */}
      {/* ========================================================= */}
      {activeTab === "mic" && (
        <div className="space-y-4 animate-fadeIn">
          {micError && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-xs font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{micError}</span>
              </div>
              <button onClick={() => startMic(selectedAudioDevice)} className="px-2.5 py-1 bg-red-500/30 hover:bg-red-500/50 text-white rounded-lg text-[10px] font-bold">
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-12 gap-4">
            {/* Live Audio Spectrum & VU Meter Column */}
            <div className="col-span-7 bg-black/60 border border-white/10 rounded-2xl p-5 flex flex-col justify-between min-h-[300px] shadow-2xl">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    Live Microphone Spectrum & VU Meter
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    micActive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-zinc-800 text-zinc-500"
                  }`}>
                    {micActive ? "MICROPHONE LIVE" : "MIC STANDBY"}
                  </span>
                </div>

                {/* 24-Band Animated Equalizer Frequency Spectrum */}
                <div className="h-32 bg-black/80 border border-white/10 rounded-xl p-3 flex items-end justify-between gap-1 mb-4">
                  {spectrumData.map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md transition-all duration-75"
                      style={{
                        height: `${Math.max(6, height)}%`,
                        background: height > 75 ? "#ef4444" : height > 45 ? "#f59e0b" : "#10b981"
                      }}
                    />
                  ))}
                </div>

                {/* Horizontal Peak Decibel Meter */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span>Input Volume Peak</span>
                    <span className="text-white font-bold">{audioLevel}% dB</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-white/10 p-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-75"
                      style={{
                        width: `${audioLevel}%`,
                        background: audioLevel > 80 ? "linear-gradient(to right, #10b981, #f59e0b, #ef4444)" : "linear-gradient(to right, #065f46, #10b981)"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400 font-mono">Gain Booster:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={micGain}
                    onChange={(e) => setMicGain(parseFloat(e.target.value))}
                    className="w-24 accent-emerald-400 h-1.5 bg-zinc-800 rounded-full outline-none"
                  />
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">{micGain}x</span>
                </div>

                {micActive ? (
                  <button
                    onClick={stopMic}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <MicOff className="w-3.5 h-3.5" /> Stop Mic Stream
                  </button>
                ) : (
                  <button
                    onClick={() => startMic(selectedAudioDevice)}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" /> Start Live Mic Test
                  </button>
                )}
              </div>
            </div>

            {/* Echo / Loopback Diagnostic Column */}
            <div className="col-span-5 bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-200 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  3-Second Audio Echo / Loopback Test
                </h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Record 3 seconds of your voice to immediately verify microphone capture & speaker playback clarity.
                </p>

                {/* Echo Recorder Box */}
                <div className="p-4 bg-zinc-950 border border-white/10 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                  {isRecordingEcho ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-400 mx-auto animate-pulse">
                        <span className="text-lg font-black font-mono">{echoCountdown}s</span>
                      </div>
                      <p className="text-xs font-bold text-white animate-pulse">Speak now into your microphone...</p>
                    </div>
                  ) : isPlayingEcho ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
                        <Volume2 className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-emerald-300">Playing back your voice recording...</p>
                    </div>
                  ) : echoAudioUrl ? (
                    <div className="space-y-2 w-full">
                      <div className="text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Loopback recording ready!
                      </div>
                      <button
                        onClick={() => playEchoAudio()}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Play className="w-3.5 h-3.5" /> Replay Voice Recording
                      </button>
                    </div>
                  ) : (
                    <div className="text-zinc-500 text-xs">
                      Press button below to begin 3s diagnostic recording.
                    </div>
                  )}

                  <button
                    onClick={startEchoTest}
                    disabled={isRecordingEcho}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Mic className="w-4 h-4" />
                    {isRecordingEcho ? `Recording... (${echoCountdown}s)` : "Record & Test Echo"}
                  </button>
                </div>
              </div>

              {/* Audio input selector */}
              {audioDevices.length > 0 && (
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Microphone Device Input</label>
                  <select
                    value={selectedAudioDevice}
                    onChange={(e) => {
                      setSelectedAudioDevice(e.target.value);
                      if (micActive) startMic(e.target.value);
                    }}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 outline-none"
                  >
                    {audioDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: LIVE DICTATION STUDIO */}
      {/* ========================================================= */}
      {activeTab === "dictation" && (
        <div className="space-y-4 animate-fadeIn">
          {dictationError && (
            <div className="p-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{dictationError}</span>
              </div>
              <button onClick={startDictation} className="px-2.5 py-1 bg-amber-500/30 text-white rounded-lg text-[10px] font-bold">
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-12 gap-4">
            {/* Live Dictation Terminal Column */}
            <div className="col-span-8 bg-black/60 border border-white/10 rounded-2xl p-4 flex flex-col justify-between min-h-[320px] shadow-2xl">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Live Real-Time Voice Dictation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400">
                      Words: <strong className="text-purple-300">{dictationWordCount}</strong>
                    </span>
                    {isDictating && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse">
                        LISTENING ({dictationDuration}s)
                      </span>
                    )}
                  </div>
                </div>

                {/* Real-time Transcription Stream Box */}
                <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 h-44 overflow-y-auto font-sans text-sm leading-relaxed text-zinc-100 relative">
                  {dictationTranscript || interimTranscript ? (
                    <div>
                      <span>{dictationTranscript} </span>
                      {interimTranscript && (
                        <span className="text-purple-400 italic bg-purple-950/40 px-1 rounded">{interimTranscript}...</span>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-2">
                      <Mic className="w-6 h-6 text-purple-400/40" />
                      <p className="text-xs text-zinc-400">Tap "Start Dictation" and speak into your microphone.</p>
                      <p className="text-[10px] text-zinc-500">Your spoken words will appear here in real-time.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dictation Action Toolbar */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-3">
                <div className="flex items-center gap-2">
                  {isDictating ? (
                    <button
                      onClick={stopDictation}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer animate-pulse"
                    >
                      <Square className="w-3.5 h-3.5" /> Stop Dictating
                    </button>
                  ) : (
                    <button
                      onClick={startDictation}
                      className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <Mic className="w-4 h-4" /> Start Dictation
                    </button>
                  )}

                  {dictationTranscript && (
                    <button
                      onClick={() => speakBackText(dictationTranscript)}
                      disabled={isSpeakingBack}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/10 flex items-center gap-1.5 transition-all"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> {isSpeakingBack ? "Reading..." : "Speak Back (TTS)"}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {dictationTranscript && (
                    <>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(dictationTranscript);
                          setCopiedText(true);
                          setTimeout(() => setCopiedText(false), 2000);
                        }}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/15 text-zinc-300 rounded-lg text-xs flex items-center gap-1"
                        title="Copy text"
                      >
                        {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {onSendToChat && (
                        <button
                          onClick={() => onSendToChat(dictationTranscript)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1"
                        >
                          <span>Send to AI</span> <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setDictationTranscript("");
                          setInterimTranscript("");
                          setDictationWordCount(0);
                        }}
                        className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg"
                        title="Clear transcript"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Elder Dictation Presets Column */}
            <div className="col-span-4 bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold text-zinc-200 uppercase font-mono tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Sample Health Phrases
                </h4>
                <p className="text-[10px] text-zinc-400 mb-2">Tap any sentence below to test dictation or speech playback:</p>

                <div className="space-y-1.5">
                  {[
                    "I just took my afternoon Metformin pill with a glass of water.",
                    "Hey Aven, what are my latest heart rate and oxygen numbers?",
                    "Please call Dr. Sharma to check my appointment for Friday.",
                    "I am feeling a little dizzy and resting on the sofa."
                  ].map((phrase, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setDictationTranscript(prev => (prev ? prev + " " + phrase : phrase));
                        setDictationWordCount(phrase.split(" ").length);
                        speakBackText(phrase);
                      }}
                      className="p-2 bg-black/50 hover:bg-white/10 border border-white/10 rounded-xl text-[11px] text-zinc-300 cursor-pointer transition-all active:scale-98"
                    >
                      "{phrase}"
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[10px] text-purple-200">
                🗣️ <strong className="text-white">Senior Dictation Mode:</strong> Hands-free voice recognition configured for natural speech cadence and clear punctuation.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: SPEAKERS & TTS STUDIO */}
      {/* ========================================================= */}
      {activeTab === "speaker" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 border border-white/10 p-4 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" /> Audio Synthesizer Chimes
              </h4>
              <p className="text-[11px] text-zinc-400">Test high-contrast tones calibrated for senior hearing frequency curves.</p>

              <div className="space-y-2">
                <button
                  onClick={() => playDiagnosticChime("harmonic")}
                  className="w-full py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-bold text-zinc-200 flex items-center justify-between"
                >
                  <span>Harmonic C-Major Chord (Medication Chime)</span>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                </button>

                <button
                  onClick={() => playDiagnosticChime("alert")}
                  className="w-full py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-bold text-zinc-200 flex items-center justify-between"
                >
                  <span>Emergency Two-Tone Alert Siren</span>
                  <Play className="w-3.5 h-3.5 text-rose-400" />
                </button>

                <button
                  onClick={() => playDiagnosticChime("subtle")}
                  className="w-full py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-bold text-zinc-200 flex items-center justify-between"
                >
                  <span>Subtle Confirmation Ping</span>
                  <Play className="w-3.5 h-3.5 text-blue-400" />
                </button>
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 p-4 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Speech Synthesis (TTS) Engine
              </h4>
              <p className="text-[11px] text-zinc-400">Test multi-lingual natural vocalization for health reminders.</p>

              <div className="p-3 bg-zinc-950 border border-white/10 rounded-xl space-y-2">
                <span className="text-[10px] text-zinc-400 font-mono block">Current Language: {userLanguage}</span>
                <button
                  onClick={playVoiceGreeting}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" /> Play Full Voice System Greeting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
