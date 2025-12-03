import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, Pause, Play, RefreshCw, Zap } from 'lucide-react';

const WORM3Cube = () => {
  // WORM³-CUBE: Winding-Orientable-Recursive-Manifold CUBED
  // Powered by the M³ Engine (Mayo Manifold Machine)

  const CUBE_PIXEL_SIZE = 320;
  const HALF_SIZE = CUBE_PIXEL_SIZE / 2;

  const colors = {
    1: { name: 'Red', bg: '#e63946', antipodal: 4 },
    2: { name: 'Green', bg: '#16a34a', antipodal: 5 },
    3: { name: 'White', bg: '#f5f5f5', antipodal: 6 },
    4: { name: 'Orange', bg: '#ff6600', antipodal: 1 },
    5: { name: 'Blue', bg: '#2563eb', antipodal: 2 },
    6: { name: 'Yellow', bg: '#ffdd00', antipodal: 3 }
  };

  const difficulties = {
    easy: { name: 'Easy', chaosInterval: 10000, spreadChance: 0.25 },
    medium: { name: 'Medium', chaosInterval: 5000, spreadChance: 0.50 },
    hard: { name: 'Hard', chaosInterval: 2500, spreadChance: 0.75 },
    expert: { name: 'Expert', chaosInterval: 1000, spreadChance: 0.90 }
  };

  // State
  const [gameStarted, setGameStarted] = useState(false);
  const [hasShuffled, setHasShuffled] = useState(false); // Controls Victory Banner visibility
  const [gridSize, setGridSize] = useState(3);
  const [cube, setCube] = useState({});
  const [difficulty, setDifficulty] = useState('medium');
  const [gameMode, setGameMode] = useState('classic');
  const [flipMode, setFlipMode] = useState(false);
  const [chaosMode, setChaosMode] = useState(false);
  const [autoFlipMode, setAutoFlipMode] = useState(false);
  const [showTileInfo, setShowTileInfo] = useState(true);
  const [affinityMode, setAffinityMode] = useState(false);
  const [autoSolveMode, setAutoSolveMode] = useState(false);
  const [moves, setMoves] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [view, setView] = useState('3d');
  const [rotation, setRotation] = useState({ x: -20, y: -30 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedTile, setSelectedTile] = useState(null);
  const [isDraggingTile, setIsDraggingTile] = useState(false);
  const [dragInfo, setDragInfo] = useState(null);
  const [draggedTileId, setDraggedTileId] = useState(null);
  const [unstableTiles, setUnstableTiles] = useState(new Set());
  const [lastFlipTime, setLastFlipTime] = useState({});
  const [globalLastFlip, setGlobalLastFlip] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickedFace, setLastClickedFace] = useState(null);

  const activeTimeouts = useRef([]);

  // Calculate totalFlips
  const totalFlips = cube && Object.keys(cube).length > 0
    ? Object.values(cube).flat().reduce((sum, tile) => sum + (tile?.flipCount || 0), 0)
    : 0;

  // Game timer
  useEffect(() => {
    if (!gameStarted || isPaused || !cube || Object.keys(cube).length === 0) return;
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 100);
    }, 100);
    return () => clearInterval(timer);
  }, [gameStarted, isPaused, cube]);

  // AUTO-SOLVE
  useEffect(() => {
    if (!autoSolveMode || !gameStarted || isPaused || !cube || Object.keys(cube).length === 0) return;

    const solveTimer = setInterval(() => {
      const tilesWithAffinity = [];
      for (let faceNum = 1; faceNum <= 6; faceNum++) {
        const faceTiles = cube[faceNum];
        if (!faceTiles) continue;
        faceTiles.forEach((tile, index) => {
          const affinity = calculateAffinity(tile, index);
          if (affinity > 0) {
            tilesWithAffinity.push({ tile, faceNum, index, affinity });
          }
        });
      }

      if (tilesWithAffinity.length === 0) {
        setAutoSolveMode(false);
        return;
      }

      tilesWithAffinity.sort((a, b) => b.affinity - a.affinity);
      const mostLost = tilesWithAffinity[0];
      const row = Math.floor(mostLost.index / gridSize);
      const col = mostLost.index % gridSize;

      const moveChoice = Math.random();
      if (moveChoice < 0.5) {
        rotateSliceRow(row, Math.random() > 0.5);
      } else {
        rotateSliceCol(col, Math.random() > 0.5);
      }
    }, 800);

    return () => clearInterval(solveTimer);
  }, [autoSolveMode, gameStarted, isPaused, cube, gridSize]);

  // Initialization
  const initializeFace = (manifoldNum, size) => {
    const tiles = [];
    const count = size * size;
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / size);
      const col = i % size;
      const modValue = (col + row) % size;
      const randomAlt = Math.floor(Math.random() * size);

      tiles.push({
        id: `M${manifoldNum}-${String(i).padStart(3, '0')}`,
        manifold: manifoldNum,
        position: i,
        value: modValue,
        altValue: randomAlt,
        originalManifold: manifoldNum,
        currentManifold: manifoldNum,
        flipCount: 0
      });
    }
    return tiles;
  };

  const initializeCube = (size) => ({
    1: initializeFace(1, size),
    2: initializeFace(2, size),
    3: initializeFace(3, size),
    4: initializeFace(4, size),
    5: initializeFace(5, size),
    6: initializeFace(6, size)
  });

  const safeTimeout = (fn, delay) => {
    const id = setTimeout(() => {
      fn();
      activeTimeouts.current = activeTimeouts.current.filter(tId => tId !== id);
    }, delay);
    activeTimeouts.current.push(id);
    return id;
  };

  // Helpers
  const getRow = (face, row) => face.slice(row * gridSize, row * gridSize + gridSize);
  const getCol = (face, col) => {
    const result = [];
    for (let i = 0; i < gridSize; i++) result.push(face[i * gridSize + col]);
    return result;
  };
  const setRow = (face, row, tiles) => {
    const newFace = [...face];
    for (let i = 0; i < gridSize; i++) newFace[row * gridSize + i] = tiles[i];
    return newFace;
  };
  const setCol = (face, col, tiles) => {
    const newFace = [...face];
    for (let i = 0; i < gridSize; i++) newFace[i * gridSize + col] = tiles[i];
    return newFace;
  };

  const rotateFace = (face, clockwise = true) => {
    const newFace = [];
    for (let i = 0; i < gridSize * gridSize; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      if (clockwise) {
        const newRow = col;
        const newCol = gridSize - 1 - row;
        newFace[newRow * gridSize + newCol] = face[i];
      } else {
        const newRow = gridSize - 1 - col;
        const newCol = row;
        newFace[newRow * gridSize + newCol] = face[i];
      }
    }
    return newFace;
  };

  const calculateAffinity = (tile, actualIndex) => {
    const isOnHomeFace = tile.currentManifold === tile.originalManifold;
    const isInHomePosition = actualIndex === tile.position;
    if (isOnHomeFace && isInHomePosition) return 0;
    if (isOnHomeFace) return 1;
    const currentFace = tile.currentManifold;
    const homeFace = tile.originalManifold;
    const faceDistance = Math.abs(currentFace - homeFace);
    return 2 + faceDistance;
  };

  // Rotations
  const rotateSliceRow = (row, clockwise = true) => {
    if (!cube || Object.keys(cube).length === 0 || row < 0 || row >= gridSize) return;
    setIsAnimating(true);
    setCube(prev => {
      const newCube = { ...prev };
      if (clockwise) {
        const f = getRow(prev[1], row);
        const r = getRow(prev[5], row);
        const b = getRow(prev[4], row);
        const l = getRow(prev[2], row);
        newCube[1] = setRow(newCube[1], row, l);
        newCube[5] = setRow(newCube[5], row, f);
        newCube[4] = setRow(newCube[4], row, r);
        newCube[2] = setRow(newCube[2], row, b);
      } else {
        const f = getRow(prev[1], row);
        const r = getRow(prev[5], row);
        const b = getRow(prev[4], row);
        const l = getRow(prev[2], row);
        newCube[1] = setRow(newCube[1], row, r);
        newCube[5] = setRow(newCube[5], row, b);
        newCube[4] = setRow(newCube[4], row, l);
        newCube[2] = setRow(newCube[2], row, f);
      }
      if (row === 0) newCube[3] = rotateFace(prev[3], clockwise);
      if (row === gridSize - 1) newCube[6] = rotateFace(prev[6], !clockwise);
      return newCube;
    });
    setMoves(prev => prev + 1);
    safeTimeout(() => setIsAnimating(false), 300);
  };

  const rotateSliceCol = (col, clockwise = true) => {
    if (!cube || Object.keys(cube).length === 0 || col < 0 || col >= gridSize) return;
    setIsAnimating(true);
    setCube(prev => {
      const newCube = { ...prev };
      if (clockwise) {
        const f = getCol(prev[1], col);
        const t = getCol(prev[3], col);
        const b = getCol(prev[4], (gridSize - 1) - col).reverse();
        const bot = getCol(prev[6], col);
        newCube[1] = setCol(newCube[1], col, bot);
        newCube[3] = setCol(newCube[3], col, f);
        newCube[4] = setCol(newCube[4], (gridSize - 1) - col, t.reverse());
        newCube[6] = setCol(newCube[6], col, b.reverse());
      } else {
        const f = getCol(prev[1], col);
        const t = getCol(prev[3], col);
        const b = getCol(prev[4], (gridSize - 1) - col).reverse();
        const bot = getCol(prev[6], col);
        newCube[1] = setCol(newCube[1], col, t);
        newCube[3] = setCol(newCube[3], col, b.reverse());
        newCube[4] = setCol(newCube[4], (gridSize - 1) - col, bot.reverse());
        newCube[6] = setCol(newCube[6], col, f);
      }
      if (col === gridSize - 1) newCube[5] = rotateFace(prev[5], clockwise);
      if (col === 0) newCube[2] = rotateFace(prev[2], !clockwise);
      return newCube;
    });
    setMoves(prev => prev + 1);
    safeTimeout(() => setIsAnimating(false), 300);
  };

  const rotateSliceDepth = (depth, clockwise = true) => {
    if (!cube || Object.keys(cube).length === 0 || depth < 0 || depth >= gridSize) return;
    setIsAnimating(true);
    setCube(prev => {
      const newCube = { ...prev };
      const invDepth = (gridSize - 1) - depth;
      if (clockwise) {
        const tb = getRow(prev[3], invDepth);
        const rl = getCol(prev[5], depth);
        const bt = getRow(prev[6], depth);
        const lr = getCol(prev[2], invDepth);
        newCube[3] = setRow(newCube[3], invDepth, lr.reverse());
        newCube[5] = setCol(newCube[5], depth, tb);
        newCube[6] = setRow(newCube[6], depth, rl.reverse());
        newCube[2] = setCol(newCube[2], invDepth, bt);
      } else {
        const tb = getRow(prev[3], invDepth);
        const rl = getCol(prev[5], depth);
        const bt = getRow(prev[6], depth);
        const lr = getCol(prev[2], invDepth);
        newCube[3] = setRow(newCube[3], invDepth, rl.reverse());
        newCube[5] = setCol(newCube[5], depth, bt);
        newCube[6] = setRow(newCube[6], depth, lr.reverse());
        newCube[2] = setCol(newCube[2], invDepth, tb);
      }
      return newCube;
    });
    setMoves(prev => prev + 1);
    safeTimeout(() => setIsAnimating(false), 300);
  };

  // Flip logic
  const flipTile = (tileId) => {
    const now = Date.now();
    if (now - globalLastFlip < 100) return;

    let targetTile = null;
    Object.values(cube).flat().forEach(t => { if (t.id === tileId) targetTile = t; });
    if (!targetTile) return;

    setGlobalLastFlip(now);
    setLastFlipTime(prev => ({ ...prev, [tileId]: now }));

    const currentManifoldValue = targetTile.currentManifold;
    const matches = tileId.match(/M(\d+)-(\d+)/);
    if (!matches) return;
    const originalManifold = parseInt(matches[1]);
    const originalPosition = parseInt(matches[2]);
    const antipodalPartnerManifold = colors[originalManifold].antipodal;
    const antipodalPartnerId = `M${antipodalPartnerManifold}-${String(originalPosition).padStart(3, '0')}`;

    setCube(prev => {
      const newCube = { ...prev };
      for (let face in newCube) {
        newCube[face] = newCube[face].map(tile => {
          if (tile.id === tileId) {
            return {
              ...tile,
              currentManifold: colors[tile.currentManifold].antipodal,
              flipCount: tile.flipCount + 1,
              value: tile.altValue,
              altValue: tile.value
            };
          }
          if (tile.id === antipodalPartnerId) {
            return {
              ...tile,
              currentManifold: colors[tile.currentManifold].antipodal,
              flipCount: tile.flipCount + 1,
              value: tile.altValue,
              altValue: tile.value
            };
          }
          return tile;
        });
      }
      return newCube;
    });
  };

  // Chaos contagion
  useEffect(() => {
    if (!chaosMode || !gameStarted || isPaused || !cube || Object.keys(cube).length === 0) return;

    const chaosTimer = setInterval(() => {
      const allTiles = Object.values(cube).flat();
      const flippedTiles = allTiles.filter(t => t && t.flipCount > 0);
      if (flippedTiles.length === 0) return;

      const sourceTile = flippedTiles[Math.floor(Math.random() * flippedTiles.length)];
      if (!sourceTile) return;

      const matches = sourceTile.id.match(/M(\d+)-(\d+)/);
      if (!matches) return;

      const faceNum = parseInt(matches[1]);
      const position = parseInt(matches[2]);
      const row = Math.floor(position / gridSize);
      const col = position % gridSize;

      const neighbors = [];
      if (row > 0) neighbors.push((row - 1) * gridSize + col);
      if (row < gridSize - 1) neighbors.push((row + 1) * gridSize + col);
      if (col > 0) neighbors.push(row * gridSize + (col - 1));
      if (col < gridSize - 1) neighbors.push(row * gridSize + (col + 1));

      const spreadChance = difficulties[difficulty].spreadChance;
      if (neighbors.length > 0 && Math.random() < spreadChance) {
        const neighborPos = neighbors[Math.floor(Math.random() * neighbors.length)];
        const neighborTile = cube[faceNum]?.[neighborPos];
        if (neighborTile) {
          flipTile(neighborTile.id);
          setUnstableTiles(prev => new Set([...prev, neighborTile.id]));
          safeTimeout(() => {
            setUnstableTiles(prev => {
              const newSet = new Set(prev);
              newSet.delete(neighborTile.id);
              return newSet;
            });
          }, 2000);
        }
      }
    }, difficulties[difficulty].chaosInterval);

    return () => clearInterval(chaosTimer);
  }, [chaosMode, gameStarted, isPaused, cube, totalFlips, gridSize, difficulty]);

  // Victory checking
  const checkVictoryTier = () => {
    if (!cube || Object.keys(cube).length === 0) return 'INCOMPLETE';

    let colorPerfectFaces = 0;
    let sudokuPerfectFaces = 0;

    for (let f = 1; f <= 6; f++) {
      const faceTiles = cube[f];
      if (!faceTiles) continue;

      const allCorrectColor = faceTiles.every(t => t.currentManifold === f);
      if (allCorrectColor) colorPerfectFaces++;

      let mathValid = true;
      for (let r = 0; r < gridSize; r++) {
        const rowVals = new Set();
        for (let c = 0; c < gridSize; c++) rowVals.add(faceTiles[r * gridSize + c].value);
        if (rowVals.size !== gridSize) mathValid = false;
      }
      for (let c = 0; c < gridSize; c++) {
        const colVals = new Set();
        for (let r = 0; r < gridSize; r++) colVals.add(faceTiles[r * gridSize + c].value);
        if (colVals.size !== gridSize) mathValid = false;
      }

      if (mathValid) sudokuPerfectFaces++;
    }

    if (colorPerfectFaces === 6 && sudokuPerfectFaces === 6) return 'GRANDMASTER';
    else if (colorPerfectFaces === 6) return 'PURIST';
    else if (sudokuPerfectFaces === 6) return 'MATHEMATICIAN';
    return 'INCOMPLETE';
  };

  const victoryTier = checkVictoryTier();

  // --- UPDATED GAME START LOGIC ---

  const startGame = (size) => {
    setGridSize(size);
    const newCube = initializeCube(size);
    setCube(newCube);
    setMoves(0);
    setElapsedTime(0);
    setFlipMode(false);
    setAutoFlipMode(false);
    setChaosMode(false);
    setSelectedTile(null);
    setUnstableTiles(new Set());
    setLastFlipTime({});
    setGlobalLastFlip(0);

    // IMPORTANT: hasShuffled is FALSE initially so victory banner is hidden
    setHasShuffled(false);
    setGameStarted(true);

    // Quick Shuffle after a brief pause so player sees solved state first
    safeTimeout(() => {
      if (newCube && Object.keys(newCube).length > 0) {
        quickShuffle(size);
      }
    }, 1500); // 1.5 second delay before shuffle starts
  };

  const quickShuffle = (size = gridSize) => {
    setIsAnimating(true);
    // Faster, lighter shuffle
    const moveCount = 10 + size;
    // Faster interval (50ms)
    const speed = 50;

    for (let i = 0; i < moveCount; i++) {
      const r = Math.floor(Math.random() * size);
      const axis = Math.floor(Math.random() * 3);
      const dir = Math.random() > 0.5;
      safeTimeout(() => {
        if (axis === 0) rotateSliceRow(r, dir);
        else if (axis === 1) rotateSliceCol(r, dir);
        else rotateSliceDepth(r, dir);
      }, i * speed);
    }

    // Only enable victory condition AFTER shuffle completes
    safeTimeout(() => {
      setIsAnimating(false);
      setHasShuffled(true);
    }, moveCount * speed + 200);
  };

  const reset = () => {
    activeTimeouts.current.forEach(clearTimeout);
    activeTimeouts.current = [];
    setAutoFlipMode(false);
    setChaosMode(false);
    setGameStarted(false);
  };

  const resetToSolved = () => {
    setCube(initializeCube(gridSize));
    setMoves(0);
    setElapsedTime(0);
    setAutoFlipMode(false);
    setChaosMode(false);
    setUnstableTiles(new Set());
    setSelectedTile(null);
    setLastFlipTime({});
    setGlobalLastFlip(0);
    // Hide victory banner when manually resetting to solved
    setHasShuffled(false);
  };

  const orientToFace = (faceNum) => {
    const faceOrientations = {
      1: { x: -20, y: -30 },
      2: { x: -20, y: -120 },
      3: { x: -110, y: -30 },
      4: { x: -20, y: 150 },
      5: { x: -20, y: 60 },
      6: { x: 70, y: -30 }
    };
    const targetRotation = faceOrientations[faceNum];
    if (targetRotation) setRotation(targetRotation);
  };

  // Mouse handlers
  const handleMouseDown = (e, faceNum = null, slotIndex = null) => {
    if (view !== '3d') return;

    if (faceNum !== null && slotIndex !== null) {
      e.stopPropagation();
      e.preventDefault(); // Prevent text selection
      const tile = cube[faceNum][slotIndex];
      const clickedRow = Math.floor(slotIndex / gridSize);
      const clickedCol = slotIndex % gridSize;

      const now = Date.now();
      const isDoubleClick = (now - lastClickTime < 400) && (lastClickedFace === faceNum);

      if (isDoubleClick) {
        orientToFace(faceNum);
        setLastClickTime(0);
        setLastClickedFace(null);
        return;
      }

      setLastClickTime(now);
      setLastClickedFace(faceNum);

      if (flipMode) {
        flipTile(tile.id);
        return;
      }

      setIsDraggingTile(true);
      setDraggedTileId(tile.id);
      setDragInfo({
        face: faceNum,
        row: clickedRow,
        col: clickedCol,
        startX: e.clientX,
        startY: e.clientY
      });
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e) => {
    if (isDraggingTile) return;
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setRotation(prev => ({
        x: prev.x - deltaY * 0.5,
        y: prev.y + deltaX * 0.5
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = (e) => {
    if (isDraggingTile && dragInfo) {
      const deltaX = e.clientX - dragInfo.startX;
      const deltaY = e.clientY - dragInfo.startY;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaX < 10 && absDeltaY < 10) {
        setSelectedTile({
          face: dragInfo.face,
          row: dragInfo.row,
          col: dragInfo.col,
          position: (dragInfo.row * gridSize) + dragInfo.col,
          tileId: draggedTileId
        });
      } else if (absDeltaX > 20 || absDeltaY > 20) {
        if (absDeltaX > absDeltaY) {
          rotateSliceRow(dragInfo.row, deltaX > 0);
        } else {
          rotateSliceCol(dragInfo.col, deltaY < 0);
        }
      }

      setDragInfo(null);
      setIsDraggingTile(false);
      setDraggedTileId(null);
    }
    setIsDragging(false);
  };

  // Render functions
  const getFontSize = () => {
    if (gridSize <= 2) return 'text-4xl';
    if (gridSize === 3) return 'text-2xl';
    if (gridSize === 4) return 'text-xl';
    if (gridSize === 5) return 'text-lg';
    return 'text-sm';
  };

  const renderTile = (tile, clickable = false, faceNum = null, index = null) => {
    if (!tile || index === null) return null;

    const row = Math.floor(index / gridSize);
    const col = index % gridSize;

    let bgColor = colors[tile.currentManifold]?.bg || '#cccccc';
    let textColor = 'white';
    let showValue = false;
    let showTileDebugInfo = false;

    if (gameMode === 'sudokube') {
      bgColor = '#f3f4f6';
      textColor = '#111827';
      showValue = true;
      showTileDebugInfo = false;
    } else if (gameMode === 'flipgrid') {
      showValue = true;
      showTileDebugInfo = showTileInfo;
    } else {
      showValue = false;
      showTileDebugInfo = false;
    }

    const isHighlighted = selectedTile && faceNum === selectedTile.face && (row === selectedTile.row || col === selectedTile.col);
    const isSelected = selectedTile && faceNum === selectedTile.face && index === selectedTile.position;

    const isAntipodalPartner = selectedTile && selectedTile.tileId && (() => {
      const matches = tile.id.match(/M(\d+)-(\d+)/);
      const selectedMatches = selectedTile.tileId.match(/M(\d+)-(\d+)/);
      if (!matches || !selectedMatches) return false;

      const tileManifold = parseInt(matches[1]);
      const tilePosition = parseInt(matches[2]);
      const selectedManifold = parseInt(selectedMatches[1]);
      const selectedPosition = parseInt(selectedMatches[2]);

      return tilePosition === selectedPosition &&
             tileManifold === colors[selectedManifold]?.antipodal;
    })();

    const isUnstable = unstableTiles.has(tile.id);
    const affinity = affinityMode ? calculateAffinity(tile, index) : 0;
    const affinityGlow = affinity === 0 ? 'ring-2 ring-green-400' :
                         affinity === 1 ? 'ring-2 ring-lime-400' :
                         affinity === 2 ? 'ring-2 ring-yellow-400' :
                         affinity === 3 ? 'ring-2 ring-orange-400' :
                         'ring-2 ring-red-400';

    const fontSize = getFontSize();

    return (
      <div
        key={tile.id}
        className={`relative border border-black/20 flex items-center justify-center font-black select-none ${fontSize}
          rounded-xl
          transition-all duration-200
          ${clickable ? 'cursor-pointer hover:brightness-110 hover:scale-105 hover:z-20' : ''}
          ${isUnstable ? 'ring-2 ring-red-500 animate-pulse' : ''}
          ${affinityMode && affinity > 0 ? affinityGlow : ''}
          ${isSelected ? 'ring-4 ring-yellow-400 z-10' :
            isAntipodalPartner ? 'ring-4 ring-orange-400 z-10 animate-pulse' :
            isHighlighted ? 'ring-2 ring-white/50' : ''}`}
        style={{
          backgroundColor: bgColor,
          color: textColor,
          boxShadow: clickable
            ? '0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.15)'
            : undefined,
          animation: tile.flipCount > 0
            ? `breathe ${Math.max(0.5, 2 - (tile.flipCount * 0.05))}s ease-in-out infinite`
            : 'none'
        }}
        onMouseDown={(e) => clickable && faceNum !== null && index !== null && handleMouseDown(e, faceNum, index)}
        onMouseEnter={(e) => {
          if (clickable) {
            const antipodalManifold = colors[tile.currentManifold]?.antipodal;
            const antipodalColor = colors[antipodalManifold]?.bg || '#888888';
            e.currentTarget.style.boxShadow = `0 0 20px ${antipodalColor}, 0 0 40px ${antipodalColor}80`;
          }
        }}
        onMouseLeave={(e) => {
          if (clickable) {
            e.currentTarget.style.boxShadow = '0 0 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.15)';
          }
        }}
      >
        {tile.flipCount > 0 && (() => {
          const antipodalManifold = colors[tile.currentManifold]?.antipodal;
          const antipodalColor = colors[antipodalManifold]?.bg || '#888888';
          const dotSize = Math.min(8 + (tile.flipCount * 2), 80);

          return (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                animation: `pulse ${Math.max(0.5, 2 - (tile.flipCount * 0.05))}s ease-in-out infinite`
              }}
            >
              <div
                style={{
                  width: `${dotSize}%`,
                  height: `${dotSize}%`,
                  backgroundColor: antipodalColor,
                  borderRadius: '50%',
                  opacity: 0.4,
                  filter: 'blur(2px)'
                }}
              />
            </div>
          );
        })()}

        {showTileDebugInfo && (
          <div className="absolute top-0 left-0 text-[6px] px-0.5 bg-black/50 text-white">{tile.id}</div>
        )}
        {showValue && tile.value}
        {tile.flipCount > 0 && showTileDebugInfo && (
          <div className="absolute bottom-0 right-0 text-[8px] leading-none text-black/50 px-0.5 bg-white/30">
            {tile.flipCount}
          </div>
        )}
      </div>
    );
  };

  const renderFace = (faceNum) => (
    <div className="relative">
      <div
        className="grid gap-1 border-2 border-black bg-black p-1"
        style={{
          width: `${CUBE_PIXEL_SIZE}px`,
          height: `${CUBE_PIXEL_SIZE}px`,
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`
        }}
      >
        {cube[faceNum] && cube[faceNum].map((tile, i) => renderTile(tile, true, faceNum, i))}
      </div>

      <svg
        className="absolute inset-0 pointer-events-none"
        width={CUBE_PIXEL_SIZE}
        height={CUBE_PIXEL_SIZE}
        style={{ opacity: 0.5 }}
      >
        {Array.from({ length: gridSize + 1 }).map((_, i) => {
          const y = (i * CUBE_PIXEL_SIZE) / gridSize;
          return (
            <line
              key={`h-${i}`}
              x1="0"
              y1={y}
              x2={CUBE_PIXEL_SIZE}
              y2={y}
              stroke="rgba(0,0,0,0.8)"
              strokeWidth="2"
            />
          );
        })}
        {Array.from({ length: gridSize + 1 }).map((_, i) => {
          const x = (i * CUBE_PIXEL_SIZE) / gridSize;
          return (
            <line
              key={`v-${i}`}
              x1={x}
              y1="0"
              x2={x}
              y2={CUBE_PIXEL_SIZE}
              stroke="rgba(0,0,0,0.8)"
              strokeWidth="2"
            />
          );
        })}
      </svg>
    </div>
  );

  const render3DCube = () => (
    <div
      className="flex justify-center items-center h-[500px]"
      onMouseDown={(e) => handleMouseDown(e)}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ perspective: '2000px' }}
    >
      <div
        style={{
          width: CUBE_PIXEL_SIZE,
          height: CUBE_PIXEL_SIZE,
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transition: isAnimating ? 'transform 0.05s linear' : isDragging ? 'none' : 'transform 0.6s ease-in-out'
        }}
      >
        <div className="absolute" style={{ transform: `translateZ(${HALF_SIZE}px)` }}>{renderFace(1)}</div>
        <div className="absolute" style={{ transform: `rotateY(180deg) translateZ(${HALF_SIZE}px)` }}>{renderFace(4)}</div>
        <div className="absolute" style={{ transform: `rotateY(-90deg) translateZ(${HALF_SIZE}px)` }}>{renderFace(2)}</div>
        <div className="absolute" style={{ transform: `rotateY(90deg) translateZ(${HALF_SIZE}px)` }}>{renderFace(5)}</div>
        <div className="absolute" style={{ transform: `rotateX(90deg) translateZ(${HALF_SIZE}px)` }}>{renderFace(3)}</div>
        <div className="absolute" style={{ transform: `rotateX(-90deg) translateZ(${HALF_SIZE}px)` }}>{renderFace(6)}</div>
      </div>
    </div>
  );

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 max-w-2xl w-full">
          <div className="text-center mb-6">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500 mb-4">
              WORM³-CUBE
            </h1>
            <div className="relative mb-4">
              <pre className="text-cyan-400 text-xs sm:text-sm leading-tight inline-block font-mono">
{`
      ╔════════════╗
     ╱  MAYO      ╱│
    ╱  MANIFOLD  ╱ │³
   ╱   MACHINE  ╱  │
  ╔════════════╗   │
  ║     M³     ║   ╱
  ╚════════════╝  ╱
`}
              </pre>
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="text-sm text-gray-400 mb-1 font-mono">
              Winding-Orientable-Recursive-Manifold CUBED
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent my-3"></div>
            <div className="text-xs text-cyan-400 mb-2 font-mono">
              Powered by the M³ Engine
              <br />
              <span className="text-gray-500">(Mayo Manifold Machine)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[2, 3, 4, 5, 6].map(size => (
              <button
                key={size}
                onClick={() => startGame(size)}
                className={`p-4 rounded-xl border border-gray-600 hover:border-green-500 hover:bg-gray-700 transition group ${
                  size === 6 ? 'col-span-2 bg-gray-700/50' : 'bg-gray-800'
                }`}
              >
                <div className="text-2xl font-bold text-white mb-1">{size} × {size}</div>
                <div className="text-xs text-gray-400 group-hover:text-green-300">
                  {size === 2 ? 'Junior' : size === 3 ? 'Classic' : size === 6 ? 'Grandmaster' : 'Standard'}
                </div>
              </button>
            ))}
          </div>

          <p className="text-gray-500 text-sm mb-2 text-center">Select dimension. Cube starts solved, then randomizes.</p>
        </div>
      </div>
    );
  }

  if (!cube || Object.keys(cube).length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Initializing cube...</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
      `}</style>
      <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded-xl border border-gray-700">
          <div className="flex items-center gap-4">
            <button onClick={reset} className="text-gray-400 hover:text-white flex items-center gap-2 font-mono text-sm">
              <RefreshCw size={16} /> EXIT
            </button>
            <div className="h-6 w-px bg-gray-600"></div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-widest">Dimension</div>
              <div className="font-bold text-xl leading-none">{gridSize}×{gridSize}×{gridSize}</div>
            </div>
            <div className="h-6 w-px bg-gray-600"></div>
            <div className="text-sm">
              <span className="text-gray-400">Moves:</span> <span className="font-bold">{moves}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Time:</span> <span className="font-bold">{formatTime(elapsedTime)}</span>
            </div>
            <div className="h-6 w-px bg-gray-600"></div>
            <div>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="px-3 py-1 border border-gray-600 rounded bg-gray-700 text-gray-200 text-sm"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-gray-700 rounded-lg p-1 gap-1">
              <button
                onClick={() => setGameMode('classic')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                  gameMode === 'classic' ? 'bg-blue-500 text-white' : 'text-gray-300'
                }`}
                title="Pure color cube - traditional Rubik's"
              >
                Classic
              </button>
              <button
                onClick={() => setGameMode('flipgrid')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                  gameMode === 'flipgrid' ? 'bg-purple-500 text-white' : 'text-gray-300'
                }`}
                title="Colors + Numbers + Flip tracking"
              >
                FlipGrid
              </button>
              <button
                onClick={() => setGameMode('sudokube')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                  gameMode === 'sudokube' ? 'bg-green-500 text-white' : 'text-gray-300'
                }`}
                title="Pure Sudoku logic puzzle"
              >
                sudoWORM
              </button>
            </div>
            <button
              onClick={() => setAffinityMode(!affinityMode)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                affinityMode ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-700 text-gray-300'
              }`}
              title="Show each tile's yearning for home (green glasses)"
            >
              {affinityMode ? '🏠 HOME ON' : '🏠 Home'}
            </button>
            <button
              onClick={() => setFlipMode(!flipMode)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 ${
                flipMode ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-300'
              }`}
            >
              <Zap size={16} /> {flipMode ? 'FLIP ON' : 'Flip'}
            </button>
            <button
              onClick={() => setChaosMode(!chaosMode)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                chaosMode ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {chaosMode ? 'CHAOS ON' : 'Chaos'}
            </button>
            {gameMode === 'flipgrid' && (
              <button
                onClick={() => setShowTileInfo(!showTileInfo)}
                className={`px-3 py-2 rounded-lg font-bold text-sm transition ${
                  showTileInfo ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300'
                }`}
                title="Show/hide tile IDs and flip counts"
              >
                Info
              </button>
            )}
            <button onClick={resetToSolved} className="px-3 py-2 bg-green-600 text-white rounded-lg flex items-center gap-1">
              <RefreshCw size={16} />Solved
            </button>
            <button onClick={() => quickShuffle(gridSize)} className="px-3 py-2 bg-purple-500 text-white rounded-lg flex items-center gap-1">
              <RotateCw size={16} />Shuffle
            </button>
          </div>
        </div>

        {/* Victory Banner - ONLY if shuffled */}
        {victoryTier !== 'INCOMPLETE' && hasShuffled && (
          <div className={`mb-4 p-4 rounded-lg border-2 animate-pulse ${
            victoryTier === 'GRANDMASTER' ? 'bg-gradient-to-r from-yellow-500 to-orange-600 border-yellow-300' :
            victoryTier === 'MATHEMATICIAN' ? 'bg-gradient-to-r from-blue-500 to-cyan-600 border-blue-300' :
            'bg-gradient-to-r from-green-500 to-emerald-600 border-green-300'
          }`}>
            <div className="text-center font-bold text-white text-xl">
              {victoryTier === 'GRANDMASTER' && '🎉 WORM³ MASTERY! 🎉'}
              {victoryTier === 'MATHEMATICIAN' && '🧮 M³ MATHEMATICIAN! 🧮'}
              {victoryTier === 'PURIST' && '🎨 MANIFOLD PURIST! 🎨'}
            </div>
            <div className="text-center text-white text-sm mt-1">
              {victoryTier === 'GRANDMASTER' && 'You have conquered the Mayo Manifold Machine! Perfect topology achieved!'}
              {victoryTier === 'MATHEMATICIAN' && 'All faces are valid Sudoku grids! The M³ Engine recognizes your logic!'}
              {victoryTier === 'PURIST' && 'All faces match their colors! You understand the winding topology!'}
            </div>
            <div className="text-center text-white text-xs mt-2 opacity-90">
              Time: {formatTime(elapsedTime)} | Moves: {moves} | M³ Efficiency: {moves > 0 ? Math.round(1000/moves) : 0}%
            </div>
          </div>
        )}

        {/* Dashboard */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">M³ Chaos Level</div>
            <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
              <div
                className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                  totalFlips > 200 ? 'bg-gradient-to-r from-purple-600 to-pink-500 animate-pulse' :
                  totalFlips > 100 ? 'bg-gradient-to-r from-red-600 to-red-500 animate-pulse' :
                  totalFlips > 75 ? 'bg-gradient-to-r from-red-600 to-orange-500 animate-pulse' :
                  totalFlips > 50 ? 'bg-gradient-to-r from-orange-600 to-orange-500' :
                  totalFlips > 25 ? 'bg-gradient-to-r from-yellow-600 to-yellow-500' :
                  'bg-gradient-to-r from-green-600 to-green-500'
                }`}
                style={{ width: `${Math.min((totalFlips / 300) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-black text-white">{totalFlips}</span>
              <span className="text-xs text-gray-400">flips</span>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Parity Status</div>
            {(() => {
              const allTiles = Object.values(cube).flat();
              const flippedTiles = allTiles.filter(t => t && t.currentManifold !== t.originalManifold);
              const parityCount = flippedTiles.length;
              const totalTiles = allTiles.length;
              const parityPercent = totalTiles > 0 ? Math.round((parityCount / totalTiles) * 100) : 0;
              const isEven = parityCount % 2 === 0;

              return (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full ${isEven ? 'bg-blue-500' : 'bg-purple-500'} animate-pulse`}></div>
                    <span className="text-xl font-black text-white">{isEven ? 'EVEN' : 'ODD'}</span>
                  </div>
                  <div className="text-sm text-gray-300">{parityCount} / {totalTiles} flipped</div>
                  <div className="text-xs text-gray-400">{parityPercent}% displacement</div>
                </>
              );
            })()}
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">
              {autoSolveMode ? 'Auto-Solving' : 'Active Chaos'}
            </div>
            {autoSolveMode ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-green-500 animate-ping"></div>
                  <span className="text-xl font-black text-green-400">HOMING</span>
                </div>
                <div className="text-sm text-gray-300">Following affinity</div>
                <button
                  onClick={() => setAutoSolveMode(false)}
                  className="mt-2 w-full px-2 py-1 bg-red-600 text-white text-xs rounded"
                >
                  Stop Auto-Solve
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  {chaosMode && unstableTiles.size > 0 && (
                    <div className="w-4 h-4 rounded-full bg-red-500 animate-ping"></div>
                  )}
                  <span className="text-2xl font-black text-white">{unstableTiles.size}</span>
                </div>
                <div className="text-sm text-gray-300">Unstable tiles</div>
                {chaosMode ? (
                  <div className={`text-xs mt-1 font-bold ${
                    difficulties[difficulty].spreadChance > 0.5 ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {Math.round(difficulties[difficulty].spreadChance * 100)}% spread rate
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-gray-500 mt-1">Chaos disabled</div>
                    {affinityMode && (
                      <button
                        onClick={() => setAutoSolveMode(true)}
                        className="mt-2 w-full px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Auto-Solve (Home)
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Game View */}
        <div className="relative">
          {render3DCube()}

          <div className="absolute top-0 right-0 w-64 p-4 space-y-2 pointer-events-none">
            <div className="bg-black/80 rounded-lg p-3 border border-gray-700">
              <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Face Status</div>
              {Object.keys(cube).map(faceNum => {
                const faceTiles = cube[faceNum];
                if (!faceTiles) return null;
                const flippedInFace = faceTiles.filter(t => t.currentManifold !== t.originalManifold).length;
                const avgFlips = faceTiles.reduce((sum, t) => sum + t.flipCount, 0) / faceTiles.length;
                const faceColor = colors[parseInt(faceNum)];

                return (
                  <div key={faceNum} className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-sm border border-white/30"
                      style={{ backgroundColor: faceColor.bg }}
                    ></div>
                    <span className="text-xs text-gray-300 flex-1">{faceColor.name}</span>
                    <span className="text-xs text-yellow-400">{flippedInFace}</span>
                    <span className="text-xs text-gray-500">~{avgFlips.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>

            {(() => {
              const allTiles = Object.values(cube).flat();
              const totalDisplacement = allTiles.filter(t => t && t.currentManifold !== t.originalManifold).length;
              const maxDisplacement = allTiles.length;
              const entropy = maxDisplacement > 0 ? (totalDisplacement / maxDisplacement) : 0;

              return (
                <div className="bg-black/80 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">System Entropy</div>
                  <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                      style={{ width: `${entropy * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                    {(entropy * 100).toFixed(1)}%
                  </div>
                </div>
              );
            })()}

            <div className="bg-black/80 rounded-lg p-3 border border-gray-700">
              <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Snakeholes</div>
              <div className="text-2xl font-black text-orange-400">{totalFlips * 2}</div>
              <div className="text-xs text-gray-400">Antipodal wormholes active</div>
              <div className="text-lg mt-1">🐍🕳️</div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 p-4 text-xs text-gray-500 font-mono pointer-events-none">
            {gameMode === 'sudokube' && (
              <>GOAL: Navigate snakeholes to create unique rows/cols (0-{gridSize - 1}). Pure logic mode.</>
            )}
            {gameMode === 'flipgrid' && (
              <>GOAL: Master the M³ - restore topology OR solve logic. Full data wormhole mode.</>
            )}
            {gameMode === 'classic' && (
              <>GOAL: Restore winding manifold - match colors to faces. Traditional WORM³ navigation.</>
            )}
            <br />
            {flipMode ? 'CLICK TILE TO TRAVERSE SNAKEHOLE (FLIP)' : 'DRAG TILES TO ROTATE MANIFOLD SLICES'}
            {chaosMode && <><br /><span className="text-red-400">CHAOS MODE: Snakeholes are unstable!</span></>}
            <br />
            <span className="text-yellow-400">Yellow</span> = Selected | <span className="text-orange-400">Orange (pulse)</span> = Antipodal Snakehole | {chaosMode && <><span className="text-red-400">Red (pulse)</span> = Unstable</>}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default WORM3Cube;
