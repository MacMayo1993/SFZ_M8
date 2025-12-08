# WORM³ - Topological Puzzle Game

A React-based 3D puzzle game where antipodal pairs on a cube are quantum-entangled. When you flip a tile, its opposite partner flips too, creating a challenging topological puzzle.

## What Makes This Different?

Unlike a standard Rubik's Cube, WORM³ has a unique **flip mechanic**: each tile is entangled with its antipodal (opposite) partner on the cube. Flip one, and the other flips too. This creates a fascinating constraint that makes solving the puzzle require both spatial reasoning and understanding of symmetry.

## Features

- **Multiple Cube Sizes**: Play with 2×2, 3×3, 4×4, or 5×5 cubes
- **Dual Mechanics**:
  - Standard slice rotations (like Rubik's Cube)
  - Antipodal flip mode (unique to WORM³)
- **Full 3D Interaction**: Rotate the view by dragging
- **Timer & Statistics**: Track your solving time, moves, and puzzle entropy
- **Neo-Brutalist Design**: Bold, geometric UI inspired by modern design trends

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The app will open at `http://localhost:3000`

## How to Play

### Basic Controls

1. **Select a Tile**: Click any tile on the cube to select it
2. **Move Slices**: Use the arrow buttons (↑↓←→) to rotate slices
3. **Rotate Faces**: Use the circular buttons (↺↻) to rotate entire faces
4. **Flip Mode**: Toggle flip mode to activate the entanglement mechanic
5. **Rotate View**: Click and drag the background to rotate your view

### Game Modes

#### Standard Mode (Default)
- Select a tile and use arrows to move slices
- Just like a Rubik's Cube
- Great for learning the basic mechanics

#### Flip Mode
- Click any tile to flip it (and its antipodal partner)
- Creates wormhole markers on affected tiles
- Essential for certain solving strategies

### Solving Strategy

1. **Start with corners**: They're easier to track
2. **Use flip mode strategically**: Flips affect two faces at once
3. **Watch the entropy meter**: Shows how scrambled the cube is
4. **Combine moves**: Use both rotations and flips together

## Project Structure

```
src/
├── components/
│   ├── WORM3.jsx           # Main game component
│   ├── Menu.jsx            # Start menu
│   └── VictoryScreen.jsx   # Win screen
├── constants/
│   └── cube.js             # Game constants (colors, faces, transforms)
├── utils/
│   ├── cube.js             # Utility functions (init, clone, calculations)
│   └── cubeLogic.js        # Core game logic (moves, rotations)
├── App.jsx                 # Root component
├── main.jsx                # React entry point
└── index.css               # Global styles
```

## Code Organization

### Constants (`src/constants/cube.js`)
- **COLORS**: UI color scheme
- **FACES**: Cube face configuration (colors, opposites)
- **ANTIPODAL_COLOR**: Mapping for flip mechanic
- **FACE_TRANSFORMS**: 3D CSS transforms for cube layout

### Utilities (`src/utils/cube.js`)
- `initCube()`: Create a solved cube
- `cloneCube()`: Efficient deep cloning
- `formatTime()`: Timer display formatting
- `isCubeSolved()`: Win condition checker
- `calculateEntropy()`: Puzzle complexity metric

### Game Logic (`src/utils/cubeLogic.js`)
- `applyMove()`: Execute slice rotations
- `rotateFace()`: Rotate entire faces
- `shuffleCube()`: Generate solvable scrambles

## Technical Details

### State Management
The game uses React hooks for state management:
- `useState` for game state, cube data, UI state
- `useRef` for drag interactions and timer
- `useCallback` for performance optimization
- `useEffect` for timer updates and win detection

### 3D Rendering
Uses CSS 3D transforms with:
- `perspective` for 3D depth
- `transform-style: preserve-3d` for nesting
- `rotateX/Y` for cube orientation
- `translateZ` for face positioning

### Performance Optimizations
- Efficient cube cloning (structured clone vs JSON)
- Memoized callbacks to prevent re-renders
- Modular code splitting for better tree-shaking
- Minimal re-renders with careful state updates

## Customization

### Changing Colors
Edit `src/constants/cube.js`:
```javascript
export const COLORS = {
  bg: '#FFFDF5',        // Background
  accent: '#FF6B6B',    // Primary action color
  secondary: '#FFD93D', // Secondary elements
  // ...
};
```

### Adjusting Difficulty
Edit `src/constants/cube.js`:
```javascript
// More moves = harder scramble
export const SHUFFLE_MULTIPLIER = 15; // Default: 15
```

### Cube Face Colors
Edit `src/constants/cube.js`:
```javascript
export const FACES = {
  1: { color: '#FF6B6B', opp: 4, name: 'RED' },
  // Change colors here
};
```

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (requires -webkit- prefixes for some transforms)
- Mobile: ⚠️ Works but touch controls could be improved

## Performance Notes

- Recommended for desktop browsers
- 60 FPS on modern hardware
- May lag on cube sizes > 5×5
- 3D transforms are GPU-accelerated

## Future Enhancements

- [ ] Keyboard shortcuts
- [ ] Touch/mobile optimizations
- [ ] Solve algorithms visualization
- [ ] Multiplayer mode
- [ ] Custom color themes
- [ ] Save/load puzzle states
- [ ] Undo/redo functionality
- [ ] Hints system

## Contributing

This is part of the SFZ-M8 project. For contributions:
1. Keep the neo-brutalist design language
2. Maintain code modularity (constants, utils, components)
3. Add JSDoc comments for new functions
4. Test on multiple cube sizes

## Credits

**Design Philosophy**: Neo-brutalism meets topology
**Inspired By**: Rubik's Cube, quantum entanglement, and manifold theory
**Built With**: React, Vite, Tailwind CSS

## License

Apache 2.0 - See LICENSE file for details

---

**No hype. No hallucinations. Just geometry.**
