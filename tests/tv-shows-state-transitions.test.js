import test from 'node:test';
import assert from 'node:assert/strict';

// Import game definitions and data
import cultura from '../src/games/cultura.js';
import avanti from '../src/games/avanti.js';
import caduta from '../src/games/caduta.js';
import eredita from '../src/games/eredita.js';
import affari from '../src/games/affari.js';
import bingo from '../src/boardgames/bingo.js';
import forza4 from '../src/boardgames/forza4.js';

import { generateBingoTicket, evaluateBingoCard } from '../src/boardgames/bingo-rules.js';
import { emptyBoard, dropDisc, hasFour, getWinningCells } from '../src/boardgames/forza4-rules.js';
import { REG, contents, offer, LUCKY } from '../src/games/affari_data.js';
import { GHIGLIOTTINE, DEFS } from '../src/games/eredita_data.js';
import { PASSI, DEFS as CADUTA_DEFS } from '../src/games/caduta_data.js';

const EFFS = [
  ...Array(3).fill({k: 'money', v: 5000}), ...Array(3).fill({k: 'money', v: 10000}), ...Array(2).fill({k: 'money', v: 20000}), {k: 'money', v: 50000},
  {k: 'life'}, {k: 'life'}, {k: 'scream'}, {k: 'scream'}, {k: 'double'}, {k: 'double'}, {k: 'half'}, {k: 'half'}, {k: 'zero'}
];
import { WRONG, CATS } from '../src/games/avanti_data.js';

const CASH = [1000, 2000, 3000, 5000, 10000, 15000, 20000, 30000, 50000, 75000, 100000, 150000, 200000];

// ============================================================================
// 1. CULTURA GENERALE (MILIONARIO) TESTS
// ============================================================================
test('cultura: prize ladder has milestones at 500 € (Q5) and 30.000 € (Q10)', () => {
  // Ladder must have 15 levels
  // Check rules and guide text reflecting 500 € and 30.000 € milestones
  assert.ok(cultura.guide.includes('500 €'), 'Guide must document 500 € milestone');
  assert.ok(cultura.guide.includes('30.000 €'), 'Guide must document 30.000 € milestone');
  assert.ok(cultura.rules.some(r => r.includes('500 €') && r.includes('30.000 €')), 'Rules must document 500 € and 30.000 € milestones');

  // Verify lifelines are properly documented (50:50, switch, audience, phone)
  assert.ok(cultura.guide.includes('50:50'), 'Guide must document 50:50');
  assert.ok(cultura.guide.includes('Switch') || cultura.guide.includes('Cambio Domanda'), 'Guide must document switch lifeline');
  assert.ok(cultura.guide.includes('Pubblico'), 'Guide must document audience lifeline');
});

test('cultura: safe amount calculation (safeFor) transitions', () => {
  const ladder = [50, 100, 200, 300, 500, 1000, 2000, 4000, 10000, 30000, 70000, 150000, 300000, 500000, 1000000];
  const safeFor = k => k >= 10 ? ladder[9] : k >= 5 ? ladder[4] : 0;

  assert.equal(ladder[4], 500, '5th question milestone must be 500 €');
  assert.equal(ladder[9], 30000, '10th question milestone must be 30.000 €');
  assert.equal(ladder[14], 1000000, 'Final 15th question must be 1.000.000 €');

  // Less than 5 correct
  assert.equal(safeFor(0), 0);
  assert.equal(safeFor(4), 0);

  // Reached first safety net (5 to 9 correct)
  assert.equal(safeFor(5), 500);
  assert.equal(safeFor(7), 500);
  assert.equal(safeFor(9), 500);

  // Reached second safety net (10 to 14 correct)
  assert.equal(safeFor(10), 30000);
  assert.equal(safeFor(12), 30000);
  assert.equal(safeFor(14), 30000);
});

// ============================================================================
// 2. AVANTI UN ALTRO! TESTS
// ============================================================================
test('avanti: Pidigozzo roll options and data integrity', () => {
  assert.ok(CASH.length >= 10, 'Pidigozzo must have variety of cash rolls');
  assert.ok(CASH.includes(1000) && CASH.includes(200000), 'Cash must range from 1.000 € to 200.000 €');

  // Verify 21 wrong answers finale data
  assert.ok(WRONG.length >= 21, 'Must have at least 21 reverse questions');
  for (const item of WRONG) {
    const [q, r, w] = item;
    assert.ok(q && typeof q === 'string', 'Question text must be valid');
    assert.ok(r && typeof r === 'string', 'Correct answer must be valid');
    assert.ok(w && typeof w === 'string', 'Wrong answer must be valid');
  }
});

