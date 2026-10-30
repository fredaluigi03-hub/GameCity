// Calcolo Lampo — "The Floor" with maths categories.
// Rules chosen: duel on the DEFENDER's category, challenger answers first; wrong answer = retry while the clock runs;
// PASSO = solution shown for 3 s with the clock running; winner keeps the remaining time only if it challenges again at once.
import {THREE, newStage, tween, anim, label3d, mat, person, podium, PAL} from '../engine.js';
import {h, sfx, shuffle} from '../ui.js';
import {createHost, HOSTS} from '../host.js';
import {CATS, gen} from './math_data.js';

const CLOCK = 45, PASS_S = 3, PITCH = 1.68, TILE = 1.56, GZ = -1.8, DUEL_Z = 3.7, DX = 1.75;
const COLORS = ['#d8b45a', '#4fb3a9', '#d0708a', '#7b93d8', '#c98a55', '#8fae6a', '#a585c9', '#5f9fc6'];
const EXTRA = ['Ugo', 'Lia', 'Teo', 'Irma', 'Dino', 'Vera', 'Olga', 'Pio'];
const SKINS = ['#f0d0b4', '#e6bf9c', '#dcae88', '#c99272', '#a8704f', '#8a5a3c'];
const HAIR = ['#1c1416', '#3a2416', '#6b4a2a', '#b98a4a', '#cfcac2', '#7a3b22'];
const V3 = THREE.Vector3;
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const fmt = s => (s = Math.max(0, s)) >= 10 ? String(Math.ceil(s)) : s.toFixed(1).replace('.', ',');
const dk = (col, k = .42) => '#' + new THREE.Color(col).multiplyScalar(k).getHexString();

const CSS = `
.flr .flr-clk{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px}
.flr-clk>div{--pc:var(--gold);display:grid;grid-template-columns:1fr auto;align-items:center;column-gap:8px;border:1px solid var(--line-soft);border-left:4px solid var(--pc);border-radius:12px;padding:6px 12px;opacity:.5;transition:opacity .2s,box-shadow .2s}
.flr-clk>div.on{opacity:1;box-shadow:0 0 0 1px var(--pc)}
.flr-clk span{font-weight:700;font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.flr-clk small{grid-row:2;color:var(--mut);font-size:.62rem;letter-spacing:.14em;text-transform:uppercase}
.flr-clk b{grid-row:1/3;grid-column:2;font:400 2.1rem/1 "Bebas Neue",Outfit,sans-serif;font-variant-numeric:tabular-nums}
.flr-clk .lo b{color:var(--bad)}
.flr-turn{font-size:.78rem;color:var(--mut);letter-spacing:.12em;text-transform:uppercase;display:flex;gap:8px;align-items:center;justify-content:center;min-height:18px}
.flr-turn i,.flr .dot{width:10px;height:10px;border-radius:50%;background:var(--pc);flex:none}
.flr .flr-q{font:400 clamp(1.8rem,6vw,2.9rem)/1.08 "Bebas Neue",Outfit,sans-serif;text-align:center;margin:4px 0 6px;letter-spacing:.02em}
.flr-ans{min-height:50px;text-align:center;font:600 1.9rem/48px Outfit,sans-serif;border-radius:12px;background:rgba(3,5,14,.5);border:1px solid var(--line-soft);margin-bottom:10px;font-variant-numeric:tabular-nums}
.flr-ans.ok{color:var(--ok);border-color:var(--ok)}
.flr-ans.bad{color:var(--bad);border-color:var(--bad)}
.flr-ans.pass{color:var(--gold-hi);font-size:1.15rem}
.flr-kp{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.flr-kp .btn{min-height:56px;font-size:1.45rem;padding:0}
.flr-kp .btn.danger{font-size:.85rem}
.flr-hint{text-align:center;color:var(--mut);font-size:.72rem;margin-top:8px}
.flr-list{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;margin:6px 0 12px;font-size:.88rem}
.flr-list div{display:flex;gap:8px;align-items:center;min-width:0}
.flr-list em{color:var(--mut);font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.flr .btn .dot{margin-right:2px}
@media (pointer:fine) and (min-height:760px){.flr-kp .btn{min-height:46px}}
@media (pointer:coarse){.flr-hint{display:none}}
@media (max-width:520px){.flr-list{grid-template-columns:1fr}}`;

