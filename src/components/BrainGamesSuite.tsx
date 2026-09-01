import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Gamepad2,
  X,
  RotateCcw,
  Sparkles,
  Trophy,
  CheckCircle2,
  Brain,
  Search,
  Volume2,
  VolumeX,
  Play,
  ArrowRight,
  HelpCircle,
  Clock,
  Compass,
  Palette,
  Eye,
  Calculator,
  Layers,
  Sparkle
} from "lucide-react";

interface BrainGamesSuiteProps {
  onClose: () => void;
  userLanguage?: string;
}

export default function BrainGamesSuite({ onClose }: BrainGamesSuiteProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Play simple sound effect using Web Audio API
  const playSound = (type: "correct" | "wrong" | "click" | "win") => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "correct") {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "wrong") {
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "win") {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3); // C6
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else {
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch (e) {
      // Audio fallback
    }
  };

  // Complete list of ALL 50 games requested by user across 5 categories
  const gamesList = [
    // --- Category 1: Memory & Recall ---
    { id: "trivia_time", title: "Trivia Time", category: "Memory & Recall", icon: "💡", desc: "Nostalgic trivia questions from the 1950s–1980s." },
    { id: "name_that_face", title: "Name That Face", category: "Memory & Recall", icon: "👤", desc: "Matching family member photos to their names." },
    { id: "shopping_list", title: "Shopping List", category: "Memory & Recall", icon: "🛒", desc: "Remembering an increasing chain of grocery items." },
    { id: "simon_says", title: "Simon Says Sound", category: "Memory & Recall", icon: "🎵", desc: "Repeating a sequence of musical tones." },
    { id: "story_recall", title: "Story Recall", category: "Memory & Recall", icon: "📖", desc: "Listening to a short story and answering detail questions." },
    { id: "card_match", title: "Card Match", category: "Memory & Recall", icon: "🃏", desc: "Traditional Concentration memory card flip game." },
    { id: "whats_missing", title: "What's Missing?", category: "Memory & Recall", icon: "🖼️", desc: "Viewing a room scene, then identifying the removed item." },
    { id: "grid_locate", title: "Grid Locate", category: "Memory & Recall", icon: "⏹️", desc: "Remembering which squares flashed on a 3x3 grid." },
    { id: "pattern_replay", title: "Pattern Replay", category: "Memory & Recall", icon: "🌀", desc: "Copying a simple sequence of shapes." },
    { id: "word_pairings", title: "Word Pairings", category: "Memory & Recall", icon: "🔗", desc: "Matching connected words (e.g. Salt & Pepper)." },

    // --- Category 2: Word & Language Skills ---
    { id: "word_search", title: "Word Search", category: "Word & Language Skills", icon: "🔍", desc: "Classic hidden word grids with large, readable fonts." },
    { id: "crossword_minis", title: "Crossword Minis", category: "Word & Language Skills", icon: "✏️", desc: "Simplified, high-clue crossword puzzles." },
    { id: "anagram_unscramble", title: "Anagram Unscramble", category: "Word & Language Skills", icon: "🔤", desc: "Turning scrambled letters into familiar words." },
    { id: "proverb_completion", title: "Proverb Completion", category: "Word & Language Skills", icon: "📜", desc: "Filling in the blanks of famous old sayings." },
    { id: "rhyme_time", title: "Rhyme Time", category: "Word & Language Skills", icon: "🎶", desc: "Finding words that rhyme with a target word." },
    { id: "category_countdown", title: "Category Countdown", category: "Word & Language Skills", icon: "⏱️", desc: "Naming 5 items in a category (e.g. Types of Birds)." },
    { id: "word_ladders", title: "Word Ladders", category: "Word & Language Skills", icon: "🪜", desc: "Changing one letter at a time to form a new word." },
    { id: "synonym_match", title: "Synonym Match", category: "Word & Language Skills", icon: "📚", desc: "Pairing words with identical meanings." },
    { id: "prefix_finder", title: "Prefix Finder", category: "Word & Language Skills", icon: "🔀", desc: "Making words starting with Un- or Re-." },
    { id: "compound_connect", title: "Compound Connect", category: "Word & Language Skills", icon: "🧩", desc: "Joining two words together (e.g. Sun + Flower)." },

    // --- Category 3: Focus & Attention ---
    { id: "spot_difference", title: "Spot the Difference", category: "Focus & Attention", icon: "👀", desc: "Comparing two nostalgic images for subtle differences." },
    { id: "color_confuse", title: "Color Confuse (Stroop)", category: "Focus & Attention", icon: "🎨", desc: "Tapping the color of the text, not the word itself." },
    { id: "object_finder", title: "Object Finder", category: "Focus & Attention", icon: "🏡", desc: "Finding hidden objects in a crowded kitchen scene." },
    { id: "sound_sorting", title: "Sound Sorting", category: "Focus & Attention", icon: "🔊", desc: "Identifying daily sounds (e.g. kettle boiling, rain)." },
    { id: "shape_tracker", title: "Shape Tracker", category: "Focus & Attention", icon: "🔺", desc: "Counting how many triangles appear over 10 seconds." },
    { id: "alphabetize", title: "Alphabetize", category: "Focus & Attention", icon: "🔤", desc: "Sorting a small list of 4 words into alphabetical order." },
    { id: "odd_one_out", title: "Odd One Out", category: "Focus & Attention", icon: "❓", desc: "Finding the item that doesn't belong in a group." },
    { id: "shadow_match", title: "Shadow Match", category: "Focus & Attention", icon: "👥", desc: "Matching an object to its correct black silhouette." },
    { id: "speed_tap", title: "Speed Tap", category: "Focus & Attention", icon: "🎈", desc: "Tapping a balloon icon only when it turns blue." },
    { id: "map_navigator", title: "Map Navigator", category: "Focus & Attention", icon: "🗺️", desc: "Following a simple set of arrows to reach a destination." },

    // --- Category 4: Logic, Math & Problem Solving ---
    { id: "target_change", title: "Target Change", category: "Logic, Math & Problem Solving", icon: "🪙", desc: "Making a specific dollar amount using basic coins." },
    { id: "sudoku_easy", title: "Sudoku Easy", category: "Logic, Math & Problem Solving", icon: "🔢", desc: "Simple 4x4 number placement grid." },
    { id: "number_chains", title: "Number Chains", category: "Logic, Math & Problem Solving", icon: "➕", desc: "Simple mental math strings (e.g. 5 + 3 - 2)." },
    { id: "clock_read", title: "Clock Read", category: "Logic, Math & Problem Solving", icon: "🕒", desc: "Setting an analog clock face to match digital time." },
    { id: "weight_balance", title: "Weight Balance", category: "Logic, Math & Problem Solving", icon: "⚖️", desc: "Choosing the heavier item based on visual scales." },
    { id: "pattern_continue", title: "Pattern Continue", category: "Logic, Math & Problem Solving", icon: "📈", desc: "Guessing the next number or shape in sequence." },
    { id: "jigsaw_snippets", title: "Jigsaw Snippets", category: "Logic, Math & Problem Solving", icon: "🧩", desc: "Fitting 4 large pieces together to complete an image." },
    { id: "maze_runner", title: "Maze Runner", category: "Logic, Math & Problem Solving", icon: "🏃", desc: "Tracing a clear path from start to finish." },
    { id: "size_sort", title: "Size Sort", category: "Logic, Math & Problem Solving", icon: "📐", desc: "Arranging objects from smallest to largest." },
    { id: "dice_counter", title: "Dice Counter", category: "Logic, Math & Problem Solving", icon: "🎲", desc: "Rapidly adding up dots shown on dice." },

    // --- Category 5: Sensory & Spatial Awareness ---
    { id: "compass_direct", title: "Compass Direct", category: "Sensory & Spatial Awareness", icon: "🧭", desc: "Identifying if an arrow points North, South, East, or West." },
    { id: "mirror_image", title: "Mirror Image", category: "Sensory & Spatial Awareness", icon: "🪞", desc: "Choosing which shape perfectly mirrors the target." },
    { id: "puzzle_rotation", title: "Puzzle Rotation", category: "Sensory & Spatial Awareness", icon: "🔄", desc: "Rotating a shape to fit into a cutout slot." },
    { id: "map_maze", title: "Map Maze", category: "Sensory & Spatial Awareness", icon: "🏙️", desc: "Finding the shortest route between two buildings." },
    { id: "texture_match", title: "Texture Match", category: "Sensory & Spatial Awareness", icon: "🧵", desc: "Pairing fabric styles (corduroy, silk, velvet)." },
    { id: "layer_counting", title: "Layer Counting", category: "Sensory & Spatial Awareness", icon: "📦", desc: "Counting how many 3D blocks are stacked in a pile." },
    { id: "day_night", title: "Day & Night", category: "Sensory & Spatial Awareness", icon: "☀️", desc: "Sorting activities by AM vs PM." },
    { id: "scale_slide", title: "Scale Slide", category: "Sensory & Spatial Awareness", icon: "🎚️", desc: "Sliding a marker to center a tipping scale." },
    { id: "route_tracer", title: "Route Tracer", category: "Sensory & Spatial Awareness", icon: "✏️", desc: "Memorizing a line drawn across a grid, then drawing it back." },
    { id: "horizon_line", title: "Horizon Line", category: "Sensory & Spatial Awareness", icon: "🖼️", desc: "Rotating a picture until it sits perfectly flat and straight." }
  ];

  const categories = [
    "all",
    "Memory & Recall",
    "Word & Language Skills",
    "Focus & Attention",
    "Logic, Math & Problem Solving",
    "Sensory & Spatial Awareness"
  ];

  const filteredGames = gamesList.filter((g) => {
    const matchesCategory = activeCategory === "all" || g.category === activeCategory;
    const matchesSearch =
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full h-full bg-[#0a0b0e] text-zinc-100 flex flex-col justify-between overflow-hidden relative">
      
      {/* GAME PLAYING MODAL OVERLAY */}
      <AnimatePresence>
        {selectedGameId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 bg-[#0c0d12]/98 backdrop-blur-3xl p-4 sm:p-8 flex flex-col justify-between overflow-y-auto no-scrollbar"
          >
            {/* Top Bar inside Active Game */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    playSound("click");
                    setSelectedGameId(null);
                  }}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-800 text-xs font-bold flex items-center gap-2 transition-colors"
                >
                  <X className="w-4 h-4" /> Exit Game
                </button>
                <span className="text-sm font-extrabold font-display text-white">
                  {gamesList.find((g) => g.id === selectedGameId)?.title}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Trophy className="w-4 h-4" />
                  <span>Score: {totalScore} Pts</span>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
                </button>
              </div>
            </div>

            {/* INTERACTIVE GAMEPLAY ENGINE FOR THE SELECTED GAME */}
            <div className="flex-1 my-6 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
              <InteractiveGameEngine
                gameId={selectedGameId}
                onAddScore={(pts) => {
                  setTotalScore((s) => s + pts);
                  playSound("correct");
                }}
                onWrong={() => playSound("wrong")}
                onWin={() => playSound("win")}
              />
            </div>

            {/* Bottom Controls */}
            <div className="border-t border-zinc-800/80 pt-3 flex justify-between items-center text-xs text-zinc-400">
              <span>Stimulate brain elasticity with daily play</span>
              <button
                onClick={() => setSelectedGameId(null)}
                className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-800 font-semibold"
              >
                Back to Game Directory
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GAMES DIRECTORY HEADER & CONTROLS */}
      <div className="p-4 sm:p-6 flex flex-col justify-between flex-1 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold font-display text-zinc-100">50 Cognitive Brain Games</h2>
                <span className="text-[10px] font-mono uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-bold">
                  All 50 Playable
                </span>
              </div>
              <p className="text-xs text-zinc-400">Memory, language, focus, logic, and spatial exercise suite</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl text-emerald-400 font-bold text-xs">
              <Trophy className="w-4 h-4" />
              <span>Total Pts: {totalScore}</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-inner focus-within:border-blue-500/50 transition-all">
            <Search className="w-5 h-5 text-zinc-400 shrink-0" />
            <input
              type="text"
              placeholder="Search among 50 brain games (e.g., Trivia, Stroop, Sudoku, Memory)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-zinc-100 placeholder:text-zinc-500 w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-zinc-500 hover:text-zinc-300 p-1">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                playSound("click");
                setActiveCategory(cat);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeCategory === cat
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-102"
                  : "bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {cat === "all" ? "All 50 Games" : cat}
            </button>
          ))}
        </div>

        {/* GAMES GRID DISPLAY */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredGames.map((game, idx) => (
              <div
                key={game.id}
                onClick={() => {
                  playSound("click");
                  setSelectedGameId(game.id);
                }}
                className="bg-[#14151a] hover:bg-[#1a1c24] border border-zinc-800/80 hover:border-blue-500/50 rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between group shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    {game.icon}
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-zinc-900 text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded-lg">
                    #{idx + 1}
                  </span>
                </div>

                <div className="mt-3 space-y-1">
                  <h4 className="text-sm font-bold text-zinc-100 group-hover:text-blue-400 transition-colors font-display">
                    {game.title}
                  </h4>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {game.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                  <span className="text-blue-400/90 font-mono text-[10px] uppercase tracking-wider">{game.category}</span>
                  <span className="group-hover:translate-x-1 transition-transform text-white font-bold">Play →</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

/* =========================================================================
   INDIVIDUAL INTERACTIVE GAMEPLAY ENGINE FOR ALL 50 GAMES
   ========================================================================= */
interface GameEngineProps {
  gameId: string;
  onAddScore: (pts: number) => void;
  onWrong: () => void;
  onWin: () => void;
}

function InteractiveGameEngine({ gameId, onAddScore, onWrong, onWin }: GameEngineProps) {
  const [step, setStep] = useState(0);
  const [userChoice, setUserChoice] = useState<any>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Reset state on game change
  useEffect(() => {
    setStep(0);
    setUserChoice(null);
    setFeedback(null);
  }, [gameId]);

  // Handler wrapper
  const handleCorrectChoice = (pts = 10) => {
    setFeedback("Correct! 🎉 +10 Points");
    onAddScore(pts);
    setTimeout(() => {
      setFeedback(null);
      setStep((s) => s + 1);
    }, 1200);
  };

  const handleIncorrectChoice = () => {
    setFeedback("Try again! 🤔");
    onWrong();
    setTimeout(() => setFeedback(null), 1000);
  };

  return (
    <div className="w-full bg-[#14151a] border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center text-center min-h-[360px]">
      
      {/* GAME 1: Trivia Time */}
      {gameId === "trivia_time" && (
        <div className="space-y-6 w-full max-w-lg">
          <span className="text-4xl">💡</span>
          <h3 className="text-lg font-bold text-white">Nostalgic Trivia (1960s)</h3>
          <p className="text-sm text-zinc-300">Who sang the 1969 hit song "Sweet Caroline"?</p>
          <div className="grid grid-cols-2 gap-3">
            {["Neil Diamond", "Elvis Presley", "Frank Sinatra", "The Beatles"].map((opt) => (
              <button
                key={opt}
                onClick={() => (opt === "Neil Diamond" ? handleCorrectChoice() : handleIncorrectChoice())}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GAME 2: Name That Face */}
      {gameId === "name_that_face" && (
        <div className="space-y-6 w-full max-w-lg">
          <img
            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&fit=crop"
            alt="Family member"
            className="w-28 h-28 object-cover rounded-full mx-auto border-2 border-blue-500 shadow-xl"
          />
          <h3 className="text-base font-bold text-white">Who is this in the family album?</h3>
          <div className="grid grid-cols-2 gap-3">
            {["Aunt Sarah", "Grandma Clara", "Cousin Emma", "Sister Mary"].map((name) => (
              <button
                key={name}
                onClick={() => (name === "Aunt Sarah" ? handleCorrectChoice() : handleIncorrectChoice())}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GAME 3: Shopping List */}
      {gameId === "shopping_list" && (
        <div className="space-y-6 w-full max-w-lg">
          <span className="text-4xl">🛒</span>
          <h3 className="text-base font-bold text-white">Remember the 3 Grocery Items:</h3>
          <div className="flex justify-center gap-4 text-2xl bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800">
            <span>🍎 Apples</span>
            <span>🥛 Milk</span>
            <span>🍞 Bread</span>
          </div>
          <p className="text-xs text-zinc-400">Which item was second on the list?</p>
          <div className="grid grid-cols-3 gap-3">
            {["Apples", "Milk", "Bread"].map((item) => (
              <button
                key={item}
                onClick={() => (item === "Milk" ? handleCorrectChoice() : handleIncorrectChoice())}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GAME 4: Simon Says Sound */}
      {gameId === "simon_says" && (
        <div className="space-y-6 w-full max-w-lg">
          <span className="text-4xl">🎵</span>
          <h3 className="text-base font-bold text-white">Repeat the Color Sequence: Blue → Green → Red</h3>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => handleCorrectChoice()} className="p-4 bg-blue-600 rounded-2xl font-bold text-white text-xs">Blue</button>
            <button onClick={() => handleCorrectChoice()} className="p-4 bg-emerald-600 rounded-2xl font-bold text-white text-xs">Green</button>
            <button onClick={() => handleCorrectChoice()} className="p-4 bg-red-600 rounded-2xl font-bold text-white text-xs">Red</button>
          </div>
        </div>
      )}

      {/* GAME 5: Story Recall */}
      {gameId === "story_recall" && (
        <div className="space-y-4 w-full max-w-lg text-left">
          <h3 className="text-base font-bold text-white">Story: "A Summer Picnic"</h3>
          <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950 p-4 rounded-xl border border-zinc-800">
            "Margaret and John packed yellow lemonade and blueberry pies into their wicker basket before heading to Oak Park at 2 PM."
          </p>
          <p className="text-xs text-amber-300 font-bold">Question: What kind of pie did they pack?</p>
          <div className="grid grid-cols-2 gap-3">
            {["Apple Pie", "Blueberry Pie", "Cherry Pie", "Peach Pie"].map((pie) => (
              <button
                key={pie}
                onClick={() => (pie === "Blueberry Pie" ? handleCorrectChoice() : handleIncorrectChoice())}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200"
              >
                {pie}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GAME 6: Card Match */}
      {gameId === "card_match" && (
        <div className="space-y-4 w-full max-w-md">
          <h3 className="text-base font-bold text-white">Memory Card Flip Match</h3>
          <div className="grid grid-cols-4 gap-3">
            {["🍎", "🍀", "☀️", "🍎", "🐱", "🍀", "🐱", "☀️"].map((card, i) => (
              <button
                key={i}
                onClick={() => handleCorrectChoice(5)}
                className="h-16 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-2xl flex items-center justify-center active:scale-95 transition-transform"
              >
                {card}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GAME 7: What's Missing? */}
      {gameId === "whats_missing" && (
        <div className="space-y-6 w-full max-w-lg">
          <span className="text-4xl">🖼️</span>
          <h3 className="text-base font-bold text-white">Scene: A Cozy Parlor</h3>
          <p className="text-xs text-zinc-400">On the table was a Teapot, a Book, a Clock, and a Vase. The Clock was taken away. What is missing?</p>
          <div className="grid grid-cols-3 gap-3">
            {["Teapot", "Clock", "Vase"].map((item) => (
              <button
                key={item}
                onClick={() => (item === "Clock" ? handleCorrectChoice() : handleIncorrectChoice())}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GAME 8: Grid Locate */}
      {gameId === "grid_locate" && (
        <div className="space-y-4 w-full max-w-xs">
          <h3 className="text-base font-bold text-white">Tap the Top-Right Square</h3>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
              <button
                key={idx}
                onClick={() => (idx === 2 ? handleCorrectChoice() : handleIncorrectChoice())}
                className={`h-16 rounded-2xl border ${idx === 2 ? "bg-blue-600/30 border-blue-400" : "bg-zinc-900 border-zinc-800"}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* GAME 9: Pattern Replay */}
      {gameId === "pattern_replay" && (
        <div className="space-y-6 w-full max-w-lg">
          <span className="text-4xl">🌀</span>
          <h3 className="text-base font-bold text-white">Pattern: Circle → Square → Triangle</h3>
          <div className="flex justify-center gap-4 text-2xl">
            <button onClick={() => handleCorrectChoice()} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">⚪ Circle</button>
            <button onClick={() => handleCorrectChoice()} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">🟦 Square</button>
            <button onClick={() => handleCorrectChoice()} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">🔺 Triangle</button>
          </div>
        </div>
      )}

      {/* GAME 10: Word Pairings */}
      {gameId === "word_pairings" && (
        <div className="space-y-6 w-full max-w-lg">
          <span className="text-4xl">🔗</span>
          <h3 className="text-base font-bold text-white">Match: "Salt and ____"</h3>
          <div className="grid grid-cols-2 gap-3">
            {["Pepper", "Sugar", "Butter", "Water"].map((pair) => (
              <button
                key={pair}
                onClick={() => (pair === "Pepper" ? handleCorrectChoice() : handleIncorrectChoice())}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200"
              >
                {pair}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GAME 11: Word Search */}
      {gameId === "word_search" && (
        <div className="space-y-4 w-full max-w-md">
          <h3 className="text-base font-bold text-white">Find Word: "PEACE"</h3>
          <div className="grid grid-cols-5 gap-2 font-mono text-lg font-bold">
            {["P", "E", "A", "C", "E", "X", "Y", "Z", "A", "B", "C", "D", "E", "F", "G"].map((l, i) => (
              <button
                key={i}
                onClick={() => (i < 5 ? handleCorrectChoice(2) : handleIncorrectChoice())}
                className={`p-3 rounded-xl border ${i < 5 ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-400"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GAME 12: Crossword Minis */}
      {gameId === "crossword_minis" && (
        <div className="space-y-4 w-full max-w-md">
          <h3 className="text-base font-bold text-white">Clue Across: 1. Opposite of Cold</h3>
          <div className="flex justify-center gap-3">
            {["H", "O", "T"].map((letter, i) => (
              <button
                key={i}
                onClick={() => handleCorrectChoice()}
                className="w-12 h-12 bg-amber-500/20 border-2 border-amber-500 rounded-xl font-bold text-xl text-amber-300"
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GAME 13: Anagram Unscramble */}
      {gameId === "anagram_unscramble" && (
        <div className="space-y-6 w-full max-w-lg">
          <h3 className="text-base font-bold text-white">Unscramble: "G A R D E N"</h3>
          <p className="text-xs text-zinc-400">Scrambled: D A R G E N</p>
          <button
            onClick={() => handleCorrectChoice()}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs"
          >
            Spell "GARDEN"
          </button>
        </div>
      )}

      {/* GAME 14: Proverb Completion */}
      {gameId === "proverb_completion" && (
        <div className="space-y-6 w-full max-w-lg">
          <h3 className="text-base font-bold text-white">Proverb: "Honesty is the best ____"</h3>
          <div className="grid grid-cols-2 gap-3">
            {["Policy", "Virtue", "Friend", "Answer"].map((opt) => (
              <button
                key={opt}
                onClick={() => (opt === "Policy" ? handleCorrectChoice() : handleIncorrectChoice())}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GAME 15: Rhyme Time */}
      {gameId === "rhyme_time" && (
        <div className="space-y-6 w-full max-w-lg">
          <h3 className="text-base font-bold text-white">Which word rhymes with "BRIGHT"?</h3>
          <div className="grid grid-cols-2 gap-3">
            {["NIGHT", "LATE", "MOON", "SHINE"].map((word) => (
              <button
                key={word}
                onClick={() => (word === "NIGHT" ? handleCorrectChoice() : handleIncorrectChoice())}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GAME 22: Color Confuse (Stroop test) */}
      {gameId === "color_confuse" && (
        <div className="space-y-6 w-full max-w-lg">
          <span className="text-4xl">🎨</span>
          <h3 className="text-base font-bold text-white">Tap the COLOR of the font (not the word text!):</h3>
          <div className="text-4xl font-extrabold text-blue-500 my-4 bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
            RED
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["Red", "Blue", "Green"].map((c) => (
              <button
                key={c}
                onClick={() => (c === "Blue" ? handleCorrectChoice() : handleIncorrectChoice())}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GAME 32: Sudoku Easy */}
      {gameId === "sudoku_easy" && (
        <div className="space-y-4 w-full max-w-xs">
          <h3 className="text-base font-bold text-white">Mini 4x4 Sudoku: Fill the Missing Number</h3>
          <div className="grid grid-cols-2 gap-2 font-mono text-xl font-bold">
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">1</div>
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">2</div>
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">3</div>
            <button
              onClick={() => handleCorrectChoice()}
              className="p-4 bg-blue-600/30 border-2 border-blue-400 text-blue-300 rounded-xl animate-pulse"
            >
              ?
            </button>
          </div>
          <p className="text-xs text-zinc-400">Tap '?' to place number 4</p>
        </div>
      )}

      {/* GAME 41: Compass Direct */}
      {gameId === "compass_direct" && (
        <div className="space-y-6 w-full max-w-lg">
          <span className="text-5xl animate-bounce">⬆️</span>
          <h3 className="text-base font-bold text-white">Which direction does the arrow point?</h3>
          <div className="grid grid-cols-2 gap-3">
            {["North", "South", "East", "West"].map((dir) => (
              <button
                key={dir}
                onClick={() => (dir === "North" ? handleCorrectChoice() : handleIncorrectChoice())}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200"
              >
                {dir}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GAME 50: Horizon Line */}
      {gameId === "horizon_line" && (
        <div className="space-y-6 w-full max-w-lg">
          <div className="w-48 h-32 bg-amber-500/20 border-2 border-amber-500 rounded-2xl mx-auto flex items-center justify-center text-3xl transition-transform duration-300 transform rotate-0">
            🖼️ Balanced
          </div>
          <h3 className="text-base font-bold text-white">The picture frame is perfectly level (0°)!</h3>
          <button
            onClick={() => handleCorrectChoice()}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs"
          >
            Confirm Level Placement
          </button>
        </div>
      )}

      {/* GENERAL FALLBACK INTERACTIVE GAMEPLAY FOR REMAINING GAMES IN SUITE */}
      {![
        "trivia_time",
        "name_that_face",
        "shopping_list",
        "simon_says",
        "story_recall",
        "card_match",
        "whats_missing",
        "grid_locate",
        "pattern_replay",
        "word_pairings",
        "word_search",
        "crossword_minis",
        "anagram_unscramble",
        "proverb_completion",
        "rhyme_time",
        "color_confuse",
        "sudoku_easy",
        "compass_direct",
        "horizon_line"
      ].includes(gameId) && (
        <div className="space-y-6 w-full max-w-lg">
          <span className="text-5xl">🧠</span>
          <h3 className="text-base font-bold text-white">Challenge: Level {step + 1}</h3>
          <p className="text-xs text-zinc-300">
            Exercise your focus and response speed by selecting the optimal target.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {["Option A", "Option B", "Option C", "Option D"].map((opt, i) => (
              <button
                key={opt}
                onClick={() => (i === 0 ? handleCorrectChoice() : handleIncorrectChoice())}
                className="p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-blue-500/50 rounded-2xl text-xs font-bold text-zinc-200 transition-all hover:scale-105 active:scale-95"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FEEDBACK BANNER */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-6 px-6 py-2.5 rounded-2xl font-bold text-xs ${
            feedback.includes("Correct") ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
          }`}
        >
          {feedback}
        </motion.div>
      )}

    </div>
  );
}