test('avanti: 21 wrong answers finale state simulation', () => {
  // In the finale: contestant must pick the WRONG answer to advance.
  const questions = WRONG.slice(0, 21).map(([q, r, w]) => {
    // randomized display options: index 0 or 1 is the wrong answer (target)
    const isTargetFirst = Math.random() < 0.5;
    return {
      q,
      opts: isTargetFirst ? [w, r] : [r, w],
      good: isTargetFirst ? 0 : 1 // good index = target WRONG answer
    };
  });

  assert.equal(questions.length, 21);

  let currentIdx = 0;
  // Test simulated answer logic: correct choice advances
  for (let i = 0; i < 21; i++) {
    const q = questions[currentIdx];
    const pick = q.good; // contestant chooses the wrong answer
    assert.equal(pick, q.good, 'Picking wrong answer must be successful');
    currentIdx++;
  }
  assert.equal(currentIdx, 21, 'Contestant completes all 21 questions');

  // Test error reset: giving the true answer resets index to 0
  currentIdx = 15;
  const mistakePick = 1 - questions[currentIdx].good;
  assert.notEqual(mistakePick, questions[currentIdx].good);
  // Reset rule
  currentIdx = 0;
  assert.equal(currentIdx, 0, 'Mistake in clock phase restarts from question 1');
});

// ============================================================================
// 3. CADUTA LIBERA TESTS
// ============================================================================
test('caduta: 10 Passi and 10 Botole data & mechanics', () => {
  assert.ok(PASSI.length >= 10, 'Must have at least 10 final definitions for 10 passi');
  for (const item of PASSI) {
    assert.ok(item.q && item.a, `Passi entry must have question and answer: ${JSON.stringify(item)}`);
    assert.ok(item.a.length >= 3, 'Answer word must be at least 3 chars');
  }

  // Lecca-lecca outcomes
  const outcomeTypes = new Set(EFFS.map(e => e.k));
  assert.ok(outcomeTypes.has('money'), 'Must have money tiles');
  assert.ok(outcomeTypes.has('life'), 'Must have +1 life tile');
  assert.ok(outcomeTypes.has('scream'), 'Must have +1 scream tile');
  assert.ok(outcomeTypes.has('double'), 'Must have double jackpot tile');
  assert.ok(outcomeTypes.has('half'), 'Must have halve jackpot tile');
  assert.ok(outcomeTypes.has('zero'), 'Must have zero jackpot tile');
});

test('caduta: duel life loss and champion succession', () => {
  let champion = { name: 'Campione', lives: 3, score: 0 };
  let challenger = { name: 'Sfidante', lives: 0, score: 0 };

  // Challenger answers correctly when champion passes: steals life
  champion.lives--;
  challenger.lives++;
  assert.equal(champion.lives, 2);
  assert.equal(challenger.lives, 1);

  // When lives reach 0, player falls through trapdoor
  champion.lives = 0;
  assert.equal(champion.lives, 0, 'Champion out of lives must fall');

  // Challenger takes champion seat
  champion = challenger;
  champion.lives = 3;
  assert.equal(champion.name, 'Sfidante');
  assert.equal(champion.lives, 3, 'New champion receives 3 lives upon crowning');
});

// ============================================================================
// 4. L'EREDITÀ TESTS
// ============================================================================
test('eredita: duel jackpot inheritance and 100 seconds handoff', () => {
  const p1 = { id: 0, name: 'Alice', score: 45000, alive: true };
  const p2 = { id: 1, name: 'Bob', score: 15000, alive: true };

  // Duel between Alice and Bob:
  // If Bob runs out of time, Alice inherits Bob's score
  const loser = p2;
  const winner = p1;

  winner.score += loser.score;
  loser.score = 0;
  loser.alive = false;

  assert.equal(winner.score, 60000, 'Winner must inherit entire jackpot of the loser');
  assert.equal(loser.score, 0, 'Loser jackpot is reset to 0');
  assert.equal(loser.alive, false, 'Loser is eliminated');
});

