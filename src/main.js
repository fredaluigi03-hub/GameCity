import {THREE, newStage, tween, raycast, label3d, ease, PAL, tune} from './engine.js';
import {h, sleep, sfx, askMC, getGameSpeed, setGameSpeed} from './ui.js';
import {createSpaceLobby} from './spaceHub.js';
import eredita from './games/eredita.js';
import avanti from './games/avanti.js';
import caduta from './games/caduta.js';
import affari from './games/affari.js';
import catena from './games/catena.js';
import fight from './games/fight.js';
import hit from './games/hit.js';
import math from './games/math.js';
import cultura from './games/cultura.js';
import monopoly from './monopoly/index.js';
import tombola from './boardgames/tombola.js';
import bingo from './boardgames/bingo.js';
import ouija from './boardgames/ouija.js';
import forza4 from './boardgames/forza4.js';

const GAMES = [eredita, avanti, caduta, affari, catena, fight, hit, math, cultura, monopoly, tombola, bingo, ouija, forza4];
const ui = document.getElementById('ui');
const store = {get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }};
const best = id => +store.get('best_' + id, 0) || 0;
const setBest = (id, v) => { if (v > best(id)) store.set('best_' + id, v); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const BOTS = ['Rita', 'Gino', 'Nora', 'Ettore', 'Ada', 'Bruno', 'Ugo', 'Lia', 'Franco', 'Mara', 'Sergio', 'Elsa'];
const accent = g => ({a: tune(g.c1), b: tune(g.c2)});
const setAccent = (a = '#38bdf8', b = '#2563eb') => { const r = document.documentElement.style; r.setProperty('--ac', a); r.setProperty('--ac2', b); };
let teardown = () => {};

function speedBtn() {
  const LABELS = { 1: '⚡ 1x', 1.5: '⚡ 1.5x', 2.5: '⚡ 2.5x' };
  const b = h('button', 'pill btn speedPill', LABELS[getGameSpeed()] || '⚡ 1x');
  b.setAttribute('aria-label', 'Velocità di gioco');
  b.onclick = () => {
    const cur = getGameSpeed();
    const next = cur === 1 ? 1.5 : cur === 1.5 ? 2.5 : 1;
    setGameSpeed(next);
    b.textContent = LABELS[next];
    sfx.click();
  };
  return b;
}

function muteBtn() {
  const b = h('button', 'pill btn icon', sfx.muted ? '🔇' : '🔊'); b.setAttribute('aria-label', 'Audio on/off'); b.setAttribute('aria-pressed', String(sfx.muted));
  b.onclick = () => { const m = sfx.toggle(); b.textContent = m ? '🔇' : '🔊'; b.setAttribute('aria-pressed', String(m)); };
  return b;
}

function lobby() {
  teardown();
  ui.replaceChildren();
  setAccent();
  const space = createSpaceLobby({
    GAMES,
    best,
    accent,
    setAccent,
    intro,
    setup,
    showRulesModal,
    speedBtn,
    muteBtn,
    ui
  });
  teardown = space.teardown;
}

function overlay(inner) {
  const ov = h('div', 'ov'), c = h('div', 'card');
  c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true');
  if (inner) c.innerHTML = inner;
  ov.append(c); ui.append(ov);
  return {ov, c};
}

function showRulesModal(g) {
  const {a} = accent(g);
  const extraHtml = g.guide ? `<div class="rulesExtra">${g.guide}</div>` : '';
  const {ov, c} = overlay(`
    <p class="kicker" style="color:${a}">Regolamento Ufficiale · ${esc(g.tag)}</p>
    <h1 class="disp">${esc(g.name)}</h1>
    <p class="sub" style="margin-bottom:12px">${esc(g.desc)}</p>
    <div class="rulesListWrap">
      <ul class="rulesList">${(g.rules || []).map((r, idx) => `<li><span class="ruleNum">${idx + 1}</span><div>${r}</div></li>`).join('')}</ul>
      ${extraHtml}
    </div>
  `);
  c.classList.add('rulesModalCard');
  const row = h('div', 'row');
  const close = h('button', 'btn pri', 'Ho capito · Torna al gioco');
  close.onclick = () => { sfx.click(); ov.remove(); };
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  row.append(close);
  c.append(row);
  close.focus();
}

function intro(g) {
  if (ui.querySelector('.ov')) return;
  const {a} = accent(g);
  const extraHtml = g.guide ? `<div class="rulesExtra">${g.guide}</div>` : '';
  const {ov, c} = overlay(`<p class="kicker" style="color:${a}">${esc(g.tag)}</p><h1 class="disp">${esc(g.name)}</h1><div class="rulesListWrap"><ul class="rulesList">${g.rules.map((r, i) => `<li><span class="ruleNum">${i + 1}</span><div>${r}</div></li>`).join('')}</ul>${extraHtml}</div>`);
  c.classList.add('rulesModalCard');
  const row = h('div', 'row');
  const back = h('button', 'btn', 'Indietro'), go = h('button', 'btn pri', 'Configura Partita ▸');
  back.onclick = () => { ov.remove(); lobby(); };
  go.onclick = () => { sfx.drum(); if (g.players) { ov.remove(); setup(g); } else launch(g); };
  row.append(back, go); c.append(row); go.focus();
}

const DIFFS = [['facile', 'Facile'], ['medio', 'Medio'], ['difficile', 'Difficile']];
const SKILL = {facile: .4, medio: .6, difficile: .82}; // bot answer skill
const THINK = {facile: 1.35, medio: 1, difficile: .75}; // bot pause multiplier
const QD = {facile: 1, medio: 2, difficile: 3}; // question level, ctx.pool filters on d

function diffRow(label, value, onPick) {
  const r = h('div', 'diffRow', `<span class="lbl">${label}</span>`), s = h('div', 'seg');
  s.setAttribute('role', 'radiogroup'); s.setAttribute('aria-label', label);
  const paint = () => s.replaceChildren(...DIFFS.map(([k, t]) => {
    const b = h('button', 'segb' + (k === value ? ' on' : ''), t);
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(k === value));
    b.onclick = () => { value = k; onPick(k); paint(); }; return b;
  }));
  paint(); r.append(s); return r;
}

