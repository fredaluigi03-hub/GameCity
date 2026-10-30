// Calcolo Lampo (The Floor) — 12 maths categories, procedural questions in 3 levels.
// gen(id, lvl) -> {q, a}: `a` is always a non-negative integer (keypad has no minus/comma).
// No imports: node can load this file for the self-check (see bottom).
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const SUP = {0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹'};
const sup = n => String(n).split('').map(d => SUP[d]).join('');
const dec = (n, d) => { const s = String(n).padStart(d + 1, '0'), i = s.slice(0, -d), f = s.slice(-d).replace(/0+$/, ''); return f ? `${i},${f}` : i; }; // dec(25,1) = "2,5"
const xs = (a, s = 'x') => a === 1 ? s : `${a}${s}`;

// diff = CPU base think-time (s) at level 1; also scales CPU accuracy
export const CATS = [
  {id: 'add', name: 'Addizioni', short: 'Addizioni', icon: '+', diff: 3.2},
  {id: 'sub', name: 'Sottrazioni', short: 'Sottrazioni', icon: '−', diff: 3.6},
  {id: 'tab', name: 'Tabelline', short: 'Tabelline', icon: '×', diff: 2.4},
  {id: 'mul', name: 'Moltiplicazioni a 2 cifre', short: 'Molt. 2 cifre', icon: '××', diff: 6},
  {id: 'div', name: 'Divisioni', short: 'Divisioni', icon: '÷', diff: 3.6},
  {id: 'pct', name: 'Percentuali', short: 'Percentuali', icon: '%', diff: 5},
  {id: 'pow', name: 'Potenze e radici', short: 'Potenze', icon: 'x²√', diff: 4},
  {id: 'frac', name: 'Frazioni', short: 'Frazioni', icon: '¾', diff: 5},
  {id: 'seq', name: 'Sequenze numeriche', short: 'Sequenze', icon: '1·2·3', diff: 5.4},
  {id: 'eq', name: 'Equazioni semplici', short: 'Equazioni', icon: 'x=?', diff: 5.6},
  {id: 'geo', name: 'Geometria: aree e perimetri', short: 'Geometria', icon: '▱', diff: 5},
  {id: 'conv', name: 'Conversioni di unità', short: 'Conversioni', icon: 'km→m', diff: 4.4}
];
export const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));

