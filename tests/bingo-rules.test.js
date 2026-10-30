import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBingoTicket, evaluateBingoCard } from '../src/boardgames/bingo-rules.js';

test('bingo ticket has 15 numbers distributed across 3 rows', () => {
  const ticket = generateBingoTicket(1);
  assert.equal(ticket.grid.length, 3);
  let total = 0;
  for (const row of ticket.grid) {
    assert.equal(row.length, 9);
    total += row.filter(n => n > 0).length;
  }
  assert.equal(total, 15);
});

test('bingo evaluateBingoCard checks cinquina and full house bingo', () => {
  const ticket = {
    id: 1,
    grid: [
      [5, 0, 25, 0, 45, 0, 65, 0, 85],
      [0, 15, 0, 35, 0, 55, 0, 75, 90],
      [8, 0, 28, 0, 48, 0, 68, 0, 88]
    ]
  };

  let drawn = new Set([5, 25, 45, 65, 85]);
  let ev = evaluateBingoCard(ticket, drawn);
  assert.equal(ev.hasCinquina, true);
  assert.equal(ev.hasBingo, false);
  assert.equal(ev.toBingo, 10);

  const all = ticket.grid.flat().filter(n => n > 0);
  ev = evaluateBingoCard(ticket, new Set(all));
  assert.equal(ev.hasBingo, true);
  assert.equal(ev.toBingo, 0);
});
