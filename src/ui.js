export const h = (tag, cls = '', html = '') => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; return e; };
let gameSpeed = (() => {
  try { return parseFloat(localStorage.getItem('game_speed')) || 1; } catch { return 1; }
})();
export const setGameSpeed = s => { gameSpeed = Math.max(0.2, Math.min(4, s)); try { localStorage.setItem('game_speed', String(gameSpeed)); } catch {} };
export const getGameSpeed = () => gameSpeed;
export const sleep = ms => new Promise(r => setTimeout(r, Math.max(8, Math.round(ms / gameSpeed))));
export const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const eur = n => '€ ' + n.toLocaleString('it-IT');
export const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

function lev(a, b) {
  const d = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// tolerant match (typos on longer words)
export function near(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return false;
  if (a === b) return true;
  const l = Math.max(a.length, b.length);
  return l >= 5 && lev(a, b) <= (l >= 10 ? 2 : 1);
}

// ---------- audio ----------
let ac, muted = false;
const muteL = new Set();
const AC = () => ac ||= new (window.AudioContext || window.webkitAudioContext)();
export function tone(f, d = .15, type = 'sine', v = .08, at = 0, slide = 0) {
  if (muted) return;
  try {
    const a = AC(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
  } catch {}
}
export const sfx = {
  ok() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .2, 'triangle', .09, i * .07)); },
  bad() { tone(200, .6, 'sawtooth', .09, 0, -140); tone(110, .7, 'square', .04); },
  tick() { tone(900, .04, 'square', .025); },
  click() { tone(620, .06, 'triangle', .06); },
  win() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, .35, 'triangle', .1, i * .1)); },
  drop() { tone(800, .9, 'sine', .12, 0, -700); },
  drum() { tone(100, .25, 'sine', .22, 0, -60); },
  whoosh() { tone(300, .4, 'sawtooth', .03, 0, 700); },
  open() { tone(420, .2, 'triangle', .08, 0, 500); },
  phone() { for (let i = 0; i < 4; i++) { tone(880, .12, 'square', .04, i * .25); tone(660, .12, 'square', .04, i * .25 + .12); } },
  censorBeep(d = .38) { tone(1000, d, 'sine', .24); },
  dice() { [320, 480, 260, 540, 390].forEach((f, i) => tone(f, .05, 'triangle', .08, i * .06, -60)); },
  tumble() { [200, 240, 280, 220, 260, 310].forEach((f, i) => tone(f, .07, 'sine', .07, i * .08, -40)); },
  spooky() { tone(146, .9, 'sine', .1, 0, -30); tone(220, 1.2, 'sawtooth', .035, .15, -40); tone(110, 1.5, 'sine', .08, .3); },
  bell() { tone(880, 1.2, 'sine', .14, 0, -20); tone(1760, .9, 'sine', .05, 0, -40); },
  fanfare() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .22, 'triangle', .12, i * .09)); },
  toggle() { muted = !muted; muteL.forEach(f => f(muted)); return muted; },
  get muted() { return muted; },
  // onMute(fn(muted)) -> unsubscribe
  onMute(f) { muteL.add(f); return () => muteL.delete(f); }
};

// ---------- timer ----------
export function countdown(ctx, sec, {bar, label, onEnd} = {}) {
  const cap = sec, t0 = performance.now(); let last = -1, stopped = false;
  const api = {stop() { stopped = true; clearInterval(iv); }, adj(d) { sec += d; }, left: () => sec - (performance.now() - t0) / 1000};
  const iv = setInterval(() => {
    const l = api.left();
    if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, l / cap))})`;
    if (label) label.textContent = Math.max(0, Math.ceil(l));
    const s = Math.ceil(l); if (l < 6 && s !== last) { last = s; sfx.tick(); }
    if (l <= 0) { api.stop(); onEnd && onEnd(); }
  }, 100);
  ctx.onExit(api.stop);
  return api;
}

// ---------- multiple choice ----------
// player: optional ctx.players entry; if player.bot the CPU answers by itself (skill = player.skill ?? .6)
export function askMC(ctx, {q, opts, right, time = 15, cat = '', n = '', onReveal, extra, player}) {
  return new Promise(res => {
    const card = h('div', 'card');
    const who = player ? `<span class="who" style="--pc:${player.color}">${player.name}${player.bot ? ' · CPU' : ''}</span>` : '';
    card.innerHTML = `<div class="meta"><span>${cat}</span>${who}<span>${n}</span></div><h2>${q}</h2><div class="timer"><i></i></div><div class="opts ${opts.length === 3 ? 'three' : ''}"></div>`;
    const box = card.querySelector('.opts'); let done = false;
    const btns = opts.map((o, i) => { const b = h('button', 'opt', `<b>${'ABCD'[i]}</b><span>${o}</span>`); b.onclick = () => fin(i); box.append(b); return b; });
    const cd = countdown(ctx, time, {bar: card.querySelector('.timer i'), onEnd: () => fin(-1)});
    const key = e => { if (player?.bot || e.target.tagName === 'INPUT') return; const i = 'abcd'.indexOf(e.key.toLowerCase()); if (i >= 0 && i < opts.length && e.key.length === 1) fin(i); };
    addEventListener('keydown', key); ctx.onExit(() => removeEventListener('keydown', key));
    async function fin(i) {
      if (done || ctx.dead) return; done = true; cd.stop(); removeEventListener('keydown', key);
      if (i === -2) return res({pick: -2, ok: false});
      btns.forEach((b, k) => { b.disabled = true; if (k === right) b.classList.add('right'); else if (k === i) b.classList.add('wrong'); });
      const ok = i === right; (ok ? sfx.ok : sfx.bad)();
      onReveal && onReveal(ok, i);
      await sleep(1300); if (!ctx.dead) res({pick: i, ok});
    }
    if (player?.bot) {
      btns.forEach(b => { b.disabled = true; });
      const pick = Math.random() < (player.skill ?? .6) ? right : [...opts.keys()].filter(k => k !== right)[Math.floor(Math.random() * (opts.length - 1))];
      const tm = setTimeout(() => { btns[pick]?.classList.add('picked'); setTimeout(() => fin(pick), 450); }, 1200 + Math.random() * Math.min(3500, time * 200));
      ctx.onExit(() => clearTimeout(tm));
    }
    const ex = extra && extra({btns, card, fin});
    ctx.dock(...(ex ? [card, ex] : [card]));
  });
}
