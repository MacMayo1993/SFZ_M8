import { useState, useRef, useEffect, useCallback } from 'react';
import {
  COLORS,
  FACES,
  FACE_TRANSFORMS,
  SHUFFLE_MULTIPLIER,
  CUBE_SIZE_PX,
  CUBE_PERSPECTIVE,
  ROTATION_SENSITIVITY,
  TIMER_UPDATE_INTERVAL
} from '../constants/cube.js';
import {
  initCube,
  formatTime,
  cloneCube,
  applyFlip,
  isCubeSolved,
  calculateEntropy,
  normalizeAngle
} from '../utils/cube.js';
import { applyMove, rotateFace, shuffleCube } from '../utils/cubeLogic.js';
import Menu from './Menu.jsx';
import VictoryScreen from './VictoryScreen.jsx';

/**
 * WORM³ - A topological puzzle where antipodal pairs are entangled
 */
export default function WORM3() {
  // Game state
  const [state, setState] = useState('menu'); // 'menu', 'playing', 'complete'
  const [size, setSize] = useState(3);
  const [cube, setCube] = useState({});
  const [moves, setMoves] = useState(0);
  const [selected, setSelected] = useState(null);
  const [victory, setVictory] = useState(null);
  const [hasShuffled, setHasShuffled] = useState(false);

  // UI state
  const [rot, setRot] = useState({ x: -25, y: -45 });
  const [flipMode, setFlipMode] = useState(false);
  const dragRef = useRef({ active: false, x: 0, y: 0 });

  // Timer state
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const startTimeRef = useRef(0);

  // Timer functions
  const startTimer = useCallback(() => {
    if (timerRunning) return;
    startTimeRef.current = Date.now() - timer;
    setTimerRunning(true);
  }, [timerRunning, timer]);

  const stopTimer = useCallback(() => {
    setTimerRunning(false);
    return Date.now() - startTimeRef.current;
  }, []);

  const resetTimer = useCallback(() => {
    setTimerRunning(false);
    setTimer(0);
    startTimeRef.current = 0;
  }, []);

  // Timer effect
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(
      () => setTimer(Date.now() - startTimeRef.current),
      TIMER_UPDATE_INTERVAL
    );
    return () => clearInterval(id);
  }, [timerRunning]);

  // Game functions
  const init = (cubeSize) => {
    setSize(cubeSize);
    setCube(initCube(cubeSize));
    setMoves(0);
    setSelected(null);
    setVictory(null);
    setHasShuffled(false);
    resetTimer();
    setState('playing');
  };

  const triggerFlip = (faceNum, idx) => {
    setCube(prev => {
      const c = cloneCube(prev);
      return applyFlip(c, faceNum, idx);
    });
    setMoves(m => m + 1);
    if (hasShuffled && !timerRunning) startTimer();
  };

  const performMove = useCallback((axis, dir, slice) => {
    setCube(prev => {
      const c = cloneCube(prev);
      return applyMove(c, size, axis, dir, { row: slice, col: slice });
    });
    setMoves(m => m + 1);
    if (hasShuffled && !timerRunning) startTimer();
  }, [size, hasShuffled, timerRunning, startTimer]);

  const performFaceRotation = useCallback((faceNum, clockwise) => {
    if (!selected) return;

    setCube(prev => {
      const c = cloneCube(prev);
      return rotateFace(c, size, faceNum, clockwise);
    });

    setMoves(m => m + 1);
    if (hasShuffled && !timerRunning) startTimer();
  }, [selected, size, hasShuffled, timerRunning, startTimer]);

  const moveScreenDir = (screenDir) => {
    if (!selected) return;

    const { face, row, col } = selected;

    // Normalize rotation to determine view direction
    const rotY = normalizeAngle(rot.y);

    // Calculate which quadrant we're viewing from (0-3)
    const yQuadrant = Math.floor((rotY + 45) / 90) % 4;

    // Base mappings for each face when viewed from default angle
    // Format: [axis, slice, direction]
    const baseMappings = {
      1: {
        up: ['col', col, -1],
        down: ['col', col, 1],
        left: ['row', row, -1],
        right: ['row', row, 1]
      },
      4: {
        up: ['col', size - 1 - col, 1],
        down: ['col', size - 1 - col, -1],
        left: ['row', row, 1],
        right: ['row', row, -1]
      },
      2: {
        up: ['depth', size - 1 - col, 1],
        down: ['depth', size - 1 - col, -1],
        left: ['row', row, -1],
        right: ['row', row, 1]
      },
      5: {
        up: ['depth', col, -1],
        down: ['depth', col, 1],
        left: ['row', row, -1],
        right: ['row', row, 1]
      },
      3: {
        up: ['depth', size - 1 - row, 1],
        down: ['depth', size - 1 - row, -1],
        left: ['col', col, -1],
        right: ['col', col, 1]
      },
      6: {
        up: ['depth', row, -1],
        down: ['depth', row, 1],
        left: ['col', col, -1],
        right: ['col', col, 1]
      }
    };

    // Rotate the screen direction based on view rotation
    const rotateDir = (dir, times) => {
      const dirs = ['up', 'right', 'down', 'left'];
      const idx = dirs.indexOf(dir);
      return dirs[(idx + times + 4) % 4];
    };

    const adjustedDir = rotateDir(screenDir, yQuadrant);
    const params = baseMappings[face]?.[adjustedDir];

    if (!params) return;

    const [axis, slice, dir] = params;
    performMove(axis, dir, slice);
  };

  const shuffle = () => {
    setCube(() => {
      const initial = initCube(size);
      return shuffleCube(initial, size, size * SHUFFLE_MULTIPLIER);
    });
    setMoves(0);
    setHasShuffled(true);
    setVictory(null);
    resetTimer();
  };

  const solve = () => {
    setCube(initCube(size));
    setMoves(0);
    setVictory(null);
    setSelected(null);
    setHasShuffled(false);
    resetTimer();
  };

  const handleTileClick = (faceNum, idx, row, col) => {
    if (flipMode) {
      triggerFlip(faceNum, idx);
    } else {
      setSelected({ face: faceNum, idx, row, col });
    }
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.tile') || e.target.closest('.ctrl-btn')) return;
    dragRef.current = { active: true, x: e.clientX, y: e.clientY };
    setSelected(null);
  };

  // Mouse drag effect for cube rotation
  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      dragRef.current.x = e.clientX;
      dragRef.current.y = e.clientY;
      setRot(r => ({
        x: r.x - dy * ROTATION_SENSITIVITY,
        y: r.y + dx * ROTATION_SENSITIVITY
      }));
    };
    const onUp = () => {
      dragRef.current.active = false;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Calculate statistics
  const allTiles = Object.values(cube).flat();
  const totalFlips = allTiles.reduce((a, t) => a + (t?.flips || 0), 0);
  const entropy = calculateEntropy(allTiles, size * size * 6);

  // Check for victory
  useEffect(() => {
    if (!hasShuffled || moves === 0) {
      setVictory(null);
      return;
    }

    if (isCubeSolved(cube)) {
      const finalTime = stopTimer();
      setVictory({ type: 'SOLVED', time: finalTime });
      setState('complete');
    } else {
      setVictory(null);
    }
  }, [cube, hasShuffled, moves, stopTimer]);

  // Render menu
  if (state === 'menu') {
    return <Menu onStart={init} />;
  }

  // Render game
  return (
    <div className="flex h-screen" style={{ background: COLORS.bg, fontFamily: 'system-ui' }}>
      {/* Sidebar */}
      <div className="w-72 border-r-4 border-black flex flex-col" style={{ background: COLORS.white }}>
        {/* Header */}
        <div className="p-4 border-b-4 border-black flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-4 border-black" style={{ background: COLORS.accent }} />
            <div className="w-6 h-6 border-4 border-black rounded-full" style={{ background: COLORS.secondary }} />
          </div>
          <span className="font-black text-2xl">{size}³</span>
        </div>

        {/* Timer */}
        <div className="p-6 border-b-4 border-black" style={{ background: COLORS.secondary }}>
          <div className="text-xs font-black uppercase tracking-widest mb-2">TIME</div>
          <div className="text-5xl font-black tracking-tight">{formatTime(timer)}</div>
          <div className="text-xs font-black uppercase tracking-wider mt-2">
            {timerRunning ? '● SOLVING' : hasShuffled ? '○ READY' : '○ SHUFFLE TO START'}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 flex-1 overflow-auto">
          <div className="text-xs font-black uppercase tracking-widest mb-3">MECHANICS</div>

          <button
            onClick={() => setFlipMode(!flipMode)}
            className="w-full py-3 mb-3 font-black uppercase tracking-wide border-4 border-black transition-all duration-100 active:translate-x-1 active:translate-y-1 active:shadow-none"
            style={{
              background: flipMode ? COLORS.accent : COLORS.white,
              color: COLORS.black,
              boxShadow: '4px 4px 0px 0px #000'
            }}
          >
            ⚡ FLIP MODE {flipMode ? 'ON' : 'OFF'}
          </button>

          {/* Statistics */}
          <div className="mt-6 p-4 border-4 border-black" style={{ background: COLORS.bg, boxShadow: '4px 4px 0px 0px #000' }}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="font-bold uppercase">Moves</span>
                <span className="font-black">{moves}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold uppercase">Flips</span>
                <span className="font-black" style={{ color: COLORS.accent }}>{totalFlips}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="font-bold uppercase">Entropy</span>
                <span className="font-black" style={{ color: COLORS.muted }}>{entropy}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t-4 border-black" style={{ background: COLORS.bg }}>
          <button
            onClick={shuffle}
            className="w-full py-3 mb-2 font-black uppercase tracking-wide border-4 border-black transition-all duration-100 active:translate-x-1 active:translate-y-1 active:shadow-none"
            style={{ background: COLORS.muted, boxShadow: '4px 4px 0px 0px #000' }}
          >
            SHUFFLE
          </button>
          <button
            onClick={solve}
            className="w-full py-3 mb-2 font-black uppercase tracking-wide border-4 border-black transition-all duration-100 active:translate-x-1 active:translate-y-1 active:shadow-none"
            style={{ background: COLORS.white, boxShadow: '4px 4px 0px 0px #000' }}
          >
            RESET
          </button>
          <button
            onClick={() => {
              setState('menu');
              resetTimer();
            }}
            className="w-full py-3 font-black uppercase tracking-wide border-4 border-black transition-all duration-100 active:translate-x-1 active:translate-y-1 active:shadow-none"
            style={{ background: COLORS.accent, boxShadow: '4px 4px 0px 0px #000' }}
          >
            EXIT
          </button>
        </div>
      </div>

      {/* Main Game Area */}
      <div
        className="flex-1 relative flex items-center justify-center cursor-grab"
        style={{ background: COLORS.bg }}
        onMouseDown={handleMouseDown}
      >
        {/* Decorative elements */}
        <div className="absolute top-8 left-8 w-20 h-20 border-4 border-black rounded-full opacity-30" style={{ background: COLORS.secondary }} />
        <div className="absolute bottom-8 right-8 w-24 h-24 border-4 border-black rotate-12 opacity-30" style={{ background: COLORS.accent }} />

        {/* Victory Screen */}
        {victory && (
          <VictoryScreen
            victory={victory}
            moves={moves}
            onPlayAgain={() => {
              setVictory(null);
              shuffle();
              setState('playing');
            }}
          />
        )}

        {/* Cube */}
        <div style={{ perspective: CUBE_PERSPECTIVE }}>
          <div
            style={{
              width: CUBE_SIZE_PX,
              height: CUBE_SIZE_PX,
              position: 'relative',
              transformStyle: 'preserve-3d',
              transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`
            }}
          >
            {[1, 2, 3, 4, 5, 6].map(faceNum => (
              <div
                key={faceNum}
                style={{
                  position: 'absolute',
                  width: CUBE_SIZE_PX,
                  height: CUBE_SIZE_PX,
                  transform: FACE_TRANSFORMS[faceNum],
                  display: 'grid',
                  gridTemplateColumns: `repeat(${size}, 1fr)`,
                  gap: 4,
                  padding: 4,
                  background: COLORS.black,
                  border: `4px solid ${COLORS.black}`,
                  backfaceVisibility: 'hidden'
                }}
              >
                {cube[faceNum]?.map((tile, idx) => {
                  const row = Math.floor(idx / size);
                  const col = idx % size;
                  const bg = FACES[tile.curr].color;
                  const isSelected = selected?.face === faceNum && selected?.idx === idx;
                  const isWormhole = tile.flips > 0 && tile.curr !== tile.orig;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleTileClick(faceNum, idx, row, col)}
                      className="tile relative flex items-center justify-center cursor-pointer"
                      style={{
                        background: bg,
                        border: isSelected ? '4px solid #000' : '3px solid #000',
                        boxShadow: isWormhole ? '0 0 0 3px #000, 6px 6px 0px 0px #000' : 'none',
                        transform: isWormhole ? 'translate(-3px, -3px)' : isSelected ? 'scale(1.05)' : 'none',
                        animation: isWormhole ? 'wormholePop 0.6s ease-in-out infinite' : 'none',
                        zIndex: isWormhole ? 10 : 1
                      }}
                    >
                      {isWormhole && (
                        <div className="w-4 h-4 border-4 border-black rounded-full" style={{ background: COLORS.black }} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Control Arrows */}
        {selected && !flipMode && state === 'playing' && (
          <>
            <button
              onClick={() => moveScreenDir('up')}
              className="ctrl-btn absolute top-8 left-1/2 -translate-x-1/2 w-14 h-14 flex items-center justify-center font-black text-2xl border-4 border-black transition-all duration-100 active:translate-x-1 active:translate-y-1 active:shadow-none"
              style={{ background: COLORS.white, boxShadow: '4px 4px 0px 0px #000' }}
            >
              ↑
            </button>
            <button
              onClick={() => moveScreenDir('down')}
              className="ctrl-btn absolute bottom-28 left-1/2 -translate-x-1/2 w-14 h-14 flex items-center justify-center font-black text-2xl border-4 border-black transition-all duration-100 active:translate-x-1 active:translate-y-1 active:shadow-none"
              style={{ background: COLORS.white, boxShadow: '4px 4px 0px 0px #000' }}
            >
              ↓
            </button>
            <button
              onClick={() => moveScreenDir('left')}
              className="ctrl-btn absolute top-1/2 left-8 -translate-y-1/2 w-14 h-14 flex items-center justify-center font-black text-2xl border-4 border-black transition-all duration-100 active:translate-x-1 active:translate-y-1 active:shadow-none"
              style={{ background: COLORS.white, boxShadow: '4px 4px 0px 0px #000' }}
            >
              ←
            </button>
            <button
              onClick={() => moveScreenDir('right')}
              className="ctrl-btn absolute top-1/2 right-8 -translate-y-1/2 w-14 h-14 flex items-center justify-center font-black text-2xl border-4 border-black transition-all duration-100 active:translate-x-1 active:translate-y-1 active:shadow-none"
              style={{ background: COLORS.white, boxShadow: '4px 4px 0px 0px #000' }}
            >
              →
            </button>

            {/* Face Rotation Controls */}
            <button
              onClick={() => performFaceRotation(selected.face, false)}
              className="ctrl-btn absolute top-8 left-8 w-14 h-14 flex items-center justify-center font-black text-xl border-4 border-black transition-all duration-100 active:translate-x-1 active:translate-y-1 active:shadow-none rounded-full"
              style={{ background: COLORS.secondary, boxShadow: '4px 4px 0px 0px #000' }}
            >
              ↺
            </button>
            <button
              onClick={() => performFaceRotation(selected.face, true)}
              className="ctrl-btn absolute top-8 right-8 w-14 h-14 flex items-center justify-center font-black text-xl border-4 border-black transition-all duration-100 active:translate-x-1 active:translate-y-1 active:shadow-none rounded-full"
              style={{ background: COLORS.secondary, boxShadow: '4px 4px 0px 0px #000' }}
            >
              ↻
            </button>
          </>
        )}

        {/* Status Bar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 border-4 border-black" style={{ background: COLORS.white, boxShadow: '4px 4px 0px 0px #000' }}>
          <span className="font-black uppercase tracking-wide text-sm">
            {flipMode ? '⚡ CLICK TILE TO FLIP' : selected ? '🎯 USE ARROWS TO MOVE SLICE' : '👆 SELECT A TILE'}
          </span>
        </div>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes wormholePop {
          0%, 100% { transform: translate(-3px, -3px) scale(1.02); }
          50% { transform: translate(-6px, -6px) scale(1.08); }
        }
      `}</style>
    </div>
  );
}
