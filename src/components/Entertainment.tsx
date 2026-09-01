import { useState, useEffect, useRef } from "react";
import {
  Music,
  Play,
  MessageCircle,
  Newspaper,
  Gamepad2,
  BookOpen,
  Volume2,
  X,
  ChevronRight,
  Pause,
  SkipForward,
  SkipBack,
  Search,
  Mic,
  Send,
  VolumeX,
  Flame,
  Loader2,
  Sparkles,
  RotateCcw,
  Video,
  Key,
  ExternalLink,
  Eye,
  Clock,
  ShieldCheck
} from "lucide-react";

import { getTranslation } from "../lib/translations";
import KindleReaderView from "./KindleReaderView";
import BrainGamesSuite from "./BrainGamesSuite";

interface EntertainmentProps {
  userLanguage?: string;
}

export default function Entertainment({ userLanguage }: EntertainmentProps) {
  const t = getTranslation(userLanguage);
  const [activeApp, setActiveApp] = useState<"deezer" | "videos" | "news" | "games" | "audiobooks" | null>(null);

  // Deezer states
  const [deezerSearch, setDeezerSearch] = useState("");
  const [deezerTracks, setDeezerTracks] = useState<any[]>([]);
  const [activeTrack, setActiveTrack] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [trackDuration, setTrackDuration] = useState(30);
  const [volume, setVolume] = useState(0.8);
  const [isListening, setIsListening] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleDeezerSearch = (query: string) => {
    if (!query.trim()) {
      setDeezerTracks([]);
      return;
    }
    setIsSearching(true);
    fetch(`/api/deezer/search?q=${encodeURIComponent(query.trim())}`)
      .then(r => r.json())
      .then(data => {
        setDeezerTracks(Array.isArray(data) ? data : []);
        setIsSearching(false);
      })
      .catch(err => {
        console.error("Deezer search error:", err);
        setIsSearching(false);
      });
  };

  useEffect(() => {
    if (activeApp === "deezer") {
      if (deezerSearch.trim().length > 0) {
        const timer = setTimeout(() => {
          handleDeezerSearch(deezerSearch);
        }, 400);
        return () => clearTimeout(timer);
      } else {
        setDeezerTracks([]);
      }
    }
  }, [activeApp, deezerSearch]);

  const handleStartDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please type your search query.");
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = userLanguage === "Hindi" ? "hi-IN" : userLanguage === "Spanish" ? "es-ES" : "en-US";
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setDeezerSearch(transcript);
          handleDeezerSearch(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      console.error("Voice dictation error:", e);
      setIsListening(false);
    }
  };

  useEffect(() => {
    if (activeTrack) {
      setIsPlaying(true);
      setCurrentTime(0);
    } else {
      setIsPlaying(false);
    }
  }, [activeTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setTrackDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Invidious Videos states
  const [videoSearch, setVideoSearch] = useState("");
  const [videosList, setVideosList] = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<any | null>(null);
  const [useFallbackPlayer, setUseFallbackPlayer] = useState(false);
  const [isVideoSearching, setIsVideoSearching] = useState(false);
  const [isVideoListening, setIsVideoListening] = useState(false);

  // Stop background music audio when playing videos or switching to video tab
  useEffect(() => {
    if (activeApp === "videos" || activeVideo) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [activeApp, activeVideo]);

  const handleVideoSearch = (query: string) => {
    if (!query.trim()) {
      setVideosList([]);
      return;
    }
    setIsVideoSearching(true);
    fetch(`/api/videos/search?q=${encodeURIComponent(query.trim())}`)
      .then(r => r.json())
      .then(data => {
        setVideosList(Array.isArray(data) ? data : []);
        setIsVideoSearching(false);
      })
      .catch(err => {
        console.error("Video search error:", err);
        setIsVideoSearching(false);
      });
  };

  useEffect(() => {
    if (activeApp === "videos") {
      if (videoSearch.trim().length > 0) {
        const timer = setTimeout(() => {
          handleVideoSearch(videoSearch);
        }, 200);
        return () => clearTimeout(timer);
      } else {
        setVideosList([]);
      }
    }
  }, [activeApp, videoSearch]);

  const handleStartVideoDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please type your search query.");
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = userLanguage === "Hindi" ? "hi-IN" : userLanguage === "Spanish" ? "es-ES" : "en-US";
      recognition.interimResults = false;

      recognition.onstart = () => setIsVideoListening(true);
      recognition.onend = () => setIsVideoListening(false);
      recognition.onerror = () => setIsVideoListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setVideoSearch(transcript);
          handleVideoSearch(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      console.error("Video voice dictation error:", e);
      setIsVideoListening(false);
    }
  };

  // NewsData states
  const [liveNews, setLiveNews] = useState<any[]>([]);

  useEffect(() => {
    if (activeApp === "news" && liveNews.length === 0) {
      fetch(`/api/news/search`)
        .then(r => r.json())
        .then(data => {
          if (data && data.length > 0) setLiveNews(data.slice(0, 6));
        })
        .catch(console.error);
    }
  }, [activeApp]);

  // Books states
  const [bookSearch, setBookSearch] = useState("elderly health, gardening, or history");
  const [booksList, setBooksList] = useState<any[]>([]);
  const [activeBook, setActiveBook] = useState<any | null>(null);

  useEffect(() => {
    if (activeApp === "audiobooks") {
      fetch(`/api/books/search?q=${encodeURIComponent(bookSearch)}`)
        .then(r => r.json())
        .then(data => setBooksList(data))
        .catch(console.error);
    }
  }, [activeApp, bookSearch]);

  // Games states
  const [activeGame, setActiveGame] = useState<"menu" | "memory" | "precision">("menu");
  
  // Cognitive Card Matching Game states
  const initialCards = [
    { id: 1, val: "🍎", matched: false, flipped: false },
    { id: 2, val: "🍀", matched: false, flipped: false },
    { id: 3, val: "🐱", matched: false, flipped: false },
    { id: 4, val: "☀️", matched: false, flipped: false },
    { id: 5, val: "🍎", matched: false, flipped: false },
    { id: 6, val: "🍀", matched: false, flipped: false },
    { id: 7, val: "🐱", matched: false, flipped: false },
    { id: 8, val: "☀️", matched: false, flipped: false }
  ];
  const [cards, setCards] = useState(initialCards);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [gameScore, setGameScore] = useState(0);

  // Motor skills precision game states
  const [precisionTargets, setPrecisionTargets] = useState<{ id: number, x: number, y: number, active: boolean }[]>([]);
  const [precisionScore, setPrecisionScore] = useState(0);
  const [precisionTimeLeft, setPrecisionTimeLeft] = useState(30);
  const [isPrecisionPlaying, setIsPrecisionPlaying] = useState(false);

  useEffect(() => {
    let timer: any;
    if (activeGame === "precision" && isPrecisionPlaying && precisionTimeLeft > 0) {
      timer = setInterval(() => {
        setPrecisionTimeLeft(t => t - 1);
        if (Math.random() > 0.4) {
          setPrecisionTargets(prev => [
            ...prev,
            { id: Date.now(), x: Math.random() * 80 + 10, y: Math.random() * 80 + 10, active: true }
          ].slice(-5));
        }
      }, 1000);
    } else if (precisionTimeLeft === 0) {
      setIsPrecisionPlaying(false);
    }
    return () => clearInterval(timer);
  }, [activeGame, isPrecisionPlaying, precisionTimeLeft]);

  const handleStartPrecision = () => {
    setPrecisionScore(0);
    setPrecisionTimeLeft(30);
    setPrecisionTargets([]);
    setIsPrecisionPlaying(true);
  };

  const handleTapTarget = (id: number) => {
    setPrecisionTargets(prev => prev.filter(t => t.id !== id));
    setPrecisionScore(s => s + 10);
  };

  const handleCardClick = (id: number) => {
    const clickedCard = cards.find(c => c.id === id);
    if (!clickedCard || clickedCard.matched || clickedCard.flipped || selectedCards.length >= 2) return;

    // Flip card
    setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c));
    const nextSelected = [...selectedCards, id];
    setSelectedCards(nextSelected);

    if (nextSelected.length === 2) {
      const card1 = cards.find(c => c.id === nextSelected[0])!;
      const card2 = cards.find(c => c.id === id)!;

      if (card1.val === card2.val) {
        // Matched!
        setTimeout(() => {
          setCards(prev => prev.map(c => c.id === card1.id || c.id === card2.id ? { ...c, matched: true } : c));
          setGameScore(s => s + 10);
          setSelectedCards([]);
        }, 500);
      } else {
        // Unflipped!
        setTimeout(() => {
          setCards(prev => prev.map(c => c.id === card1.id || c.id === card2.id ? { ...c, flipped: false } : c));
          setSelectedCards([]);
        }, 1000);
      }
    }
  };

  const handleRestartGame = () => {
    // Shuffle cards
    const shuffled = [...initialCards].sort(() => Math.random() - 0.5);
    setCards(shuffled.map((c, i) => ({ ...c, id: i + 1, flipped: false, matched: false })));
    setGameScore(0);
    setSelectedCards([]);
  };

  // App 6: Audiobooks states
  const [bookPlaying, setBookPlaying] = useState(false);
  const [bookChapter, setBookChapter] = useState("Chapter 1: The Secret Garden");

  return (
    <div className="w-full h-full animate-fadeIn select-none flex flex-col justify-between overflow-y-auto no-scrollbar">
      
      {/* Immersive Sub-Application Viewports */}
      {activeApp !== null && (
        <div className="absolute inset-0 bg-[#0f1115]/98 z-40 flex flex-col justify-between overflow-y-auto no-scrollbar animate-fadeIn">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveApp(null)}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-300 border border-zinc-800 transition-colors"
                title="Go back"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold font-display text-zinc-100 uppercase tracking-wider">
                {activeApp}
              </h2>
            </div>
            
            <div className="px-3.5 py-1.5 bg-[#1a1b21] rounded-full border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>Voice Mode Available</span>
            </div>
          </div>

          {/* Core sub-application rendering */}
          <div className="flex-1 my-5 overflow-hidden no-scrollbar">
            
            {/* DEEZER MUSIC */}
            {activeApp === "deezer" && (
              <div className="flex flex-col gap-5 h-full">
                {/* Search & Dictate Bar */}
                <div className="flex gap-3 items-center">
                  <div className="flex-1 bg-zinc-900/90 border border-zinc-800 focus-within:border-emerald-500/50 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-md transition-all">
                    <Search className="w-5 h-5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search Deezer music (e.g. Beethoven, Beatles, Relaxing Piano)..."
                      value={deezerSearch}
                      onChange={(e) => setDeezerSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-base text-zinc-100 placeholder-zinc-500 w-full"
                    />
                    {deezerSearch && (
                      <button
                        onClick={() => {
                          setDeezerSearch("");
                          setDeezerTracks([]);
                          setActiveTrack(null);
                        }}
                        className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Dictate Voice Search Button */}
                  <button
                    onClick={handleStartDictation}
                    className={`px-5 py-3 rounded-2xl border flex items-center gap-2 font-semibold text-sm transition-all ${
                      isListening
                        ? "bg-red-600 text-white border-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                        : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-emerald-400 hover:text-emerald-300"
                    }`}
                    title="Dictate with voice"
                  >
                    <Mic className={`w-5 h-5 ${isListening ? "animate-bounce" : ""}`} />
                    <span className="hidden sm:inline">{isListening ? "Listening..." : "Dictate"}</span>
                  </button>
                </div>

                {/* AUDIO PLAYER VIEW (When a track is selected) */}
                {activeTrack ? (
                  <div className="flex-1 bg-[#14151a] border border-zinc-900 rounded-3xl p-6 flex flex-col justify-between items-center relative overflow-hidden shadow-2xl animate-fadeIn">
                    
                    {/* Hidden Audio element with direct stream fallback */}
                    <audio
                      ref={audioRef}
                      src={activeTrack.preview || activeTrack.previewUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"}
                      autoPlay
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={() => setIsPlaying(false)}
                      onError={(e) => {
                        console.warn("Audio preview link failed, loading fallback stream...");
                        e.currentTarget.src = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
                        e.currentTarget.play().catch(console.error);
                      }}
                    />

                    {/* Background ambient glow */}
                    <div className="absolute -top-24 -left-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Player Header */}
                    <div className="w-full flex items-center justify-between border-b border-zinc-800/80 pb-4 z-10">
                      <button
                        onClick={() => setActiveTrack(null)}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        <span>Back to Results</span>
                      </button>
                      <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>HQ Audio Streaming</span>
                      </div>
                    </div>

                    {/* Album Artwork & Track Info */}
                    <div className="my-auto text-center flex flex-col items-center gap-5 z-10 max-w-lg w-full">
                      <div className="relative group">
                        <img
                          src={activeTrack.album?.cover_big || activeTrack.album?.cover_medium || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&fit=crop"}
                          alt={activeTrack.title}
                          className="w-48 h-48 sm:w-56 sm:h-56 object-cover rounded-3xl border-2 border-zinc-800 shadow-2xl transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        {isPlaying && (
                          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-4 py-1 rounded-full font-bold text-xs shadow-lg flex items-center gap-1.5 animate-pulse">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>PLAYING</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 space-y-1 w-full px-4">
                        <h3 className="text-xl sm:text-2xl font-bold font-display text-white line-clamp-1">{activeTrack.title}</h3>
                        <p className="text-sm font-semibold text-emerald-400">{activeTrack.artist?.name || "Unknown Artist"}</p>
                        {activeTrack.album?.title && (
                          <p className="text-xs text-zinc-500 font-medium line-clamp-1">{activeTrack.album?.title}</p>
                        )}
                      </div>

                      {/* Time Progress Bar */}
                      <div className="w-full space-y-1 mt-3">
                        <input
                          type="range"
                          min={0}
                          max={trackDuration || 30}
                          step={0.1}
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(trackDuration)}</span>
                        </div>
                      </div>

                      {/* Main Controls */}
                      <div className="flex items-center gap-6 mt-2">
                        <button
                          onClick={() => {
                            if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                          }}
                          className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-zinc-300 hover:text-white transition-all active:scale-95"
                          title="Rewind 10 seconds"
                        >
                          <SkipBack className="w-6 h-6" />
                        </button>

                        <button
                          onClick={togglePlay}
                          className="w-16 h-16 bg-emerald-500 hover:bg-emerald-400 rounded-2xl flex items-center justify-center text-black font-bold shadow-xl shadow-emerald-950/60 transition-all hover:scale-105 active:scale-95"
                          title={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? <Pause className="w-8 h-8 fill-black" /> : <Play className="w-8 h-8 fill-black ml-1" />}
                        </button>

                        <button
                          onClick={() => {
                            if (audioRef.current) audioRef.current.currentTime = Math.min(trackDuration, audioRef.current.currentTime + 10);
                          }}
                          className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-zinc-300 hover:text-white transition-all active:scale-95"
                          title="Fast forward 10 seconds"
                        >
                          <SkipForward className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Volume Slider */}
                      <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800/80 px-4 py-2 rounded-2xl mt-1">
                        <button
                          onClick={() => setVolume(v => (v === 0 ? 0.8 : 0))}
                          className="text-zinc-400 hover:text-zinc-200"
                        >
                          {volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="w-24 accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                      </div>

                    </div>

                  </div>
                ) : deezerSearch.trim() === "" ? (
                  /* READY TO SEARCH INITIAL STATE */
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#14151a]/80 border border-zinc-900 rounded-3xl my-auto animate-fadeIn">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 shadow-[0_0_30px_rgba(16,185,129,0.12)]">
                      <Music className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold font-display text-white tracking-wide">Ready to Search</h3>
                    <p className="text-sm text-zinc-400 max-w-md mt-2 leading-relaxed">
                      Type a song, artist, or music genre above, or tap the microphone to dictate your search.
                    </p>

                    {/* Dictate Button */}
                    <button
                      onClick={handleStartDictation}
                      className={`mt-6 px-7 py-3.5 rounded-2xl flex items-center gap-3 font-semibold text-sm transition-all border ${
                        isListening
                          ? "bg-red-600 text-white border-red-500 animate-pulse shadow-[0_0_25px_rgba(239,68,68,0.5)]"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/50 shadow-xl shadow-emerald-950/60 hover:scale-105 active:scale-95"
                      }`}
                    >
                      <Mic className="w-5 h-5" />
                      <span>{isListening ? "Listening... Speak now" : "Dictate Search Query"}</span>
                    </button>

                    {/* Popular Suggestions */}
                    <div className="mt-8">
                      <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block mb-3">Popular Music Categories</span>
                      <div className="flex flex-wrap gap-2.5 justify-center max-w-lg">
                        {["Relaxing Piano", "Classical Masterpieces", "70s Classics", "Acoustic Guitar", "Smooth Jazz", "Nature Rain Ambient"].map((preset) => (
                          <button
                            key={preset}
                            onClick={() => {
                              setDeezerSearch(preset);
                              handleDeezerSearch(preset);
                            }}
                            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 hover:border-emerald-500/40 rounded-xl text-xs font-medium text-zinc-300 hover:text-white transition-all hover:scale-105 active:scale-95"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : isSearching ? (
                  /* LOADING SEARCH STATE */
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#14151a]/60 border border-zinc-900 rounded-3xl">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
                    <p className="text-sm font-medium text-zinc-400">Searching Deezer music database...</p>
                  </div>
                ) : (
                  /* SPACED OUT SEARCH RESULTS GRID */
                  <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                    <div className="flex justify-between items-center mb-4 px-1">
                      <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                        Showing results for "{deezerSearch}" ({deezerTracks.length} tracks found)
                      </span>
                      <button
                        onClick={() => {
                          setDeezerSearch("");
                          setDeezerTracks([]);
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-300 underline"
                      >
                        Clear Search
                      </button>
                    </div>

                    {deezerTracks.length === 0 ? (
                      <div className="text-center py-12 text-zinc-500">
                        No tracks found matching "{deezerSearch}". Try another search term or dictate by voice.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {deezerTracks.map((track) => (
                          <div
                            key={track.id}
                            onClick={() => setActiveTrack(track)}
                            className="bg-[#14151a] hover:bg-[#1a1c24] border border-zinc-800/80 hover:border-emerald-500/50 rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-4 group shadow-lg"
                          >
                            <div className="relative shrink-0">
                              <img
                                src={track.album?.cover_medium || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&fit=crop"}
                                alt={track.title}
                                className="w-24 h-24 object-cover rounded-xl border border-zinc-800 shadow"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-black shadow-lg">
                                  <Play className="w-5 h-5 fill-black ml-0.5" />
                                </div>
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 py-1">
                              <h4 className="text-base font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors line-clamp-1 font-display">
                                {track.title}
                              </h4>
                              <p className="text-xs font-semibold text-zinc-400 mt-1 line-clamp-1">
                                {track.artist?.name || "Unknown Artist"}
                              </p>
                              {track.album?.title && (
                                <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1">
                                  {track.album?.title}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  Preview MP3
                                </span>
                                {track.duration && (
                                  <span className="text-[11px] font-mono text-zinc-500">
                                    {Math.floor(track.duration / 60)}:
                                    {String(track.duration % 60).padStart(2, "0")}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="pr-2">
                              <button className="p-3 bg-zinc-900 group-hover:bg-emerald-500 group-hover:text-black text-zinc-400 rounded-xl border border-zinc-800 group-hover:border-emerald-400 transition-all">
                                <Play className="w-5 h-5 fill-current" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* INVIDIOUS VIDEOS */}
            {activeApp === "videos" && (
              <div className="flex flex-col gap-5 h-full">
                {/* Search & Dictate Bar */}
                <div className="flex gap-3 items-center">
                  <div className="flex-1 bg-zinc-900/90 border border-zinc-800 focus-within:border-emerald-500/50 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-md transition-all">
                    <Search className="w-5 h-5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search videos (e.g. Nature Walks, Meditation, Chair Yoga)..."
                      value={videoSearch}
                      onChange={(e) => setVideoSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-base text-zinc-100 placeholder-zinc-500 w-full"
                    />
                    {videoSearch && (
                      <button
                        onClick={() => {
                          setVideoSearch("");
                          setVideosList([]);
                          setActiveVideo(null);
                        }}
                        className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Dictate Voice Search Button */}
                  <button
                    onClick={handleStartVideoDictation}
                    className={`px-5 py-3 rounded-2xl border flex items-center gap-2 font-semibold text-sm transition-all ${
                      isVideoListening
                        ? "bg-red-600 text-white border-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                        : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-emerald-400 hover:text-emerald-300"
                    }`}
                    title="Dictate video search with voice"
                  >
                    <Mic className={`w-5 h-5 ${isVideoListening ? "animate-bounce" : ""}`} />
                    <span className="hidden sm:inline">{isVideoListening ? "Listening..." : "Dictate"}</span>
                  </button>
                </div>

                {/* VIDEO PLAYER VIEW (When a video is selected) */}
                {activeVideo ? (
                  <div className="flex-1 bg-[#14151a] border border-zinc-900 rounded-3xl p-6 flex flex-col gap-4 overflow-y-auto no-scrollbar shadow-2xl animate-fadeIn">
                    
                    {/* Header Controls */}
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                      <button
                        onClick={() => setActiveVideo(null)}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        <span>Back to Results</span>
                      </button>

                      <button
                        onClick={() => setUseFallbackPlayer(!useFallbackPlayer)}
                        className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-emerald-400 rounded-xl text-xs font-mono transition-all"
                        title="Switch video player engine if video restricts playback"
                      >
                        Player: {useFallbackPlayer ? "Piped (Alt)" : "YouTube (Primary)"}
                      </button>
                    </div>

                    {/* Responsive Video Embed with Guaranteed Height & Proportion */}
                    <div className="w-full max-w-5xl mx-auto aspect-video max-h-[50vh] min-h-[220px] sm:min-h-[340px] rounded-3xl bg-black overflow-hidden border border-zinc-800/80 shadow-2xl relative my-2 shrink-0">
                      <iframe
                        src={
                          useFallbackPlayer
                            ? `https://piped.video/embed/${activeVideo.videoId || activeVideo.id}?autoplay=1`
                            : `https://www.youtube.com/embed/${activeVideo.videoId || activeVideo.id}?autoplay=1&enablejsapi=1&rel=0&playsinline=1`
                        }
                        title={activeVideo.title || "Video Player"}
                        className="w-full h-full border-none absolute inset-0 block"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                      ></iframe>
                    </div>

                    {/* Video Metadata */}
                    <div className="max-w-5xl mx-auto w-full space-y-3 pt-2">
                      <h3 className="text-xl sm:text-2xl font-bold font-display text-white">{activeVideo.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 border-b border-zinc-800/60 pb-3">
                        <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                          {activeVideo.author || activeVideo.uploader || "Video Creator"}
                        </span>
                        {activeVideo.viewCount && (
                          <span className="flex items-center gap-1.5 font-mono">
                            <Eye className="w-3.5 h-3.5 text-zinc-500" />
                            {activeVideo.viewCount}
                          </span>
                        )}
                        {activeVideo.publishedText && (
                          <span className="flex items-center gap-1.5 font-mono text-zinc-500">
                            <Clock className="w-3.5 h-3.5" />
                            {activeVideo.publishedText}
                          </span>
                        )}
                      </div>
                      {activeVideo.descriptionSnippet && (
                        <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
                          {activeVideo.descriptionSnippet}
                        </p>
                      )}
                    </div>

                  </div>
                ) : videoSearch.trim() === "" ? (
                  /* READY TO SEARCH INITIAL STATE */
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#14151a]/80 border border-zinc-900 rounded-3xl my-auto animate-fadeIn">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 shadow-[0_0_30px_rgba(16,185,129,0.12)]">
                      <Video className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold font-display text-white tracking-wide">Ready to Watch Videos</h3>
                    <p className="text-sm text-zinc-400 max-w-md mt-2 leading-relaxed">
                      Type a topic above, tap the microphone to dictate, or select a category below to watch instantly.
                    </p>

                    {/* Dictate Button */}
                    <button
                      onClick={handleStartVideoDictation}
                      className={`mt-6 px-7 py-3.5 rounded-2xl flex items-center gap-3 font-semibold text-sm transition-all border ${
                        isVideoListening
                          ? "bg-red-600 text-white border-red-500 animate-pulse shadow-[0_0_25px_rgba(239,68,68,0.5)]"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/50 shadow-xl shadow-emerald-950/60 hover:scale-105 active:scale-95"
                      }`}
                    >
                      <Mic className="w-5 h-5" />
                      <span>{isVideoListening ? "Listening... Speak now" : "Dictate Video Search"}</span>
                    </button>

                    {/* Popular Categories */}
                    <div className="mt-8">
                      <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block mb-3">Popular Video Categories</span>
                      <div className="flex flex-wrap gap-2.5 justify-center max-w-lg">
                        {["Nature Walk Relaxation", "Guided Meditation", "Elderly Chair Yoga", "Classical Music Concerts", "Documentaries", "Simple Cooking Recipes"].map((preset) => (
                          <button
                            key={preset}
                            onClick={() => {
                              setVideoSearch(preset);
                              handleVideoSearch(preset);
                            }}
                            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 hover:border-emerald-500/40 rounded-xl text-xs font-medium text-zinc-300 hover:text-white transition-all hover:scale-105 active:scale-95"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : isVideoSearching ? (
                  /* LOADING SEARCH STATE */
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#14151a]/60 border border-zinc-900 rounded-3xl">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
                    <p className="text-sm font-medium text-zinc-400">Loading videos...</p>
                  </div>
                ) : (
                  /* SPACED OUT SEARCH RESULTS GRID */
                  <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                    <div className="flex justify-between items-center mb-4 px-1">
                      <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                        Showing results for "{videoSearch}" ({videosList.length} videos found)
                      </span>
                      <button
                        onClick={() => {
                          setVideoSearch("");
                          setVideosList([]);
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-300 underline"
                      >
                        Clear Search
                      </button>
                    </div>

                    {videosList.length === 0 ? (
                      <div className="text-center py-12 text-zinc-500">
                        No videos found matching "{videoSearch}". Try another search term or dictate by voice.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {videosList.map((vid) => {
                          const videoId = vid.videoId || vid.id;
                          const thumb = vid.videoThumbnails?.[0]?.url || vid.thumbnail || "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&fit=crop";
                          const durationSecs = vid.lengthSeconds;
                          const durationStr = durationSecs ? `${Math.floor(durationSecs / 60)}:${String(durationSecs % 60).padStart(2, "0")}` : null;

                          return (
                            <div
                              key={videoId}
                              onClick={() => setActiveVideo(vid)}
                              className="bg-[#14151a] hover:bg-[#1a1c24] border border-zinc-800/80 hover:border-emerald-500/50 rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col group shadow-lg"
                            >
                              <div className="relative aspect-video w-full bg-black overflow-hidden">
                                <img
                                  src={thumb}
                                  alt={vid.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                  <div className="w-12 h-12 bg-emerald-500/90 group-hover:bg-emerald-500 rounded-full flex items-center justify-center text-black shadow-xl group-hover:scale-110 transition-all">
                                    <Play className="w-6 h-6 fill-black ml-0.5" />
                                  </div>
                                </div>
                                {durationStr && (
                                  <div className="absolute bottom-2 right-2 bg-black/80 text-white font-mono text-[11px] px-2 py-0.5 rounded border border-white/10">
                                    {durationStr}
                                  </div>
                                )}
                              </div>

                              <div className="p-4 flex flex-col justify-between flex-1 space-y-2">
                                <h4 className="text-sm font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors line-clamp-2 font-display leading-snug">
                                  {vid.title}
                                </h4>
                                <div className="space-y-1 text-xs text-zinc-400 font-medium pt-1 border-t border-zinc-800/60">
                                  <p className="text-emerald-400/90 line-clamp-1">{vid.author || vid.uploader}</p>
                                  {vid.publishedText && (
                                    <p className="text-[11px] text-zinc-500 font-mono">{vid.publishedText}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* NEWS REPLICA */}
            {activeApp === "news" && (
              <div className="space-y-4 overflow-y-auto h-full no-scrollbar pb-10">
                {liveNews.length > 0 ? (
                  liveNews.map((art, idx) => (
                    <a
                      key={idx}
                      href={art.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-[#14151a] border border-zinc-900 p-5 rounded-2xl hover:bg-[#1a1c23] transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-bold">
                          {art.source_id || "News"}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-medium">
                          {new Date(art.pubDate).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-2 font-display">{art.title}</h3>
                      {art.description && (
                        <p className="text-xs text-zinc-400 leading-relaxed mt-2 line-clamp-3">
                          {art.description}
                        </p>
                      )}
                    </a>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                    <Newspaper className="w-12 h-12 mb-4 opacity-50" />
                    <p>Loading latest news or API key missing...</p>
                  </div>
                )}
              </div>
            )}

            {/* GAMES SUITE (50 Playable Cognitive Brain Games) */}
            {activeApp === "games" && (
              <BrainGamesSuite onClose={() => setActiveApp(null)} userLanguage={userLanguage} />
            )}

            {/* READING & BOOKS (Google Books & Mini Kindle Reader Mode) */}
            {activeApp === "audiobooks" && (
              <KindleReaderView onClose={() => setActiveApp(null)} userLanguage={userLanguage} />
            )}

          </div>

          {/* Footer controls */}
          <div className="flex justify-end border-t border-zinc-900/60 pt-3">
            <button
              onClick={() => {
                setActiveApp(null);
              }}
              className="px-6 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold border border-zinc-800 transition-colors"
            >
              Close Application
            </button>
          </div>

        </div>
      )}

      {/* ENTERTAINMENT APP GRID */}
      <div className="flex-1 flex flex-col justify-between">
        
        {/* Helper title */}
        <div>
          <span className="text-xs text-zinc-500 font-medium">Entertainment & Communication</span>
          <h2 className="text-xl font-bold font-display text-zinc-200 mt-1">Margaret's Favorites</h2>
        </div>

        {/* Dynamic Responsive Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 my-5 flex-1 items-stretch">
          
          {/* Tile 1: Deezer Music */}
          <div
            onClick={() => setActiveApp("deezer")}
            className="glass-card glass-card-hover rounded-3xl p-5 flex flex-col justify-between cursor-pointer border border-zinc-800/60"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#1db954]/10 border border-[#1db954]/20 flex items-center justify-center text-[#1db954]">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 font-display">Deezer Music</h3>
              <p className="text-xs text-zinc-400 mt-0.5 leading-snug">Millions of tracks globally.</p>
              <ChevronRight className="w-4 h-4 text-zinc-700 mt-2 ml-auto" />
            </div>
          </div>

          {/* Tile 2: Videos */}
          <div
            onClick={() => setActiveApp("videos")}
            className="glass-card glass-card-hover rounded-3xl p-5 flex flex-col justify-between cursor-pointer border border-zinc-800/60"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#ff0000]/10 border border-[#ff0000]/20 flex items-center justify-center text-[#ff0000]">
              <Play className="w-6 h-6 fill-[#ff0000]/10" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 font-display">Videos</h3>
              <p className="text-xs text-zinc-400 mt-0.5 leading-snug">Spacious Invidious player.</p>
              <ChevronRight className="w-4 h-4 text-zinc-700 mt-2 ml-auto" />
            </div>
          </div>

          {/* Tile 3: News */}
          <div
            onClick={() => setActiveApp("news")}
            className="glass-card glass-card-hover rounded-3xl p-5 flex flex-col justify-between cursor-pointer border border-zinc-800/60"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 font-display">Live News</h3>
              <p className="text-xs text-zinc-400 mt-0.5 leading-snug">Global headlines via NewsData.io.</p>
              <ChevronRight className="w-4 h-4 text-zinc-700 mt-2 ml-auto" />
            </div>
          </div>

          {/* Tile 4: Brain Games (50% LARGER WIDGET) */}
          <div
            onClick={() => setActiveApp("games")}
            className="sm:col-span-2 glass-card glass-card-hover rounded-3xl p-7 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-[#14151a] to-zinc-900/60 shadow-xl gap-4 group"
          >
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                <Gamepad2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-white font-display">50 Cognitive Brain Games</h3>
                  <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold">
                    50% Larger Widget
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed max-w-md">
                  Memory & recall, word skills, focus attention, math logic, and spatial awareness exercises.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 shrink-0 bg-blue-500/10 px-4 py-2 rounded-2xl border border-blue-500/20 group-hover:bg-blue-500/20 transition-all">
              <span>Play All 50 Games</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Tile 5: Reading & Books (50% LARGER WIDGET) */}
          <div
            onClick={() => setActiveApp("audiobooks")}
            className="sm:col-span-2 glass-card glass-card-hover rounded-3xl p-7 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-[#14151a] to-zinc-900/60 shadow-xl gap-4 group"
          >
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-white font-display">Reading & Books</h3>
                  <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold">
                    Mini Kindle Mode
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed max-w-md">
                  Import from Google Books, live reader previews, voice dictation search, and relaxing black & white e-ink reading.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 shrink-0 bg-amber-500/10 px-4 py-2 rounded-2xl border border-amber-500/20 group-hover:bg-amber-500/20 transition-all">
              <span>Open Library</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

        </div>

        {/* Bottom indicators */}
        <div className="text-[10px] text-zinc-500 text-center uppercase tracking-wider select-none font-mono">
          Spacious design optimized with large typography for touch comfort
        </div>

      </div>

    </div>
  );
}
