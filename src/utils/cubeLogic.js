/**
 * WORM³ Cube Movement Logic
 *
 * This file contains all the logic for cube movements, rotations, and transformations.
 * The cube uses a standard Rubik's cube face numbering:
 * 1 = Front (Red), 2 = Left (Green), 3 = Top (White)
 * 4 = Back (Orange), 5 = Right (Blue), 6 = Bottom (Yellow)
 */

import { getSlice, setSlice, rotateFaceArray } from './cube.js';

/**
 * Apply a slice move to the cube (row, column, or depth rotation)
 * @param {Object} cube - The cube object
 * @param {number} size - Cube size
 * @param {string} axis - 'row', 'col', or 'depth'
 * @param {number} dir - Direction: 1 for clockwise, -1 for counter-clockwise
 * @param {Object} sel - Selected position {row, col}
 * @returns {Object} Updated cube
 */
export const applyMove = (cube, size, axis, dir, sel) => {
  const clockwise = dir === 1;
  const { row, col } = sel;

  // Helper to get/set slices using imported functions
  const get = (f, t, i) => getSlice(cube, f, t, i, size);
  const set = (f, t, i, d) => setSlice(cube, f, t, i, d, size);
  const rotFace = (arr, cw) => rotateFaceArray(arr, cw, size);

  if (axis === 'row') {
    // Rotate a horizontal ring around the cube
    // Order: Front (1) → Right (5) → Back (4) → Left (2) → Front (1)
    const f1 = get(1, 'r', row);
    const f5 = get(5, 'r', row);
    const f4 = get(4, 'r', row);
    const f2 = get(2, 'r', row);

    if (clockwise) {
      set(1, 'r', row, f2);
      set(5, 'r', row, f1);
      set(4, 'r', row, f5);
      set(2, 'r', row, f4);
    } else {
      set(1, 'r', row, f5);
      set(5, 'r', row, f4);
      set(4, 'r', row, f2);
      set(2, 'r', row, f1);
    }

    // Rotate end faces if moving top or bottom row
    if (row === 0) {
      set(3, 'f', 0, rotFace(cube[3], clockwise));
    }
    if (row === size - 1) {
      set(6, 'f', 0, rotFace(cube[6], !clockwise));
    }
  }

  if (axis === 'col') {
    // Rotate a vertical ring (front to back)
    // Order: Front (1) → Top (3) → Back (4) → Bottom (6) → Front (1)
    const f1 = get(1, 'c', col);
    const f3 = get(3, 'c', col);
    const f4 = get(4, 'c', size - 1 - col);
    const f6 = get(6, 'c', col);

    if (clockwise) {
      set(1, 'c', col, f3);
      set(3, 'c', col, [...f4].reverse());
      set(4, 'c', size - 1 - col, [...f6].reverse());
      set(6, 'c', col, f1);
    } else {
      set(1, 'c', col, f6);
      set(3, 'c', col, f1);
      set(4, 'c', size - 1 - col, [...f3].reverse());
      set(6, 'c', col, [...f4].reverse());
    }

    // Rotate side faces if moving left or right column
    if (col === 0) {
      set(2, 'f', 0, rotFace(cube[2], !clockwise));
    }
    if (col === size - 1) {
      set(5, 'f', 0, rotFace(cube[5], clockwise));
    }
  }

  if (axis === 'depth') {
    // Rotate a ring going through left and right sides
    // Order: Top (3) → Right (5) → Bottom (6) → Left (2) → Top (3)
    const d = col;
    const invD = size - 1 - d;

    const top = get(3, 'r', invD);
    const right = get(5, 'c', d);
    const bot = get(6, 'r', d);
    const left = get(2, 'c', invD);

    if (clockwise) {
      set(5, 'c', d, top);
      set(6, 'r', d, [...right].reverse());
      set(2, 'c', invD, bot);
      set(3, 'r', invD, [...left].reverse());
    } else {
      set(2, 'c', invD, [...top].reverse());
      set(6, 'r', d, left);
      set(5, 'c', d, [...bot].reverse());
      set(3, 'r', invD, right);
    }

    // Rotate front or back face if moving front or back depth slice
    if (d === 0) {
      set(1, 'f', 0, rotFace(cube[1], clockwise));
    }
    if (d === size - 1) {
      set(4, 'f', 0, rotFace(cube[4], !clockwise));
    }
  }

  return cube;
};

/**
 * Rotate an entire face of the cube
 * @param {Object} cube - The cube object
 * @param {number} size - Cube size
 * @param {number} faceNum - Face number (1-6)
 * @param {boolean} clockwise - Rotation direction
 * @returns {Object} Updated cube
 */