// player setup: count, CPU fill, names, difficulty. Calls launch(g, cfg) with cfg = {seats:[{name,color,bot}], cpu, cpuDiff, qDiff}
function setup(g) {
  const P = {min: 1, max: 4, def: 1, ...g.players};
  delete P.cpuRequiredBelow; // eliminate rigid lockout so users can choose freely
  const saved = store.get('names', []);
  let count = Math.max(P.min, Math.min(P.max, store.get('count_' + g.id, P.min))), cpu = store.get('cpu', true);
  let cpuDiff = store.get('cpu_diff', 'medio'), qDiff = store.get('q_diff', 'medio');
  const {ov, c} = overlay(`<p class="kicker">${esc(g.name)}</p><h1 class="disp">Quanti giocatori?</h1>`);
  const seg = h('div', 'seg'); seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', 'Numero di giocatori');
  const sw = h('label', 'switch', `<input type="checkbox" ${cpu ? 'checked' : ''}><span class="track"><i></i></span><span class="lbl">Completa con concorrenti CPU</span>`);
  const cdRow = diffRow('Difficoltà CPU', cpuDiff, v => { cpuDiff = v; });
  const qdRow = diffRow('Difficoltà domande', qDiff, v => { qDiff = v; });

  const SP_OPTIONS = [[1, 'Normale (1x)'], [1.5, 'Veloce (1.5x)'], [2.5, 'Turbo (2.5x)']];
  let curSp = getGameSpeed();
  const spRow = h('div', 'diffRow', '<span class="lbl">Ritmo e velocità di gioco</span>');
  const spSeg = h('div', 'seg');
  const paintSp = () => spSeg.replaceChildren(...SP_OPTIONS.map(([val, txt]) => {
    const b = h('button', 'segb' + (val === curSp ? ' on' : ''), txt);
    b.onclick = () => { curSp = val; setGameSpeed(val); paintSp(); };
    return b;
  }));
  paintSp();
  spRow.append(spSeg);

  const MONO_TOKENS = [
    {id: 'tophat', icon: '🎩', label: 'Cilindro'},
    {id: 'car', icon: '🏎️', label: 'Auto da Corsa'},
    {id: 'dog', icon: '🐕', label: 'Cane Scotty'},
    {id: 'ship', icon: '🚢', label: 'Corazzata'},
    {id: 'thimble', icon: '🪡', label: 'Ditale'},
    {id: 'boot', icon: '👢', label: 'Stivale'},
    {id: 'wheelbarrow', icon: '🛒', label: 'Carriola'},
    {id: 'iron', icon: '熨', label: 'Ferro da Stiro'}
  ];
  const hasTokens = g.id === 'monopoly' || Array.isArray(g.tokens);
  const tokenPool = g.tokens || MONO_TOKENS;
  const seatTokens = new Map();

  const seats = h('div', 'seats');
  const rosterNote = h('p', 'sub rosterNote'); rosterNote.hidden = true;
  const row = h('div', 'row'), back = h('button', 'btn', 'Indietro'), rulesB = h('button', 'btn rulesBtn', '📖 Regole'), go = h('button', 'btn pri', 'Inizia lo show');
  rulesB.onclick = () => showRulesModal(g);
  row.append(back, rulesB, go); c.append(seg, sw, rosterNote, cdRow, qdRow, spRow, seats, row);
  const swIn = sw.querySelector('input');
  const swLbl = sw.querySelector('.lbl');

  const eff = () => (!!g.players?.rival && count === 1) || cpu;
  const total = () => {
    if (count === 1 && eff()) return Math.max(2, Math.min(P.max, P.def));
    if (cpu && count < P.def && g.id === 'eredita') return P.def;
    return count;
  };

  const manualBots = new Map(); // seatIndex -> boolean

  function render() {
    seg.replaceChildren(...Array.from({length: P.max - P.min + 1}, (_, k) => {
      const n = P.min + k, b = h('button', 'segb' + (n === count ? ' on' : ''), String(n));
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(n === count));
      b.onclick = () => { count = n; render(); seats.querySelector('input')?.focus(); }; return b;
    }));
    const tot = total();
    swLbl.textContent = (tot > count) ? `Riempi tavolo fino a ${tot} con concorrenti CPU` : 'Completa con concorrenti CPU';
    swIn.checked = eff();
    swIn.disabled = !!g.players?.rival && count === 1;
    cdRow.hidden = tot === count && !cpu && !g.difficulty;
    qdRow.hidden = !g.questions;

    const keep = [...seats.querySelectorAll('input')].map(i => i.value);
    seats.replaceChildren(...Array.from({length: tot}, (_, i) => {
      let isBot = manualBots.has(i) ? manualBots.get(i) : (i >= count);
      const col = PAL.players[i % PAL.players.length];
      const s = h('div', 'seat' + (isBot ? ' bot' : ''));
      s.style.setProperty('--pc', col);

      const dot = h('span', 'dot');
      const toggle = h('button', 'pill btn seatToggle', isBot ? 'CPU ⇄' : 'Umano ⇄');
      toggle.type = 'button';
      toggle.style.cssText = 'padding:2px 8px;font-size:0.75rem;margin-left:auto;';
      toggle.onclick = () => {
        manualBots.set(i, !isBot);
        render();
      };

      let tokenEl = null;
      if (hasTokens) {
        const curTokIdx = seatTokens.has(i) ? seatTokens.get(i) : (i % tokenPool.length);
        seatTokens.set(i, curTokIdx);
        const tok = tokenPool[curTokIdx];
        tokenEl = h('button', 'pill btn tokenPickBtn', `${tok.icon} ${tok.label}`);
        tokenEl.type = 'button';
        tokenEl.title = 'Clicca per cambiare pedina 3D';
        tokenEl.style.cssText = 'padding:2px 8px;font-size:0.75rem;';
        tokenEl.onclick = () => {
          seatTokens.set(i, (curTokIdx + 1) % tokenPool.length);
          sfx.click();
          render();
        };
      }

      if (isBot) {
        const nm = h('span', 'nm', BOTS[i % BOTS.length]);
        const tag = h('span', 'tag', 'CPU');
        s.append(dot, nm);
        if (tokenEl) s.append(tokenEl);
        s.append(tag, toggle);
      } else {
        const inp = h('input');
        inp.setAttribute('aria-label', `Nome giocatore ${i + 1}`);
        inp.maxLength = 14;
        inp.value = keep[i] ?? saved[i] ?? `Giocatore ${i + 1}`;
        s.append(dot, inp);
        if (tokenEl) s.append(tokenEl);
        s.append(toggle);
      }
      return s;
    }));
  }

  swIn.onchange = () => {
    cpu = swIn.checked;
    manualBots.clear();
    render();
  };
  back.onclick = () => { ov.remove(); lobby(); };
  go.onclick = () => {
    const tot = total();
    const finalSeats = Array.from({length: tot}, (_, i) => {
      const isBot = manualBots.has(i) ? manualBots.get(i) : (i >= count);
      const inp = seats.querySelectorAll('.seat')[i]?.querySelector('input');
      const name = isBot ? BOTS[i % BOTS.length] : (inp?.value.trim() || `Giocatore ${i + 1}`);
      const tokIdx = seatTokens.has(i) ? seatTokens.get(i) : (i % tokenPool.length);
      return {name, color: PAL.players[i % PAL.players.length], bot: isBot, token: hasTokens ? tokenPool[tokIdx] : null};
    });
    const humanNames = finalSeats.filter(s => !s.bot).map(s => s.name);
    if (humanNames.length) store.set('names', humanNames);
    store.set('cpu', cpu); store.set('count_' + g.id, count); store.set('cpu_diff', cpuDiff); store.set('q_diff', qDiff);
    const cfg = {seats: finalSeats, cpu: finalSeats.some(s => s.bot), cpuDiff, qDiff: QD[qDiff]};
    ov.remove(); launch(g, cfg);
  };
  render(); go.focus();
}

