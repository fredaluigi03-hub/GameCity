import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCartella, evaluateCard, checkNextPrize } from '../src/boardgames/tombola-rules.js';

test('tombola card has 3 rows of 9 columns with exactly 15 numbers (5 per row)', () => {
  const card = generateCartella(1);
  assert.equal(card.grid.length, 3);
  let total = 0;
  for (const row of card.grid) {
    assert.equal(row.length, 9);
    const count = row.filter(n => n > 0).length;
    assert.equal(count, 5);
    total += count;
  }
  assert.equal(total, 15);
});

test('tombola evaluateCard detects ambo, terno, quaterna, cinquina, and tombola', () => {
  const card = {
    id: 1,
    grid: [
      [1, 0, 21, 0, 42, 0, 63, 0, 81],
      [0, 11, 0, 31, 0, 52, 0, 72, 90],
      [2, 0, 22, 0, 43, 0, 64, 0, 82]
    ]
  };

  // ambo on first row
  let drawn = new Set([1, 21]);
  let ev = evaluateCard(card, drawn);
  assert.equal(ev.hasAmbo, true);
  assert.equal(ev.hasTerno, false);

  // terno on first row
  drawn = new Set([1, 21, 42]);
  ev = evaluateCard(card, drawn);
  assert.equal(ev.hasTerno, true);
  assert.equal(ev.hasQuaterna, false);

  // quaterna
  drawn = new Set([1, 21, 42, 63]);
  ev = evaluateCard(card, drawn);
  assert.equal(ev.hasQuaterna, true);
  assert.equal(ev.hasCinquina, false);

  // cinquina
  drawn = new Set([1, 21, 42, 63, 81]);
  ev = evaluateCard(card, drawn);
  assert.equal(ev.hasCinquina, true);
  assert.equal(ev.hasTombola, false);

  // tombola (all 15 numbers)
  const allNums = card.grid.flat().filter(n => n > 0);
  ev = evaluateCard(card, new Set(allNums));
  assert.equal(ev.hasTombola, true);
});

test('tombola checkNextPrize follows strict progression', () => {
  const card = {
    id: 1,
    grid: [
      [1, 0, 21, 0, 42, 0, 63, 0, 81],
      [0, 11, 0, 31, 0, 52, 0, 72, 90],
      [2, 0, 22, 0, 43, 0, 64, 0, 82]
    ]
  };
  const claimed = new Set();
  const drawn = new Set([1, 21, 42, 63, 81]); // has cinquina

  // If ambo is not yet claimed, it awards ambo first
  let prize = checkNextPrize(claimed, card, drawn);
  assert.equal(prize?.id, 'ambo');

  claimed.add('ambo');
  prize = checkNextPrize(claimed, card, drawn);
  assert.equal(prize?.id, 'terno');

  claimed.add('terno');
  prize = checkNextPrize(claimed, card, drawn);
  assert.equal(prize?.id, 'quaterna');

  claimed.add('quaterna');
  prize = checkNextPrize(claimed, card, drawn);
  assert.equal(prize?.id, 'cinquina');
});
