import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Search,
  Mic,
  X,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Maximize2,
  Minimize2,
  Bookmark,
  Type,
  Loader2,
  ExternalLink,
  RotateCcw
} from "lucide-react";

interface KindleReaderViewProps {
  onClose: () => void;
  userLanguage?: string;
}

interface BookItem {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: { thumbnail?: string; extraLarge?: string };
    publishedDate?: string;
    pageCount?: number;
    previewLink?: string;
    infoLink?: string;
    categories?: string[];
  };
}

export default function KindleReaderView({ onClose, userLanguage }: KindleReaderViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [books, setBooks] = useState<BookItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [isKindleMode, setIsKindleMode] = useState(false);

  // Kindle reader customization state
  const [theme, setTheme] = useState<"eink-dark" | "eink-paper" | "sepia">("eink-dark");
  const [fontSize, setFontSize] = useState<number>(18);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isNarrating, setIsNarrating] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [useEmbeddedFrame, setUseEmbeddedFrame] = useState<boolean>(false);

  // Speech Dictation for Search
  const handleStartDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please type your book search.");
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
          setSearchQuery(transcript);
          performSearch(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      console.error("Dictation error:", e);
      setIsListening(false);
    }
  };

  const performSearch = (q: string) => {
    if (!q.trim()) return;
    setIsLoading(true);
    fetch(`/api/books/search?q=${encodeURIComponent(q.trim())}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBooks(data);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching books:", err);
        setIsLoading(false);
      });
  };

  // Perform initial search with an open, non-prefilled query if empty
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const timer = setTimeout(() => {
        performSearch(searchQuery);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Default inspiring library list
      performSearch("relaxing classics literature");
    }
  }, [searchQuery]);

  // Speech Narrator (Text-to-Speech)
  const toggleNarrator = (text: string) => {
    if (!("speechSynthesis" in window)) {
      alert("Text-to-speech audio narration is not supported in this browser.");
      return;
    }

    if (isNarrating) {
      window.speechSynthesis.cancel();
      setIsNarrating(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85; // Relaxing, calm reading pace
      utterance.pitch = 1.0;
      utterance.onend = () => setIsNarrating(false);
      utterance.onerror = () => setIsNarrating(false);

      window.speechSynthesis.speak(utterance);
      setIsNarrating(true);
    }
  };

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Sample chapters generator for books to provide a rich Kindle reading experience
  const getBookPages = (book: BookItem | null) => {
    if (!book) return [];
    const title = book.volumeInfo.title || "Selected Classic";
    const author = book.volumeInfo.authors?.join(", ") || "Unknown Author";
    const desc = book.volumeInfo.description || "A timeless piece of literature to relax your mind and spark inspiration.";

    // Slice description into soothing readable page passages
    const sentences = desc.replace(/<[^>]*>?/gm, "").split(". ");
    const pages = [];
    
    // Page 1: Title Card & Preface
    pages.push({
      chapter: "Front Matter",
      title: title,
      content: `Welcome to "${title}" by ${author}.\n\nTake a deep breath and settle in for a relaxing reading session in your Avenly Kindle mode.\n\n${sentences.slice(0, 3).join(". ")}.`
    });

    // Chapter 1
    pages.push({
      chapter: "Chapter I: The Opening",
      title: "Chapter I",
      content: sentences.slice(3, 8).join(". ") || "The afternoon sun cast long golden rays across the garden. Every leaf vibrated with peace and tranquility, whispering tales of gentle afternoons and quiet reflection."
    });

    // Chapter 2
    pages.push({
      chapter: "Chapter II: Peaceful Moments",
      title: "Chapter II",
      content: sentences.slice(8, 14).join(". ") || "In the quiet stillness, thoughts wandered like clear streams through quiet woods. The air was crisp, carrying the sweet scent of pine and vintage paper."
    });

    // Chapter 3
    pages.push({
      chapter: "Chapter III: The Wisdom of Years",
      title: "Chapter III",
      content: sentences.slice(14, 20).join(". ") || "Experience is the companion of time. With each passing hour, the beauty of simple moments shines brighter than all gold and silver."
    });

    return pages;
  };

  const currentBookPages = getBookPages(selectedBook);
  const activePageData = currentBookPages[currentPage - 1] || currentBookPages[0];

  return (
    <div className="w-full h-full bg-[#0a0b0e] text-zinc-100 flex flex-col justify-between overflow-hidden relative">
      
      {/* FULLSCREEN KINDLE ZEN READER OVERLAY */}
      <AnimatePresence>
        {isKindleMode && selectedBook && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`fixed inset-0 z-50 flex flex-col justify-between select-none ${
              theme === "eink-dark"
                ? "bg-[#09090b] text-[#f4f4f5]"
                : theme === "eink-paper"
                ? "bg-[#fcfcfc] text-[#111111]"
                : "bg-[#fbf0d9] text-[#2d241e]"
            }`}
          >
            {/* Kindle Minimal Zen Top Control Bar */}
            <div
              className={`w-full px-6 py-4 flex items-center justify-between border-b ${
                theme === "eink-dark"
                  ? "border-zinc-800/80 bg-[#09090b]/90"
                  : theme === "eink-paper"
                  ? "border-zinc-200 bg-[#fcfcfc]/90"
                  : "border-[#e6d8ba] bg-[#fbf0d9]/90"
              }`}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setIsKindleMode(false);
                    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                    setIsNarrating(false);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                    theme === "eink-dark"
                      ? "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800"
                      : "bg-black/5 border-black/10 text-black hover:bg-black/10"
                  }`}
                >
                  <X className="w-4 h-4" /> Exit Kindle
                </button>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-extrabold line-clamp-1">{selectedBook.volumeInfo.title}</span>
                  <span className="text-[10px] opacity-60 line-clamp-1">{selectedBook.volumeInfo.authors?.join(", ")}</span>
                </div>
              </div>

              {/* Reader Theme & Controls */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Font Size decrease/increase */}
                <div className={`flex items-center border rounded-xl overflow-hidden ${
                  theme === "eink-dark" ? "border-zinc-800 bg-zinc-900/80" : "border-black/10 bg-black/5"
                }`}>
                  <button
                    onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                    className="px-3 py-1.5 text-xs font-bold hover:opacity-70 transition-opacity"
                    title="Decrease font size"
                  >
                    A-
                  </button>
                  <span className="text-[10px] font-mono px-1 opacity-50">{fontSize}px</span>
                  <button
                    onClick={() => setFontSize((s) => Math.min(32, s + 2))}
                    className="px-3 py-1.5 text-xs font-bold hover:opacity-70 transition-opacity"
                    title="Increase font size"
                  >
                    A+
                  </button>
                </div>

                {/* Black & White E-Ink / Paper / Sepia Theme Switcher */}
                <div className={`flex items-center p-1 rounded-xl border gap-1 ${
                  theme === "eink-dark" ? "border-zinc-800 bg-zinc-900" : "border-black/10 bg-black/5"
                }`}>
                  <button
                    onClick={() => setTheme("eink-dark")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      theme === "eink-dark" ? "bg-white text-black shadow-sm" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    E-Ink Black
                  </button>
                  <button
                    onClick={() => setTheme("eink-paper")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      theme === "eink-paper" ? "bg-black text-white shadow-sm" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    Paper White
                  </button>
                  <button
                    onClick={() => setTheme("sepia")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      theme === "sepia" ? "bg-[#3e2c1c] text-[#fbf0d9] shadow-sm" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    Sepia
                  </button>
                </div>

                {/* Read Aloud Voice Narrator */}
                <button
                  onClick={() => toggleNarrator(activePageData?.content || selectedBook.volumeInfo.title)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                    isNarrating
                      ? "bg-emerald-500 text-black border-emerald-400 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                      : theme === "eink-dark"
                      ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                      : "bg-black/5 border-black/10 text-black hover:bg-black/10"
                  }`}
                >
                  {isNarrating ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span className="hidden md:inline">{isNarrating ? "Stop Reading" : "Read Aloud"}</span>
                </button>
              </div>
            </div>

            {/* KINDLE PAGE CANVAS (Relaxing, Soothing, Centered Page Flip) */}
            <div className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-12 flex flex-col justify-between overflow-y-auto no-scrollbar">
              
              {/* Animated Page Transition */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, x: 20, rotateY: -5 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  exit={{ opacity: 0, x: -20, rotateY: 5 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="space-y-6 my-auto"
                >
                  <div className="flex justify-between items-center border-b pb-3 opacity-60 text-xs font-mono tracking-widest uppercase">
                    <span>{activePageData?.chapter || "Book Chapter"}</span>
                    <span>Page {currentPage} of {currentBookPages.length}</span>
                  </div>

                  <h2
                    className="font-serif font-bold tracking-tight leading-snug"
                    style={{ fontSize: `${fontSize * 1.3}px` }}
                  >
                    {activePageData?.title}
                  </h2>

                  <p
                    className="font-serif leading-relaxed whitespace-pre-line tracking-wide opacity-95 text-justify"
                    style={{ fontSize: `${fontSize}px`, lineHeight: "1.8" }}
                  >
                    {activePageData?.content}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Page Turning Navigation Dock */}
              <div
                className={`mt-8 pt-4 border-t flex items-center justify-between ${
                  theme === "eink-dark" ? "border-zinc-800/80" : "border-black/10"
                }`}
              >
                <button
                  disabled={currentPage <= 1}
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    if (isNarrating) window.speechSynthesis.cancel();
                  }}
                  className={`px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                    currentPage <= 1
                      ? "opacity-30 cursor-not-allowed"
                      : theme === "eink-dark"
                      ? "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white"
                      : "bg-black/5 border border-black/10 hover:bg-black/10 text-black"
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" /> Previous Page
                </button>

                {/* Page dots indicator */}
                <div className="flex items-center gap-1.5">
                  {currentBookPages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={`h-2 rounded-full transition-all ${
                        currentPage === idx + 1
                          ? theme === "eink-dark" ? "w-6 bg-white" : "w-6 bg-black"
                          : theme === "eink-dark" ? "w-2 bg-zinc-700" : "w-2 bg-black/20"
                      }`}
                    />
                  ))}
                </div>

                <button
                  disabled={currentPage >= currentBookPages.length}
                  onClick={() => {
                    setCurrentPage((p) => Math.min(currentBookPages.length, p + 1));
                    if (isNarrating) window.speechSynthesis.cancel();
                  }}
                  className={`px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                    currentPage >= currentBookPages.length
                      ? "opacity-30 cursor-not-allowed"
                      : theme === "eink-dark"
                      ? "bg-white text-black hover:bg-zinc-200 shadow-lg"
                      : "bg-black text-white hover:bg-zinc-800 shadow-lg"
                  }`}
                >
                  Next Page <ChevronRight className="w-5 h-5" />
                </button>
              </div>

            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* REGULAR BOOKS EXPLORER & LIBRARY VIEW */}
      <div className="p-4 sm:p-6 flex flex-col justify-between flex-1 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold font-display text-zinc-100">Reading & Books Library</h2>
              <p className="text-xs text-zinc-400">Discover millions of books with Google Books & Mini Kindle Reader</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clean Search & Voice Dictation Control */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-inner focus-within:border-amber-500/50 transition-all">
            <Search className="w-5 h-5 text-zinc-400 shrink-0" />
            <input
              type="text"
              placeholder="Search books by title, author, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-zinc-100 placeholder:text-zinc-500 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dictate Speech Button */}
          <button
            onClick={handleStartDictation}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all ${
              isListening
                ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400"
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>{isListening ? "Listening..." : "Dictate"}</span>
          </button>
        </div>

        {/* Quick Genre Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-2">
          {["Classics", "Gardening", "History", "Biographies", "Poetry", "Mindfulness", "Mystery", "Philosophy"].map(
            (genre) => (
              <button
                key={genre}
                onClick={() => {
                  setSearchQuery(genre);
                  performSearch(genre);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-amber-500/20 border border-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-amber-300 transition-all shrink-0"
              >
                {genre}
              </button>
            )
          )}
        </div>

        {/* Books Results / Selection Viewport */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-2">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-12">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-3" />
              <p className="text-xs font-medium">Fetching books from Google Books...</p>
            </div>
          ) : selectedBook ? (
            /* Selected Book Preview Detail View */
            <div className="bg-[#14151a] border border-zinc-800/80 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row gap-6">
                <img
                  src={
                    selectedBook.volumeInfo.imageLinks?.thumbnail ||
                    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&fit=crop"
                  }
                  alt={selectedBook.volumeInfo.title}
                  className="w-36 h-52 object-cover rounded-2xl shadow-2xl border border-white/10 shrink-0"
                />
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold">
                      {selectedBook.volumeInfo.categories?.[0] || "Literature"}
                    </span>
                    <h3 className="text-xl font-bold font-display text-white mt-2 leading-snug">
                      {selectedBook.volumeInfo.title}
                    </h3>
                    <p className="text-xs text-amber-300 font-medium mt-1">
                      By {selectedBook.volumeInfo.authors?.join(", ") || "Unknown Author"}
                    </p>
                    <p className="text-xs text-zinc-300 mt-3 leading-relaxed line-clamp-4">
                      {selectedBook.volumeInfo.description
                        ? selectedBook.volumeInfo.description.replace(/<[^>]*>?/gm, "")
                        : "No detailed description available."}
                    </p>
                  </div>

                  {/* Actions: Launch Mini Kindle Reader Mode */}
                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-800/60">
                    <button
                      onClick={() => {
                        setIsKindleMode(true);
                        setCurrentPage(1);
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4 fill-black" /> Open in Mini Kindle Mode
                    </button>

                    {selectedBook.volumeInfo.previewLink && (
                      <a
                        href={selectedBook.volumeInfo.previewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all"
                      >
                        <ExternalLink className="w-4 h-4" /> Google Books Preview
                      </a>
                    )}

                    <button
                      onClick={() => setSelectedBook(null)}
                      className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-2xl text-xs font-semibold border border-zinc-800 transition-all ml-auto"
                    >
                      Back to Search
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Books Grid Display */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {books.map((book) => {
                const thumb =
                  book.volumeInfo.imageLinks?.thumbnail ||
                  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&fit=crop";

                return (
                  <div
                    key={book.id}
                    onClick={() => setSelectedBook(book)}
                    className="bg-[#14151a] hover:bg-[#1a1c24] border border-zinc-800/80 hover:border-amber-500/50 rounded-2xl p-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between group shadow-lg"
                  >
                    <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-zinc-950 mb-3 border border-white/5">
                      <img
                        src={thumb}
                        alt={book.volumeInfo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-zinc-100 group-hover:text-amber-400 transition-colors line-clamp-2 leading-tight">
                        {book.volumeInfo.title}
                      </h4>
                      <p className="text-[10px] text-zinc-400 line-clamp-1 font-medium">
                        {book.volumeInfo.authors?.[0] || "Classic Literature"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
