/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music } from 'lucide-react';
import { motion } from 'motion/react';

// --- Dummy Tracks ---
const TRACKS = [
  {
    id: 1,
    title: "Neon City Drive (AI Mix)",
    artist: "Synth Mind",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    id: 2,
    title: "Cybernetic Pulse",
    artist: "Neural Network",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    id: 3,
    title: "Digital Horizon",
    artist: "Deep Model",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  }
];

// --- Game Constants ---
const GRID_SIZE = 20;
const INITIAL_SPEED = 150;

type Point = { x: number, y: number };

const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };

export default function App() {
  // --- Music Player State ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Game State ---
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const directionRef = useRef(INITIAL_DIRECTION);
  const lastUpdateRef = useRef(0);
  const requestRef = useRef<number>(0);

  // --- Music Player Logic ---
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleNextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const handleTrackEnd = () => {
    handleNextTrack();
  };

  // --- Game Logic ---
  const spawnFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // eslint-disable-next-line no-loop-func
      if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        break;
      }
    }
    setFood(newFood);
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setScore(0);
    setGameOver(false);
    setSpeed(INITIAL_SPEED);
    spawnFood(INITIAL_SNAKE);
    setGameStarted(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (!gameStarted && e.key === ' ') {
        resetGame();
        return;
      }

      const { x, y } = directionRef.current;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (y !== 1) directionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (y !== -1) directionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (x !== 1) directionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (x !== -1) directionRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = (time: number) => {
      if (time - lastUpdateRef.current > speed) {
        lastUpdateRef.current = time;

        setSnake(prevSnake => {
          const head = prevSnake[0];
          const newHead = {
            x: head.x + directionRef.current.x,
            y: head.y + directionRef.current.y
          };

          // Check collisions
          if (
            newHead.x < 0 || newHead.x >= GRID_SIZE ||
            newHead.y < 0 || newHead.y >= GRID_SIZE ||
            prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)
          ) {
            setGameOver(true);
            setHighScore(prev => Math.max(prev, score));
            return prevSnake;
          }

          const newSnake = [newHead, ...prevSnake];

          // Check food
          if (newHead.x === food.x && newHead.y === food.y) {
            setScore(s => {
              const newScore = s + 10;
              // Increase speed slightly every 50 points
              if (newScore % 50 === 0) setSpeed(sp => Math.max(50, sp - 10));
              return newScore;
            });
            spawnFood(newSnake);
          } else {
            newSnake.pop(); // Remove tail if no food eaten
          }

          return newSnake;
        });
      }
      requestRef.current = requestAnimationFrame(gameLoop);
    };

    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameStarted, gameOver, food, score, speed, spawnFood]);

  return (
    <div className="w-full h-screen bg-[#050508] text-slate-300 flex flex-col font-sans overflow-hidden select-none relative">
      
      {/* Background Neon Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Header Bar */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-cyan-900/50 bg-[#0a0a12] shrink-0 z-10 w-full">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-cyan-500 rounded shadow-[0_0_15px_rgba(6,182,212,0.8)] flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-slate-900 rounded-sm rotate-45"></div>
          </div>
          <h1 className="text-xl font-black tracking-tighter text-white">
            NEON<span className="text-cyan-400">SERPENT</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs uppercase tracking-widest">
          <span className="text-green-500">● ONLINE</span>
          <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">VER 2.04</span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 p-6 overflow-hidden z-10">
        
        {/* Game Container */}
        <section className="col-span-1 md:col-span-8 flex flex-col items-center justify-center h-full">
          <div className="flex justify-between w-full max-w-[500px] px-2 mb-4">
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Current Score</p>
              <p className="text-2xl font-mono text-pink-500 leading-none">{score.toString().padStart(5, '0')}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">High Score</p>
              <p className="text-2xl font-mono text-cyan-400 leading-none">{highScore.toString().padStart(5, '0')}</p>
            </div>
          </div>

          <div 
            className="relative bg-[#010103] rounded-2xl border-4 border-slate-800 overflow-hidden flex items-center justify-center shadow-[inset_0_0_100px_rgba(0,0,0,1)]"
            style={{ width: '500px', height: '500px' }}
          >
            {/* Grid background pattern */}
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#22d3ee 1px, transparent 1px)',
                backgroundSize: `${500 / GRID_SIZE}px ${500 / GRID_SIZE}px`
              }}
            />

            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-slate-900/80 rounded-full border border-slate-700 backdrop-blur-md z-20 shadow-lg">
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">Arena Status: {gameStarted && !gameOver ? 'ACTIVE' : 'STANDBY'}</span>
            </div>

            {!gameStarted ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-30 bg-[#050508]/80 backdrop-blur-sm border border-slate-800">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center"
                >
                  <h2 className="text-3xl font-black text-white mb-2 tracking-tight">READY TO PLAY</h2>
                  <p className="text-slate-400 mb-6 max-w-sm text-xs font-mono uppercase tracking-widest leading-relaxed">Use arrow keys or WASD to move.<br/>Press Space to start.</p>
                  <button
                    onClick={resetGame}
                    className="px-6 py-3 bg-pink-500/10 border border-pink-500 text-pink-500 rounded font-black text-xs uppercase tracking-tighter shadow-[0_0_10px_rgba(236,72,153,0.3)] hover:bg-pink-500 hover:text-white transition-all focus:outline-none"
                  >
                    Initialize Game
                  </button>
                </motion.div>
              </div>
            ) : (
              <div className="relative w-full h-full z-10">
                {/* Food */}
                <div
                  className="absolute bg-pink-500 rounded-full shadow-[0_0_15px_#ec4899]"
                  style={{
                    width: `${100 / GRID_SIZE}%`,
                    height: `${100 / GRID_SIZE}%`,
                    left: `${(food.x / GRID_SIZE) * 100}%`,
                    top: `${(food.y / GRID_SIZE) * 100}%`,
                  }}
                />
                
                {/* Snake */}
                {snake.map((segment, index) => {
                  const isHead = index === 0;
                  return (
                    <motion.div
                      key={`${segment.x}-${segment.y}-${index}`}
                      className={`absolute rounded-sm ${isHead ? 'bg-cyan-400 z-20 shadow-[0_0_10px_#22d3ee]' : 'bg-cyan-400/80 z-10'}`}
                      style={{
                        width: `${100 / GRID_SIZE}%`,
                        height: `${100 / GRID_SIZE}%`,
                        left: `${(segment.x / GRID_SIZE) * 100}%`,
                        top: `${(segment.y / GRID_SIZE) * 100}%`,
                        transform: 'scale(0.9)', 
                      }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 0.9 }}
                      transition={{ duration: 0.1 }}
                    />
                  );
                })}
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-40 bg-[#050508]/80 backdrop-blur-md">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="flex flex-col items-center"
                >
                  <h2 className="text-4xl font-black text-pink-500 mb-2 tracking-widest uppercase shadow-none drop-shadow-[0_0_10px_rgba(236,72,153,0.6)]">CRITICAL FAILURE</h2>
                  <p className="text-slate-300 font-mono mb-6 text-xs uppercase tracking-widest">Final Score: <span className="text-cyan-400 font-bold">{score.toString().padStart(5, '0')}</span></p>
                  <button
                    onClick={resetGame}
                    className="px-6 py-3 bg-pink-500/10 border border-pink-500 text-pink-500 rounded font-black text-xs uppercase tracking-tighter shadow-[0_0_10px_rgba(236,72,153,0.3)] hover:bg-pink-500 hover:text-white transition-all focus:outline-none"
                  >
                    Reboot System
                  </button>
                </motion.div>
              </div>
            )}
          </div>
        </section>

        {/* Music Player Sidebar */}
        <section className="col-span-1 md:col-span-4 flex flex-col gap-4 h-[560px]">
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 h-full relative overflow-hidden group">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse"></span>
              Now Playing
            </h2>
            
            {/* Album Art Placeholder / Visualizer */}
            <div className="w-full aspect-square bg-slate-800 rounded-lg mb-2 flex flex-col items-center justify-center border border-slate-700 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-pink-500/10"></div>
              {isPlaying ? (
                <div className="flex items-end justify-center h-16 w-full gap-1.5 z-10 px-8">
                  {[...Array(7)].map((_, i) => (
                    <motion.div
                      key={i}
                      className={`w-full ${i % 2 === 0 ? 'bg-cyan-400' : 'bg-pink-500'} opacity-80 rounded-t-sm`}
                      animate={{ height: ['20%', '100%', '30%', '80%', '40%'] }}
                      transition={{
                        duration: 0.6 + i * 0.1,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                        delay: i * 0.05
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="w-12 h-12 border-4 border-slate-600 rounded-full flex items-center justify-center z-10">
                  <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center mb-4 text-center">
              <p className="text-white font-bold">{TRACKS[currentTrackIndex].title}</p>
              <p className="text-slate-500 text-[11px] uppercase tracking-widest font-mono mt-1">{TRACKS[currentTrackIndex].artist}</p>
            </div>

            {/* Audio Element Hidden */}
            <audio
              ref={audioRef}
              src={TRACKS[currentTrackIndex].url}
              onEnded={handleTrackEnd}
            />

            {/* Controls */}
            <div className="mt-auto pt-4 border-t border-slate-800 flex flex-col gap-6">
              <div className="flex items-center justify-center gap-8">
                <button 
                  onClick={handlePrevTrack}
                  className="text-slate-400 hover:text-white transition-colors"
                  aria-label="Previous track"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 transition-all"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current pl-1" />}
                </button>
                
                <button 
                  onClick={handleNextTrack}
                  className="text-slate-400 hover:text-white transition-colors"
                  aria-label="Next track"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase">
                 <button 
                   onClick={() => setIsMuted(!isMuted)}
                   className="hover:text-white transition-colors flex items-center gap-2"
                 >
                   {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                   <span>{isMuted ? 'Muted' : 'Volume'}</span>
                 </button>
                 <span className={isPlaying ? 'text-cyan-400' : 'text-slate-500'}>
                    {isPlaying ? 'ACTIVE' : 'STANDBY'}
                 </span>
              </div>
            </div>

          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="h-12 bg-[#0a0a12] border-t border-cyan-900/50 px-8 flex items-center justify-between shrink-0 z-10 w-full text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-auto">
         <div className="flex items-center gap-6">
           <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_rgb(34,211,238)]"></div> Snake: Cyan</span>
           <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_5px_rgb(236,72,153)]"></div> Food: Pink</span>
         </div>
         <div>System Diagnostics: Nominal</div>
      </footer>

    </div>
  );
}
