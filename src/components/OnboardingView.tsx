import React, { useState, useRef, useEffect } from "react";
import { 
  User, 
  Calendar, 
  Upload, 
  FileText, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck, 
  Phone, 
  Heart, 
  Sparkles, 
  Trash2,
  Lock,
  Camera,
  RefreshCw,
  X,
  LogIn,
  Pill,
  Download
} from "lucide-react";
import { UserProfile, MedicalDocument, MedicationRecord } from "../types";
import { signInWithGoogle, logoutGoogle } from "../lib/firebase";
import { createGoogleContact } from "../lib/workspace";
import AddMedicationForm from "./AddMedicationForm";

interface OnboardingViewProps {
  initialProfile?: UserProfile;
  onComplete: (profile: UserProfile) => void;
  onCancel?: () => void;
  onUpdateProfile?: (profile: UserProfile) => void;
}

import { importKey, decryptFile, generateEncryptionKey, exportKey, encryptFile } from "../lib/crypto";

export default function OnboardingView({ initialProfile, onComplete, onCancel, onUpdateProfile }: OnboardingViewProps) {
  const [step, setStep] = useState<number>(1);

  const handleDownloadDoc = async (doc: MedicalDocument) => {
    if (!doc.encryptedData || !doc.iv || !doc.key) {
      alert("This document is not encrypted properly or is missing its key.");
      return;
    }
    try {
      const key = await importKey(doc.key);
      const blob = await decryptFile(doc.encryptedData, doc.iv, key, doc.fileType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Decryption failed", e);
      alert("Failed to decrypt document. It may be corrupted or the key is invalid.");
    }
  };
  const [onboardingMeds, setOnboardingMeds] = useState<MedicationRecord[]>([]);

  // Profile form state - ZERO PREFILLED DATA
  const [fullName, setFullName] = useState(initialProfile?.fullName || "");
  const [dateOfBirth, setDateOfBirth] = useState(initialProfile?.dateOfBirth || "");
  const [gender, setGender] = useState(initialProfile?.gender || "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatarUrl || "");
  const [primaryPhone, setPrimaryPhone] = useState(initialProfile?.primaryPhone || "");
  const [language, setLanguage] = useState(initialProfile?.language || "English");

  const indianLanguages = ["Hindi", "Bengali", "Marathi", "Telugu", "Tamil", "Gujarati", "Urdu", "Kannada", "Odia", "Malayalam"];
  const internationalLanguages = ["English", "Spanish", "French", "German", "Mandarin"];

  const computedAge = dateOfBirth ? Math.floor((new Date().getTime() - new Date(dateOfBirth).getTime()) / 3.15576e+10).toString() : "";

  // Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Google Account & Sign In State
  const [googleConnected, setGoogleConnected] = useState(initialProfile?.googleAccount?.connected ?? false);
  const [googleEmail, setGoogleEmail] = useState(initialProfile?.googleAccount?.email || "");
  const [syncCalendar, setSyncCalendar] = useState(initialProfile?.googleAccount?.syncCalendar ?? true);
  const [syncDrive, setSyncDrive] = useState(initialProfile?.googleAccount?.syncDrive ?? true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Emergency & Doctor
  const [emergencyName, setEmergencyName] = useState(initialProfile?.emergencyContact?.name || "");
  const [emergencyRelation, setEmergencyRelation] = useState(initialProfile?.emergencyContact?.relationship || "");
  const [emergencyPhone, setEmergencyPhone] = useState(initialProfile?.emergencyContact?.phone || "");

  const [doctorName, setDoctorName] = useState(initialProfile?.primaryDoctor?.name || "");
  const [doctorClinic, setDoctorClinic] = useState(initialProfile?.primaryDoctor?.clinic || "");
  const [doctorPhone, setDoctorPhone] = useState(initialProfile?.primaryDoctor?.phone || "");

  // Medical Documents - NO PREFILLED DOCS
  const [medicalDocs, setMedicalDocs] = useState<MedicalDocument[]>(initialProfile?.medicalDocs || []);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState("");

  // Start Live Webcam Feed
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: "user" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Camera access denied or device has no camera available. Please allow camera permissions.");
      setIsCameraActive(false);
    }
  };

  // Stop Webcam Stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Capture photo from video feed onto canvas
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 400;
      canvas.height = video.videoHeight || 400;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoData = canvas.toDataURL("image/jpeg", 0.9);
        setAvatarUrl(photoData);
        stopCamera();
      }
    }
  };

  // Clean up camera on unmount or step change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (step !== 1) {
      stopCamera();
    }
  }, [step]);

  // Document upload handler for user medical files
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsUploading(true);
      const file = files[0];
      
      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: `Analyze the context of a medical document named "${file.name}". Generate a brief 1-2 sentence medical summary of what this document likely contains based on its name and typical patient uploads. Keep it highly professional and concise.`
          })
        });
        
        let summary = "Uploaded and stored in your medical vault.";
        if (response.ok) {
          const data = await response.json();
          if (data.response) summary = data.response;
        }

        const cryptoKey = await generateEncryptionKey();
        const exportedKey = await exportKey(cryptoKey);
        const { encryptedData, iv } = await encryptFile(file, cryptoKey);

        const newDoc: MedicalDocument = {
          id: `doc-${Date.now()}`,
          fileName: file.name,
          fileType: file.type || "application/pdf",
          fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          uploadDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          category: file.name.toLowerCase().includes("presc") ? "Prescription" : "General",
          summary: summary,
          encryptedData: encryptedData,
          iv: iv,
          key: exportedKey
        };
        setMedicalDocs(prev => [newDoc, ...prev]);
      } catch (err) {
        console.error("AI Document analysis failed", err);
      } finally {
        setIsUploading(false);
        setUploadSuccessMsg(`Successfully processed ${file.name}`);
        setTimeout(() => setUploadSuccessMsg(""), 4000);
      }
    }
  };

  const removeDoc = (id: string) => {
    setMedicalDocs(prev => prev.filter(d => d.id !== id));
  };

  const handleGoogleSignInSubmit = async () => {
    setIsAuthLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user && user.email) {
        setGoogleEmail(user.email);
        setGoogleConnected(true);
      }
    } catch (e) {
      console.error("Google Sign-In failed", e);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await logoutGoogle();
    setGoogleConnected(false);
    setGoogleEmail("");
  };

  const handleFinish = async () => {
    if (googleConnected) {
      if (emergencyName && emergencyPhone) {
        createGoogleContact({
          name: emergencyName,
          phone: emergencyPhone,
          relationship: emergencyRelation || "Emergency Contact"
        }).catch(e => console.error("Failed to add emergency contact:", e));
      }
      if (doctorName && doctorPhone) {
        createGoogleContact({
          name: doctorName,
          phone: doctorPhone,
          relationship: "Doctor"
        }).catch(e => console.error("Failed to add doctor contact:", e));
      }
    }

    const profile: UserProfile = {
      fullName: fullName.trim(),
      dateOfBirth,
      age: computedAge,
      gender,
      avatarUrl,
      primaryPhone,
      language,
      googleAccount: {
        connected: googleConnected,
        email: googleEmail,
        syncCalendar,
        syncDrive
      },
      emergencyContact: {
        name: emergencyName,
        relationship: emergencyRelation,
        phone: emergencyPhone
      },
      primaryDoctor: {
        name: doctorName,
        clinic: doctorClinic,
        phone: doctorPhone
      },
      medicalDocs,
      onboarded: true
    };

    localStorage.setItem("avenly_user_profile", JSON.stringify(profile));
    localStorage.setItem("avenly_onboarded", "true");
    onComplete(profile);
  };

  const stepsList = [
    { stepNum: 1, label: "Photo" },
    { stepNum: 2, label: "Details" },
    { stepNum: 3, label: "Google" },
    { stepNum: 4, label: "Medications" },
    { stepNum: 5, label: "Vault" },
    { stepNum: 6, label: "Emergency" },
    { stepNum: 7, label: "Doctor" },
    { stepNum: 8, label: "Review" }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#121212] text-zinc-100 flex flex-col font-sans select-none overflow-hidden animate-fadeIn">
      {/* Top Header Step Indicator */}
      <div className="bg-[#1C1C1E] border-b border-zinc-800 px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-sm">
            AV
          </div>
          <div>
            <h1 className="text-sm font-bold font-display text-white flex items-center gap-2">
              Avenly Smart Touch Hub Setup
              <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
                8-Step Wizard
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400">Step {step} of 8: {stepsList[step - 1]?.label}</p>
          </div>
        </div>

        {/* Step Progress Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[60%]">
          {stepsList.map((s) => (
            <div
              key={s.stepNum}
              onClick={() => {
                if (s.stepNum < step) setStep(s.stepNum);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                step === s.stepNum
                  ? "bg-white text-black border-white shadow-sm"
                  : step > s.stepNum
                  ? "bg-zinc-800 border-zinc-700 text-white"
                  : "bg-transparent border-transparent text-zinc-500"
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-mono ${
                step === s.stepNum ? "bg-black text-white" : step > s.stepNum ? "bg-white text-black" : "bg-zinc-800 text-zinc-400"
              }`}>
                {step > s.stepNum ? "✓" : s.stepNum}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}

          {onCancel && (
            <button
              onClick={onCancel}
              className="ml-3 px-3 py-1 text-xs font-bold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-md transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Main Form Content Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-4xl mx-auto w-full flex flex-col justify-between">
        
        {/* STEP 1: PROFILE PHOTO VIA LIVE CAMERA */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider">Step 1 of 8</span>
              <h2 className="text-2xl font-bold font-display text-white mt-1">Take Profile Photo</h2>
              <p className="text-xs text-zinc-400">Capture a clear photo using your device camera for your Hub identity.</p>
            </div>

            <div className="bg-[#1C1C1E] border border-zinc-800 p-8 rounded-3xl shadow-sm flex flex-col items-center justify-center text-center">
              <div className="relative w-52 h-52 rounded-2xl bg-zinc-900 border-2 border-dashed border-zinc-700 overflow-hidden flex flex-col items-center justify-center shadow-inner">
                <canvas ref={canvasRef} className="hidden" />

                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Captured Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-500 p-4 text-center">
                    <User className="w-16 h-16 mb-2 text-zinc-600" />
                    <span className="text-xs font-medium text-zinc-400">No photo taken yet</span>
                  </div>
                )}

                {isCameraActive && (
                  <div className="absolute top-2 left-2 bg-white/20 border border-white/30 backdrop-blur-md text-white font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-full animate-pulse">
                    ● Live Camera
                  </div>
                )}
              </div>

              {cameraError && (
                <p className="text-xs text-zinc-300 font-semibold mt-3 text-center leading-tight bg-white/5 p-3 rounded-2xl border border-white/10 max-w-md">
                  {cameraError}
                </p>
              )}

              <div className="mt-6 flex gap-3">
                {!isCameraActive ? (
                  <button
                    onClick={startCamera}
                    className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl border border-zinc-700 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{avatarUrl ? "Retake Photo" : "Open Camera"}</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={capturePhoto}
                      className="px-6 py-2.5 bg-white text-black font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-black" />
                      <span>Capture Photo</span>
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-700"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PERSONAL DETAILS */}
        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider">Step 2 of 8</span>
              <h2 className="text-2xl font-bold font-display text-white mt-1">Personal Details & Demographics</h2>
              <p className="text-xs text-zinc-400">Enter your name, date of birth, contact number, and language preference.</p>
            </div>

            <div className="bg-[#1C1C1E] border border-zinc-800 p-6 rounded-3xl shadow-sm space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#121212] border border-zinc-800 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-zinc-500 transition-colors"
                  placeholder="e.g. Margaret Sullivan"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full bg-[#121212] border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">Calculated Age</label>
                  <input
                    type="text"
                    readOnly
                    value={computedAge ? `${computedAge} Years Old` : ""}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none cursor-not-allowed"
                    placeholder="Auto-calculated from DOB"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">Primary Phone Number</label>
                  <input
                    type="text"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    className="w-full bg-[#121212] border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-zinc-500"
                    placeholder="+1 (555) 012-3456"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">Preferred Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-[#121212] border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-zinc-500"
                  >
                    <optgroup label="International">
                      {internationalLanguages.map(lang => (
                        <option key={lang} value={lang} className="bg-zinc-900">{lang}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Indian Regional">
                      {indianLanguages.map(lang => (
                        <option key={lang} value={lang} className="bg-zinc-900">{lang}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: GOOGLE WORKSPACE SIGN IN */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider">Step 3 of 8</span>
              <h2 className="text-2xl font-bold font-display text-white mt-1">Google Workspace Sign-In</h2>
              <p className="text-xs text-zinc-400">Authenticate with your Google Account for real-time Google Sheets, Calendar, and Drive integration.</p>
            </div>

            <div className="bg-[#1C1C1E] border border-zinc-800 p-6 rounded-3xl shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white text-black font-bold text-2xl flex items-center justify-center shadow-sm">
                    G
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Google Workspace Account</h3>
                    <p className="text-xs text-zinc-400">
                      {googleConnected ? `Signed in as ${googleEmail}` : "Required for Sheets prescription sync & doctor appointments"}
                    </p>
                  </div>
                </div>

                {!googleConnected ? (
                  <button
                    onClick={handleGoogleSignInSubmit}
                    disabled={isAuthLoading}
                    className="px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-white" />
                    <span>{isAuthLoading ? "Authenticating..." : "Sign in with Google Account"}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 bg-white/10 text-white border border-white/20 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      Authenticated
                    </span>
                    <button
                      onClick={handleGoogleSignOut}
                      className="px-3 py-1.5 bg-white/5 text-zinc-400 hover:text-white border border-white/10 rounded-xl text-xs font-semibold backdrop-blur-md"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>

              {googleConnected ? (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="bg-black/30 border border-white/10 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-white/20 backdrop-blur-md">
                      <input
                        type="checkbox"
                        checked={syncCalendar}
                        onChange={(e) => setSyncCalendar(e.target.checked)}
                        className="w-5 h-5 rounded bg-black border-white/20 text-white focus:ring-0"
                      />
                      <div>
                        <span className="text-xs font-bold text-zinc-200 block">Google Calendar Sync</span>
                        <span className="text-[10px] text-zinc-400 block">Sync doctor appointments & care schedule</span>
                      </div>
                    </label>

                    <label className="bg-black/30 border border-white/10 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-white/20 backdrop-blur-md">
                      <input
                        type="checkbox"
                        checked={syncDrive}
                        onChange={(e) => setSyncDrive(e.target.checked)}
                        className="w-5 h-5 rounded bg-black border-white/20 text-white focus:ring-0"
                      />
                      <div>
                        <span className="text-xs font-bold text-zinc-200 block">Google Drive Cloud Vault</span>
                        <span className="text-[10px] text-zinc-400 block">Backup prescription PDFs & medical reports</span>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-zinc-300 text-xs leading-relaxed flex items-center gap-3 backdrop-blur-md">
                  <ShieldCheck className="w-5 h-5 text-white shrink-0" />
                  <span>Click <strong>"Sign in with Google Account"</strong> above to link your Google Account and sync data with Google Sheets.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: ADD YOUR MEDICATIONS (DEDICATED STEP) */}
        {step === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider">Step 4 of 8</span>
              <h2 className="text-2xl font-bold font-display text-white mt-1">Add Your Medications</h2>
              <p className="text-xs text-zinc-400">
                Configure your active daily medication schedule. Each entry writes as a new row to your Google Sheet <span className="font-mono text-zinc-300">"Medications"</span> tab.
              </p>
            </div>

            <AddMedicationForm
              isEmbedded={true}
              onComplete={(savedMeds) => {
                setOnboardingMeds(savedMeds);
                setStep(5);
              }}
              onSkip={() => {
                setStep(5);
              }}
            />
          </div>
        )}

        {/* STEP 5: MEDICAL VAULT DOCUMENTS */}
        {step === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider">Step 5 of 8</span>
                <h2 className="text-2xl font-bold font-display text-white mt-1">Upload Medical Documents</h2>
                <p className="text-xs text-zinc-400">Upload prescription PDFs, discharge notes, and medical records.</p>
              </div>

              <label className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-2xl text-xs font-bold shadow-lg border border-white/20 cursor-pointer flex items-center gap-2 transition-all active:scale-95 backdrop-blur-md">
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
                <input type="file" onChange={handleDocUpload} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className="hidden" />
              </label>
            </div>

            {uploadSuccessMsg && (
              <div className="bg-white/10 border border-white/20 text-white text-xs px-4 py-2 rounded-2xl flex items-center gap-2 animate-fadeIn backdrop-blur-md">
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                <span>{uploadSuccessMsg}</span>
              </div>
            )}

            {isUploading && (
              <div className="bg-white/10 border border-white/20 text-white text-xs px-4 py-3 rounded-2xl flex items-center justify-center gap-3 animate-pulse backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-white animate-spin" />
                <span>Processing & OCR Extracting Document Details...</span>
              </div>
            )}

            {medicalDocs.length === 0 ? (
              <div className="bg-white/5 border border-dashed border-white/15 p-12 rounded-3xl flex flex-col items-center justify-center text-center backdrop-blur-2xl">
                <FileText className="w-12 h-12 text-zinc-600 mb-3" />
                <h3 className="text-sm font-bold text-zinc-200">No Medical Documents Uploaded</h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
                  Your medical vault is empty. Click the button above to upload a document, or continue to the next step.
                </p>
                <label className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-bold cursor-pointer transition-colors backdrop-blur-md">
                  Choose File to Upload
                  <input type="file" onChange={handleDocUpload} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className="hidden" />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {medicalDocs.map((doc) => (
                  <div key={doc.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-between backdrop-blur-xl">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white truncate max-w-[180px]">{doc.fileName}</h4>
                          <span className="text-[10px] text-zinc-400 font-mono">{doc.fileSize} • {doc.category}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleDownloadDoc(doc)} className="text-zinc-500 hover:text-emerald-400 p-1" title="Decrypt & Download">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeDoc(doc.id)} className="text-zinc-500 hover:text-red-400 p-1" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 6: EMERGENCY CONTACT */}
        {step === 6 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider">Step 6 of 8</span>
              <h2 className="text-2xl font-bold font-display text-white mt-1">Emergency Contact</h2>
              <p className="text-xs text-zinc-400">Designate the primary contact to alert in the event of a fall or urgent health notice.</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 backdrop-blur-2xl">
              <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center border border-white/15">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Primary Emergency Contact</h3>
                  <p className="text-[10px] text-zinc-400">First responder on fall detection and SOS triggers</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Contact Full Name</label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-white/40"
                  placeholder="e.g. Preeti Sullivan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Relationship</label>
                  <input
                    type="text"
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-white/40"
                    placeholder="e.g. Daughter, Son, Spouse"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-white/40"
                    placeholder="+1 (555) 234-5678"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: PRIMARY DOCTOR */}
        {step === 7 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider">Step 7 of 8</span>
              <h2 className="text-2xl font-bold font-display text-white mt-1">Primary Care Physician</h2>
              <p className="text-xs text-zinc-400">Configure your primary doctor for 1-touch tele-consultations.</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 backdrop-blur-2xl">
              <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center border border-white/15">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Physician Information</h3>
                  <p className="text-[10px] text-zinc-400">Quick contact and consultation link</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Doctor Name</label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-white/40"
                  placeholder="e.g. Dr. Robert Chen, MD"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Clinic Name</label>
                  <input
                    type="text"
                    value={doctorClinic}
                    onChange={(e) => setDoctorClinic(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-white/40"
                    placeholder="e.g. City Health Clinic"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Doctor Phone</label>
                  <input
                    type="text"
                    value={doctorPhone}
                    onChange={(e) => setDoctorPhone(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-white/40"
                    placeholder="+1 (555) 789-0123"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: REVIEW & LAUNCH */}
        {step === 8 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-zinc-300 tracking-wider">Step 8 of 8 • Setup Complete</span>
              <h2 className="text-2xl font-bold font-display text-white mt-1">Review & Launch Avenly Hub</h2>
              <p className="text-xs text-zinc-400">Confirm your profile parameters and launch your personalized Touch Hub.</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-2xl space-y-5 backdrop-blur-2xl">
              <div className="flex items-center gap-5 border-b border-white/10 pb-5">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName || "Profile"}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white/40 shadow-xl"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-zinc-400">
                    <User className="w-10 h-10" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">{fullName || "Unnamed Profile"}</h3>
                  <p className="text-xs text-zinc-400">
                    {computedAge ? `${computedAge} Years Old` : "Age not set"} • DOB: {dateOfBirth || "N/A"} • Language: {language}
                  </p>
                  <p className="text-xs text-zinc-300 font-mono mt-1">{primaryPhone || "No primary phone set"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-zinc-300">
                <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10 backdrop-blur-md">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1 font-mono">Google Workspace</span>
                  <span className={`font-bold block ${googleConnected ? "text-white" : "text-zinc-500"}`}>
                    {googleConnected ? `Connected (${googleEmail})` : "Not Authenticated"}
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    {googleConnected ? "Sheets, Calendar & Drive" : "No Cloud Sync"}
                  </span>
                </div>

                <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10 backdrop-blur-md">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1 font-mono">Medications</span>
                  <span className="text-white font-bold block">
                    {onboardingMeds.length > 0 ? `${onboardingMeds.length} Active Prescriptions` : "Configured via Sheets"}
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">Google Sheets Tab</span>
                </div>

                <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10 backdrop-blur-md">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1 font-mono">Emergency Contact</span>
                  <span className="text-white font-bold block truncate">{emergencyName || "None Set"}</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">{emergencyPhone || "No Phone"}</span>
                </div>

                <div className="bg-black/30 p-3.5 rounded-2xl border border-white/10 backdrop-blur-md">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1 font-mono">Medical Vault</span>
                  <span className="text-white font-bold block">{medicalDocs.length} Documents</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">Encrypted Vault</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation Controls (For non-form embedded steps) */}
        {step !== 4 && (
          <div className="flex items-center justify-between border-t border-white/10 pt-6 mt-4">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-2xl text-xs font-bold border border-white/10 flex items-center gap-2 transition-all backdrop-blur-md"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : <div />}

            {step < 8 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-2xl text-xs font-bold border border-white/25 shadow-lg flex items-center gap-2 transition-all active:scale-95 backdrop-blur-md cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="px-8 py-3 bg-white hover:bg-zinc-200 text-black rounded-2xl text-xs font-bold uppercase tracking-wider shadow-2xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-black" />
                <span>Launch Avenly Hub</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