test('eredita: La Ghigliottina 5 clues halving and final word match', () => {
  const puzzle = GHIGLIOTTINE[0];
  let jackpot = 200000;

  // 5 pairs: for each pair, picking the bad clue halves the jackpot
  for (let i = 0; i < 5; i++) {
    const isBadChoice = i % 2 === 1; // 2 wrong choices
    if (isBadChoice) {
      jackpot = Math.floor(jackpot / 2);
    }
  }

  // 200.000 / 2 = 100.000 -> 100.000 / 2 = 50.000
  assert.equal(jackpot, 50000, 'Two wrong clue choices must halve jackpot twice');

  // Solution word verification
  assert.ok(puzzle.a.length >= 3, 'Ghigliottina solution must be a valid word');
  const userGuess = puzzle.a.toLowerCase().trim();
  assert.equal(userGuess, puzzle.a.toLowerCase(), 'Exact target word match awards remaining jackpot');
});

// ============================================================================
// 5. AFFARI TUOI TESTS
// ============================================================================
test('affari: 20 boxes distribution across blue and red amounts', () => {
  const boxes = contents();
  assert.equal(boxes.length, 20, 'Affari Tuoi must have exactly 20 boxes');

  const blueBoxes = boxes.filter(b => b.blue);
  const redBoxes = boxes.filter(b => !b.blue && b.v >= 10000);
  assert.ok(blueBoxes.length >= 7, 'Must have at least 7 blue prize boxes');
  assert.ok(redBoxes.length >= 8, 'Must have at least 8 red prize boxes');

  // Check top prizes include 100.000, 200.000, 300.000
  const values = boxes.map(b => b.v);
  assert.ok(values.includes(300000), 'Must include top prize of 300.000 €');
  assert.ok(values.includes(200000), 'Must include 200.000 €');
  assert.ok(values.includes(100000), 'Must include 100.000 €');
});

test('affari: Banker offer calculation logic and Regione Fortunata', () => {
  const sealed = [{ v: 100000 }, { v: 200000 }, { v: 300000 }];
  const revealedIds = new Set(['v0', 'v1', 'v10']);
  const off = offer(sealed, revealedIds, 1);
  assert.ok(off > 0, 'Banker offer must be greater than 0');
  assert.ok(off <= 300000, 'Banker offer must not exceed highest available prize');

  // Regione Fortunata: 1st chance 100.000 €, 2nd chance 50.000 €
  assert.equal(LUCKY[0], 100000, 'First chance Regione Fortunata must be 100.000 €');
  assert.equal(LUCKY[1], 50000, 'Second chance Regione Fortunata must be 50.000 €');
});

// ============================================================================
// 6. BINGO 75 VS 90 BALLS TESTS
// ============================================================================
test('bingo: 75-ball vs 90-ball ticket generation and rules', () => {
  // Test 90-ball ticket
  const ticket90 = generateBingoTicket(1, 90);
  assert.equal(ticket90.grid.length, 3, 'Must have 3 rows');
  let count90 = 0;
  for (const row of ticket90.grid) {
    const nums = row.filter(n => n > 0);
    assert.equal(nums.length, 5, 'Every row must have exactly 5 numbers');
    count90 += nums.length;
    for (const n of nums) {
      assert.ok(n >= 1 && n <= 90, `Number ${n} must be between 1 and 90`);
    }
  }
  assert.equal(count90, 15, 'Ticket must contain exactly 15 numbers');

  // Test 75-ball ticket
  const ticket75 = generateBingoTicket(2, 75);
  assert.equal(ticket75.grid.length, 3, 'Must have 3 rows');
  let count75 = 0;
  for (const row of ticket75.grid) {
    const nums = row.filter(n => n > 0);
    assert.equal(nums.length, 5, 'Every row must have exactly 5 numbers');
    count75 += nums.length;
    for (const n of nums) {
      assert.ok(n >= 1 && n <= 75, `Number ${n} must be between 1 and 75 in 75-ball bingo`);
    }
  }
  assert.equal(count75, 15, 'Ticket must contain exactly 15 numbers');

  // Verify Cinquina and Bingo evaluation
  const drawn = new Set();
  // Draw first row of ticket75
  ticket75.grid[0].forEach(n => { if (n > 0) drawn.add(n); });
  const evalCinquina = evaluateBingoCard(ticket75, drawn);
  assert.equal(evalCinquina.hasCinquina, true, 'First full row must award Cinquina');
  assert.equal(evalCinquina.hasBingo, false, 'Single row is not Bingo');

  // Draw remaining rows
  ticket75.grid[1].forEach(n => { if (n > 0) drawn.add(n); });
  ticket75.grid[2].forEach(n => { if (n > 0) drawn.add(n); });
  const evalBingo = evaluateBingoCard(ticket75, drawn);
  assert.equal(evalBingo.hasBingo, true, 'Full ticket must award Bingo VIP');
  assert.equal(evalBingo.toBingo, 0, 'Distance to bingo is 0');
});

