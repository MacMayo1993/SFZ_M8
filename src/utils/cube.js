/**
 * WORM³ Puzzle Utility Functions
 *
 * This file contains utility functions for cube initialization,
 * time formatting, and other helper functions.
 */

import { ANTIPODAL_COLOR } from '../constants/cube.js';

/**
 * Initialize a cube with the given size
 * @param {number} size - The size of the cube (e.g., 3 for a 3x3 cube)
 * @returns {Object} A cube object with 6 faces
 */
export const initCube = (size) => {
  const cube = {};
  for (let f = 1; f <= 6; f++) {
    cube[f] = Array.from({ length: size * size }, (_, i) => {
      const row = Math.floor(i / size);
      const col = i % size;
      return {
        id: `${f}-${i}`,
        curr: f,
        orig: f,
        val: ((row + col) % size) + 1,
        flips: 0
      };
    });
  }
  return cube;
};

/**
 * Format time in milliseconds to MM:SS format
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
export const formatTime = (ms) => {
  const s = Math.floor((ms / 1000) % 60);
  const m = Math.floor(ms / 60000);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/**
 * Deep clone a cube using structured cloning
 * More efficient than JSON.parse(JSON.stringify())
 * @param {Object} cube - The cube to clone
 * @returns {Object} Cloned cube
 */
export const cloneCube = (cube) => {
  const cloned = {};
  for (let f = 1; f <= 6; f++) {
    if (cube[f]) {
      cloned[f] = cube[f].map(tile => ({ ...tile }));
    }
  }
  return cloned;
};

/**
 * Apply flip to a tile and its antipodal pair
 * @param {Object} cube - The cube object
 * @param {number} faceNum - Face number (1-6)
 * @param {number} idx - Tile index on the face
 * @returns {Object} Updated cube
 */
export const applyFlip = (cube, faceNum, idx) => {
  const oppFace = [null, 4, 5, 6, 1, 2, 3][faceNum]; // Opposite face mapping

  // Flip current face tile
  cube[faceNum][idx].curr = ANTIPODAL_COLOR[cube[faceNum][idx].curr];
  cube[faceNum][idx].flips++;

  // Flip opposite face tile
  cube[oppFace][idx].curr = ANTIPODAL_COLOR[cube[oppFace][idx].curr];
  cube[oppFace][idx].flips++;

  return cube;
};

/**
 * Check if the cube is solved
 * @param {Object} cube - The cube object
 * @returns {boolean} True if solved
 */
export const isCubeSolved = (cube) => {
  for (let f = 1; f <= 6; f++) {
    if (!cube[f]?.every(tile => tile.curr === f)) {
      return false;
    }
  }
  return true;
};

/**
 * Calculate entropy (percentage of tiles not in original position)
 * @param {Array} allTiles - Array of all tiles
 * @param {number} totalTiles - Total number of tiles
 * @returns {number} Entropy percentage (0-100)
 */
export const calculateEntropy = (allTiles, totalTiles) => {
  const displacedTiles = allTiles.filter(t => t?.curr !== t?.orig).length;
  return Math.round((displacedTiles / totalTiles) * 100);
};

/**
 * Get slice of tiles from a face
 * @param {Object} cube - The cube object
 * @param {number} face - Face number
 * @param {string} type - 'r' (row), 'c' (column), or 'f' (full face)
 * @param {number} index - Row/column index
 * @param {number} size - Cube size
 * @returns {Array} Slice of tiles
 */
export const getSlice = (cube, face, type, index, size) => {
  const arr = cube[face];
  if (type === 'r') {
    // Get row
    return arr.slice(index * size, index * size + size);
  }
  if (type === 'c') {
    // Get column
    return Array.from({ length: size }, (_, x) => arr[x * size + index]);
  }
  // Get full face
  return arr;
};

/**
 * Set slice of tiles on a face
 * @param {Object} cube - The cube object
 * @param {number} face - Face number
 * @param {string} type - 'r' (row), 'c' (column), or 'f' (full face)
 * @param {number} index - Row/column index
 * @param {Array} data - Tiles to set
 * @param {number} size - Cube size
 */
export const setSlice = (cube, face, type, index, data, size) => {
  if (type === 'r') {
    // Set row
    for (let k = 0; k < size; k++) {
      cube[face][index * size + k] = data[k];
    }
  } else if (type === 'c') {
    // Set column
    for (let k = 0; k < size; k++) {
      cube[face][k * size + index] = data[k];
    }
  } else if (type === 'f') {
    // Set full face
    cube[face] = data;
  }
};

/**
 * Rotate a face array 90 degrees
 * @param {Array} arr - Face array
 * @param {boolean} clockwise - Rotation direction
 * @param {number} size - Cube size
 * @returns {Array} Rotated face array
 */
export const rotateFaceArray = (arr, clockwise, size) => {
  const n = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    const row = Math.floor(i / size);
    const col = i % size;
    const newRow = clockwise ? col : size - 1 - col;
    const newCol = clockwise ? size - 1 - row : row;
    n[newRow * size + newCol] = arr[i];
  }
  return n;
};

/**
 * Normalize angle to 0-360 range
 * @param {number} angle - Angle in degrees
 * @returns {number} Normalized angle
 */
export const normalizeAngle = (angle) => {
  return ((angle % 360) + 360) % 360;
};
