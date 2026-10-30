import test from 'node:test';
import assert from 'node:assert/strict';

import monopoly, { MONOPOLY_TOKENS } from '../src/monopoly/index.js';
import { BOARD } from '../src/monopoly/data.js';
import {
  START_CASH,
  rentDue,
  canBuild,
  build,
  sellBuilding,
  mortgageValue,
  unmortgageCost,
  netWorth
} from '../src/monopoly/rules.js';

import tombola from '../src/boardgames/tombola.js';
import bingo from '../src/boardgames/bingo.js';
import ouija from '../src/boardgames/ouija.js';
import forza4 from '../src/boardgames/forza4.js';

import affari from '../src/games/affari.js';
import avanti from '../src/games/avanti.js';
import caduta from '../src/games/caduta.js';
import catena from '../src/games/catena.js';
import cultura from '../src/games/cultura.js';
import eredita from '../src/games/eredita.js';
import fight from '../src/games/fight.js';
import hit from '../src/games/hit.js';
import math from '../src/games/math.js';

const ALL_GAMES = [
  monopoly, tombola, bingo, ouija, forza4,
  affari, avanti, caduta, catena, cultura, eredita, fight, hit, math
];

test('All 14 games (9 TV Shows + 5 3D Boardgames) have complete rules, guide HTML, and start()', () => {
  assert.equal(ALL_GAMES.length, 14);
  for (const g of ALL_GAMES) {
    assert.ok(g.id, `Game missing id`);
    assert.ok(g.name, `Game ${g.id} missing name`);
    assert.ok(Array.isArray(g.rules) && g.rules.length >= 3, `Game ${g.id} must have at least 3 rules`);
    assert.equal(typeof g.guide, 'string', `Game ${g.id} must have a guide string`);
    assert.ok(g.guide.length > 80, `Game ${g.id} guide must be detailed`);
    assert.equal(typeof g.start, 'function', `Game ${g.id} must export start(ctx)`);
  }
});

test('Monopoly 3D defines all 8 classic 3D tokens with icon and label', () => {
  assert.ok(Array.isArray(MONOPOLY_TOKENS));
  assert.equal(MONOPOLY_TOKENS.length, 8);
  const ids = MONOPOLY_TOKENS.map(t => t.id);
  assert.deepEqual(ids, ['tophat', 'car', 'dog', 'ship', 'thimble', 'boot', 'wheelbarrow', 'iron']);
  for (const t of MONOPOLY_TOKENS) {
    assert.ok(t.label && t.icon, `Token ${t.id} must have label and icon`);
  }
});

test('Monopoly 3D rules engine supports 40 spaces, building 3D houses/hotels, and netWorth', () => {
  assert.equal(BOARD.length, 40);
  assert.equal(START_CASH, 1500);
  const s = {
    owners: Array(40).fill(null),
    houses: Array(40).fill(0),
    mortgages: new Set(),
    bank: { houses: 32, hotels: 12 },
    players: [{ cash: START_CASH }, { cash: START_CASH }],
    current: 0
  };
  s.owners[1] = 0;
  s.owners[3] = 0;

  assert.equal(canBuild(s, 1), true);
  assert.equal(build(s, 1), true);
  assert.equal(s.houses[1], 1);

  s.current = 1;
  assert.equal(rentDue(s, 1, 7), 10);

  s.current = 0;
  assert.equal(sellBuilding(s, 1), 25);
  assert.equal(s.houses[1], 0);

  assert.equal(mortgageValue(1), 30);
  assert.equal(unmortgageCost(1), 33);
  assert.ok(netWorth(s, 0) > 1500);
});