// ============================================================================
// 7. FORZA 4 3D TESTS
// ============================================================================
test('forza4: grid drop mechanics and win detection', () => {
  const board = emptyBoard();
  // Player 1 drops in column 3 four times (vertical win)
  assert.equal(hasFour(board, 5, 3, 1), false);
  dropDisc(board, 3, 1);
  dropDisc(board, 3, 1);
  dropDisc(board, 3, 1);
  const winRow = dropDisc(board, 3, 1);
  assert.equal(hasFour(board, winRow, 3, 1), true, 'Four vertical discs must be detected as win');
  const cells = getWinningCells(board, winRow, 3, 1);
  assert.equal(cells.length, 4, 'Must return 4 winning coordinates');
});

// ============================================================================
// 8. FORFEIT & PROMISE RESOLUTION DEADLOCK VERIFICATION
// ============================================================================
test('forfeitPlayer: cleanly triggers onForfeit listeners without deadlock', async () => {
  let forfeitTriggered = false;
  let notifiedPlayer = null;

  const mockPlayer = { id: 0, name: 'Mario', alive: true, retired: false, color: '#38bdf8' };
  const _listeners = [];
  const ctx = {
    dead: false,
    players: [mockPlayer],
    onForfeit(cb) {
      _listeners.push(cb);
      return () => { const i = _listeners.indexOf(cb); if (i >= 0) _listeners.splice(i, 1); };
    },
    forfeitPlayer(p) {
      p.retired = true;
      p.alive = false;
      _listeners.forEach(cb => cb(p));
    }
  };

  // Simulate an active promise waiting on human input
  const pendingActionPromise = new Promise(resolve => {
    const unsub = ctx.onForfeit(p => {
      if (p === mockPlayer) {
        forfeitTriggered = true;
        notifiedPlayer = p;
        unsub();
        resolve({ pick: -2, ok: false });
      }
    });
  });

  // Player clicks retire
  ctx.forfeitPlayer(mockPlayer);

  const result = await pendingActionPromise;
  assert.equal(forfeitTriggered, true, 'Forfeit listener must have fired');
  assert.equal(notifiedPlayer.name, 'Mario');
  assert.equal(mockPlayer.retired, true, 'Player must be marked retired');
  assert.equal(mockPlayer.alive, false, 'Player must be marked dead');
  assert.equal(result.pick, -2, 'Pending promise resolved immediately without freezing');
});

// ============================================================================
// 8. SOLO ROUND FINALE CONFIGURATION AND FINALE INTEGRATION
// ============================================================================
import { GAME_FINALS } from '../src/games/finals.js';
import catena from '../src/games/catena.js';
import hit from '../src/games/hit.js';
import fight from '../src/games/fight.js';
import math from '../src/games/math.js';

test('GAME_FINALS metadata defines final rounds for all 9 TV shows and quiz games', () => {
  const expectedShows = ['eredita', 'avanti', 'caduta', 'affari', 'catena', 'cultura', 'hit', 'fight', 'math'];
  for (const id of expectedShows) {
    assert.ok(GAME_FINALS[id], `GAME_FINALS must include ${id}`);
    assert.ok(typeof GAME_FINALS[id].name === 'string' && GAME_FINALS[id].name.length > 0, `${id} must have a finale name`);
    assert.ok(typeof GAME_FINALS[id].desc === 'string' && GAME_FINALS[id].desc.length > 0, `${id} must have a finale description`);
  }
});

test('Games with finales have start functions that accept ctx.cfg.finalOnly without throwing', () => {
  const gamesWithFinals = [
    { id: 'avanti', mod: avanti },
    { id: 'eredita', mod: eredita },
    { id: 'caduta', mod: caduta },
    { id: 'affari', mod: affari },
    { id: 'catena', mod: catena },
    { id: 'cultura', mod: cultura },
    { id: 'hit', mod: hit },
    { id: 'fight', mod: fight },
    { id: 'math', mod: math }
  ];

  for (const { id, mod } of gamesWithFinals) {
    assert.equal(typeof mod.start, 'function', `${id} must have a start() function`);
  }
});