const G = {
  add(l) {
    const [a, b] = l === 1 ? [rnd(12, 89), rnd(11, 79)] : l === 2 ? [rnd(120, 899), rnd(25, 99)] : [rnd(250, 999), rnd(150, 899)];
    return {q: `${a} + ${b}`, a: a + b};
  },
  sub(l) {
    const a = l === 1 ? rnd(30, 99) : l === 2 ? rnd(150, 999) : rnd(500, 1500);
    const b = l === 1 ? rnd(11, a - 5) : l === 2 ? rnd(25, 99) : rnd(120, a - 50);
    return {q: `${a} − ${b}`, a: a - b};
  },
  tab(l) {
    const [lo, hi] = l === 1 ? [2, 9] : l === 2 ? [3, 12] : [6, 12];
    let a, b; do { a = rnd(lo, hi); b = rnd(lo, hi); } while (l === 3 && (a === 10 || b === 10));
    return {q: `${a} × ${b}`, a: a * b};
  },
  mul(l) {
    const a = rnd(l === 3 ? 13 : 12, 49), b = l === 1 ? rnd(2, 9) : l === 2 ? rnd(11, 19) : rnd(13, 29);
    return {q: `${a} × ${b}`, a: a * b};
  },
  div(l) {
    const [b, c] = l === 1 ? [rnd(2, 9), rnd(2, 10)] : l === 2 ? [rnd(3, 12), rnd(6, 15)] : [rnd(11, 25), rnd(4, 19)];
    return {q: `${b * c} ÷ ${b}`, a: c};
  },
  pct(l) {
    const p = pick(l === 1 ? [10, 20, 25, 50] : l === 2 ? [5, 15, 30, 40, 75] : [12, 35, 45, 60, 80, 120]);
    const step = 100 / gcd(p, 100), max = l === 1 ? 200 : l === 2 ? 400 : 900;
    const n = step * rnd(Math.max(1, Math.ceil(20 / step)), Math.max(1, Math.floor(max / step)));
    return {q: `${p}% di ${n}`, a: p * n / 100};
  },
  pow(l) {
    const k = rnd(0, l === 1 ? 1 : 2);
    if (l === 3 && k === 0) { const n = rnd(5, 10); return {q: `2${sup(n)}`, a: 2 ** n}; }
    if (k === 2 || (l === 3 && k === 1)) { const a = l === 2 ? rnd(2, 5) : rnd(4, 9); return {q: `${a}³`, a: a ** 3}; }
    const a = l === 1 ? rnd(2, 12) : l === 2 ? rnd(11, 20) : rnd(15, 30);
    return Math.random() < .5 || l === 3 ? {q: `√${a * a}`, a} : {q: `${a}²`, a: a * a};
  },
  frac(l) {
    const b = l === 1 ? rnd(2, 5) : l === 2 ? rnd(3, 8) : rnd(6, 12);
    const a = l === 1 ? 1 : rnd(l === 2 ? 1 : 2, b - 1), N = b * (l === 1 ? rnd(2, 12) : l === 2 ? rnd(3, 15) : rnd(5, 25));
    return {q: `${a}/${b} di ${N}`, a: N / b * a};
  },
  seq(l) {
    let t;
    if (l === 1) { const s = rnd(2, 30), d = rnd(2, 9); t = [0, 1, 2, 3, 4].map(i => s + d * i); }
    else if (l === 2) {
      if (Math.random() < .5) { const s = rnd(1, 5), r = rnd(2, 3); t = [0, 1, 2, 3, 4].map(i => s * r ** i); }
      else { const d = rnd(3, 12), s = d * 4 + rnd(5, 40); t = [0, 1, 2, 3, 4].map(i => s - d * i); } // descending, stays > 0
    } else if (Math.random() < .5) { const s = rnd(1, 20), d = rnd(1, 5), inc = rnd(1, 3); t = [s]; for (let i = 0; i < 4; i++) t.push(t[i] + d + inc * i); } // growing gaps
    else { const s = rnd(10, 40), up = rnd(4, 9), dn = rnd(1, up - 1); t = [s]; for (let i = 0; i < 5; i++) t.push(t[i] + (i % 2 ? -dn : up)); } // +up, -dn alternating
    const show = t.slice(0, t.length - 1), a = t[t.length - 1];
    return {q: `${show.join(', ')}, ?`, a};
  },
  eq(l) {
    const x = rnd(2, l === 1 ? 30 : 15);
    if (l === 1) { const a = rnd(3, 40); return Math.random() < .5 || x <= 3 ? {q: `x + ${a} = ${x + a}`, a: x} : {q: `x − ${Math.min(a, x - 1)} = ${x - Math.min(a, x - 1)}`, a: x}; }
    if (l === 2) { const a = rnd(2, 9), b = rnd(1, 30); return {q: `${a}x + ${b} = ${a * x + b}`, a: x}; }
    for (;;) { // a·x − b = c·x + d, with d >= 1
      const a = rnd(4, 9), c = rnd(1, a - 2), b = rnd(1, 20), d = a * x - b - c * x;
      if (d >= 1) return {q: `${xs(a)} − ${b} = ${xs(c)} + ${d}`, a: x};
    }
  },
  geo(l) {
    const k = rnd(0, 2);
    if (l === 1) {
      if (k === 0) { const s = rnd(3, 25); return {q: `Perimetro del quadrato di lato ${s} cm`, a: 4 * s}; }
      const b = rnd(2, 12), h = rnd(2, 12);
      return k === 1 ? {q: `Area del rettangolo ${b} × ${h} cm`, a: b * h} : {q: `Perimetro del rettangolo ${b} × ${h} cm`, a: 2 * (b + h)};
    }
    if (l === 2) {
      if (k === 0) { const s = rnd(11, 20); return {q: `Area del quadrato di lato ${s} cm`, a: s * s}; }
      if (k === 1) { const b = rnd(3, 16) * 2, h = rnd(3, 15); return {q: `Area del triangolo: base ${b}, altezza ${h} cm`, a: b * h / 2}; }
      const b = rnd(12, 45), h = rnd(8, 30); return {q: `Perimetro del rettangolo ${b} × ${h} cm`, a: 2 * (b + h)};
    }
    if (k === 0) { const B = rnd(8, 20), b = rnd(2, B - 2), h = rnd(2, 12) * 2; return {q: `Area del trapezio: basi ${B} e ${b}, altezza ${h} cm`, a: (B + b) * h / 2}; }
    if (k === 1) { const b = rnd(12, 30), h = rnd(11, 25); return {q: `Area del rettangolo ${b} × ${h} cm`, a: b * h}; }
    const s = rnd(4, 15), n = rnd(5, 8); return {q: `Perimetro di un poligono regolare di ${n} lati da ${s} cm`, a: n * s};
  },
  conv(l) {
    const k = rnd(0, 2);
    if (l === 1) {
      const [u, v, f] = pick([['km', 'm', 1000], ['m', 'cm', 100], ['kg', 'g', 1000], ['h', 'min', 60], ['min', 's', 60], ['l', 'ml', 1000]]);
      const n = rnd(2, 9); return {q: `${n} ${u} = ? ${v}`, a: n * f};
    }
    if (l === 2) {
      if (k === 0) { const n = rnd(11, 99); return {q: `${dec(n, 1)} km = ? m`, a: n * 100}; }
      if (k === 1) { const n = rnd(2, 9); return {q: `${n} giorni = ? ore`, a: n * 24}; }
      const n = rnd(11, 49); return {q: `${dec(n, 1)} l = ? ml`, a: n * 100};
    }
    if (k === 0) { const hh = rnd(1, 4), mm = rnd(1, 11) * 5; return {q: `${hh} h ${mm} min = ? min`, a: hh * 60 + mm}; }
    if (k === 1) { const n = rnd(101, 999); return {q: `${dec(n, 2)} m = ? cm`, a: n}; }
    const n = rnd(11, 95); return {q: `${n * 100} g = ? hg`, a: n};
  }
};

