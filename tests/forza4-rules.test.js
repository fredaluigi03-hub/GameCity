import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyBoard, dropDisc, validColumns, hasFour, winningMove} from '../src/boardgames/forza4-rules.js';

test('discs fall to the lowest free space and full columns reject moves', () => {
  const board = emptyBoard();
  assert.equal(dropDisc(board, 3, 1), 5);
  assert.equal(dropDisc(board, 3, 2), 4);
  for (let i = 0; i < 4; i++) dropDisc(board, 0, 1);
  assert.equal(dropDisc(board, 0, 2), 1);
  assert.equal(dropDisc(board, 0, 2), 0);
  assert.equal(dropDisc(board, 0, 1), -1);
  assert.equal(validColumns(board).includes(0), false);
});

test('four in a row detects horizontal, vertical, and diagonal wins', () => {
  const horizontal = emptyBoard();
  [0, 1, 2, 3].forEach(col => dropDisc(horizontal, col, 1));
  assert.equal(hasFour(horizontal, 5, 2, 1), true);

  const vertical = emptyBoard();
  for (let i = 0; i < 4; i++) dropDisc(vertical, 4, 2);
  assert.equal(hasFour(vertical, 2, 4, 2), true);

  const diagonal = emptyBoard();
  diagonal[5][0] = 1;
  diagonal[4][1] = 1; diagonal[5][1] = 2;
  diagonal[3][2] = 1; diagonal[4][2] = 2; diagonal[5][2] = 2;
  diagonal[2][3] = 1;
  assert.equal(hasFour(diagonal, 2, 3, 1), true);
});

test('winning move simulation restores the board', () => {
  const board = emptyBoard();
  [1, 2, 3].forEach(col => dropDisc(board, col, 1));
  const before = board.map(row => [...row]);
  assert.equal(winningMove(board, 4, 1), true);
  assert.deepEqual(board, before);
});
