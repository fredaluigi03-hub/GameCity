// Affari Tuoi — pure data + maths (no three/DOM: checked by a node script).

export const REG = ['Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli V.G.', 'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana', 'Trentino A.A.', 'Umbria', 'Valle d’Aosta', 'Veneto'];
// premi attuali (16) + 4 speciali = 20 pacchi
export const VALUES = [0, 1, 10, 20, 50, 100, 200, 10000, 15000, 20000, 30000, 50000, 75000, 100000, 200000, 300000];
// Assumption (rules don't fix it): 18 pacchi opened in groups 6,3,3,2,2,1,1 -> 2 left. Dottore calls after rounds 1-6, finale after round 7.
export const ROUNDS = [6, 3, 3, 2, 2, 1, 1];
// Assumption: share of the Dottore's expected value offered at call k (1-based). Call 1 is the cambio pacco.
export const OFFER_F = [0, .3, .42, .55, .68, .8, .9];
export const JACKPOT = 20000; // Assumption: Gennarino opened within the first 3 pacchi unlocks this bonus
export const LUCKY = [100000, 50000]; // La regione fortunata: 1st guess / 2nd guess
export const INVENZIONI = ['L’ombrello per pesci', 'Il tostapane a pedali', 'Le calze col navigatore', 'La forchetta che fischia quando è piena', 'Il ventilatore per ventilatori', 'Lo specchio che ti dà sempre ragione', 'Il cuscino antisveglia per lunedì'];

export const SPECIALS = {
  gen: {name: 'GENNARINO', sub: 'il cane del Dottore'},
  bal: {name: 'BALLERINA', sub: 'un balletto e via'},
  inv: {name: 'INVENZIONE', sub: ''},
  nero: {name: 'PACCO NERO', sub: 'nemmeno il Dottore lo sa'}
};

// contents for one game. blue = small (left board), red = big (right board).
// Pacco Nero = hidden duplicate of a real value: red column, real worth = dup.
export function contents(rand = Math.random) {
  const list = VALUES.map(v => ({id: 'v' + v, v, blue: v < 10000}));
  list.push({id: 'gen', sp: 'gen', v: 0, blue: true}, {id: 'bal', sp: 'bal', v: 0, blue: true},
    {id: 'inv', sp: 'inv', v: 0, blue: true, joke: INVENZIONI[Math.floor(rand() * INVENZIONI.length)]});
  const dup = VALUES[Math.floor(rand() * VALUES.length)];
  list.push({id: 'nero', sp: 'nero', v: dup, blue: false});
  return list;
}
// board order: left (blue) / right (red)
export const BOARD_L = [...VALUES.filter(v => v < 10000).map(v => 'v' + v), 'gen', 'bal', 'inv'];
export const BOARD_R = [...VALUES.filter(v => v >= 10000).map(v => 'v' + v), 'nero'];

export const nice = n => n < 1000 ? Math.max(10, Math.round(n / 10) * 10) : n < 10000 ? Math.round(n / 500) * 500 : Math.round(n / 1000) * 1000;

// The Dottore does not know the Pacco Nero: he values it as the mean of the base values not yet revealed.
export function dottoreEV(sealed, revealedIds) {
  const base = VALUES.filter(v => !revealedIds.has('v' + v)), neroEst = base.reduce((s, v) => s + v, 0) / Math.max(1, base.length);
  return sealed.reduce((s, c) => s + (c.sp === 'nero' ? neroEst : c.v), 0) / sealed.length;
}
export const BANKER = {facile: 1.15, medio: 1, difficile: .85}; // banker generosity by cpuDiff
export function offer(sealed, revealedIds, call, rand = Math.random, mult = 1) {
  const f = (OFFER_F[Math.min(call, OFFER_F.length - 1)] + (rand() - .5) * .08) * mult;
  const max = Math.max(...sealed.map(c => c.sp === 'nero' ? VALUES[VALUES.length - 1] : c.v)); // never above the best possible pacco
  return Math.max(1, Math.min(max, nice(dottoreEV(sealed, revealedIds) * f)));
}

// La regione fortunata: after a wrong first guess keep 10 options (right one included, wrong guess removed)
export function halfOptions(all, right, guessed, rand = Math.random) {
  const wrong = all.filter(r => r !== right && r !== guessed);
  for (let i = wrong.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [wrong[i], wrong[j]] = [wrong[j], wrong[i]]; }
  return all.filter(r => r === right || wrong.slice(0, Math.floor(all.length / 2) - 1).includes(r));
}

// ---------- set layout ----------
// slot = plinth (height y0) + pedestal + pacco + holder standing behind. Local +z faces the camera.
export const DIM = {plinthW: 1.25, plinthD: 1.3, plinthZ: -.15, pedW: .7, pedH: .9, pedD: .5, boxW: .7, boxH: .38, boxD: .46, lidOpen: -1.8, personZ: -.62, hover: .08};
export const ME = {ped: [0, 0, 4.5], person: [0, 0, 3.95]};
export const HOSTPOS = [2.5, 0, 5.3];
export const PHONE = [3.4, 0, 4.6];

export const fovFor = a => a < .8 ? 88 : a < 1.2 ? 66 : 50; // mirrors engine resize()
// landscape: two arcs centred on the camera's ground point, back row staggered at half steps
// portrait: staggered bleacher rows 3,4,3,4,5 (front -> back)
// W = viewport width in px: keeps the slots clear of the HTML prize boards (.side: 12px + 132px, or 78px under 640px)
const boardEdge = W => W ? 1 - 2 * (W > 640 ? 150 : 96) / W : 1;
export function layout(aspect, W) {
  const edge = boardEdge(W);
  if (aspect >= .8) {
    const Cz = 12, R = 11.3, R2 = 13.1, step = 1.4 / R, slots = [];
    for (let i = 0; i < 19; i++) {
      const front = i % 2 === 0, a = (i - 9) * step / 2, r = front ? R : R2;
      slots.push({x: Math.sin(a) * r, z: Cz - Math.cos(a) * r, y0: front ? .12 : 1.05, ry: -a, row: front ? 0 : 1});
    }
    // engine fov rule (88/66/50): pull the camera back on narrower screens so the arcs keep the 16:9 framing
    const k = Math.max(1, .829 / (Math.tan(fovFor(aspect) * Math.PI / 360) * aspect)) * Math.max(1, .75 / edge);
    return {key: 'land', slots, cam: [0, .9 + 5.1 * k, Cz * k], look: [0, .9, 0]};
  }
  const rows = [3, 4, 3, 4, 5], slots = [];
  rows.forEach((n, r) => { for (let c = 0; c < n; c++) slots.push({x: (c - (n - 1) / 2) * (1.4 + r * .06), z: .9 - r * 1.4, y0: .12 + r * 1.0, ry: 0, row: r}); });
  const kp = Math.max(1, .56 / edge), look = [0, 2.6, -2];
  return {key: 'port', slots, cam: [0, 2.6 + 4.9 * kp, -2 + 13 * kp], look};
}
