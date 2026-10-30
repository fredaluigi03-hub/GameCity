// Reazione a Catena — L'intesa vincente. Two teams of 3 (Blu campioni / Arancio sfidanti), 7 pot games, Intesa vincente, Ultima catena.
// Choices where the real rules are unclear are marked [non verificato].
import {THREE, newStage, tween, anim, label3d, mat, person, chair, deskTable, PAL, tune} from '../engine.js';
import {h, sfx, norm, near, countdown, shuffle, eur, tone} from '../ui.js';
import {createHost, HOSTS} from '../host.js';
import {CHAINS, TITLES, NEWS, SYLL, ZIP, QDCP, Q4, ZOT, INTESA, FINALS} from './catena_data.js';

const TEAMS = [
  {name: 'Blu', role: 'Campioni', col: '#4f7fd0', suit: '#24407a'},
  {name: 'Arancio', role: 'Sfidanti', col: '#d98a3d', suit: '#8a4a1e'}
];
const CPU = ['Marta', 'Ivo', 'Lea', 'Sandro', 'Pia', 'Tommaso', 'Greta', 'Dario'];
const V3 = THREE.Vector3;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const pick = a => a[Math.floor(Math.random() * a.length)];
const main = s => String(s).split('|')[0];
const clean = s => String(s).trim().replace(/^(l['’]\s*|un['’]\s*|(il|lo|la|i|gli|le|un|uno|una)\s+)/i, '');
const match = (txt, sol) => !!norm(txt) && String(sol).split('|').some(a => near(clean(txt), clean(a)) || near(txt, a));
const isL = ch => /\p{L}/u.test(ch);
// "M _ _ _": shown = number (prefix length) or function(i)
const pat = (w, shown) => [...w].map((ch, i) => !isL(ch) || (typeof shown === 'number' ? i < shown : shown(i)) ? ch : '_').join(' ');
const turnY = (cur, tgt) => { let d = tgt - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return cur + d; };
const POOL = [...new Set([...CHAINS.flat(), ...FINALS.flat(), ...ZIP.flat(), ...ZOT.flat(), ...SYLL.flatMap(s => s.w.map(x => x[0])),
  ...NEWS.flatMap(n => [...n.matchAll(/\[([^\]]+)\]/g)].map(m => m[1])), ...INTESA.filter(x => !x.a.includes(' ')).map(x => x.a)])];
const fits = (sol, shown) => w => { const a = norm(w), b = norm(main(sol)); return a.length === b.length && [...b].every((c, i) => !shown(i) || a[i] === c); };
const decoy = (sol, test) => shuffle(POOL).find(w => test(w) && !match(w, sol)) || null;
const prefixGuess = (sol, n) => decoy(sol, fits(sol, i => i < n)) || decoy(sol, w => norm(w).startsWith(norm(main(sol)).slice(0, n)));