function launch(g, cfg) {
  teardown(); ui.replaceChildren();
  const {a, b} = accent(g); setAccent(a, b);
  const hudEl = h('div', 'hud'), dockEl = h('div', 'dock'), bottom = h('div', 'bottomStack'), subSlot = h('div', 'subSlot');
  const exitBtn = h('button', 'pill btn', '← Studio'); exitBtn.onclick = () => { kill(); lobby(); };
  const name = h('div', 'pill disp title', g.name);
  const right = h('div', 'hudR'), tools = h('div', 'tools');

  const rulesBtn = h('button', 'pill btn rulesBtn', '📖 Regole');
  rulesBtn.title = 'Leggi il regolamento completo di questo gioco';
  rulesBtn.onclick = () => { sfx.click(); showRulesModal(g); };

  const retireBtn = h('button', 'pill btn retireBtn', '⚐ Ritirati');
  retireBtn.title = 'Abbandona la gara o elimina un concorrente';
  retireBtn.onclick = () => {
    if (ctx.dead) return;
    const al = ctx.players.filter(p => p.alive);
    if (al.length <= 1) return;
    const {ov, c} = overlay(`
      <p class="kicker">Auto-eliminazione</p>
      <h1 class="disp">Vuoi ritirarti dalla gara?</h1>
      <p class="sub">Seleziona il concorrente che intende abbandonare la gara:</p>
      <div class="opts" style="display:flex;flex-direction:column;gap:8px;margin:16px 0"></div>
    `);
    const box = c.querySelector('.opts');
    al.forEach(p => {
      const b = h('button', 'opt', `<span class="dot" style="--pc:${p.color}"></span><span style="flex:1;text-align:left">Ritira <b>${esc(p.name)}</b>${p.bot ? ' (CPU)' : ''}</span><span style="color:var(--bad)">Elimina ✕</span>`);
      b.onclick = () => {
        ov.remove();
        ctx.forfeitPlayer(p);
      };
      box.append(b);
    });
    const cancel = h('button', 'btn', 'Annulla');
    cancel.onclick = () => ov.remove();
    c.append(cancel);
  };

  tools.append(rulesBtn, retireBtn, speedBtn(), muteBtn());
  hudEl.append(exitBtn, name, h('div', 'sp'), right, tools);
  const board = h('div', 'board'), top = h('div', 'topStack'); board.setAttribute('aria-live', 'polite');
  top.append(hudEl, board); bottom.append(subSlot, dockEl);
  ui.append(top, bottom);
  const seats = cfg?.seats || [{name: store.get('names', [])[0] || 'Tu', color: '#38bdf8', bot: false}];
  const diff = cfg?.cpuDiff ?? 'medio';
  const players = seats.map((s, id) => ({id, name: s.name, color: s.color, bot: s.bot, token: s.token || null, skill: s.bot ? SKILL[diff] + (Math.random() - .5) * .12 : undefined, score: 0, alive: true, data: {}}));
  const kill = () => { if (ctx.dead) return; ctx.dead = true; ctx.exits.forEach(f => { try { f(); } catch {} }); };
  const ctx = {
    dead: false, exits: [], ui, g, accent: {a, b},
    cpu: !!cfg?.cpu, cpuDiff: diff, qDiff: cfg?.qDiff ?? 2,
    showRules: () => showRulesModal(g),
    // question pool at level d (1–3); items without d count as 2; fallback to full list if too few
    pool: (list, d = ctx.qDiff) => { const f = list.filter(x => (x.d ?? 2) === d); return f.length >= 5 ? f : list; },
    players, humans: players.filter(p => !p.bot), active: null, hudTools: tools, subSlot, cfg,
    w: p => new Promise(r => p.then(v => { if (!ctx.dead) r(v); })),
    sleep: ms => ctx.w(sleep(ms)),
    onExit: f => ctx.exits.push(f),
    hud: html => { right.innerHTML = html; },
    dock: (...n) => dockEl.replaceChildren(...n),
    sideAdd: n => ui.append(n),
    ask: o => askMC(ctx, o),
    forfeitPlayer(p) {
      if (!p || !p.alive || ctx.dead) return;
      p.retired = true;
      sfx.bad();
      if (ctx.onPlayerRetired) {
        ctx.onPlayerRetired(p);
      } else {
        p.alive = false;
        ctx.scoreboard();
      }
    },
    // ---- players ----
    setScore(p, n) { p.score = n; ctx.scoreboard(); },
    addScore(p, n) { p.score += n; ctx.scoreboard(); },
    setActive(p) { ctx.active = p; ctx.scoreboard(); },
    scoreboard() {
      board.replaceChildren(...players.map(p => {
        const c = h('div', 'pchip' + (p === ctx.active ? ' on' : '') + (p.alive ? '' : ' out'));
        c.style.setProperty('--pc', p.color);
        c.innerHTML = `<span class="dot"></span><span class="nm">${esc(p.name)}${p.bot ? '<small>CPU</small>' : ''}</span><b>${p.score.toLocaleString('it-IT')}</b>`;
        return c;
      }));
    },
    // hot-seat interstitial; resolves at once for bots or single-human games
    passDevice(p) {
      if (!p || p.bot || ctx.humans.length < 2) return Promise.resolve();
      ctx.setActive(p);
      return ctx.w(new Promise(res => {
        const {ov, c} = overlay(`<p class="kicker">Cambio turno</p><div class="passDot" style="--pc:${p.color}"></div><h1 class="disp">Passa il dispositivo a <span style="color:${p.color}">${esc(p.name)}</span></h1><p class="sub">Premi quando sei pronto</p>`);
        ov.classList.add('pass');
        const btn = h('button', 'btn pri', 'Sono pronto'); c.append(btn); btn.focus();
        btn.onclick = () => { ov.remove(); sfx.click(); res(); };
        ctx.onExit(() => ov.remove());
      }));
    },
    // bot helpers
    botChance: (skill = .6) => Math.random() < skill,
    botAsk(q, skill = .6) { const n = q.opts.length, pick = Math.random() < skill ? q.right : [...Array(n).keys()].filter(k => k !== q.right)[Math.floor(Math.random() * (n - 1))]; return {pick, ok: pick === q.right}; },
    botThink: (min = 900, max = 2400) => ctx.sleep((min + Math.random() * (max - min)) * THINK[diff]),
    // finish({win, title, lines, score}) or finish({title, ranking:[{player, score}], win?, lines?})
    finish({win, title, lines = [], score = 0, ranking}) {
      if (!ranking && players.length > 1) ranking = players.map(p => ({player: p, score: p.score}));
      if (ranking) {
        ranking = [...ranking].sort((x, y) => y.score - x.score);
        const top = ranking[0];
        score = Math.max(0, ...ranking.filter(r => !r.player.bot).map(r => r.score));
        win ??= !top.player.bot;
        title ??= ranking.length > 1 ? `Vince ${top.player.name}!` : (win ? 'Hai vinto!' : 'Fine partita');
      }
      setBest(g.id, score);
      if (ctx.dead) return;
      (win ? sfx.win : sfx.bad)(); if (win) ctx.stage?.burst(b);
      const medal = ['1°', '2°', '3°'];
      const rk = ranking ? `<ol class="rank">${ranking.map((r, i) => `<li style="--pc:${r.player.color}"><span class="pos">${medal[i] || i + 1 + '°'}</span><span class="dot"></span><span class="nm">${esc(r.player.name)}${r.player.bot ? '<small>CPU</small>' : ''}</span><b>${r.score.toLocaleString('it-IT')}</b></li>`).join('')}</ol>` : '';
      const {c} = overlay(`<p class="kicker">${esc(g.name)} · Fine puntata</p><h1 class="disp ${win ? 'gold' : 'bad'}">${title}</h1>${lines.map(l => `<p class="sub">${l}</p>`).join('')}${rk || `<p class="big disp gold score">${score.toLocaleString('it-IT')}</p>`}`);
      const row = h('div', 'row'), again = h('button', 'btn pri', '↻ Rigioca'), out = h('button', 'btn', 'Torna agli show');
      again.onclick = () => { kill(); launch(g, cfg); };
      out.onclick = () => { kill(); lobby(); };
      row.append(again, out); c.append(row); again.focus();
    }
  };
  teardown = () => {};
  window.__studio.ctx = ctx; // debug hook
  if (players.length > 1) ctx.scoreboard();
  g.start(ctx);
}

Promise.race([document.fonts.load('40px "Bebas Neue"'), sleep(1500)]).catch(() => {}).finally(lobby);
window.__studio = {lobby, launch, GAMES};