export const rotateFace = (cube, size, faceNum, clockwise) => {
  const get = (f, t, i) => getSlice(cube, f, t, i, size);
  const set = (f, t, i, d) => setSlice(cube, f, t, i, d, size);
  const rotFaceArr = (arr, cw) => rotateFaceArray(arr, cw, size);

  // Rotate the face itself
  cube[faceNum] = rotFaceArr(cube[faceNum], clockwise);

  const cw = clockwise;

  // Rotate adjacent edges based on which face is being rotated
  if (faceNum === 1) {
    // Front face
    const top = get(3, 'r', size - 1);
    const right = get(5, 'c', 0);
    const bot = get(6, 'r', 0);
    const left = get(2, 'c', size - 1);

    if (cw) {
      set(5, 'c', 0, top);
      set(6, 'r', 0, [...right].reverse());
      set(2, 'c', size - 1, bot);
      set(3, 'r', size - 1, [...left].reverse());
    } else {
      set(2, 'c', size - 1, [...top].reverse());
      set(6, 'r', 0, left);
      set(5, 'c', 0, [...bot].reverse());
      set(3, 'r', size - 1, right);
    }
  } else if (faceNum === 4) {
    // Back face
    const top = get(3, 'r', 0);
    const left = get(5, 'c', size - 1);
    const bot = get(6, 'r', size - 1);
    const right = get(2, 'c', 0);

    if (cw) {
      set(2, 'c', 0, top);
      set(6, 'r', size - 1, [...right].reverse());
      set(5, 'c', size - 1, bot);
      set(3, 'r', 0, [...left].reverse());
    } else {
      set(5, 'c', size - 1, [...top].reverse());
      set(6, 'r', size - 1, left);
      set(2, 'c', 0, [...bot].reverse());
      set(3, 'r', 0, right);
    }
  } else if (faceNum === 2) {
    // Left face
    const top = get(3, 'c', 0);
    const front = get(1, 'c', 0);
    const bot = get(6, 'c', 0);
    const back = get(4, 'c', size - 1);

    if (cw) {
      set(1, 'c', 0, top);
      set(6, 'c', 0, front);
      set(4, 'c', size - 1, [...bot].reverse());
      set(3, 'c', 0, [...back].reverse());
    } else {
      set(3, 'c', 0, front);
      set(1, 'c', 0, bot);
      set(6, 'c', 0, [...back].reverse());
      set(4, 'c', size - 1, [...top].reverse());
    }
  } else if (faceNum === 5) {
    // Right face
    const top = get(3, 'c', size - 1);
    const back = get(4, 'c', 0);
    const bot = get(6, 'c', size - 1);
    const front = get(1, 'c', size - 1);

    if (cw) {
      set(4, 'c', 0, [...top].reverse());
      set(6, 'c', size - 1, [...back].reverse());
      set(1, 'c', size - 1, bot);
      set(3, 'c', size - 1, front);
    } else {
      set(1, 'c', size - 1, top);
      set(3, 'c', size - 1, [...back].reverse());
      set(4, 'c', 0, [...bot].reverse());
      set(6, 'c', size - 1, front);
    }
  } else if (faceNum === 3) {
    // Top face
    const back = get(4, 'r', 0);
    const right = get(5, 'r', 0);
    const front = get(1, 'r', 0);
    const left = get(2, 'r', 0);

    if (cw) {
      set(5, 'r', 0, back);
      set(1, 'r', 0, right);
      set(2, 'r', 0, front);
      set(4, 'r', 0, left);
    } else {
      set(2, 'r', 0, back);
      set(1, 'r', 0, left);
      set(5, 'r', 0, front);
      set(4, 'r', 0, right);
    }
  } else if (faceNum === 6) {
    // Bottom face
    const front = get(1, 'r', size - 1);
    const right = get(5, 'r', size - 1);
    const back = get(4, 'r', size - 1);
    const left = get(2, 'r', size - 1);

    if (cw) {
      set(5, 'r', size - 1, front);
      set(4, 'r', size - 1, right);
      set(2, 'r', size - 1, back);
      set(1, 'r', size - 1, left);
    } else {
      set(2, 'r', size - 1, front);
      set(4, 'r', size - 1, left);
      set(5, 'r', size - 1, back);
      set(1, 'r', size - 1, right);
    }
  }

  return cube;
};

/**
 * Shuffle the cube with random moves
 * @param {Object} cube - Initial cube (solved state)
 * @param {number} size - Cube size
 * @param {number} numMoves - Number of random moves to apply
 * @returns {Object} Shuffled cube
 */
export const shuffleCube = (cube, size, numMoves) => {
  let shuffled = cube;
  const sel = { row: 0, col: 0 };

  for (let i = 0; i < numMoves; i++) {
    // Pick random axis
    const axes = ['row', 'col', 'depth'];
    const axis = axes[Math.floor(Math.random() * 3)];

    // Pick random direction
    const dir = Math.random() > 0.5 ? 1 : -1;

    // Pick random slice
    const slice = Math.floor(Math.random() * size);
    sel.row = slice;
    sel.col = slice;

    shuffled = applyMove(shuffled, size, axis, dir, sel);
  }

  return shuffled;
};