export const gen = (id, lvl = 1) => {
  const r = G[id](Math.max(1, Math.min(3, lvl)));
  return {...r, s: String(r.a)};
};

// self-check: node src/games/math_data.js
if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('math_data.js')) {
  for (const c of CATS) for (let l = 1; l <= 3; l++) for (let i = 0; i < 3000; i++) {
    const r = gen(c.id, l);
    if (!Number.isInteger(r.a) || r.a < 0 || r.a > 99999 || /NaN|undefined|Infinity/.test(r.q)) throw new Error(`${c.id} L${l}: ${r.q} = ${r.a}`);
    // independent re-evaluation where the text is a plain expression / equation
    const js = r.q.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
    if (/^(add|sub|tab|mul|div)$/.test(c.id) && Function(`return ${js}`)() !== r.a) throw new Error(`eval ${r.q} = ${r.a}`);
    if (c.id === 'eq') { const [L, R] = js.replace(/(\d)x/g, '$1*x').split('='); if (Function('x', `return (${L}) - (${R})`)(r.a) !== 0) throw new Error(`eq ${r.q} x=${r.a}`); }
    if (c.id === 'frac' || c.id === 'pct') { const m = r.q.match(/(\d+)(?:\/(\d+)|%) di (\d+)/); const v = c.id === 'frac' ? m[3] / m[2] * m[1] : m[1] * m[3] / 100; if (Math.abs(v - r.a) > 1e-9) throw new Error(`${r.q} = ${r.a}`); }
  }
  // spot checks of the formatting helpers
  if (dec(25, 1) !== '2,5' || dec(345, 2) !== '3,45' || dec(310, 2) !== '3,1' || dec(30, 1) !== '3') throw new Error('dec');
  console.log('math_data ok', CATS.flatMap(c => [1, 3].map(l => { const r = gen(c.id, l); return `${c.id}${l}: ${r.q} = ${r.a}`; })).join(' | '));
}
