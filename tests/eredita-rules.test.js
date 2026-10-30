import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFS, GHIGLIOTTINE, CENC, TRIS, DATE, SCOSSA} from '../src/games/eredita_data.js';

test('eredita DEFS has valid word and text definitions', () => {
  assert.ok(DEFS.length >= 20, 'DEFS must have at least 20 entries');
  for (const item of DEFS) {
    assert.ok(typeof item.w === 'string' && item.w.length > 0, `item.w must be non-empty: ${JSON.stringify(item)}`);
    assert.ok(typeof item.t === 'string' && item.t.length > 0, `item.t must be non-empty: ${JSON.stringify(item)}`);
    // Object destructuring check: must not be treated as array
    const {w, t} = item;
    assert.equal(w, item.w);
    assert.equal(t, item.t);
  }
});

test('eredita GHIGLIOTTINE has valid 5-word pairs and solutions', () => {
  assert.ok(GHIGLIOTTINE.length >= 5, 'Must have at least 5 ghigliottina puzzles');
  for (const g of GHIGLIOTTINE) {
    assert.ok(typeof g.a === 'string' && g.a.length > 0, `Missing target word: ${JSON.stringify(g)}`);
    assert.equal(g.p.length, 5, `Must have exactly 5 pairs in ghigliottina ${g.a}`);
    for (const [good, bad] of g.p) {
      assert.ok(typeof good === 'string' && good.length > 0, 'Good clue must be valid');
      assert.ok(typeof bad === 'string' && bad.length > 0, 'Bad clue must be valid');
    }
    assert.ok(typeof g.x === 'string' && g.x.length > 0, 'Explanation must exist');
  }
});

test('eredita qualification sets CENC, TRIS, DATE, SCOSSA are valid', () => {
  assert.ok(CENC.length >= 5, 'CENC must have topics');
  assert.ok(TRIS.length >= 5, 'TRIS must have triples');
  assert.ok(DATE.length >= 3, 'DATE must have year sets');
  assert.ok(SCOSSA.length >= 5, 'SCOSSA must have questions');
});