export default {
  id: 'math', name: 'Calcolo Lampo', tag: 'The Floor della matematica', desc: 'Conquista il pavimento a colpi di calcoli', c1: '#2fa58a', c2: '#d8b45a',
  players: {min: 1, max: 4, def: 8, rival: true}, questions: true,
  rules: [
    'Il pavimento è una griglia di caselle luminose: ogni concorrente possiede un territorio e una categoria di matematica (addizioni, frazioni, equazioni, geometria, conversioni…).',
    'Il sorteggio sceglie uno sfidante, che attacca un territorio confinante. Si gioca sempre sulla categoria del difensore; lo sfidante risponde per primo.',
    'Ognuno ha un orologio di 45 secondi che scorre solo nel suo turno. Risposta esatta: la parola passa all’avversario. Risposta sbagliata: riprovi, ma il tempo corre. PASSO: vedi la soluzione e perdi 3 secondi.',
    'Chi esaurisce il tempo perde il duello. Con 4 o più concorrenti è eliminato e il vincitore conquista tutte le sue caselle e le sue categorie; con 2–3 concorrenti il Floor è più grande e il perdente cede le 3 caselle più vicine, eliminato solo quando non gli resta nulla. Chi vince, se sfida subito un altro vicino, il suo orologio riparte dal tempo residuo; se torna sul Floor, riparte da 45 secondi.',
    'Scrivi il risultato col tastierino (o la tastiera: cifre, Invio, P = passo): appena è esatto passa da solo. Vince chi resta padrone di tutto il Floor.'
  ],
  async start(ctx) {
    const S = ctx.stage = newStage({c1: this.c1, c2: this.c2, bg: '#050a10', cam: [0, 15, 17], look: [0, 0, -1.5]});
    const st = h('style', '', CSS); document.head.append(st); ctx.onExit(() => st.remove());

    // ---------- contestants (def 8 can exceed main.js colours/bot names: fix them here) ----------
    const P = ctx.players;
    const taken = new Set(P.map(p => p.name).filter(Boolean));
    P.forEach((p, i) => { p.color = COLORS[i % COLORS.length]; if (!p.name || p.name === 'undefined') { p.name = EXTRA.find(x => !taken.has(x)); taken.add(p.name); } });
    ctx.scoreboard();
    const n = P.length, part = n < 4, TAKE = 3, GN = n === 4 ? 3 : 4, NC = GN * GN; // ponytail: few players = bigger floor + partial takeover so the game lasts

    // ---------- floor grid: n contiguous territories grown from spread-out seeds ----------
    const rc = c => [Math.floor(c / GN), c % GN];
    const nb = c => { const [r, k] = rc(c), o = []; if (r) o.push(c - GN); if (r < GN - 1) o.push(c + GN); if (k) o.push(c - 1); if (k < GN - 1) o.push(c + 1); return o; };
    const dist = (a, b) => { const [r1, k1] = rc(a), [r2, k2] = rc(b); return Math.abs(r1 - r2) + Math.abs(k1 - k2); };
    const seeds = [Math.floor(Math.random() * NC)];
    while (seeds.length < n) {
      let best = -1, bd = -1;
      for (const c of shuffle([...Array(NC).keys()])) { if (seeds.includes(c)) continue; const d = Math.min(...seeds.map(s => dist(s, c))); if (d > bd) { bd = d; best = c; } }
      seeds.push(best);
    }
    const own = Array(NC).fill(null); seeds.forEach((c, i) => { own[c] = P[i]; });
    for (let g = 0; own.includes(null) && g < 500; g++) P.forEach(p => { const fr = shuffle(own.flatMap((o, c) => o === p ? nb(c).filter(x => !own[x]) : [])); if (fr.length) own[fr[0]] = p; });
    const cellsOf = p => own.flatMap((o, c) => o === p ? [c] : []);
    const neighbours = p => [...new Set(cellsOf(p).flatMap(nb).map(c => own[c]))].filter(o => o && o !== p);
    shuffle(CATS).slice(0, n).forEach((c, i) => { P[i].data.cats = [c]; P[i].data.home = seeds[i]; });

    const pos = c => { const [r, k] = rc(c); return new V3((k - (GN - 1) / 2) * PITCH, 0, GZ + (r - (GN - 1) / 2) * PITCH); };
    const span = GN * PITCH + .3;
    const base = new THREE.Mesh(new THREE.BoxGeometry(span, .16, span), mat('#0a0d18', {roughness: .55, metalness: .6})); base.position.set(0, .08, GZ); S.add(base);
    const seamM = new THREE.MeshBasicMaterial({color: '#6f5f3a', toneMapped: false}); // thin LED seams: small accents only
    for (let i = 0; i <= GN; i++) {
      const off = (i - GN / 2) * PITCH;
      const a = new THREE.Mesh(new THREE.BoxGeometry(span - .12, .02, .035), seamM); a.position.set(0, .17, GZ + off);
      const b = new THREE.Mesh(new THREE.BoxGeometry(.035, .02, span - .12), seamM); b.position.set(off, .17, GZ);
      a.userData.noShadow = b.userData.noShadow = true; S.add(a, b);
    }
    const tileG = new THREE.BoxGeometry(TILE, .12, TILE);
    const tiles = own.map((p, c) => {
      const m = new THREE.MeshStandardMaterial({color: dk(p.color), emissive: p.color, emissiveIntensity: .16, roughness: .3, metalness: .35});
      const mesh = new THREE.Mesh(tileG, m); mesh.position.copy(pos(c)).setY(.23); S.add(mesh);
      const lab = label3d('', {w: 1.4, h: 1.4, px: 128, bg: null, border: null}); lab.rotation.x = -Math.PI / 2; lab.position.copy(pos(c)).setY(.296); S.add(lab);
      return {c, mesh, m, lab};
    });
    const drawTile = t => { const cat = own[t.c].data.cats[0]; if (cat) t.lab.set([{t: cat.icon, fs: .4, color: '#f4efe3'}, {t: cat.short.toUpperCase(), fs: .13, font: 'Outfit', color: '#f4efe3'}]); };
    tiles.forEach(drawTile);
    const glowTiles = f => tiles.forEach(t => tween(t.m, {emissiveIntensity: f(own[t.c])}, .25));
    const calm = () => glowTiles(() => .16);

    // ---------- avatars ----------
    const homePos = p => pos(p.data.home).setY(.29);
    P.forEach(p => {
      const female = Math.random() < .45;
      const a = person({suit: '#' + new THREE.Color(p.color).lerp(new THREE.Color(PAL.navy), .6).getHexString(), tie: p.color, shirt: '#ece6da', skin: pick(SKINS), hair: pick(HAIR),
        hairStyle: pick(female ? ['long', 'bob', 'bun'] : ['short', 'slick', 'curly', 'bald']), female});
      a.position.copy(homePos(p));
      const tag = label3d(p.name.toUpperCase(), {w: 1.7, h: .36, px: 160, bg: null, border: null, color: p.color, fs: .8});
      tag.position.y = 2.2; tag.rotation.x = -.45; a.add(tag);
      S.add(a); p.data.obj = a;
    });

    // ---------- duel set: two podiums, two ring clocks, question screen (all hidden under the floor) ----------
    const steel = mat('#2a2f3d', {metalness: .8, roughness: .3});
    const sides = [-1, 1].map(s => {
      const pod = podium(PAL.gold); pod.position.set(s * DX, -1.3, DUEL_Z); pod.visible = false; S.add(pod);
      const cv = document.createElement('canvas'); cv.width = cv.height = 256;
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const face = new THREE.Mesh(new THREE.CircleGeometry(.72, 48), new THREE.MeshBasicMaterial({map: tex, transparent: true, toneMapped: false, color: new THREE.Color(.92, .92, .92)}));
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, 1.5, 12), steel); pole.position.y = .75;
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, .1, 48), mat('#0d1120', {metalness: .6, roughness: .35})); housing.rotation.x = Math.PI / 2; housing.position.y = 2.15;
      face.position.set(0, 2.15, .056); face.userData.noShadow = true;
      const rig = new THREE.Group(); rig.add(pole, housing, face); rig.position.set(s * 3.6, -3.2, DUEL_Z + .2); rig.rotation.y = -s * .28; rig.visible = false; S.add(rig);
      return {pod, rig, x: cv.getContext('2d'), tex, key: ''};
    });
    function drawClock(sd, p, left, active) {
      const key = `${p.id}|${active}|${Math.round(left * 5)}`; if (key === sd.key) return; sd.key = key;
      const x = sd.x, c = 128, col = left < 10 ? PAL.bad : p.color;
      x.clearRect(0, 0, 256, 256);
      x.fillStyle = '#0a0f1f'; x.beginPath(); x.arc(c, c, 124, 0, 7); x.fill();
      x.lineWidth = 16; x.lineCap = 'round'; x.strokeStyle = 'rgba(244,239,227,.1)'; x.beginPath(); x.arc(c, c, 104, 0, 7); x.stroke();
      x.globalAlpha = active ? 1 : .45; x.strokeStyle = col;
      x.beginPath(); x.arc(c, c, 104, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, left / CLOCK))); x.stroke();
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#f4efe3';
      x.font = '92px "Bebas Neue", Outfit, Arial'; x.fillText(fmt(left), c, c - 6);
      x.font = '600 20px Outfit, Arial'; x.fillStyle = col; x.fillText(p.name.toUpperCase().slice(0, 12), c, c + 54);
      x.globalAlpha = 1; sd.tex.needsUpdate = true;
    }
    const board = new THREE.Group(), scr = label3d('', {w: 2.8, h: 1.1, px: 200, fs: .5});
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, 1.9, 12), steel); stand.position.y = .95; scr.position.y = 2.45;
    board.add(stand, scr); board.position.set(0, -3.6, DUEL_Z - 1.5); board.visible = false; S.add(board);

    const host = createHost(ctx, {...HOSTS.math, position: [-5.5, 0, 3.4]});

    // ---------- motion helpers ----------
    async function walk(p, to) {
      const a = p.data.obj, dx = to.x - a.position.x, dz = to.z - a.position.z, d = Math.hypot(dx, dz);
      if (d < .05) return;
      tween(a.rotation, {y: Math.atan2(dx, dz)}, .35, 'out');
      const stop = anim.on((dt, t) => { a.rig.position.y = Math.abs(Math.sin(t * 9)) * .045; });
      await ctx.w(tween(a.position, {x: to.x, y: to.y, z: to.z}, Math.max(.8, d / 2.2), 'inout'));
      stop(); a.rig.position.y = 0;
      await ctx.w(tween(a.rotation, {y: 0}, .4, 'out'));
    }
    async function stageUp(A, B) {
      [A, B].forEach((p, i) => { const sd = sides[i]; sd.pod.setLabel([{t: p.name.toUpperCase(), fs: .62}]); sd.pod.light(p.color); sd.pod.visible = sd.rig.visible = true; sd.key = ''; drawClock(sd, p, CLOCK, false); });
      board.visible = true; scr.set([{t: 'DUELLO', fs: .5}, {t: `${A.name} contro ${B.name}`, fs: .2, font: 'Outfit', color: PAL.goldHi}]);
      S.go([0, 4.4, 11.8], [0, 1.1, DUEL_Z - 1]); sfx.whoosh();
      await ctx.w(Promise.all([
        tween(board.position, {y: 0}, 1.5, 'spring'),
        ...sides.flatMap(sd => [tween(sd.pod.position, {y: 0}, 1.2, 'spring'), tween(sd.rig.position, {y: 0}, 1.5, 'spring')]),
        walk(A, new V3(-DX, 0, DUEL_Z - .78)), walk(B, new V3(DX, 0, DUEL_Z - .78))
      ]));
    }
    async function stageDown(W) {
      sides.forEach(sd => { sd.pod.light(false); tween(sd.pod.position, {y: -1.3}, .9, 'in'); tween(sd.rig.position, {y: -3.2}, 1, 'in'); });
      tween(board.position, {y: -3.6}, 1, 'in');
      await walk(W, homePos(W));
      sides.forEach(sd => { sd.pod.visible = sd.rig.visible = false; }); board.visible = false;
    }
    async function eliminate(L) {
      const a = L.data.obj; a.setMood('sad');
      await ctx.sleep(450); sfx.drop();
      await ctx.w(tween(a.position, {y: a.position.y - 2.3}, 1.1, 'in'));
      a.visible = false;
    }
    async function flip(t, col, delay) {
      await ctx.sleep(delay * 1000);
      tween(t.lab.material, {opacity: 0}, .12); sfx.click();
      tween(t.mesh.position, {y: .62}, .26, 'out');
      await ctx.w(tween(t.mesh.rotation, {x: Math.PI / 2}, .26, 'in'));
      t.m.color.set(dk(col)); t.m.emissive.set(col); t.m.emissiveIntensity = .5; t.mesh.rotation.x = -Math.PI / 2;
      tween(t.mesh.position, {y: .23}, .6, 'bounce'); tween(t.m, {emissiveIntensity: .16}, 1.4, 'out');
      await ctx.w(tween(t.mesh.rotation, {x: 0}, .34, 'out'));
      tween(t.lab.material, {opacity: 1}, .3);
    }
    function grab(W, L) { // cells L loses: all of them, or the TAKE nearest to W when few players
      const d = Array(NC).fill(99), qu = cellsOf(W), all = cellsOf(L);
      qu.forEach(c => { d[c] = 0; });
      for (let i = 0; i < qu.length; i++) for (const x of nb(qu[i])) if (own[x] === L && d[x] === 99) { d[x] = d[qu[i]] + 1; qu.push(x); }
      return {d, lc: part && all.length > TAKE ? all.sort((a, b) => d[a] - d[b]).slice(0, TAKE) : all};
    }
    async function takeover(W, L, {lc, d}) {
      lc.forEach(c => { own[c] = W; });
      const ctr = lc.reduce((v, c) => v.add(pos(c)), new V3()).multiplyScalar(1 / lc.length);
      const ring = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 64), new THREE.MeshBasicMaterial({color: W.color, transparent: true, opacity: .7, depthWrite: false, side: THREE.DoubleSide}));
      ring.rotation.x = -Math.PI / 2; ring.position.copy(ctr).setY(.34); ring.userData.noShadow = true; S.add(ring);
      tween(ring.scale, {x: span * .8, y: span * .8, z: 1}, 1.6, 'out');
      tween(ring.material, {opacity: 0}, 1.6, 'in').then(() => { S.scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); });
      await Promise.all(lc.map(c => flip(tiles[c], W.color, (Math.min(d[c], 9) - 1) * .14 + Math.random() * .05)));
      tiles.forEach(drawTile);
    }

    // ---------- dock helpers ----------
    let holder = null;
    const handTo = async p => { if (!p || p.bot || p === holder) return; await ctx.passDevice(p); holder = p; };
    const info = (meta, title, extra = '') => { const card = h('div', 'card flr', `<div class="meta"><span>${meta}</span><span>The Floor</span></div><h2>${title}</h2>${extra}`); ctx.dock(card); return card; };
    const choose = (card, items) => ctx.w(new Promise(res => {
      const box = h('div', 'opts' + (items.length === 3 ? ' three' : ''));
      items.forEach(it => { const b = h('button', 'btn', it.html); b.onclick = () => { sfx.click(); res(it.v); }; box.append(b); });
      card.append(box); box.querySelector('button')?.focus();
    }));
    let duelNo = 0, outN = 0;
    const alive = () => P.filter(p => p.alive);
    const hud = () => ctx.hud(`<span class="pill">In gara <b>${alive().length}</b></span><span class="pill">Duello <b>${duelNo}</b></span>`);
    const overview = () => S.go([0, 9.5, 9.6], [0, 0, -1.4]);

    async function randomPick(quick) {
      const al = alive().sort((a, b) => a.data.home - b.data.home), card = info('Sorteggio', '…');
      const h2 = card.querySelector('h2'), steps = quick ? 1 : 12 + Math.floor(Math.random() * al.length * 2);
      let i = Math.floor(Math.random() * al.length);
      for (let k = 0; k < steps; k++) {
        i = (i + 1) % al.length; const p = al[i];
        glowTiles(o => o === p ? .55 : .1); h2.innerHTML = `<span style="color:${p.color}">${esc(p.name)}</span>`; sfx.tick();
        await ctx.sleep(55 + k * k * 1.7);
      }
      sfx.drum(); return al[i];
    }
    async function chooseOpp(C) {
      const opts = neighbours(C);
      glowTiles(o => o === C ? .55 : opts.includes(o) ? .34 : .06);
      const cp = pos(C.data.home);
      S.go([cp.x * .6, 6.2, cp.z + 6.6], [cp.x * .6, .4, cp.z - .5]);
      const card = info('Scelta dello sfidante', `<span style="color:${C.color}">${esc(C.name)}</span>, chi sfidi? Si gioca sulla categoria dell’avversario.`);
      if (C.bot) {
        await ctx.botThink(1100, 2000);
        return opts.map(p => ({p, k: p.data.cats[0].diff + Math.random() * 2.5})).sort((a, b) => a.k - b.k)[0].p;
      }
      await handTo(C);
      return choose(card, opts.map(p => ({v: p, html: `<span class="dot" style="--pc:${p.color}"></span>${esc(p.name)} · ${p.data.cats[0].icon} ${p.data.cats[0].short}`})));
    }
    async function askContinue(W, rest) {
      const card = info('Tempo residuo', `<span style="color:${W.color}">${esc(W.name)}</span> vince con <b>${fmt(rest)} s</b> sul suo orologio.`,
        `<p class="flr-hint" style="display:block">Sfida ancora: l’orologio riparte da ${fmt(rest)} s. Torna sul Floor: riparte da 45 s al prossimo duello.</p>`);
      if (W.bot) { await ctx.botThink(900, 1600); return rest >= 28 && Math.random() < W.skill; }
      await handTo(W);
      return choose(card, [{v: true, html: `Sfida ancora (${fmt(rest)} s)`}, {v: false, html: 'Torna sul Floor'}]);
    }

    // ---------- the duel: chess clocks, keypad, CPU ----------
    function duel(A, B, cat, lvl0, startA) {
      const D = [A, B], left = [startA, CLOCK], human = D.some(p => !p.bot), fast = human ? 1 : 2.5;
      const card = h('div', 'card flr');
      card.innerHTML = `<div class="meta"><span>${cat.icon} · ${cat.name}</span><span class="lv"></span></div>
        <div class="flr-clk">${D.map(p => `<div style="--pc:${p.color}"><span>${esc(p.name)}</span><small>Tempo residuo</small><b>${fmt(CLOCK)}</b></div>`).join('')}</div>
        <div class="flr-turn"></div><h2 class="flr-q"></h2><div class="flr-ans" aria-live="polite"></div>
        <div class="flr-kp">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button class="btn" data-k="${d}">${d}</button>`).join('')}<button class="btn" data-k="del" aria-label="Cancella">⌫</button><button class="btn" data-k="0">0</button><button class="btn danger" data-k="pass">Passo</button></div>
        <p class="flr-hint">Tastiera: cifre · Invio verifica · Backspace cancella · P passa</p>`;
      ctx.dock(card);
      const $ = s => card.querySelector(s), qEl = $('.flr-q'), ansEl = $('.flr-ans'), turnEl = $('.flr-turn'), lvEl = $('.lv'), keys = $('.flr-kp');
      const clk = [...card.querySelectorAll('.flr-clk>div')];
      let act = 0, since = 0, running = false, done = false, tok = 0, q = null, typed = '', mode = 'wait', asked = 0, lvl = lvl0, lastTick = -1;
      const warned = [false, false];
      const cur = () => left[act] - (running ? (performance.now() - since) / 1000 * fast : 0);
      const stopClock = () => { if (running) { left[act] = cur(); running = false; } };
      const startClock = () => { since = performance.now(); running = true; };
      let resolve; const out = new Promise(r => { resolve = r; });
      const paint = () => D.forEach((p, i) => {
        const v = i === act ? cur() : left[i];
        clk[i].querySelector('b').textContent = fmt(v); clk[i].classList.toggle('on', i === act && mode !== 'wait'); clk[i].classList.toggle('lo', v < 10);
        drawClock(sides[i], p, v, i === act);
      });
      const end = (li, rest) => {
        if (done) return; done = true; stopClock(); clearInterval(iv); removeEventListener('keydown', onKey);
        if (rest === undefined) left[li] = 0; else left[1 - li] = rest;
        mode = 'wait'; paint(); keys.querySelectorAll('button').forEach(b => { b.disabled = true; });
        resolve({loser: D[li], winner: D[1 - li], rest: left[1 - li]});
      };
      const iv = setInterval(() => {
        if (done) return;
        const v = cur();
        if (running && v <= 10 && !warned[act]) { warned[act] = true; host.ask('Dieci secondi.'); }
        if (running && v <= 5 && Math.ceil(v) !== lastTick) { lastTick = Math.ceil(v); sfx.tick(); }
        if (running && v <= 0) { left[act] = 0; running = false; sfx.bad(); S.shakeIt(.5); end(act); return; }
        paint();
      }, 50);
      ctx.onExit(() => clearInterval(iv));
      const setKeys = () => keys.querySelectorAll('button').forEach(b => { b.disabled = done || mode !== 'q' || D[act].bot; });
      const nextQ = () => {
        if (done) return;
        const my = ++tok, p = D[act]; mode = 'q'; typed = ''; asked++;
        lvl = Math.min(3, lvl0 + Math.floor(asked / 10));
        q = gen(cat.id, lvl);
        lvEl.textContent = `Livello ${lvl}`; qEl.textContent = q.q; ansEl.textContent = ''; ansEl.className = 'flr-ans';
        scr.set([{t: q.q, fs: .44}, {t: `${cat.short} · tocca a ${p.name}`, fs: .15, font: 'Outfit', color: p.color}]);
        turnEl.innerHTML = `<i style="--pc:${p.color}"></i>${p.bot ? `${esc(p.name)} sta pensando…` : `Tocca a ${esc(p.name)}`}`;
        setKeys(); ctx.setActive(p); host.turnTo(p);
        sides.forEach((sd, i) => sd.pod.light(i === act ? D[i].color : false));
        S.go([(act ? 1 : -1) * .7, 2.6, 9.6], [(act ? 1 : -1) * .45, 1.55, DUEL_Z - .4]);
        if (p.bot) botTurn(my);
      };
      const correct = () => {
        if (done || mode !== 'q') return;
        stopClock(); tok++; mode = 'ok'; setKeys();
        const p = D[act];
        ansEl.textContent = q.s; ansEl.className = 'flr-ans ok'; sfx.ok(); S.flashWith(p.color); S.flash = .4; p.data.obj.point();
        act = 1 - act;
        ctx.sleep(420).then(() => { if (done) return; startClock(); nextQ(); });
      };
      const wrong = () => { sfx.bad(); ansEl.className = 'flr-ans bad'; typed = ''; card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); };
      const pass = () => {
        if (done || mode !== 'q') return;
        const my = ++tok; mode = 'pass'; setKeys();
        ansEl.textContent = `Passo · era ${q.s}`; ansEl.className = 'flr-ans pass'; sfx.bad();
        scr.set([{t: `${q.q} = ${q.s}`, fs: .4}, {t: 'PASSO · −3 s', fs: .16, font: 'Outfit', color: PAL.bad}]);
        ctx.sleep(PASS_S * 1000 / fast).then(() => { if (my === tok && !done) nextQ(); });
      };
      const press = k => {
        if (done || mode !== 'q' || D[act].bot) return;
        if (k === 'pass') return pass();
        if (k === 'ok') { if (typed) +typed === q.a ? correct() : wrong(); return; }
        if (k === 'del') typed = typed.slice(0, -1); else if (typed.length < 6) typed += k;
        sfx.click(); ansEl.textContent = typed; ansEl.className = 'flr-ans';
        if (typed && +typed === q.a) correct();
        else if (typed.length >= q.s.length) wrong();
      };
      keys.onclick = e => { const b = e.target.closest('button'); if (b) press(b.dataset.k); };
      const onKey = e => {
        if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        const k = /^[0-9]$/.test(e.key) ? e.key : e.key === 'Backspace' ? 'del' : e.key === 'Enter' ? 'ok' : /^p$/i.test(e.key) ? 'pass' : null;
        if (k === null || done || mode !== 'q' || D[act].bot) return; e.preventDefault(); press(k);
      };
      addEventListener('keydown', onKey); ctx.onExit(() => removeEventListener('keydown', onKey));
      async function botTurn(my) {
        const p = D[act], sk = p.skill ?? .6;
        const solve = Math.random() < Math.max(.3, Math.min(.95, sk + .32 - cat.diff * .035 - (lvl - 1) * .06));
        const t = solve ? cat.diff * (1 + (lvl - 1) * .3) * (.55 + Math.random() * .7) * (1.35 - sk) : 1.4 + Math.random() * 2.4;
        await ctx.botThink(t * 1000 / fast, t * 1000 / fast);
        if (my !== tok || done) return;
        if (solve) correct(); else pass();
      }
      if (!human) { // CPU vs CPU: played at 2.5x, can be skipped
        const sk = h('button', 'btn', 'Salta duello ▸▸'); sk.style.marginTop = '10px'; sk.style.width = '100%';
        sk.onclick = () => { if (done) return; const v = [0, 1].map(i => i === act ? cur() : left[i]), aw = Math.random() < (v[0] + 1) / (v[0] + v[1] + 2); end(aw ? 1 : 0, Math.max(1, v[aw ? 0 : 1] * (.3 + Math.random() * .5))); };
        card.append(sk);
      }
      paint();
      (async () => {
        await handTo(D.find(p => !p.bot));
        for (const k of ['3', '2', '1']) { if (done) return; qEl.textContent = k; scr.set([{t: k, fs: .7}]); sfx.tick(); await ctx.sleep(650 / fast); }
        if (done) return;
        sfx.drum(); startClock(); nextQ();
      })();
      return ctx.w(out);
    }
    // all humans out: resolve the rest instantly
    function quickDuel(A, B, restA) {
      const a = Math.max(.05, (A.skill ?? .6) + (restA - CLOCK) / 90), b = (B.skill ?? .6) + .05, aw = Math.random() < a / (a + b);
      return {winner: aw ? A : B, loser: aw ? B : A, rest: 4 + Math.random() * 30};
    }

    // ---------- show ----------
    hud(); overview();
    const intro = info(`${n} concorrenti · ${NC} caselle`, 'The Floor della matematica',
      `<div class="flr-list">${P.map(p => `<div><span class="dot" style="--pc:${p.color}"></span><b>${esc(p.name)}</b><em>${p.data.cats[0].icon} ${p.data.cats[0].name}</em></div>`).join('')}</div>`);
    await host.say(`Buonasera. Sul pavimento ci sono ${n} concorrenti e ${n} categorie di matematica. Ogni duello si gioca sulla categoria di chi difende. Quarantacinque secondi a testa: chi resta senza tempo, perde il territorio.`, {mood: 'happy', gesture: 'wave'});
    if (ctx.humans.length) await choose(intro, [{v: 1, html: 'Si comincia'}]);

    let carry = null;
    while (alive().length > 1) {
      const quick = !alive().some(p => !p.bot);
      const C = carry ? carry.p : await randomPick(quick);
      ctx.setActive(C);
      if (!carry && !quick) await host.say(`Il sorteggio sceglie ${C.name}.`, {mood: 'think', gesture: 'point', to: C});
      const B = await chooseOpp(C);
      const cat = B.data.cats[0] || pick(CATS);
      const lvl = ctx.qDiff;
      duelNo++; hud(); calm();
      let res;
      if (quick) { info('Duello lampo', `${esc(C.name)} contro ${esc(B.name)} · ${cat.name}`); await ctx.sleep(700); res = quickDuel(C, B, carry ? carry.rest : CLOCK); }
      else {
        host.say(`${C.name} sfida ${B.name}. Si gioca su ${cat.name.toLowerCase()}, la categoria di ${B.name}.`, {mood: 'think', gesture: 'point', to: B});
        await stageUp(C, B);
        res = await duel(C, B, cat, lvl, carry ? carry.rest : CLOCK);
      }
      carry = null;
      const {winner: W, loser: L, rest} = res;
      const g = grab(W, L), won = g.lc.length, elim = won === cellsOf(L).length;
      if (elim) { // categories: the duel category is used up (4+ players); the winner inherits the loser's others
        if (!part) [C, B].forEach(p => { p.data.cats = p.data.cats.filter(c => c !== cat); });
        W.data.cats.push(...L.data.cats); L.data.cats = [];
        if (!W.data.cats.length) { const free = CATS.filter(c => !P.some(p => p.data.cats.includes(c))); W.data.cats.push(pick(free.length ? free : CATS)); }
        L.alive = false; L.data.out = ++outN;
      }
      ctx.addScore(W, 100 + Math.round(rest) * 2); if (elim) ctx.addScore(L, outN * 10); ctx.setActive(W); hud();
      const cs = `${won} ${won === 1 ? 'casella' : 'caselle'}`;
      info(elim ? 'Eliminazione' : 'Duello vinto', `<span style="color:${L.color}">${esc(L.name)}</span> ${elim ? 'è eliminato' : `cede ${cs}`}.`,
        `<p class="sub"><span style="color:${W.color}">${esc(W.name)}</span> conquista ${cs} · tempo residuo ${fmt(rest)} s</p>`);
      W.data.obj.setMood('happy'); W.data.obj.celebrate(); L.data.obj.setMood('sad');
      if (!quick) {
        S.flashWith(W.color);
        host.say(`${L.name} ${elim ? 'è eliminato' : 'cede terreno'}. ${W.name} vince con ${Math.ceil(rest)} secondi di tempo residuo.`, {mood: 'surprised', to: W});
        if (elim) await eliminate(L);
        await stageDown(W);
      } else if (elim) await eliminate(L);
      overview();
      await takeover(W, L, g);
      W.data.obj.setMood('neutral'); if (!elim) L.data.obj.setMood('neutral');
      if (!quick && alive().length > 1 && await askContinue(W, rest)) carry = {p: W, rest};
    }

    const champ = alive()[0];
    ctx.addScore(champ, 2000); ctx.setActive(champ);
    const cp = homePos(champ);
    S.go([cp.x * .5, 4.5, cp.z + 7], [cp.x, 1, cp.z]); champ.data.obj.setMood('happy'); champ.data.obj.celebrate(); S.burst(champ.color);
    glowTiles(() => .4);
    await host.say(`${champ.name} conquista tutto il Floor. Promosso a pieni voti.`, {mood: 'happy', gesture: 'clap', to: champ});
    ctx.finish({title: `${champ.name} conquista il Floor!`, lines: [`Duelli giocati: ${duelNo} · Caselle: ${NC}`], ranking: P.map(p => ({player: p, score: p.score}))});
  }
};