export default {
  id: 'catena', name: 'Reazione a Catena', tag: 'L’intesa vincente', desc: 'Due squadre, parole a catena e l’intesa decide tutto', c1: '#3f74d8', c2: '#e08a3a',
  // Con CPU spenta si gioca con sei umani; con CPU attiva le squadre si completano a tre.
  players: {min: 1, max: 6, def: 6, rival: true, cpuRequiredBelow: 6},
  rules: [
    'Due squadre: <b>Blu</b> (campioni) contro <b>Arancio</b> (sfidanti). Gli umani si dividono tra le squadre; con la CPU attiva le squadre si completano a tre con concorrenti CPU, senza CPU giocano solo gli umani (a turno).',
    'Sette giochi riempiono il montepremi di ogni squadra: Le parole mancanti, Catena del titolo, La sillaba fortunata, Una tira l’altra + Zip, Quando dove come perché, Quattro per una e Zot.',
    'Nei giochi a prenotazione premi il tuo pulsante <b>PRENOTA</b> e scrivi la risposta: chi sbaglia blocca la propria squadra per quella parola.',
    '<b>L’intesa vincente</b>: 60 secondi. I due in piedi dicono una parola a testa, a turno (massimo 5 s tra una parola e l’altra, niente stessa radice né traduzioni), e chi è seduto indovina. +1 se giusta, −1 se sbagliata, 3 passo, 2 raddoppi sulle risposte di più parole.',
    'Chi vince l’intesa gioca <b>L’ultima catena</b>: 15 caselle, 10 s a parola, ogni errore dimezza il montepremi, 2 jolly, poi la parola finale in un minuto (si può comprare il terzo elemento).'
  ],
  async start(ctx) {
    const S = ctx.stage = newStage({c1: this.c1, c2: this.c2, bg: '#060a1c', cam: [0, 3.7, 12.8], look: [0, 3.4, 0]});
    const HOME = [[0, 3.7, 12.8], [0, 3.4, 0]];
    const home = () => S.go(...HOME);
    const sl = ms => ctx.sleep(ms);

    // ---------- teams ----------
    const T = TEAMS.map((d, i) => ({...d, i, m: [], pot: 0, it: 60, r: -1}));
    const hum = ctx.players.filter(p => !p.bot), bots = ctx.players.filter(p => p.bot);
    hum.forEach((p, k) => T[k % 2].m.push(p));
    const taken = new Set(ctx.players.map(p => p.name)), spare = CPU.filter(n => !taken.has(n));
    for (const t of T) while (ctx.cpu && t.m.length < 3) {
      let p = bots.shift();
      if (!p) { p = {id: 100 + spare.length, name: spare.shift(), bot: true, skill: .5 + Math.random() * .25, score: 0, alive: true, data: {}}; }
      t.m.push(p);
    }
    ctx.players.splice(0, ctx.players.length, ...T[0].m, ...T[1].m);
    T.forEach(t => t.m.forEach(p => { p.color = tune(t.col); p.data.team = t; p.skill ??= .6; }));
    const ALL = ctx.players;
    const other = t => T[1 - t.i];
    const nextOf = t => t.m[++t.r % t.m.length];
    const names = t => t.m.map(p => p.name).join(', ').replace(/, ([^,]*)$/, ' e $1');
    let gameNo = 0, gameName = '';
    const hud = () => ctx.hud(T.map(t => `<span class="pill"><span class="dot" style="--pc:${tune(t.col)}"></span>${t.name} <b>${eur(t.pot)}</b></span>`).join('') + (gameName ? `<span class="pill">${gameNo}/9 · ${gameName}</span>` : ''));
    const boardLines = t => [{t: `${t.name.toUpperCase()} · ${t.role.toUpperCase()}`, fs: .26, color: tune(t.col), font: 'Outfit'}, {t: eur(t.pot), fs: .5}];

    // ---------- 3D: team desks ----------
    const SEAT = new V3(0, 0, 1.7), GIV = [new V3(-1.25, 0, 2.75), new V3(1.25, 0, 2.75)];
    T.forEach((t, i) => {
      const s = i ? 1 : -1, g = new THREE.Group(); g.position.set(s * 5.3, 0, .9); g.rotation.y = -s * .52; S.add(g);
      g.add(deskTable(3.5, t.col));
      t.board = label3d(boardLines(t), {w: 2.6, h: .8, px: 170, accent: tune(t.col)}); t.board.position.set(0, 2.72, -1.15); g.add(t.board);
      t.g = g;
      const R = 3.5 / 1.6;
      t.m.forEach((p, k) => {
        const x = (k - 1) * 1.08, fem = /a$/i.test(p.name.trim());
        const pr = person({suit: t.suit, female: fem, hairStyle: pick(fem ? ['long', 'bob', 'bun'] : ['short', 'slick', 'curly']),
          skin: pick(['#efcaa9', '#e2b893', '#d9a77f', '#c99272', '#f0d0b4']), hair: pick(['#2a1d14', '#4a3020', '#7a3b22', '#1c1416', '#a07848']), tie: tune(t.col)});
        pr.position.set(x, 0, -.62); g.add(pr);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(.11, .13, .05, 20), mat('#1a1f33', {metalness: .7, roughness: .3})); base.position.set(x, 1.085, -.08);
        const bm = mat(new THREE.Color(tune(t.col)).multiplyScalar(.35), {emissive: '#000000', roughness: .25});
        const dome = new THREE.Mesh(new THREE.SphereGeometry(.085, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), bm); dome.position.set(x, 1.11, -.08);
        const th = Math.asin(x / R);
        const plate = label3d(p.name, {w: .92, h: .26, px: 200, fs: .66, accent: tune(t.col)});
        plate.position.set(Math.sin(th) * R, .74, -R + .5 + Math.cos(th) * R + .03); plate.rotation.y = th;
        g.add(base, dome, plate);
        Object.assign(p.data, {obj: pr, bm, x, sIn: -s});
      });
    });
    const lit = (p, on) => { p.data.bm.emissive.set(on ? tune(p.data.team.col) : '#000000'); p.data.bm.emissiveIntensity = on ? 1.3 : 0; };
    const buzz = p => { lit(p, true); tone(880, .12, 'square', .05); tone(1320, .18, 'triangle', .05, .08); S.flashWith(tune(p.data.team.col)); ctx.setActive(p); host.turnTo(p); };

    // ---------- 3D: chain walls (nested pivots swing, plates flip) ----------
    const linkG = new THREE.TorusGeometry(.065, .016, 8, 20), linkM = mat('#c9a85a', {metalness: .95, roughness: .28});
    const frameM = mat('#121831', {metalness: .55, roughness: .35}), beamM = mat('#9aa0ad', {metalness: .9, roughness: .35});
    function wall(n, {w, hh, gap = .16, top, z = -1.4, px = 150, fs = .6}) {
      const root = new THREE.Group(); root.position.set(0, top + 10, z); root.visible = false; S.add(root);
      root.add(new THREE.Mesh(new THREE.BoxGeometry(w + .8, .1, .14), beamM));
      [-1, 1].forEach(s => { const c = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 10, 6), linkM); c.position.set(s * (w / 2 + .3), 5, 0); root.add(c); });
      const cells = []; let par = root;
      for (let i = 0; i < n; i++) {
        const pv = new THREE.Group(); pv.position.y = i ? -(hh + gap) : -.05; par.add(pv);
        [0, 1].forEach(k => { const l = new THREE.Mesh(linkG, linkM); l.position.y = -gap * (.28 + k * .44); l.rotation.y = k ? Math.PI / 2 : 0; pv.add(l); });
        const pl = new THREE.Group(); pl.position.y = -gap - hh / 2; pv.add(pl);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(w + .1, hh + .1, .09), frameM); fr.position.z = -.05;
        const edgeM = mat('#2a3050', {emissive: '#000000', roughness: .4});
        const e1 = new THREE.Mesh(new THREE.BoxGeometry(w + .12, .03, .11), edgeM); e1.position.set(0, -hh / 2 - .05, -.04);
        const e2 = e1.clone(); e2.position.y = hh / 2 + .05;
        const lb = label3d('', {w, h: hh, px, fs}); lb.position.z = .005;
        pl.add(fr, e1, e2, lb);
        cells.push({pv, pl, lb, edgeM, a: 0, v: 0});
        par = pv;
      }
      anim.on((dt, t) => { if (!root.visible) return; const k = Math.min(dt, .05); cells.forEach((c, i) => { c.v += (-30 * c.a - 2.4 * c.v + Math.sin(t * .7 + i * 1.3) * .01) * k; c.a += c.v * k; c.pv.rotation.z = c.a; }); });
      const Wl = {cells, n,
        set(i, lines, o = {}) { cells[i].lb.set(lines, o); },
        async flip(i, lines, o = {}) {
          const c = cells[i]; c.v += (Math.random() - .5) * .5; tone(520, .05, 'triangle', .05);
          await ctx.w(tween(c.pl.rotation, {x: Math.PI / 2}, .16, 'in')); c.lb.set(lines, o);
          await ctx.w(tween(c.pl.rotation, {x: 0}, .75, 'spring'));
        },
        edge(i, col) { const m = cells[i].edgeM; m.color.set(col || '#2a3050'); m.emissive.set(col || '#000000'); m.emissiveIntensity = col ? .85 : 0; },
        kick(a = .3) { cells.forEach(c => { c.v += (Math.random() - .5) * a; }); },
        async show(count = n) {
          cells.forEach((c, i) => { c.pv.visible = i < count; c.pl.rotation.x = 0; Wl.edge(i, null); c.lb.set(''); });
          root.visible = true; root.position.y = top + 9; sfx.whoosh();
          await ctx.w(tween(root.position, {y: top}, 1.1, 'spring')); Wl.kick(.7);
        },
        async hide() { if (!root.visible) return; await ctx.w(tween(root.position, {y: top + 10}, .6, 'in')); root.visible = false; }
      };
      return Wl;
    }
    const W7 = wall(7, {w: 2.9, hh: .62, top: 6.85});
    const W4 = wall(4, {w: 5.4, hh: .8, top: 6.4, px: 120, fs: .5});
    const W15 = wall(15, {w: 2.7, hh: .44, gap: .1, top: 9.75, px: 170, fs: .66});
    const word = (t, color = PAL.ivory) => [{t, color}];
    const hid = t => [{t, color: PAL.goldHi}];

    // ---------- 3D: 60 s clock, chair, clue bubbles ----------
    const clk = new THREE.Group(); clk.position.set(0, 3.25, .9); clk.visible = false; S.add(clk);
    clk.add(new THREE.Mesh(new THREE.RingGeometry(.5, .6, 64), mat('#141a33', {side: THREE.DoubleSide})));
    const arc = new THREE.Mesh(new THREE.RingGeometry(.5, .6, 64), mat(PAL.gold, {emissive: PAL.gold, emissiveIntensity: .45, side: THREE.DoubleSide})); arc.position.z = .01; clk.add(arc);
    const num = label3d('60', {w: .9, h: .5, px: 200, bg: null, border: null, fs: .95}); num.position.z = .02; clk.add(num);
    let clkQ = -1, clkS = -1;
    const setClock = (sec, max) => {
      const f = Math.max(0, Math.min(1, sec / max)), q = Math.round(f * 120);
      if (q !== clkQ) { clkQ = q; arc.geometry.dispose(); arc.geometry = new THREE.RingGeometry(.5, .6, 64, 1, Math.PI / 2, Math.max(.001, f * Math.PI * 2)); }
      const s = Math.max(0, Math.ceil(sec)); if (s !== clkS) { clkS = s; num.set(String(s), {color: s <= 10 ? PAL.bad : PAL.ivory}); }
    };
    const seat = chair('#2a2f4a'); seat.position.copy(SEAT); seat.visible = false; S.add(seat);
    const bub = GIV.map(g => { const b = label3d('', {w: 1.7, h: .42, px: 170, fs: .62}); b.position.set(g.x, 2.35, g.z); b.visible = false; S.add(b); return b; });

    const host = createHost(ctx, {...HOSTS.catena, position: [-2.7, 0, 3.1]});
    ctx.players.forEach(p => { p.score = 0; });
    ctx.scoreboard(); hud();

    // ---------- money ----------
    const pay = (t, n) => {
      t.pot = Math.max(0, t.pot + n); t.m.forEach(p => { p.score = t.pot; });
      ctx.scoreboard(); hud(); t.board.set(boardLines(t));
      t.board.scale.setScalar(1.12); tween(t.board.scale, {x: 1, y: 1, z: 1}, .6, 'spring');
    };
    const right = (p, v) => { if (v) pay(p.data.team, v); sfx.ok(); S.flashWith(PAL.ok); lit(p, false); p.data.obj.celebrate(); host.react('right', p); };
    const wrong = p => { sfx.bad(); S.flashWith(PAL.bad); lit(p, false); p.data.obj.shrug(); host.react('wrong', p); };

    // ---------- DOM helpers ----------
    const card = (meta, body = '') => { const c = h('div', 'card'); c.innerHTML = `<div class="meta">${meta}</div>${body}`; return c; };
    const who = p => `<span class="who" style="--pc:${p.color}">${esc(p.name)}${p.bot ? ' · CPU' : ''}</span>`;
    const M = sub => `<span>${esc(gameName)}${sub ? ' · ' + sub : ''}</span>`;
    // human input: returns string, array (n>1) or an extra-button value
    function typeIn(p, {meta, body = '', time = 12, n = 1, ph = 'Scrivi la risposta…', extra = []}) {
      return ctx.w(new Promise(res => {
        const ins = Array.from({length: n}, (_, k) => `<input autocomplete="off" aria-label="Risposta ${k + 1}" placeholder="${n > 1 ? `Parola ${k + 1}` : ph}">`).join('');
        const c = card(meta + (p ? who(p) : ''), body + `<div class="timer"><i></i></div><form class="in">${ins}<button class="btn pri">Rispondi</button></form>`);
        const inp = [...c.querySelectorAll('input')]; let done = false;
        const fin = v => { if (done) return; done = true; cd.stop(); res(v); };
        const cd = countdown(ctx, time, {bar: c.querySelector('.timer i'), onEnd: () => fin(n > 1 ? inp.map(() => '') : '')});
        c.querySelector('form').onsubmit = e => { e.preventDefault(); if (inp.every(i => norm(i.value))) fin(n > 1 ? inp.map(i => i.value.trim()) : inp[0].value.trim()); else inp.find(i => !norm(i.value)).focus(); };
        if (extra.length) { const r = h('div', 'row'); extra.forEach(([lab, val]) => { const b = h('button', 'btn', lab); b.type = 'button'; b.onclick = () => fin(val); r.append(b); }); c.append(r); }
        ctx.dock(c); inp[0].focus();
      }));
    }
    const choose = (meta, body, opts) => ctx.w(new Promise(res => {
      const c = card(meta, body), r = h('div', 'row');
      opts.forEach(([lab, val, pri]) => { const b = h('button', 'btn' + (pri ? ' pri' : ''), lab); b.onclick = () => res(val); r.append(b); });
      c.append(r); ctx.dock(c); r.querySelector('button').focus();
    }));
    const botSays = async (p, txt, meta) => { ctx.dock(card(meta + who(p), `<p class="msg">dice…</p><div class="big disp">${esc(txt)}</div>`)); await sl(1300); };
    // one answer: human types, bot answers by chance -> {txt, ok} or {act}
    async function answer(p, sol, {meta, body = '', time = 10, chance = .5, dec, extra}) {
      ctx.setActive(p);
      if (!p.bot) { const v = await typeIn(p, {meta, body, time, extra}); return typeof v === 'string' ? {txt: v, ok: match(v, sol)} : {act: v.act}; }
      ctx.dock(card(meta + who(p), body + '<p class="msg">ci pensa…</p>'));
      await sl(900 + Math.random() * 1500);
      const ok = Math.random() < chance, txt = ok ? main(sol) : (dec && dec()) || 'Passo';
      await botSays(p, txt, meta);
      return {txt, ok: ok || match(txt, sol)};
    }
    const botAt = (p, steps) => Math.random() < .2 + p.skill * .7 ? Math.max(.6, steps * (1.1 - p.skill) * (.35 + Math.random() * .85)) : Infinity;
    // buzzer race: step(k) reveals, ends on first buzz -> {p, k} or {p: null, k}
    function race({eligible, steps, k0 = 0, ms, step, body, meta}) {
      return ctx.w(new Promise(res => {
        let k = k0, done = false; const timers = [], t0 = performance.now(), total = (steps - k0 + 1) * ms;
        const c = card(meta, `<div class="rb">${body()}</div><div class="timer"><i></i></div>`);
        const rb = c.querySelector('.rb'), bar = c.querySelector('.timer i'), row = h('div', 'row');
        eligible.filter(p => !p.bot).forEach(p => { const b = h('button', 'btn pri', `🔔 Prenota · ${esc(p.name)}`); b.onclick = () => end(p); row.append(b); });
        if (row.children.length) c.append(row);
        ctx.dock(c); row.querySelector('button')?.focus();
        const iv = setInterval(() => { if (k >= steps) return end(null); k++; step(k); rb.innerHTML = body(); }, ms);
        const bi = setInterval(() => { bar.style.transform = `scaleX(${Math.max(0, 1 - (performance.now() - t0) / total)})`; }, 100);
        eligible.filter(p => p.bot).forEach(p => { const at = botAt(p, steps); if (at <= steps + .9) timers.push(setTimeout(() => end(p), Math.max(500, (at - k0) * ms + Math.random() * 600))); });
        const clear = () => { clearInterval(iv); clearInterval(bi); timers.forEach(clearTimeout); };
        function end(p) { if (done || ctx.dead) return; done = true; clear(); if (p) buzz(p); res({p, k}); }
        ctx.onExit(clear);
      }));
    }
    // buzzer item: wrong answer locks that team for this item. Returns winning player or null
    async function buzzItem({sol, steps, ms, step, body, meta, value, chance, dec}) {
      const locked = new Set(); let k = 0;
      for (;;) {
        const elig = ALL.filter(p => !locked.has(p.data.team));
        if (!elig.length) return null;
        const r = await race({eligible: elig, steps, k0: k, ms, step, body, meta});
        k = r.k; if (!r.p) return null;
        const a = await answer(r.p, sol, {meta, body: body(), time: 10, chance: chance(r.p, k), dec: () => dec(k)});
        if (a.ok) { right(r.p, value(k)); return r.p; }
        wrong(r.p); locked.add(r.p.data.team);
        ctx.dock(card(meta, `<p class="msg">${esc(r.p.name)}: «${esc(a.txt || '…')}» — no! Squadra ${r.p.data.team.name} bloccata.</p>`)); await sl(900);
      }
    }
    async function intro(name, line, text) {
      gameNo++; gameName = name; hud(); home(); ctx.setActive(null);
      const go = choose(`<span>Gioco ${gameNo} di 9</span>`, `<h2>${esc(name)}</h2><p class="msg" style="text-align:left">${text}</p>`, [['Via!', 1, true]]);
      host.say(line, {mood: 'happy', gesture: 'point'});
      await go; host.stop();
    }

    // ---------- walking (Intesa staging) ----------
    async function walk(pr, pts, ry) {
      S.scene.attach(pr); pr.sit(false);
      const stop = anim.on((dt, t) => { pr.rig.position.y = Math.abs(Math.sin(t * 8)) * .035; });
      for (const q of pts) {
        const dx = q.x - pr.position.x, dz = q.z - pr.position.z, d = Math.hypot(dx, dz); if (d < .02) continue;
        tween(pr.rotation, {y: turnY(pr.rotation.y, Math.atan2(dx, dz))}, .35, 'out');
        await ctx.w(tween(pr.position, {x: q.x, z: q.z}, Math.max(.35, d / 1.7), 'inout'));
      }
      stop(); pr.rig.position.y = 0;
      await ctx.w(tween(pr.rotation, {y: turnY(pr.rotation.y, ry)}, .5, 'inout'));
    }
    const exitPt = p => { const t = p.data.team; t.g.updateMatrixWorld(); return t.g.localToWorld(new V3(p.data.sIn * 2.2, 0, -.35)); };
    async function goHome(p) {
      const t = p.data.team, pr = p.data.obj; t.g.updateMatrixWorld();
      await walk(pr, [exitPt(p), t.g.localToWorld(new V3(p.data.x, 0, -.62))], t.g.rotation.y);
      t.g.attach(pr); pr.position.set(p.data.x, 0, -.62); pr.rotation.set(0, 0, 0);
    }

    // ================= GAMES =================
    // no spoilers: items sharing 2+ words with anything already drawn (finale first) are skipped
    const usedW = new Set();
    const fresh = (pool, n, words = x => x) => {
      const out = [];
      for (const it of shuffle(pool)) { if (out.length >= n) break; const ws = words(it).map(norm); if (ws.filter(w => usedW.has(w)).length < 2) { out.push(it); ws.forEach(w => usedW.add(w)); } }
      for (const it of shuffle(pool)) { if (out.length >= n) break; if (!out.includes(it)) out.push(it); }
      return out;
    };
    const FIN = fresh(FINALS, 1)[0], chainPool = fresh(CHAINS, 2), ZIPW = fresh(ZIP, 1)[0], ZOTS = fresh(ZOT, 3);
    const played = new Set(); // answers already seen this show: pushed to the end of the Intesa pool

    // 1. Le parole mancanti
    async function g1() {
      await intro('Le parole mancanti', 'Prima prova: una notizia con sei buchi. Chi si prenota per primo?',
        'Una notizia con <b>6 parole omesse</b>. Le lettere compaiono una alla volta: prenotati e scrivi la parola. <b>2.000 €</b> a parola.');
      const txt = pick(NEWS), words = [...txt.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
      await W7.show(6); words.forEach((w, i) => W7.set(i, hid(pat(w, 0))));
      for (let i = 0; i < 6; i++) {
        const w = words[i], order = shuffle([...w].map((_, j) => j)), shown = new Set(), sh = j => shown.has(j);
        W7.edge(i, PAL.gold); W7.kick(.2);
        const body = () => { let j = -1; return `<h2 style="font-size:1.05rem;line-height:1.5">${esc(txt).replace(/\[([^\]]+)\]/g, (m, x) => { j++; return j < i ? `<b class="gold">${x}</b>` : j === i ? `<b style="color:var(--gold-hi);letter-spacing:.12em">[ ${pat(w, sh)} ]</b>` : '<span style="opacity:.45">[ … ]</span>'; })}</h2>`; };
        const win = await buzzItem({sol: w, steps: w.length - 1, ms: 1250, meta: M(`parola ${i + 1}/6`), body, value: () => 2000,
          step: k => { shown.add(order[k - 1]); W7.set(i, hid(pat(w, sh))); sfx.tick(); },
          chance: (p, k) => Math.min(.95, .2 + p.skill * .4 + k / w.length * .5), dec: () => decoy(w, fits(w, sh))});
        await W7.flip(i, word(w, win ? PAL.ivory : PAL.mut)); W7.edge(i, win ? PAL.ok : PAL.bad);
        if (!win) { ctx.dock(card(M(), `<p class="msg">Nessuno: era <b class="gold">${w}</b>.</p>`)); await sl(1200); }
      }
      await sl(600); await W7.hide();
    }

    // 2. Catena del titolo (adattamento della catena musicale)
    let firstHand = null;
    function jingle(seed, layers) {
      const sc = [0, 2, 4, 7, 9, 12, 14], base = 262 * Math.pow(2, (seed % 5) / 12); let r = seed * 7919 + 13;
      const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
      const mel = Array.from({length: 8}, () => sc[Math.floor(rnd() * sc.length)]), f = n => base * Math.pow(2, n / 12), st = .17;
      mel.forEach((n, i) => {
        tone(f(n), .16, 'triangle', .06, i * st);
        if (layers > 1 && i % 2 === 0) tone(f(mel[0] - 12), .3, 'sine', .08, i * st);
        if (layers > 2) tone(f(n + 7), .07, 'square', .012, i * st + st / 2);
        if (layers > 3 && i % 4 === 2) tone(f(n + 12), .22, 'sine', .035, i * st);
      });
    }
    async function g2() {
      await intro('Catena del titolo', 'Una catena e, nascosto dietro, un titolo famoso. Più parole trovate, più indizi!',
        'Catena di <b>7 parole</b>: la prima è scoperta, delle altre vedi l’iniziale. Ogni parola vale <b>2.000 €</b>, aggiunge uno strato al jingle e svela un indizio su un <b>titolo</b> (film, libro o luogo celebre). Errore: una lettera in più e la mano passa. Al tuo turno puoi tentare il titolo: <b>2.000 € × parole mancanti + 5.000 €</b>; se sbagli, 2.000 € passano agli avversari. <i>Adattamento senza brani musicali; il titolo lo può tentare solo chi ha la mano [non verificato].</i>');
      const ch = chainPool[0], ti = pick(TITLES), seed = TITLES.indexOf(ti) + 3;
      played.add(norm(main(ti.a)));
      const letters = ch.map(() => 1), done = ch.map((_, i) => i === 0);
      await W7.show(7); W7.set(0, word(ch[0])); W7.edge(0, PAL.gold); ch.forEach((w, i) => i && W7.set(i, hid(pat(w, 1))));
      let hand = T[0].pot < T[1].pot ? T[0] : T[1], titled = false;
      firstHand = hand;
      const resolved = () => done.filter(Boolean).length - 1;
      const nClues = () => Math.min(4, 1 + Math.floor(resolved() * 3 / 6));
      const clues = (all) => `<ol style="margin:0 0 10px 18px;color:#e4dccb;line-height:1.45">${ti.c.slice(0, all ? 4 : nClues()).map(c => `<li>${esc(c)}</li>`).join('')}</ol>`;
      const tryTitle = async (p, t, bonusOnly) => {
        const val = bonusOnly ? 5000 : 2000 * (6 - resolved()) + 5000, meta = M(`titolo per ${eur(val)}`);
        let a;
        if (!p.bot) { const v = await typeIn(p, {meta, body: clues(bonusOnly) + '<h2>Qual è il titolo?</h2>', time: 15, ph: 'Titolo…'}); a = {txt: v, ok: match(v, ti.a)}; }
        else { const ok = Math.random() < .25 + p.skill * .35 + nClues() * .08; const txt = ok ? main(ti.a) : main(pick(TITLES.filter(x => x !== ti).map(x => x.a))); await botSays(p, txt, meta); a = {txt, ok}; }
        if (a.ok) { right(p, val); jingle(seed, 4); return true; }
        wrong(p); if (!bonusOnly) { pay(t, -2000); pay(other(t), 2000); }
        return false;
      };
      for (let i = 1; i < 7 && !titled;) {
        const p = nextOf(hand), meta = M(`parola ${i + 1}/7 · mano ai ${hand.name}`);
        W7.edge(i, tune(hand.col)); host.turnTo(p); lit(p, true);
        const body = clues() + `<h2 style="letter-spacing:.12em">${pat(ch[i], letters[i])}</h2>`;
        let a;
        if (p.bot && Math.random() < (nClues() - 1) * .16 * p.skill) a = {act: 'T'};
        else a = await answer(p, ch[i], {meta, body, time: 15, chance: Math.min(.9, .3 + p.skill * .4 + letters[i] * .08), dec: () => prefixGuess(ch[i], letters[i]),
          extra: [['🎬 Tento il titolo', {act: 'T'}]]});
        lit(p, false);
        if (a.act === 'T') { if (await tryTitle(p, hand, false)) titled = true; else hand = other(hand); continue; }
        if (a.ok) { right(p, 2000); done[i] = true; await W7.flip(i, word(ch[i])); W7.edge(i, PAL.ok); jingle(seed, Math.min(4, resolved())); i++; }
        else {
          wrong(p); letters[i]++;
          if (letters[i] >= [...ch[i]].length) { done[i] = true; await W7.flip(i, word(ch[i], PAL.mut)); W7.edge(i, PAL.bad); i++; }
          else W7.set(i, hid(pat(ch[i], letters[i])));
          hand = other(hand);
        }
      }
      if (titled) { for (let i = 1; i < 7; i++) if (!done[i]) { done[i] = true; await W7.flip(i, word(ch[i], PAL.mut)); } }
      else {
        for (const t of [hand, other(hand)]) { const p = nextOf(t); host.turnTo(p); if (await tryTitle(p, t, true)) { titled = true; break; } }
      }
      ctx.dock(card(M(), `<p class="msg">Il titolo era <b class="gold">${esc(main(ti.a))}</b>.</p>`)); await sl(1600);
      await W7.hide();
    }

    // 3. La sillaba fortunata
    async function g3() {
      const set = pick(SYLL);
      await intro('La sillaba fortunata', `La sillaba fortunata di oggi è ${set.s}. Sette parole, tutte cominciano così!`,
        `Sette parole che iniziano con la sillaba fortunata <b>${set.s}</b>. Leggi la definizione: le lettere compaiono pian piano, prenotati e scrivi la parola. <b>2.000 €</b> a parola, la settima ne vale <b>5.000</b> <i>[importo delle prime sei non verificato]</i>.`);
      await W7.show(7); set.w.forEach(([w], i) => W7.set(i, hid(pat(w, 2))));
      for (let i = 0; i < 7; i++) {
        const [w, def] = set.w[i], order = shuffle([...w].map((_, j) => j).filter(j => j >= 2)).slice(0, -1), shown = new Set(), sh = j => j < 2 || shown.has(j);
        W7.edge(i, PAL.gold);
        const val = i === 6 ? 5000 : 2000;
        const body = () => `<h2>${esc(def)}</h2><div class="big disp" style="letter-spacing:.14em">${pat(w, sh)}</div>`;
        const win = await buzzItem({sol: w, steps: order.length, ms: 1400, meta: M(`${i + 1}/7 · ${eur(val)}`), body, value: () => val,
          step: k => { shown.add(order[k - 1]); W7.set(i, hid(pat(w, sh))); sfx.tick(); },
          chance: (p, k) => Math.min(.95, .3 + p.skill * .4 + k / w.length * .4), dec: () => decoy(w, fits(w, sh))});
        await W7.flip(i, word(w, win ? PAL.ivory : PAL.mut)); W7.edge(i, win ? PAL.ok : PAL.bad);
      }
      await sl(600); await W7.hide();
    }

    // 4. Una tira l'altra + Zip
    async function zipGame(closer) {
      const z = ZIPW, lt = [0, 1, 1, 0];
      await W4.show(4); W4.set(0, word(z[0])); W4.set(3, word(z[3])); [1, 2].forEach(i => W4.set(i, hid(pat(z[i], 1))));
      host.say(`Zip! ${closer.name}, giocate o passate?`, {to: closer.m[1]});
      const decider = closer.m.find(p => !p.bot);
      const play = decider ? await choose(M(`zip per 15.000 € · ${closer.name}`), `<h2>${z[0]} → ${pat(z[1], 1)} → ${pat(z[2], 1)} → ${z[3]}</h2><p class="msg">10 secondi per le due parole centrali. Se sbagliate tocca agli avversari; se passate, loro avranno due lettere in più.</p>`, [['Giochiamo', true, true], ['Passiamo', false]])
        : Math.random() < .7;
      const attempt = async (t, extra) => {
        [1, 2].forEach(i => { lt[i] = Math.min([...z[i]].length - 1, 1 + extra); W4.set(i, hid(pat(z[i], lt[i]))); W4.edge(i, tune(t.col)); });
        const p = t.m.find(x => !x.bot) || nextOf(t), meta = M(`zip · ${eur(15000)}`);
        const body = `<h2>${z[0]} → ${pat(z[1], lt[1])} → ${pat(z[2], lt[2])} → ${z[3]}</h2>`;
        buzz(p); let ok;
        if (!p.bot) { const v = await typeIn(p, {meta, body, time: 10, n: 2}); ok = match(v[0], z[1]) && match(v[1], z[2]); }
        else { await sl(1500); ok = Math.random() < .2 + p.skill * .4 + extra * .15; await botSays(p, ok ? `${z[1]} · ${z[2]}` : `${prefixGuess(z[1], lt[1]) || '…'} · ${prefixGuess(z[2], lt[2]) || '…'}`, meta); }
        if (ok) right(p, 15000); else wrong(p);
        return ok;
      };
      if (!(play && await attempt(closer, 0))) await attempt(other(closer), play ? 1 : 2);
      await W4.flip(1, word(z[1])); await W4.flip(2, word(z[2])); await sl(1200); await W4.hide();
    }
    async function g4() {
      await intro('Una tira l’altra', 'Una tira l’altra: prima e ultima parola le vedete già. Da dove partite?',
        'Catena di 7 parole con prima e ultima scoperte. Chi ha la mano sceglie se partire <b>dall’alto</b> o <b>dal basso</b> e riceve l’iniziale. <b>3.000 €</b> a parola; errore = una lettera in più e la mano passa. Chi chiude la catena può tentare la <b>Zip</b> (4 caselle, 10 s, <b>15.000 €</b>) o passarla agli avversari.');
      const ch = chainPool[1], letters = ch.map(() => 1), done = ch.map((_, i) => i === 0 || i === 6);
      await W7.show(7); W7.set(0, word(ch[0])); W7.set(6, word(ch[6])); for (let i = 1; i < 6; i++) W7.set(i, hid('?'));
      let hand = firstHand ? other(firstHand) : T[1];
      while (done.some(d => !d)) {
        const top = done.indexOf(false), bot = done.lastIndexOf(false), p = nextOf(hand);
        let i = top;
        if (top !== bot) {
          if (!p.bot) i = await choose(M(`mano ai ${hand.name}`) + who(p), `<h2>Da dove parti?</h2><p class="msg">Dall’alto: dopo <b>${ch[top - 1]}</b> · Dal basso: prima di <b>${ch[bot + 1]}</b></p>`, [['▲ Dall’alto', top, true], ['▼ Dal basso', bot, true]]);
          else { await sl(700); i = letters[bot] > letters[top] || (letters[bot] === letters[top] && Math.random() < .5) ? bot : top; }
        }
        W7.edge(i, tune(hand.col)); W7.set(i, hid(pat(ch[i], letters[i]))); lit(p, true); host.turnTo(p);
        const a = await answer(p, ch[i], {meta: M(`${eur(3000)} · mano ai ${hand.name}`), time: 12,
          body: `<p class="msg" style="text-align:left">${i < 6 && done[i + 1] ? 'Prima di <b>' + ch[i + 1] + '</b>' : ''} ${i > 0 && done[i - 1] ? ' Dopo <b>' + ch[i - 1] + '</b>' : ''}</p><h2 style="letter-spacing:.12em">${pat(ch[i], letters[i])}</h2>`,
          chance: Math.min(.9, .3 + p.skill * .4 + letters[i] * .08), dec: () => prefixGuess(ch[i], letters[i])});
        if (a.ok) { right(p, 3000); done[i] = true; await W7.flip(i, word(ch[i])); W7.edge(i, PAL.ok); }
        else {
          wrong(p); letters[i]++;
          if (letters[i] >= [...ch[i]].length) { done[i] = true; await W7.flip(i, word(ch[i], PAL.mut)); W7.edge(i, PAL.bad); }
          else W7.set(i, hid(pat(ch[i], letters[i])));
          hand = other(hand);
        }
      }
      await sl(700); await W7.hide();
      await zipGame(hand);
    }

    // 5. Quando, dove, come, perché
    async function g5() {
      await intro('Quando, dove, come, perché', 'Quattro indizi, uno alla volta. Chi indovina al primo prende il doppio!',
        'Quattro indizi in ordine: <b>quando, dove, come, perché</b>. Prenotati quando hai capito: <b>4.000 €</b>, <b>8.000 €</b> se rispondi al primo indizio.');
      const LAB = ['QUANDO', 'DOVE', 'COME', 'PERCHÉ'], sets = shuffle(QDCP).slice(0, 3);
      sets.forEach(q => played.add(norm(main(q.a))));
      for (let n = 0; n < sets.length; n++) {
        const q = sets[n]; let k = 0;
        await W4.show(4);
        const paint = () => q.c.forEach((c, i) => W4.set(i, i <= k ? [{t: LAB[i], fs: .26, color: PAL.gold, font: 'Outfit'}, {t: c, fs: .34, font: 'Outfit'}] : [{t: LAB[i], fs: .3, color: PAL.mut, font: 'Outfit'}]));
        paint(); W4.edge(0, PAL.gold);
        const body = () => `<ol style="margin:0 0 6px 18px;line-height:1.5">${q.c.slice(0, k + 1).map((c, i) => `<li><b class="gold">${LAB[i]}</b> · ${esc(c)}</li>`).join('')}</ol>`;
        const win = await buzzItem({sol: q.a, steps: 3, ms: 4500, meta: M(`${n + 1}/3`), body, value: kk => kk === 0 ? 8000 : 4000,
          step: kk => { k = kk; paint(); W4.edge(kk, PAL.gold); W4.kick(.3); sfx.tick(); },
          chance: (p, kk) => Math.min(.92, .25 + p.skill * .35 + kk * .12), dec: () => main(pick(QDCP.filter(x => x !== q)).a)});
        ctx.dock(card(M(), `<p class="msg">${win ? 'Esatto' : 'Era'}: <b class="gold">${esc(main(q.a))}</b></p>`)); await sl(1400);
        await W4.hide();
      }
    }

    // 6. Quattro per una
    async function g6() {
      await intro('Quattro per una', 'Quattro indizi in ordine sparso e una sola soluzione. Pulsanti pronti!',
        'Quattro indizi compaiono <b>in ordine casuale</b> e portano a un personaggio, un oggetto o un luogo. Ognuno ha il suo pulsante: <b>8.000 €</b> a chi indovina.');
      const sets = shuffle(Q4).slice(0, 2);
      sets.forEach(q => played.add(norm(main(q.a))));
      for (let n = 0; n < sets.length; n++) {
        const q = sets[n], cl = shuffle(q.c); let k = 0;
        await W4.show(4);
        const paint = () => cl.forEach((c, i) => W4.set(i, i <= k ? [{t: c, fs: .42, font: 'Outfit'}] : hid('?')));
        paint(); W4.edge(0, PAL.gold);
        const body = () => `<div class="chips">${cl.slice(0, k + 1).map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>`;
        const win = await buzzItem({sol: q.a, steps: 3, ms: 4000, meta: M(`${n + 1}/2 · ${eur(8000)}`), body, value: () => 8000,
          step: kk => { k = kk; paint(); W4.edge(kk, PAL.gold); W4.kick(.3); sfx.tick(); },
          chance: (p, kk) => Math.min(.92, .25 + p.skill * .35 + kk * .12), dec: () => main(pick(Q4.filter(x => x !== q)).a)});
        ctx.dock(card(M(), `<p class="msg">${win ? 'Esatto' : 'Era'}: <b class="gold">${esc(main(q.a))}</b></p>`)); await sl(1400);
        await W4.hide();
      }
    }

    // 7. Zot
    async function g7() {
      const t = T[0].pot < T[1].pot ? T[0] : T[1], o = other(t);
      await intro('Zot', `Zot! Tocca ai ${t.name}, che sono dietro: ogni risposta giusta ruba cinque secondi agli avversari.`,
        `Gioca solo la squadra in svantaggio (<b>${t.name}</b>; a parità gli sfidanti <i>[non verificato]</i>), un concorrente alla volta: trova la parola legata ai due termini, con l’iniziale, in <b>10 s</b>. Giusta = <b>+5 s</b> per la tua Intesa e <b>−5 s</b> agli avversari; errore = <b>−5 s</b>.`);
      const items = ZOTS;
      await W4.show(3);
      for (let n = 0; n < 3; n++) {
        const [a, x, y] = items[n], p = t.m[n % t.m.length];
        await ctx.passDevice(p);
        W4.set(0, word(x)); W4.set(1, hid(pat(a, 1))); W4.set(2, word(y)); W4.edge(1, tune(t.col)); W4.kick(.4);
        buzz(p);
        const r = await answer(p, a, {meta: M(`${n + 1}/3`), body: `<h2>${x} · ${pat(a, 1)} · ${y}</h2>`, time: 10, chance: .3 + p.skill * .5, dec: () => prefixGuess(a, 1)});
        if (r.ok) { right(p, 0); t.it += 5; o.it -= 5; } else { wrong(p); t.it -= 5; }
        t.it = Math.max(40, Math.min(80, t.it)); o.it = Math.max(40, Math.min(80, o.it));
        await W4.flip(1, word(a)); W4.edge(1, r.ok ? PAL.ok : PAL.bad);
        ctx.dock(card(M(), `<p class="msg">Tempo per l’Intesa: <b>${T[0].name} ${T[0].it} s</b> · <b>${T[1].name} ${T[1].it} s</b></p>`)); await sl(1300);
      }
      await W4.hide();
    }

    // 8. L'intesa vincente
    const fouls = (w, tg, said) => {
      const v = w.trim(), n = norm(v);
      if (!/^[\p{L}’']+$/u.test(v)) return 'una sola parola per volta';
      const roots = tg.a.split(/[\s’']+/).filter(x => x.length > 2).map(norm);
      if (roots.some(r => n.startsWith(r.slice(0, Math.min(4, r.length))) || (n.length >= 4 && r.startsWith(n.slice(0, 4))))) return 'stessa radice della parola da indovinare';
      if (said.some(s => norm(s) === n)) return 'parola già detta';
      return null;
    };
    async function stageIn(t, g, gs) {
      seat.visible = true;
      const yaw = v => Math.atan2(SEAT.x - v.x, SEAT.z - v.z) * .55;
      await Promise.all([walk(g.data.obj, [exitPt(g), SEAT], 0), ...gs.map((p, k) => walk(p.data.obj, [exitPt(p), GIV[k]], yaw(GIV[k])))]);
      g.data.obj.sit(true); g.data.obj.lookAt(new V3(0, 1.6, 2.7));
      gs.forEach(p => p.data.obj.lookAt(g.data.obj.head));
    }
    async function stageOut(t) { seat.visible = false; bub.forEach(b => { b.visible = false; }); t.m.forEach(p => p.data.obj.lookAt(null)); await Promise.all(t.m.map(goHome)); }
    async function roles(t) {
      if (t.roles) return t.roles;
      const hs = t.m.filter(p => !p.bot);
      let g;
      if (hs.length === 1) {
        g = await choose(M(`squadra ${t.name}`) + who(hs[0]), `<h2>${esc(hs[0].name)}, che ruolo vuoi?</h2><p class="msg">Seduto indovini; in piedi suggerisci una parola alla volta (vedi la parola tenendo premuto un pulsante).</p>`, [['Indovino io (seduto)', hs[0], true], ['Suggerisco io (in piedi)', t.m.find(p => p.bot)]]);
      } else g = hs[0] || pick(t.m);
      return t.roles = {g, gs: t.m.filter(p => p !== g)};
    }
    function intesaTurn(t, targets, dur) {
      const {g, gs} = t.roles, human = t.m.some(p => !p.bot);
      return ctx.w(new Promise(res => {
        const st = {busy: false, left: dur, run: false, score: 0, passes: 3, dbl: 2, dblOn: false, ti: -1, ci: 0, gt: 0, since: 0, cad: 1.8, said: [], spd: 1, el: 0, botAns: null, done: false, first: null};
        const c = card(M(`squadra ${t.name}`) + `<span class="who" style="--pc:${tune(t.col)}">Seduto: ${esc(g.name)}</span>`,
          `<div class="timer"><i></i></div><div class="stat msg" style="text-align:left;margin-bottom:8px"></div><div class="chips"></div><div class="giv"></div><div class="gue"></div><div class="row btns"></div>`);
        const bar = c.querySelector('.timer i'), stat = c.querySelector('.stat'), chips = c.querySelector('.chips'), giv = c.querySelector('.giv'), gue = c.querySelector('.gue'), btns = c.querySelector('.btns');
        let gin = null;
        if (!g.bot) {
          gue.innerHTML = `<form class="in"><input autocomplete="off" aria-label="Risposta" placeholder="${esc(g.name)}: scrivi e premi Invio per rispondere"><button class="btn pri">Rispondo</button></form>`;
          gin = gue.querySelector('input');
          // first keystroke = buzzer: the clock stops and the answer is taken after ANSW s
          gin.addEventListener('input', () => { if (!st.run || st.busy || ansT) return; st.run = false; buzz(g); stat.innerHTML = `<b class="gold">Prenotato!</b> ${ANSW} secondi per rispondere`; ansT = setTimeout(submitG, ANSW * 1000); });
          gue.querySelector('form').onsubmit = e => { e.preventDefault(); if (ansT) submitG(); };
        }
        let ansT = null; const ANSW = 4; // 3 s del regolamento + 1 s per digitare
        const clearAns = () => { clearTimeout(ansT); ansT = null; };
        const submitG = () => { clearAns(); const v = gin.value.trim(); gin.value = ''; judge(v || '—', match(v, targets[st.ti].a)); };
        ctx.onExit(clearAns);
        let hin = null, peekS = null;
        if (gs.some(p => !p.bot)) {
          giv.innerHTML = `<form class="in"><input autocomplete="off" aria-label="Parola indizio"><button class="btn">Dico</button></form><div class="row"><button type="button" class="btn peek">👁 Tieni premuto per vedere la parola</button><span class="peekS disp big" style="flex:2;font-size:1.6rem"></span></div>`;
          hin = giv.querySelector('input'); peekS = giv.querySelector('.peekS');
          const pk = giv.querySelector('.peek');
          const show = on => { peekS.textContent = on && st.ti >= 0 && st.ti < targets.length ? targets[st.ti].a : ''; };
          pk.onpointerdown = () => show(true); pk.onpointerup = pk.onpointerleave = pk.onpointercancel = () => show(false);
          giv.querySelector('form').onsubmit = e => {
            e.preventDefault(); const p = gs[st.gt]; if (!st.run || p.bot) return;
            const v = hin.value.trim(); if (!norm(v)) return; hin.value = '';
            const f = fouls(v, targets[st.ti], st.said);
            if (f) foul(`${p.name}: ${f}`); else say(st.gt, v.toUpperCase());
          };
        }
        const bPass = h('button', 'btn', ''), bDbl = h('button', 'btn', ''), bFf = h('button', 'btn', '⏩ Avanti veloce');
        bPass.onclick = () => pass(); bDbl.onclick = () => { const tg = targets[st.ti]; if (st.run && st.dbl > 0 && !st.dblOn && tg.a.includes(' ')) { st.dbl--; st.dblOn = true; sfx.drum(); render(); } };
        bFf.onclick = () => { st.spd = st.spd > 1 ? 1 : 4; bFf.textContent = st.spd > 1 ? '▶ Velocità normale' : '⏩ Avanti veloce'; };
        if (human) btns.append(bPass); if (gs.some(p => !p.bot)) btns.append(bDbl); if (!human) btns.append(bFf);
        ctx.dock(c);
        function render() {
          const tg = targets[st.ti];
          stat.innerHTML = `Punti <b class="gold">${st.score}</b> · Passo <b>${st.passes}</b> · Raddoppi <b>${st.dbl}</b>${st.dblOn ? ' · <b class="gold">RADDOPPIO ATTIVO (±2)</b>' : ''}`;
          bPass.textContent = `Passo (${st.passes})`; bPass.disabled = !st.passes;
          bDbl.textContent = `Raddoppio (${st.dbl})`; bDbl.disabled = !(st.dbl > 0 && !st.dblOn && tg && tg.a.includes(' '));
          if (hin) { const p = gs[st.gt]; hin.disabled = p.bot; hin.placeholder = p.bot ? `Tocca a ${p.name}…` : `${p.name}: una parola (Invio)`; if (!p.bot) hin.focus(); }
          if (gin && (!hin || gs[st.gt].bot)) gin.focus();
        }
        function next() {
          clearAns(); st.busy = false; st.ti++; st.ci = 0; st.since = 0; st.said = []; st.dblOn = false; st.botAns = null; st.cad = 1.4 + Math.random() * 1.2;
          if (st.ti >= targets.length) return end();
          const tg = targets[st.ti]; chips.innerHTML = ''; bub.forEach(b => b.set(''));
          if (tg.a.includes(' ') && st.dbl > 0 && gs.every(p => p.bot) && Math.random() < .75) { st.dbl--; st.dblOn = true; }
          if (peekS) peekS.textContent = '';
          render(); st.run = true;
        }
        function say(k, w) {
          st.said.push(w); st.since = 0; st.gt = 1 - st.gt; st.cad = 1.4 + Math.random() * 1.2;
          const b = bub[k]; b.visible = true; b.set(w); b.scale.setScalar(.6); tween(b.scale, {x: 1, y: 1, z: 1}, .45, 'back');
          tone(660 + k * 120, .06, 'triangle', .04);
          chips.insertAdjacentHTML('beforeend', `<span class="chip">${esc(w)}</span>`);
          if (g.bot) { const n = st.said.length; if (Math.random() < g.skill * (.1 + .1 * n)) st.botAns = {at: st.el + .6 + Math.random(), ok: true}; else if (Math.random() < .05 + n * .015) st.botAns = {at: st.el + .8 + Math.random(), ok: false}; }
          render();
        }
        async function judge(txt, ok) {
          if (st.done || st.busy) return;
          st.busy = true; st.run = false; lit(g, true);
          const v = st.dblOn ? 2 : 1, tg = targets[st.ti];
          st.score += ok ? v : -v; if (ok && st.first == null) st.first = dur - st.left;
          (ok ? sfx.ok : sfx.bad)(); S.flashWith(ok ? PAL.ok : PAL.bad); if (ok) g.data.obj.clap(); else g.data.obj.shrug();
          stat.innerHTML = `${esc(g.name)}: «${esc(txt)}» — ${ok ? `<b style="color:var(--ok)">giusto! +${v}</b>` : `<b class="bad">no, −${v}</b>`} · era <b class="gold">${esc(tg.a)}</b>`;
          await sl(1300); lit(g, false);
          if (st.done) return;
          if (st.left <= 0) return end();
          next();
        }
        async function pass() {
          if (!st.run || st.busy || !st.passes) return;
          st.busy = true; st.run = false; st.passes--; sfx.whoosh();
          stat.innerHTML = `Passo! Era <b class="gold">${esc(targets[st.ti].a)}</b>`;
          await sl(1000); if (!st.done) next();
        }
        async function foul(why) {
          if (st.busy) return; st.busy = true; st.run = false; sfx.bad();
          stat.innerHTML = `<b class="bad">Parola annullata</b> (${esc(why)}). Era <b class="gold">${esc(targets[st.ti].a)}</b>`;
          await sl(1500); if (!st.done) next();
        }
        function end() {
          if (st.done) return; st.done = true; st.run = false; clearAns(); stopT(); bub.forEach(b => b.set(''));
          res({score: st.score, first: st.first ?? 99});
        }
        const stopT = anim.on(dt => {
          if (!st.run || st.done) return;
          const d = dt * st.spd; st.left -= d; st.since += d; st.el += d;
          setClock(st.left, dur); bar.style.transform = `scaleX(${Math.max(0, st.left / dur)})`;
          if (st.left <= 0) { st.left = 0; setClock(0, dur); sfx.drum(); return end(); }
          const p = gs[st.gt], tg = targets[st.ti];
          if (p.bot) {
            if (st.since >= st.cad) {
              while (st.ci < tg.c.length && st.said.some(s => norm(s) === norm(tg.c[st.ci]))) st.ci++;
              if (st.ci < tg.c.length) say(st.gt, tg.c[st.ci++].toUpperCase());
              else if (g.bot && !st.botAns) { if (st.passes) pass(); else st.botAns = {at: st.el + 1, ok: Math.random() < g.skill * .6}; }
            }
          } else if (st.since >= 5) foul(`${p.name}: più di 5 secondi senza parola`);
          if (st.botAns && st.el >= st.botAns.at) { const b = st.botAns; st.botAns = null; buzz(g); judge(b.ok ? tg.a : (main(pick(INTESA.filter(x => x !== tg)).a)), b.ok); }
        });
        ctx.onExit(stopT);
        setClock(dur, dur); next();
      }));
    }
    async function g8() {
      gameNo++; gameName = 'L’intesa vincente'; hud(); home();
      await choose(M(), `<h2>L’intesa vincente</h2><p class="msg" style="text-align:left">Due concorrenti in piedi dicono <b>una parola a testa</b>, alternandosi, per far indovinare al compagno seduto. Massimo 5 s tra una parola e l’altra, niente parole con la stessa radice né traduzioni: un fallo annulla la parola. Chi è seduto si prenota iniziando a scrivere: il tempo si ferma e ha <b>3 s</b> per rispondere (+1 s per digitare). <b>+1</b> giusta, <b>−1</b> sbagliata, <b>3 passo</b>, <b>2 raddoppi</b> (±2) sulle risposte di più parole. Tempo: ${T[0].name} ${T[0].it} s, ${T[1].name} ${T[1].it} s. Comincia ${T[1].name} <i>[ordine non verificato]</i>.</p>`, [['Via!', 1, true]]);
      host.say('Ed eccoci al momento più bello: l’intesa vincente!', {mood: 'happy', gesture: 'celebrate'});
      const pool = shuffle(INTESA).sort((a, b) => played.has(norm(a.a)) - played.has(norm(b.a))), lists = [pool.slice(0, 20), pool.slice(20, 40)], tie = pool.slice(40);
      const res = [];
      for (const t of [T[1], T[0]]) {
        await roles(t);
        const {g, gs} = t.roles;
        if (!g.bot) await ctx.passDevice(g);
        host.say(`Tocca ai ${t.name}! ${g.name} si siede, ${gs[0].name} e ${gs[1].name} suggeriscono.`, {to: g});
        await stageIn(t, g, gs);
        S.go([0, 2.9, 8.4], [0, 1.9, 1.7]); clk.visible = true; setClock(t.it, t.it);
        await sl(900);
        res[t.i] = await intesaTurn(t, lists[t.i], t.it);
        clk.visible = false;
        ctx.dock(card(M(), `<p class="msg">${t.name}: <b class="gold">${res[t.i].score}</b> parole.</p>`));
        host.say(`${t.name}: ${res[t.i].score} ${res[t.i].score === 1 ? 'parola' : 'parole'}!`, {mood: 'happy', to: g});
        await stageOut(t); home(); await sl(800);
      }
      let w = res[0].score === res[1].score ? null : res[0].score > res[1].score ? T[0] : T[1];
      for (let k = 0; !w && k < 2; k++) {
        host.say('Parità! Spareggio: quindici secondi a squadra.', {mood: 'surprised'});
        ctx.dock(card(M('spareggio'), `<h2>Parità ${res[0].score} a ${res[1].score}: spareggio da 15 secondi</h2><p class="msg">Parole diverse per le due squadre, perché giocate sullo stesso schermo <i>[nel programma è la stessa parola]</i>.</p>`)); await sl(2200);
        const r2 = [];
        for (const t of [T[1], T[0]]) {
          await stageIn(t, t.roles.g, t.roles.gs); S.go([0, 2.9, 8.4], [0, 1.9, 1.7]); clk.visible = true;
          r2[t.i] = await intesaTurn(t, tie.slice(t.i * 6 + k * 3, t.i * 6 + k * 3 + 3), 15);
          clk.visible = false; await stageOut(t); home();
        }
        if (r2[0].score !== r2[1].score) w = r2[0].score > r2[1].score ? T[0] : T[1];
        else if (r2[0].first !== r2[1].first) w = r2[0].first < r2[1].first ? T[0] : T[1];
      }
      w ||= T[0]; // ancora pari: restano i campioni [non verificato]
      S.burst(tune(w.col), 140, 5); sfx.win();
      w.m.forEach(p => p.data.obj.celebrate()); other(w).m.forEach(p => p.data.obj.setMood('sad'));
      ctx.dock(card(M(), `<h2>Vincono i ${w.name}!</h2><p class="msg">${res[0].score} a ${res[1].score}. Giocano l’ultima catena con <b class="gold">${eur(w.pot)}</b>.</p>`));
      await host.say(`Vincono i ${w.name}! ${names(w)}, vi aspetta l’ultima catena, con ${eur(w.pot)} in palio.`, {mood: 'happy', gesture: 'celebrate', to: w.m[1]});
      await sl(1200);
      return w;
    }

    // 9. L'ultima catena
    async function g9(t) {
      gameNo++; gameName = 'L’ultima catena'; hud();
      const ch = FIN; let pot = t.pot, jolly = 2, jUsed = false, r = 0;
      const potL = () => `Montepremi <b class="gold">${eur(pot)}</b> · Jolly <b>${jolly}</b>`;
      await choose(M(), `<h2>L’ultima catena · ${t.name}</h2><p class="msg" style="text-align:left">15 parole, ognuna legata alle due vicine. Le caselle dispari sono scoperte. Per le prime 6 coperte giocate <b>uno alla volta, senza consultarvi</b>: iniziale e <b>10 s</b>. Errore: il montepremi si <b>dimezza</b> e il compagno ha una lettera in più; se sbaglia anche lui la parola si scopre e si dimezza ancora. <b>2 jolly</b> danno una lettera senza dimezzare. Poi la parola finale, insieme, in <b>1 minuto</b>: si può comprare il terzo elemento (dimezzando, gratis se non avete usato jolly), e avete <b>20 s</b> per la risposta.</p><p class="msg">${potL()}</p>`, [['Via!', 1, true]]);
      S.go([0, 5.3, 14.5], [0, 5.3, 0]);
      await W15.show(15);
      ch.forEach((w, i) => W15.set(i, i % 2 === 0 && i < 14 ? word(w) : hid('• • •')));
      host.say(`Ultima catena per i ${t.name}! In palio ${eur(pot)}.`, {mood: 'happy'});
      const halve = () => { pot = Math.floor(pot / 2); t.pot = pot; t.m.forEach(p => { p.score = pot; }); ctx.scoreboard(); t.board.set(boardLines(t)); hud(); };
      for (const i of [1, 3, 5, 7, 9, 11]) {
        const w = ch[i], len = [...w].length; let lt = 1, ok = false;
        for (let tr = 0; tr < 2 && !ok; tr++) {
          const p = t.m[r++ % t.m.length]; await ctx.passDevice(p);
          W15.edge(i, PAL.gold); W15.set(i, hid(pat(w, lt))); buzz(p);
          for (;;) {
            const meta = M(`parola ${(i + 1) / 2}/6`), body = `<p class="msg">${potL()}</p><h2>${ch[i - 1]} · <span style="letter-spacing:.12em">${pat(w, lt)}</span> · ${ch[i + 1]}</h2>`;
            if (p.bot && jolly && lt < len - 1 && Math.random() < .3) { jolly--; jUsed = true; lt++; W15.set(i, hid(pat(w, lt))); sfx.click(); ctx.dock(card(meta + who(p), `<p class="msg">${esc(p.name)} usa un jolly!</p>`)); await sl(900); continue; }
            const a = await answer(p, w, {meta, body, time: 10, chance: Math.min(.92, .3 + p.skill * .4 + lt * .08), dec: () => prefixGuess(w, lt), extra: jolly && lt < len - 1 ? [[`🃏 Jolly (${jolly})`, {act: 'J'}]] : []});
            if (a.act === 'J') { jolly--; jUsed = true; lt++; W15.set(i, hid(pat(w, lt))); sfx.click(); continue; }
            ok = a.ok; break;
          }
          lit(p, false);
          if (ok) { sfx.ok(); S.flashWith(PAL.ok); host.react('right', p); }
          else { wrong(p); halve(); lt = Math.min(len - 1, lt + 1); if (tr === 0) W15.set(i, hid(pat(w, lt))); }
        }
        await W15.flip(i, word(w, ok ? PAL.ivory : PAL.mut)); W15.edge(i, ok ? PAL.ok : PAL.bad);
      }
      // final group word
      const fw = ch[13], fl = [...fw].length, shF = i => i < 2 || i === fl - 1;
      W15.set(13, hid(pat(fw, shF))); W15.edge(13, PAL.gold); W15.edge(14, PAL.mut);
      host.say('L’ultima parola. Adesso potete consultarvi: un minuto!', {mood: 'think'});
      let bought = false;
      const buy = async () => { bought = true; if (jUsed) halve(); await W15.flip(14, word(ch[14])); };
      const hp = t.m.find(p => !p.bot), fBody = () => `<p class="msg">${potL()}</p><h2>${ch[12]} · <span style="letter-spacing:.12em">${pat(fw, shF)}</span> · ${bought ? ch[14] : '?'}</h2>`;
      let ans = '';
      if (hp) {
        const v = await typeIn(null, {meta: M('parola finale · 60 s, insieme'), body: fBody(), time: 60, ph: 'La parola finale…', extra: [[`Compra il terzo elemento (${jUsed ? '−50%' : 'gratis'})`, {act: 'B'}]]});
        const isB = v?.act === 'B';
        if (isB) await buy();
        else if (v === '' && await choose(M('tempo!'), `<h2>Comprate il terzo elemento?</h2><p class="msg">${jUsed ? 'Costa metà del montepremi' : 'È gratis: non avete usato jolly'}.</p>`, [['Compra', true, true], ['No, rispondiamo così', false]])) await buy();
        ans = isB || v === '' ? await typeIn(null, {meta: M('risposta finale · 20 s'), body: fBody(), time: 20, ph: 'La parola finale…'}) : v;
      } else {
        ctx.dock(card(M('parola finale'), fBody() + '<p class="msg">La squadra si consulta…</p>')); await sl(3000);
        let ch1 = .3 + t.m.reduce((s, p) => s + p.skill, 0) / 3 * .3;
        if (Math.random() > ch1 + .1) { await buy(); ch1 += .2; ctx.dock(card(M('parola finale'), fBody() + '<p class="msg">Comprano il terzo elemento…</p>')); await sl(2500); }
        ans = Math.random() < ch1 ? fw : (prefixGuess(fw, 2) || '…');
        await botSays(t.m[0], ans, M('risposta finale'));
      }
      const won = match(ans, fw) ? pot : 0;
      if (!bought) await W15.flip(14, word(ch[14]));
      await W15.flip(13, word(fw, won ? PAL.ivory : PAL.mut)); W15.edge(13, won ? PAL.ok : PAL.bad);
      if (won) { sfx.win(); S.burst(PAL.goldHi, 160, 8); t.m.forEach(p => p.data.obj.celebrate()); await host.react('win', t.m[1], {value: eur(won)}); }
      else { sfx.bad(); await host.react('lose', t.m[1]); }
      await sl(1500);
      return {won, fw, ans};
    }

    // ================= SHOW =================
    await host.say(`Ciao a tutti e benvenuti a Reazione a Catena! Da una parte i campioni Blu: ${names(T[0])}. Dall’altra gli sfidanti Arancio: ${names(T[1])}. Pronti a fare catena?`, {mood: 'happy', gesture: 'wave'});
    await g1(); await g2(); await g3(); await g4(); await g5(); await g6(); await g7();
    const w = await g8();
    const fin = await g9(w);
    host.react('outro');
    const lose = other(w);
    ctx.finish({
      title: fin.won ? `I ${w.name} vincono ${eur(fin.won)}!` : `Vincono i ${w.name}, ma la catena resiste`,
      win: w.m.some(p => !p.bot) && fin.won > 0,
      lines: [`L’intesa l’hanno vinta i ${w.name}. Parola finale: <b>${esc(fin.fw)}</b>${fin.won ? '' : ` (risposta: «${esc(fin.ans || '—')}»)`}.`, `I ${lose.name} tornano a casa senza premio (montepremi accumulato ${eur(lose.pot)}).`],
      ranking: [...w.m.map(p => ({player: p, score: fin.won})), ...lose.m.map(p => ({player: p, score: 0}))]
    });
  }
};
