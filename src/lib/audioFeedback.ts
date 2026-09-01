// Web Audio API and Haptic Feedback for Elderly-Accessible Interface

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export type SoundType = "tap" | "success" | "warning" | "back" | "error" | "chime" | "sos" | "medication_taken" | "call" | "end_call";

export function playAudioFeedback(type: SoundType = "tap", volumeMultiplier = 1.0, forcePlay = false) {
  try {
    const isSoundEnabled = localStorage.getItem("avenly_sound_feedback") !== "false";
    if (!isSoundEnabled && !forcePlay) return;

    // Trigger haptic vibration if supported on device
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      if (type === "tap" || type === "back") {
        navigator.vibrate(25);
      } else if (type === "success" || type === "medication_taken") {
        navigator.vibrate([30, 40, 30]);
      } else if (type === "warning" || type === "error" || type === "sos") {
        navigator.vibrate([60, 50, 60]);
      }
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.15 * volumeMultiplier, now);
    masterGain.connect(ctx.destination);

    if (type === "tap") {
      // Pleasant soft tactile wooden-like click chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.05);

      gain.gain.setValueAtTime(0.3 * volumeMultiplier, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === "back" || type === "end_call") {
      // Gentle downward navigation chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.08);

      gain.gain.setValueAtTime(0.25 * volumeMultiplier, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "medication_taken") {
      // Reassuring 3-tone harmonic ascent (C5 -> E5 -> G5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      const gain3 = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.2 * volumeMultiplier, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.25 * volumeMultiplier, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc3.type = "triangle";
      osc3.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain3.gain.setValueAtTime(0, now);
      gain3.gain.setValueAtTime(0.3 * volumeMultiplier, now + 0.16);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc3.connect(gain3);
      gain3.connect(masterGain);

      osc1.start(now);
      osc1.stop(now + 0.16);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.26);
      osc3.start(now + 0.16);
      osc3.stop(now + 0.42);
    } else if (type === "call") {
      // Friendly telephone connection chime (Dual Tone 440Hz + 480Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0.2 * volumeMultiplier, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.26);
      osc2.stop(now + 0.26);
    } else if (type === "success" || type === "chime") {
      // Cheerful 2-tone harmonic confirmation (C5 -> G5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.25 * volumeMultiplier, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(783.99, now + 0.09); // G5
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.3 * volumeMultiplier, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc2.connect(gain2);
      gain2.connect(masterGain);

      osc1.start(now);
      osc1.stop(now + 0.22);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.38);
    } else if (type === "warning" || type === "sos") {
      // Clear alert chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(523.25, now + 0.12); // C5

      gain.gain.setValueAtTime(0.35 * volumeMultiplier, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (type === "error") {
      // Gentle double low tap for error
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.08);

      gain.gain.setValueAtTime(0.2 * volumeMultiplier, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch (e) {
    // Non-blocking fallback
    console.debug("Audio feedback suppressed:", e);
  }
}

// Text-to-Speech screen reader helper for elderly users
export function speakText(text: string, lang = "en-US") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel(); // Stop any pending speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower, clearer pacing for elderly comprehension
    utterance.pitch = 1.0;
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.debug("Speech synthesis error:", e);
  }
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}
