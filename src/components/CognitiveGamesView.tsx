import React, { useState, useEffect } from "react";
import {
  Brain,
  Sparkles,
  Trophy,
  RotateCcw,
  Volume2,
  Heart,
  Sun,
  Star,
  Music,
  Smile,
  CheckCircle,
  HelpCircle,
  Award,
  ChevronRight,
  Flame,
  Lightbulb
} from "lucide-react";

interface CognitiveGamesViewProps {
  userName?: string;
  userLanguage?: string;
}

interface MemoryCard {
  id: number;
  symbol: string;
  iconName: string;
  color: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function CognitiveGamesView({
  userName = "Margret",
  userLanguage = "en"
}: CognitiveGamesViewProps) {
  const [activeGame, setActiveGame] = useState<"memory" | "word" | "trivia" | "breathing">("memory");

  // Web Audio Tone generator for soothing auditory feedback
  const playChime = (type: "success" | "flip" | "victory") => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      if (type === "flip") {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === "success") {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } else if (type === "victory") {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15);
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3);
        osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.9);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.9);
      }
    } catch (e) {
      // Audio not permitted or not supported
    }
  };

  // 1. Memory Match Game State
  const initialSymbols = [
    { symbol: "🌸", iconName: "Flower", color: "text-pink-400 bg-pink-500/10 border-pink-500/30" },
    { symbol: "☀️", iconName: "Sun", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    { symbol: "🍎", iconName: "Apple", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
    { symbol: "🎵", iconName: "Music", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
    { symbol: "⭐", iconName: "Star", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
    { symbol: "🌿", iconName: "Leaf", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  ];

  const createShuffledCards = (): MemoryCard[] => {
    const pairs = [...initialSymbols, ...initialSymbols];
    const shuffled = pairs.sort(() => Math.random() - 0.5);
    return shuffled.map((item, index) => ({
      id: index,
      symbol: item.symbol,
      iconName: item.iconName,
      color: item.color,
      isFlipped: false,
      isMatched: false,
    }));
  };

  const [cards, setCards] = useState<MemoryCard[]>(createShuffledCards);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedPairsCount, setMatchedPairsCount] = useState(0);
  const [movesCount, setMovesCount] = useState(0);
  const [memoryCelebration, setMemoryCelebration] = useState(false);

  const handleCardClick = (index: number) => {
    if (cards[index].isFlipped || cards[index].isMatched || flippedIndices.length === 2) {
      return;
    }

    playChime("flip");

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMovesCount((prev) => prev + 1);
      const [firstIdx, secondIdx] = newFlipped;
      if (newCards[firstIdx].symbol === newCards[secondIdx].symbol) {
        // Matched!
        setTimeout(() => {
          playChime("success");
          newCards[firstIdx].isMatched = true;
          newCards[secondIdx].isMatched = true;
          setCards([...newCards]);
          setFlippedIndices([]);
          setMatchedPairsCount((prev) => {
            const nextVal = prev + 1;
            if (nextVal === initialSymbols.length) {
              setMemoryCelebration(true);
              playChime("victory");
            }
            return nextVal;
          });
        }, 500);
      } else {
        // Not matched
        setTimeout(() => {
          newCards[firstIdx].isFlipped = false;
          newCards[secondIdx].isFlipped = false;
          setCards([...newCards]);
          setFlippedIndices([]);
        }, 1100);
      }
    }
  };

  const resetMemoryGame = () => {
    setCards(createShuffledCards());
    setFlippedIndices([]);
    setMatchedPairsCount(0);
    setMovesCount(0);
    setMemoryCelebration(false);
  };

  // 2. Word Builder Game State
  const wordPuzzles = [
    { target: "GARDEN", clue: "A peaceful outdoor place with blooming flowers and green plants", letters: ["R", "G", "E", "A", "N", "D"] },
    { target: "SPRING", clue: "The cheerful season when trees wake up and birds sing", letters: ["I", "P", "S", "G", "N", "R"] },
    { target: "SMILE", clue: "A warm, happy facial expression shared with friends and family", letters: ["L", "M", "S", "E", "I"] },
    { target: "SUNSET", clue: "The golden evening glow as day turns into night", letters: ["T", "S", "E", "N", "U", "S"] }
  ];
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [wordSuccess, setWordSuccess] = useState(false);

  const activePuzzle = wordPuzzles[currentWordIdx];

  const handleSelectLetter = (letter: string) => {
    if (selectedLetters.length >= activePuzzle.target.length) return;
    playChime("flip");
    const updated = [...selectedLetters, letter];
    setSelectedLetters(updated);

    if (updated.length === activePuzzle.target.length) {
      if (updated.join("") === activePuzzle.target) {
        setWordSuccess(true);
        playChime("success");
      }
    }
  };

  const handleBackspaceLetter = () => {
    if (selectedLetters.length === 0) return;
    setSelectedLetters(selectedLetters.slice(0, -1));
    setWordSuccess(false);
  };

  const handleNextWord = () => {
    setCurrentWordIdx((prev) => (prev + 1) % wordPuzzles.length);
    setSelectedLetters([]);
    setWordSuccess(false);
  };

  // 3. Trivia Game State
  const triviaQuestions = [
    {
      question: "Which gentle flower is commonly known as a symbol of tranquility and peace?",
      options: ["White Olive Rose", "Lavender", "Marigold", "Cactus"],
      correct: 0,
      note: "White roses and olive branches represent deep peace and harmony throughout history."
    },
    {
      question: "What is the largest and closest star that provides daylight to our Earth?",
      options: ["North Star (Polaris)", "The Sun", "Alpha Centauri", "Sirius"],
      correct: 1,
      note: "The Sun is at the center of our solar system and warms our planet every day!"
    },
    {
      question: "Which of these birds is famous for its melodious early morning song in gardens?",
      options: ["Robin", "Penguin", "Pelican", "Eagle"],
      correct: 0,
      note: "Robins are cherished early risers with cheerful, uplifting songs in spring."
    }
  ];
  const [triviaIdx, setTriviaIdx] = useState(0);
  const [selectedTriviaOption, setSelectedTriviaOption] = useState<number | null>(null);
  const [triviaSubmitted, setTriviaSubmitted] = useState(false);

  const handleSelectTrivia = (idx: number) => {
    if (triviaSubmitted) return;
    setSelectedTriviaOption(idx);
    setTriviaSubmitted(true);
    if (idx === triviaQuestions[triviaIdx].correct) {
      playChime("success");
    } else {
      playChime("flip");
    }
  };

  const handleNextTrivia = () => {
    setTriviaIdx((prev) => (prev + 1) % triviaQuestions.length);
    setSelectedTriviaOption(null);
    setTriviaSubmitted(false);
  };

  // Speak aloud voice function for accessibility
  const speakText = (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch (e) {
      // Ignore
    }
  };

  return (
    <div className="w-full h-full p-6 animate-fadeIn select-none flex flex-col justify-between">
      
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Brain Agility & Mindful Exercises
            </h2>
            <p className="text-xs text-zinc-400">Gentle memory, vocabulary, and trivia games designed for seniors</p>
          </div>
        </div>

        {/* Game Mode Selector Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveGame("memory")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeGame === "memory"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "bg-zinc-900 text-zinc-300 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Memory Tiles
          </button>
          <button
            onClick={() => setActiveGame("word")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeGame === "word"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                : "bg-zinc-900 text-zinc-300 hover:text-white"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Word Builder
          </button>
          <button
            onClick={() => setActiveGame("trivia")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeGame === "trivia"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20"
                : "bg-zinc-900 text-zinc-300 hover:text-white"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Golden Trivia
          </button>
        </div>
      </div>

      {/* Main Game Screen */}
      <div className="flex-1 overflow-hidden">
        
        {/* Game 1: Memory Tiles */}
        {activeGame === "memory" && (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2 px-2">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-zinc-400">
                  Pairs Matched: <strong className="text-amber-400 font-mono text-sm">{matchedPairsCount} / {initialSymbols.length}</strong>
                </span>
                <span className="text-zinc-400">
                  Turns: <strong className="text-white font-mono">{movesCount}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => speakText("Tap any card to turn it over, then find its matching twin card!")}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-zinc-800"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  Read Rules Aloud
                </button>
                <button
                  onClick={resetMemoryGame}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-zinc-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  New Game
                </button>
              </div>
            </div>

            {memoryCelebration ? (
              <div className="flex-1 glass-card rounded-3xl p-8 border border-amber-500/30 flex flex-col items-center justify-center text-center animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                  <Trophy className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">Brilliant Memory, {userName}! 🌟</h3>
                <p className="text-sm text-zinc-300 max-w-md mb-6">
                  You successfully discovered all {initialSymbols.length} matching pairs in {movesCount} smooth turns. Your brain agility score is in top condition today!
                </p>
                <button
                  onClick={resetMemoryGame}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-2xl transition-all shadow-lg shadow-amber-500/20"
                >
                  Play Another Round
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3 flex-1">
                {cards.map((card, idx) => (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(idx)}
                    className={`h-full min-h-[72px] rounded-2xl border flex flex-col items-center justify-center transition-all duration-300 transform active:scale-95 ${
                      card.isMatched
                        ? `${card.color} opacity-90 scale-[0.98]`
                        : card.isFlipped
                        ? "bg-zinc-800 border-zinc-600 shadow-md"
                        : "bg-[#161820] hover:bg-[#1f222d] border-zinc-800/80 cursor-pointer"
                    }`}
                  >
                    {card.isFlipped || card.isMatched ? (
                      <span className="text-3xl animate-fadeIn">{card.symbol}</span>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-600">
                        <Sparkles className="w-5 h-5 text-zinc-500" />
                        <span className="text-[10px] uppercase font-mono tracking-wider mt-1 text-zinc-500">Tap</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Game 2: Word Builder */}
        {activeGame === "word" && (
          <div className="h-full flex flex-col justify-between glass-card rounded-3xl p-6 border border-zinc-800">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-blue-400 font-bold uppercase tracking-wider font-mono">
                  Word Puzzle {currentWordIdx + 1} of {wordPuzzles.length}
                </span>
                <button
                  onClick={() => speakText(`Clue: ${activePuzzle.clue}`)}
                  className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-zinc-800"
                >
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                  Speak Clue
                </button>
              </div>

              <h3 className="text-base font-semibold text-zinc-100 mb-1">
                💡 Clue: "{activePuzzle.clue}"
              </h3>
            </div>

            {/* Target Letter Slot Display */}
            <div className="flex items-center justify-center gap-3 my-4">
              {Array.from({ length: activePuzzle.target.length }).map((_, idx) => {
                const letter = selectedLetters[idx];
                return (
                  <div
                    key={idx}
                    className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-bold font-mono transition-all ${
                      letter
                        ? "bg-blue-950/40 border-blue-500 text-white shadow-md shadow-blue-900/30"
                        : "bg-zinc-900/60 border-dashed border-zinc-700 text-zinc-600"
                    }`}
                  >
                    {letter || ""}
                  </div>
                );
              })}
            </div>

            {/* Word Success Banner */}
            {wordSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center text-emerald-400 font-bold text-sm mb-2 flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Splendid! You spelled {activePuzzle.target} correctly!</span>
              </div>
            )}

            {/* Letter Selection Tiles */}
            <div className="flex items-center justify-center gap-3">
              {activePuzzle.letters.map((letter, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectLetter(letter)}
                  className="w-14 h-14 bg-zinc-900 hover:bg-blue-600 hover:text-white active:scale-95 text-zinc-200 border border-zinc-700 rounded-2xl text-xl font-bold font-mono transition-all shadow-md"
                >
                  {letter}
                </button>
              ))}

              <button
                onClick={handleBackspaceLetter}
                className="px-4 h-14 bg-zinc-900 hover:bg-zinc-800 text-rose-400 border border-zinc-800 rounded-2xl text-xs font-bold transition-all"
              >
                Erase Letter
              </button>

              {wordSuccess && (
                <button
                  onClick={handleNextWord}
                  className="px-6 h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-blue-900/30 flex items-center gap-2"
                >
                  Next Puzzle
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Game 3: Golden Trivia */}
        {activeGame === "trivia" && (
          <div className="h-full flex flex-col justify-between glass-card rounded-3xl p-6 border border-zinc-800">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider font-mono">
                  Golden Trivia Question {triviaIdx + 1} of {triviaQuestions.length}
                </span>
                <button
                  onClick={() => speakText(triviaQuestions[triviaIdx].question)}
                  className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-zinc-800"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  Read Question Aloud
                </button>
              </div>

              <h3 className="text-lg font-bold text-white mb-4">
                {triviaQuestions[triviaIdx].question}
              </h3>
            </div>

            {/* 4 Large Choice Cards */}
            <div className="grid grid-cols-2 gap-3 my-2">
              {triviaQuestions[triviaIdx].options.map((option, idx) => {
                const isSelected = selectedTriviaOption === idx;
                const isCorrect = idx === triviaQuestions[triviaIdx].correct;

                let cardStyle = "bg-zinc-900/70 hover:bg-zinc-800 border-zinc-800 text-zinc-200";
                if (triviaSubmitted) {
                  if (isCorrect) {
                    cardStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold";
                  } else if (isSelected && !isCorrect) {
                    cardStyle = "bg-rose-500/20 border-rose-500 text-rose-300";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectTrivia(idx)}
                    className={`p-4 rounded-2xl border text-left text-sm font-semibold transition-all active:scale-95 ${cardStyle}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Feedback footer */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/80">
              {triviaSubmitted ? (
                <div className="text-xs text-zinc-300 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{triviaQuestions[triviaIdx].note}</span>
                </div>
              ) : (
                <span className="text-xs text-zinc-500 font-mono">
                  Select the best answer above. No time pressure!
                </span>
              )}

              {triviaSubmitted && (
                <button
                  onClick={handleNextTrivia}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shrink-0 ml-4"
                >
                  Next Question
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Bottom Affirmation bar */}
      <div className="text-center text-[10px] text-zinc-500 font-mono uppercase tracking-wider mt-2">
        Daily mental exercises support neuroplasticity, memory retention, and positive cognitive health
      </div>

    </div>
  );
}
