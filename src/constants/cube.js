/**
 * WORM³ Puzzle Constants
 *
 * This file contains all the constants used in the WORM³ puzzle game,
 * including colors, face configurations, and cube transformations.
 */

// Color scheme for the UI
export const COLORS = {
  bg: '#FFFDF5',
  black: '#000000',
  accent: '#FF6B6B',
  secondary: '#FFD93D',
  muted: '#C4B5FD',
  white: '#FFFFFF'
};

// Face configuration for the cube
// Each face has a color, its opposite face number, and a name
export const FACES = {
  1: { color: '#FF6B6B', opp: 4, name: 'RED' },      // Front
  2: { color: '#22c55e', opp: 5, name: 'GREEN' },    // Left
  3: { color: '#FFFFFF', opp: 6, name: 'WHITE' },    // Top
  4: { color: '#f97316', opp: 1, name: 'ORANGE' },   // Back
  5: { color: '#3b82f6', opp: 2, name: 'BLUE' },     // Right
  6: { color: '#FFD93D', opp: 3, name: 'YELLOW' }    // Bottom
};

// Antipodal color mapping for the flip mechanic
// When a tile is flipped, it changes to its antipodal color
export const ANTIPODAL_COLOR = {
  1: 4,
  4: 1,
  2: 5,
  5: 2,
  3: 6,
  6: 3
};

// 3D CSS transforms for positioning each face of the cube
// These transforms create the 3D cube layout
export const FACE_TRANSFORMS = {
  1: 'translateZ(140px)',                      // Front
  2: 'rotateY(-90deg) translateZ(140px)',      // Left
  3: 'rotateX(90deg) translateZ(140px)',       // Top
  4: 'rotateY(180deg) translateZ(140px)',      // Back
  5: 'rotateY(90deg) translateZ(140px)',       // Right
  6: 'rotateX(-90deg) translateZ(140px)'       // Bottom
};

// Shuffle complexity multiplier
// Controls how many moves are made during shuffle (size * SHUFFLE_MULTIPLIER)
export const SHUFFLE_MULTIPLIER = 15;

// Cube 3D settings
export const CUBE_SIZE_PX = 280;
export const CUBE_PERSPECTIVE = 1200;

// Rotation sensitivity for mouse drag
export const ROTATION_SENSITIVITY = 0.5;

// Timer update interval in milliseconds
export const TIMER_UPDATE_INTERVAL = 100;
