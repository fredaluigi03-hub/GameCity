import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCartella,
  generateUniqueCartella,
  getCardFingerprint,
  evaluateCard,
  checkNextPrize,
  checkNextPrizeForCartelle,
  createPrizeTiers,
  CARTELLA_THEMES
} from '../src/boardgames/tombola-rules.js';

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

test('generateUniqueCartella guarantees uniqueness across multiple players and cards', () => {
  const used = new Set();
  const cards = [];
  for (let i = 1; i <= 24; i++) {
    const card = generateUniqueCartella(i, used, CARTELLA_THEMES[i % CARTELLA_THEMES.length].color);
    cards.push(card);
  }
  assert.equal(cards.length, 24);
  assert.equal(used.size, 24, 'All 24 generated cards must have strictly unique fingerprints');

  // Verify that all 24 cards have different fingerprints
  const fps = cards.map(getCardFingerprint);
  const uniqueFps = new Set(fps);
  assert.equal(uniqueFps.size, 24, 'Every card must be unique with no collisions between players');
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

test('checkNextPrizeForCartelle evaluates multiple cards per player correctly', () => {
  const card1 = {
    id: 1,
    grid: [
      [1, 0, 21, 0, 42, 0, 63, 0, 81],
      [0, 11, 0, 31, 0, 52, 0, 72, 90],
      [2, 0, 22, 0, 43, 0, 64, 0, 82]
    ]
  };
  const card2 = {
    id: 2,
    grid: [
      [5, 0, 25, 0, 45, 0, 65, 0, 85],
      [0, 15, 0, 35, 0, 55, 0, 75, 89],
      [6, 0, 26, 0, 46, 0, 66, 0, 86]
    ]
  };

  const claimed = new Set();
  const drawn = new Set([5, 25]); // ambo on card 2

  const res = checkNextPrizeForCartelle(claimed, [card1, card2], drawn);
  assert.ok(res);
  assert.equal(res.tier.id, 'ambo');
  assert.equal(res.card.id, 2);
});

test('createPrizeTiers allows custom user prizes and amounts', () => {
  const custom = createPrizeTiers({
    amboDesc: 'Cesto di Natale piccolo',
    amboPoints: 10,
    tombolaDesc: 'Super Premio 100 €',
    tombolaPoints: 100,
    hasTombolino: true,
    tombolinoDesc: 'Tombolino di consolazione 50 €',
    tombolinoPoints: 50
  });

  assert.equal(custom.length, 6);
  assert.equal(custom[0].label, 'Cesto di Natale piccolo');
  assert.equal(custom[0].points, 10);
  assert.equal(custom[4].label, 'Super Premio 100 €');
  assert.equal(custom[5].id, 'tombolino');
  assert.equal(custom[5].label, 'Tombolino di consolazione 50 €');
});
