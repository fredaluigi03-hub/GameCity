import {THREE, newStage, tween, label3d, ease, mat, person, anim, PAL} from '../engine.js';
import {h, sfx, eur, norm, shuffle, tone, countdown} from '../ui.js';
import {createHost, HOSTS} from '../host.js';
import {DEFS, BOTOLE, PASSI} from './caduta_data.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const rand = (a, b) => a + Math.random() * (b - a);
const pickR = a => a[Math.floor(Math.random() * a.length)];
const angd = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

const MALE_A = /^(luca|andrea|nicola|mattia|elia|enea|tobia|battista|gianluca|giosue)$/;
// ponytail: gender from the name (Italian -a heuristic), only used for the champion's M/F alternation
const genderOf = n => (/a$/.test(norm(n)) && !MALE_A.test(norm(n)) ? 'F' : 'M');

const SUITS = ['#2a3557', '#3a2f4a', '#2f4a45', '#4a3a2a', '#253a5a', '#4a2a35', '#33384a', '#2d4a3a', '#4a4030', '#3a2a4a', '#2a4048'];
const SKINS = ['#f0d0b4', '#e9c3a0', '#dcae88', '#c99272', '#a9745a', '#efcaa9'];
const HAIRS = ['#2a1d14', '#1c1416', '#6b4a2a', '#b9b6b0', '#7a3b22', '#c9a46a'];
const KEY = 'flex:1;min-width:0;max-width:46px;height:42px;padding:0;border-radius:9px;border:1px solid var(--line-soft);background:rgba(244,239,227,.06);color:var(--tx);font-weight:700;font-size:1rem;cursor:pointer;';
const BOX = 'display:inline-grid;place-items:center;width:clamp(24px,6.6vw,40px);height:clamp(30px,8vw,48px);border-radius:8px;font:400 clamp(1.15rem,3.8vw,1.7rem) "Bebas Neue",Outfit,Arial;letter-spacing:0;';

const LINES = {
  intro: ['Benvenuti a Caduta Libera! Undici concorrenti, dieci botole e un campione al centro!', 'Si parte! {name}, il centro dello studio è tuo: tre vite e tanta adrenalina!', 'Buonasera! Qui sotto ogni piede c’è una botola. Pronti?'],
  right: ['Esatto!', 'Sì! Giusto, {name}!', 'Bravissimo! Si continua!', 'Perfetto! La botola resta chiusa!', 'Velocissimo, {name}!', 'Giusto! Tocca all’altro!'],
  wrong: ['Tempo scaduto!', 'Nooo, {name}! Il tempo è finito!', 'Ahi! Il cronometro non perdona!', 'Peccato, {name}!'],
  win: ['Ce l’ha fatta! {name} vince {value}!', 'Incredibile! {value} per {name}!', 'Vittoria! Lo studio esplode!'],
  lose: ['E giùùù! Caduta libera!', 'Si apre la botola! Che volo, {name}!', 'Peccato, {name}! Il materasso ti aspetta!'],
  suspense: ['Tre, due, uno…', 'Che tensione in studio!', 'Il pavimento aspetta…', 'Silenzio! Tutto si decide adesso!'],
  outro: ['Grazie a tutti! Alla prossima caduta!', 'È tutto! Tenete i piedi ben piantati!', 'Ciao {name}, che puntata!']
};
// lecca-lecca squares (weighted by repetition)
const EFFS = [
  ...Array(3).fill({k: 'money', v: 5000}), ...Array(3).fill({k: 'money', v: 10000}), ...Array(2).fill({k: 'money', v: 20000}), {k: 'money', v: 50000},
  {k: 'life'}, {k: 'life'}, {k: 'scream'}, {k: 'scream'}, {k: 'double'}, {k: 'double'}, {k: 'half'}, {k: 'half'}, {k: 'zero'}
];
const val = e => ({zero: -1, half: 0, scream: 1, life: 2, double: 3})[e.k] ?? 1 + e.v / 50000; // valore stimato per il CPU
const effTxt = e => e.k === 'money' ? ['+ ' + eur(e.v)] : {life: ['+1 VITA'], scream: ['+1 URLO'], double: ['RADDOPPIO', 'MONTEPREMI × 2'], half: ['DIMEZZA', 'MONTEPREMI ÷ 2'], zero: ['AZZERA', 'MONTEPREMI A ZERO']}[e.k];

export default {
  id: 'caduta', name: 'Caduta Libera', tag: 'Un campione, dieci botole', desc: 'Il campione sfida dieci concorrenti sulle botole: chi resta senza tempo e senza vite cade', c1: '#1ec8ff', c2: '#ffffff',
  players: {min: 1, max: 4, def: 11}, questions: true,
  rules: [
    'Il Giocatore 1 è il campione al centro, con 3 vite; gli altri (fino a 10) sono sfidanti, ognuno sulla propria botola. Con la CPU si arriva a 11 concorrenti; senza CPU si gioca solo tra umani (minimo 2).',
    'Con meno di 5 concorrenti si giocano più manche: a turno ognuno è il campione e sfida gli altri. Vince chi accumula più soldi nelle finali.',
    'Il campione sceglie ogni volta uno sfidante, alternando uomo e donna. Nel duello si risponde a turno a una definizione con alcune lettere già visibili: 30 secondi, tentativi illimitati. Scrivi con la tastiera o tocca le lettere.',
    'Allo scadere del tempo perdi una vita; senza vite si apre la botola. Il campione può passare la domanda: se lo sfidante indovina gli ruba una vita. Il campione ha anche un «urlo del pubblico» che suggerisce la risposta.',
    'Se cade il campione, lo sfidante prende il suo posto. Dopo ogni sfidante eliminato il campione gioca al lecca-lecca: piede bianco o piede nero (soldi, vite, urli, raddoppio, dimezzamento o azzeramento).',
    'Con un solo sfidante rimasto si gioca l’ultima sfida (stesse vite, 15 secondi). Il vincitore va in finale: «Le 10 botole» o «I 10 passi». Vince il montepremi (minimo 10.000 €) o cade.'
  ],
  async start(ctx) {
    const S = ctx.stage = newStage({c1: this.c1, c2: this.c2, bg: '#060a18', cam: [0, 12, 23], look: [0, 1.4, -1]});
    const WIDE = [[0, 7.2, 15.5], [0, 1.3, -.8]];
    const V = (x, y, z) => new THREE.Vector3(x, y, z);

    // ---------- trapdoor podium with two hinged flaps ----------
    function trap(x, z, r, rIn, top) {
      const g = new THREE.Group(); g.position.set(x, 0, z); S.add(g);
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, top, 48, 1, true), mat('#141a33', {metalness: .6, roughness: .35})); shell.position.y = top / 2;
      const deck = new THREE.Mesh(new THREE.RingGeometry(rIn + .015, r, 48), mat('#222a4a', {metalness: .55, roughness: .3})); deck.rotation.x = -Math.PI / 2; deck.position.y = top;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(rIn, rIn, top, 32, 1, true), new THREE.MeshStandardMaterial({color: '#05060b', roughness: 1, side: THREE.BackSide})); shaft.position.y = top / 2;
      const hole = new THREE.Mesh(new THREE.CircleGeometry(rIn, 32), new THREE.MeshBasicMaterial({color: '#000000'})); hole.rotation.x = -Math.PI / 2; hole.position.y = .025;
      const rimM = new THREE.MeshBasicMaterial({color: PAL.gold, toneMapped: false});
      const rim = new THREE.Mesh(new THREE.TorusGeometry(rIn + .03, .016, 6, 64), rimM); rim.rotation.x = -Math.PI / 2; rim.position.y = top + .005;
      const edge = new THREE.Mesh(new THREE.TorusGeometry(r, .022, 6, 64), mat('#8a7440', {metalness: .9, roughness: .3})); edge.rotation.x = -Math.PI / 2; edge.position.y = top;
      g.add(shell, deck, shaft, hole, rim, edge);
      const flapM = mat('#b9bfcc', {metalness: .85, roughness: .28});
      const flaps = [1, -1].map(s => {
        const pv = new THREE.Group(); pv.position.set(s * rIn, top, 0);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rIn - .006, rIn - .006, .05, 32, 1, false, s > 0 ? 0 : Math.PI, Math.PI), flapM);
        m.position.set(-s * rIn, -.026, 0); pv.add(m); g.add(pv); pv.userData.s = s; return pv;
      });
      // name plate facing the wide camera
      const d = V(WIDE[0][0] - x, 0, WIDE[0][2] - z).normalize();
      const plate = label3d([' '], {w: 1.36, h: .4, px: 200, fs: .5}); plate.position.set(d.x * (r + .03), Math.max(.22, top * .5), d.z * (r + .03)); plate.rotation.y = Math.atan2(d.x, d.z); g.add(plate);
      return {g, top, plate, feet: V(x, top, z),
        led: c => rimM.color.set(c),
        open: () => Promise.all(flaps.map(pv => tween(pv.rotation, {z: pv.userData.s * Math.PI / 2 * .96}, .95, 'spring'))),
        close: () => Promise.all(flaps.map(pv => tween(pv.rotation, {z: 0}, 1.1, 'inout')))};
    }
    const center = trap(0, 0, 1.5, .72, 1.0);
    const ring = Array.from({length: 10}, (_, i) => { const a = (-125 + i * 250 / 9) * Math.PI / 180, R = 6.4; return trap(R * Math.sin(a), -R * Math.cos(a), .85, .55, .55); });

    // ---------- audience tiers + crowd ----------
    const tierM = mat('#10152b', {metalness: .3, roughness: .6, side: THREE.DoubleSide});
    const crowdBase = [];
    for (let t = 0; t < 3; t++) {
      const r = 11.2 + t * .9, top = .45 * (t + 1);
      const tier = new THREE.Mesh(new THREE.CylinderGeometry(r + .45, r + .45, top, 64, 1, false, Math.PI - 1.2, 2.4), tierM); tier.position.y = top / 2; tier.userData.noShadow = true; S.add(tier);
      for (let k = 0; k < 34; k++) { const th = Math.PI - 1.12 + k * 2.24 / 33 + rand(-.015, .015); crowdBase.push(V(r * Math.sin(th), top, r * Math.cos(th))); }
    }
    const NC = crowdBase.length;
    const bodiesI = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.17, .42, 4, 8), mat('#ffffff', {roughness: .8, metalness: 0}), NC);
    const headsI = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 10, 8), mat('#ffffff', {roughness: .7, metalness: 0}), NC);
    const dummy = new THREE.Object3D(), cc = new THREE.Color();
    const crowdPose = (i, lift) => {
      const b = crowdBase[i];
      dummy.position.set(b.x, b.y + .38 + lift, b.z); dummy.updateMatrix(); bodiesI.setMatrixAt(i, dummy.matrix);
      dummy.position.y += .42; dummy.updateMatrix(); headsI.setMatrixAt(i, dummy.matrix);
    };
    for (let i = 0; i < NC; i++) { crowdPose(i, 0); bodiesI.setColorAt(i, cc.set(pickR(SUITS)).multiplyScalar(rand(.7, 1.2))); headsI.setColorAt(i, cc.set(pickR(SKINS))); }
    [bodiesI, headsI].forEach(m => { m.userData.noShadow = true; m.frustumCulled = false; S.add(m); });
    const phase = crowdBase.map(() => [rand(0, 6), rand(7, 12)]);
    let crowdStop = null;
    function crowd(amp = .15, dur = 2.2) {
      crowdStop?.(); let t = 0;
      crowdStop = anim.on(dt => {
        t += dt; const k = Math.max(0, 1 - t / dur);
        for (let i = 0; i < NC; i++) crowdPose(i, Math.abs(Math.sin(t * phase[i][1] + phase[i][0])) * amp * k);
        bodiesI.instanceMatrix.needsUpdate = headsI.instanceMatrix.needsUpdate = true;
        if (k <= 0) { crowdStop(); crowdStop = null; }
      });
    }

    // ---------- scream meter ----------
    const meter = new THREE.Group(); meter.position.set(-8.2, 0, 3.2); meter.rotation.y = .45; S.add(meter);
    const mf = new THREE.Mesh(new THREE.BoxGeometry(.62, 3.3, .22), mat('#0d1226', {metalness: .6, roughness: .3})); mf.position.y = 1.75; meter.add(mf);
    const segs = Array.from({length: 12}, (_, i) => {
      const c = new THREE.Color(PAL.ok).lerp(new THREE.Color(i < 6 ? PAL.gold : PAL.bad), i < 6 ? i / 6 : (i - 6) / 6);
      const m = new THREE.Mesh(new THREE.BoxGeometry(.42, .2, .04), mat('#1a1f33', {emissive: c, emissiveIntensity: 0, roughness: .4}));
      m.position.set(0, .35 + i * .245, .13); meter.add(m); return m;
    });
    const mlab = label3d(['URLO'], {w: 1.1, h: .36, px: 200, fs: .62}); mlab.position.set(0, 3.65, 0); meter.add(mlab);
    let level = 0, levelT = 0;
    S.on(dt => { levelT = Math.max(0, levelT - dt); const target = levelT > 0 ? .75 + Math.random() * .25 : 0; level += (target - level) * Math.min(1, dt * (target > level ? 9 : 2.2)); segs.forEach((m, i) => { m.material.emissiveIntensity = i / 12 < level ? .7 : 0; }); });

    // ---------- lecca-lecca board ----------
    const board = new THREE.Group(); board.position.set(8, 0, 3.8); board.rotation.y = Math.atan2(-8, 9 - 3.8); S.add(board);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 1.2, 12), mat('#9aa0ad', {metalness: .9, roughness: .3})); post.position.y = .6; board.add(post);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.3, 2.1, .14), mat('#0d1226', {metalness: .5, roughness: .35})); panel.position.y = 2.2; board.add(panel);
    const btitle = label3d(['LECCA-LECCA'], {w: 2.6, h: .5, px: 200, fs: .7}); btitle.position.set(0, 3.6, .08); board.add(btitle);
    const tiles = [['BIANCO', '#ece6d8', '#141a33'], ['NERO', '#0b0d16', PAL.ivory]].map(([n, bg, col], i) => {
      const t = new THREE.Group(); t.position.set(i ? .8 : -.8, 2.2, .1); board.add(t);
      const f = label3d([{t: 'PIEDE', fs: .26, color: col, font: 'Outfit'}, {t: n, fs: .4, color: col}], {w: 1.4, h: 1.7, px: 160, bg, border: PAL.gold});
      const b = label3d([' '], {w: 1.4, h: 1.7, px: 160, fs: .26}); b.rotation.y = Math.PI; b.position.z = -.01;
      t.add(f, b); return {t, b};
    });

    // ---------- landing pit (far below the set, reached by a camera cut) ----------
    const PIT = V(0, -60, 0);
    const room = new THREE.Mesh(new THREE.BoxGeometry(9, 6, 9), mat('#141a30', {side: THREE.BackSide, roughness: .9, metalness: 0})); room.position.set(PIT.x, PIT.y + 3, PIT.z); room.userData.noShadow = true; S.add(room);
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(3.4, .5, 3.4), mat('#2f4f8f', {roughness: .95, metalness: 0})); mattress.position.set(PIT.x, PIT.y + .25, PIT.z); S.add(mattress);
    const pitL = new THREE.PointLight('#ffe2c0', 40, 14); pitL.position.set(PIT.x + 1, PIT.y + 4.5, PIT.z + 2); S.add(pitL);
    const PIT_TOP = PIT.y + .5;

    // ---------- pot sign ----------
    let pot = 0, urli = 1;
    const potLbl = label3d(['MONTEPREMI', eur(0)], {w: 3.4, h: 1, px: 180, fs: .4}); potLbl.position.set(0, 4.7, -2.4); S.add(potLbl);

    // ---------- players: only those from cfg (no injected bots), bodies ----------
    const P = ctx.players, N = P.length, M = N < 5 ? N : 1; // < 5 concorrenti (solo umani): una manche a testa
    const slot = i => ring[Math.round((i + .5) * 10 / (N - 1) - .5)]; // sfidanti spalmati sull'anello
    let champ = P[0], mi = 0, lastG = null;
    P.forEach((p, i) => {
      p.data.g = genderOf(p.name); p.data.won = 0;
      const f = p.data.g === 'F';
      const look = {female: f, suit: p.bot ? SUITS[i % SUITS.length] : new THREE.Color(p.color).multiplyScalar(.55).getStyle(), tie: p.bot ? '#6a2b3a' : p.color,
        skin: SKINS[(i * 7) % SKINS.length], hair: HAIRS[(i * 5) % HAIRS.length], hairStyle: f ? ['long', 'bob', 'bun'][i % 3] : ['short', 'slick', 'curly', 'bald'][i % 4]};
      p.data.obj = S.add(person(look));
    });
    const host = createHost(ctx, {...HOSTS.caduta, lines: LINES, position: [-2.4, 0, 5.6], lookAt: [0, 1.5, 0]});

    // ---------- helpers ----------
    let watch = true, lastHuman = null;
    const pause = ms => ctx.sleep(watch ? ms : ms * .45);
    const talk = (t, o) => { const pr = host.say(t, o); return watch ? pr : Promise.resolve(); };
    const alive = () => P.filter(p => p.alive && p !== champ);
    const plate = p => {
      const tr = p.data.trap;
      if (!p.alive) return tr.plate.set([{t: p.name.toUpperCase(), color: PAL.mut, fs: .46}, {t: 'CADUTO', fs: .3, color: PAL.bad, font: 'Outfit'}]);
      const sub = (p === champ ? 'CAMPIONE' : p.bot ? 'CPU' : 'SFIDANTE') + (p.data.lives ? ` · VITE ${p.data.lives}` : '');
      tr.plate.set([{t: p.name.toUpperCase(), fs: .46}, {t: sub, fs: .3, color: PAL.goldHi, font: 'Outfit'}]);
    };
    const hud = () => {
      ctx.hud(`<span class="pill">🏆 <b>${esc(champ.name)}</b> <span class="hearts">${'♥'.repeat(champ.data.lives) || '0 vite'}</span> · 📣 ${urli}</span><span class="pill">Montepremi <b>${eur(pot)}</b></span>${M > 1 ? `<span class="pill">Manche <b>${mi}/${M}</b></span>` : ''}<span class="pill">Sfidanti <b>${alive().length}</b></span>`);
      potLbl.set(['MONTEPREMI', eur(pot)]);
      P.forEach(p => { p.score = p.data.won + (p === champ ? pot : 0); if (p.alive || p.data.trap !== center) plate(p); });
      ctx.scoreboard();
    };
    const head = p => p.data.obj.position.clone().setY(p.data.obj.position.y + 1.65);
    const face = (p, v, d = .6) => { const b = p.data.obj; return tween(b.rotation, {y: b.rotation.y + angd(Math.atan2(v.x - b.position.x, v.z - b.position.z), b.rotation.y)}, d, 'inout'); };
    const wide = (snap = false) => S.go(...WIDE, {snap});
    function shot(A, B) {
      const a = A.data.obj.position, b = B.data.obj.position, d = V(b.x - a.x, 0, b.z - a.z);
      if (d.lengthSq() < .01) d.set(0, 0, 1); d.normalize();
      const c = b.clone().addScaledVector(d, 2.6).addScaledVector(V(-d.z, 0, d.x), .9); c.y = b.y + 2.3;
      S.go(c.toArray(), [a.x, a.y + 1.15, a.z]);
      P.forEach(p => { if (p.alive && p !== A) p.data.obj.lookAt(head(A)); }); A.data.obj.lookAt(head(B));
    }
    async function hot(p) {
      ctx.setActive(p);
      if (!p.bot && ctx.humans.length > 1 && lastHuman !== p) await ctx.passDevice(p);
      if (!p.bot) lastHuman = p;
    }
    const who = p => `<span class="who" style="--pc:${p.color}">${esc(p.name)}${p.bot ? ' · CPU' : ''}</span>`;
    const roar = (n = 16) => { for (let i = 0; i < n; i++) tone(rand(160, 620), rand(.5, 1.1), 'sawtooth', .01, i * .035, rand(-120, 160)); };
    function walkTo(p, to, dur = 1.5) {
      const b = p.data.obj, from = b.position.clone();
      tween(b.rotation, {y: b.rotation.y + angd(Math.atan2(to.x - from.x, to.z - from.z), b.rotation.y)}, .35, 'inout');
      return ctx.w(new Promise(res => { let t = 0; const stop = anim.on(dt => {
        t = Math.min(1, t + dt / dur); b.position.lerpVectors(from, to, ease.sine(t));
        b.position.y += Math.sin(Math.PI * t) * .5 + Math.abs(Math.sin(t * Math.PI * 7)) * .035;
        if (t >= 1) { stop(); res(); }
      }); }));
    }

    // fall: flaps open, body drops, camera follows, cut to the pit, soft landing
    async function fall(p) {
      const tr = p.data.trap, b = p.data.obj;
      p.alive = false; ctx.scoreboard(); tr.led('#15171f');
      const d = V(WIDE[0][0] - tr.feet.x, 0, WIDE[0][2] - tr.feet.z).normalize();
      S.go([tr.feet.x + d.x * 2, tr.top + 3.4, tr.feet.z + d.z * 2], [tr.feet.x, tr.top - .4, tr.feet.z]);
      host.react('lose', p);
      b.setMood('surprised'); b.lookAt(null);
      await ctx.sleep(watch ? 700 : 300);
      sfx.drop(); S.shakeIt(.6); tr.open(); roar(10); crowd(.12, 1.6);
      await ctx.sleep(110);
      b.celebrate(1400);
      await ctx.w(tween(b.position, {y: tr.top - 3.4}, .62, 'in'));
      S.par = .06; S.go([PIT.x + 3.4, PIT.y + 2.4, PIT.z + 3.6], [PIT.x, PIT.y + 1, PIT.z], {snap: true});
      b.position.set(PIT.x, PIT.y + 5.8, PIT.z); b.rotation.y = .7;
      await ctx.w(tween(b.position, {y: PIT_TOP}, .5, 'in'));
      sfx.drum();
      tween(mattress.scale, {y: .55}, .09, 'out').then(() => tween(mattress.scale, {y: 1}, .7, 'spring'));
      await ctx.w(tween(b.position, {y: PIT_TOP + .38}, .24, 'out'));
      await ctx.w(tween(b.position, {y: PIT_TOP}, .55, 'bounce'));
      b.sit(true); b.setMood('happy'); b.shrug();
      await ctx.sleep(watch ? 1700 : 800);
      b.visible = false; b.sit(false);
      S.par = .5; wide(true);
      tr.close(); plate(p);
      P.forEach(q => { if (q.alive && q !== champ && Math.random() < .5) q.data.obj.clap(); });
    }

    // ---------- choice card (human taps, CPU decides) ----------
    function choose(p, {kicker, title, items, time, onTime, bot, one}) {
      return ctx.w(new Promise(res => {
        const card = h('div', 'card');
        card.innerHTML = `<div class="meta"><span>${kicker}</span>${who(p)}<span>${time ? '<b class="tl" style="color:var(--gold-hi)"></b> s' : ''}</span></div><h2>${title}</h2>${time ? '<div class="timer"><i></i></div>' : ''}<div class="opts"></div>`;
        const box = card.querySelector('.opts'); if (one) box.style.gridTemplateColumns = '1fr';
        let done = false, cd, bt;
        const fin = v => { if (done) return; done = true; cd?.stop(); clearTimeout(bt); box.querySelectorAll('button').forEach(b => { b.disabled = true; }); sfx.click(); setTimeout(() => res(v), 350); };
        const btns = items.map((it, i) => { const b = h('button', 'opt', `<b>${it.tag ?? i + 1}</b><span>${it.label}</span>`); b.disabled = !!p.bot; b.onclick = () => fin(it.value); box.append(b); return b; });
        if (time) cd = countdown(ctx, time, {bar: card.querySelector('.timer i'), label: card.querySelector('.tl'), onEnd: () => fin(onTime)});
        if (p.bot) { const v = bot(); ctx.botThink(watch ? 1100 : 500, watch ? 2700 : 1100).then(async () => { btns[items.findIndex(it => it.value === v)]?.classList.add('picked'); await ctx.sleep(450); fin(v); }); }
        ctx.dock(card);
      }));
    }

    // ---------- crossword turn: resolves 'ok' | 'time' | 'pass' ----------
    const usedD = new Set();
    function drawDef() {
      const lvl = ctx.pool(DEFS); let pool = lvl.filter(d => !usedD.has(d.a));
      if (!pool.length) { usedD.clear(); pool = lvl; }
      const d = pickR(pool); usedD.add(d.a);
      return {d: d.q, a: d.a, shown: reveal(d.a.length, Math.round(d.a.length * [.45, .35, .25][ctx.qDiff - 1]))};
    }
    function reveal(L, n) { n = Math.max(1, Math.min(L - 1, n)); const s = Array(L).fill(false); shuffle([...Array(L).keys()]).slice(0, n).forEach(i => { s[i] = true; }); return s; }
    const know = (p, q, t) => Math.min(.92, .25 + (p.skill ?? .6) * .75 - q.shown.filter(x => !x).length / q.a.length * .25 + (t >= 30 ? .05 : -.05));

    function turn(p, q, {clock, n, canPass = false, canScream = false, passProb = .5}) {
      const A = q.a;
      return ctx.w(new Promise(res => {
        let typed = [], done = false, el = 0, lastS = -1;
        const hiddenN = () => q.shown.filter(s => !s).length;
        const card = h('div', 'card');
        card.innerHTML = `<div class="meta"><span>${n}</span>${who(p)}<span><b class="tl" style="color:var(--gold-hi);font-size:1.25rem">${Math.ceil(clock.left)}</b> s</span></div><h2>${esc(q.d)}</h2><div class="cw" style="display:flex;flex-wrap:wrap;justify-content:center;gap:5px;margin:2px 0 12px"></div><div class="timer"><i></i></div><p class="msg st" style="min-height:1.3em;margin:-6px 0 8px"></p>`;
        const cw = card.querySelector('.cw'), bar = card.querySelector('.timer i'), tl = card.querySelector('.tl'), st = card.querySelector('.st');
        const draw = s => {
          let k = 0;
          cw.innerHTML = [...A].map((ch, i) => {
            const fix = q.shown[i], t = fix || s ? ch : (typed[k++] || ''), bad = s === 'reveal' && !fix;
            const bg = s === 'ok' ? 'rgba(63,191,138,.28)' : fix ? 'rgba(216,180,90,.16)' : 'rgba(3,5,14,.55)';
            const bc = s === 'ok' ? 'var(--ok)' : bad ? 'var(--bad)' : fix ? 'var(--gold)' : t ? 'var(--gold-hi)' : 'var(--line-soft)';
            return `<span style="${BOX}background:${bg};border:1px solid ${bc};color:${bad ? 'var(--bad)' : fix ? 'var(--gold-hi)' : 'var(--tx)'}">${t}</span>`;
          }).join('');
        };
        bar.style.transform = `scaleX(${Math.max(0, clock.left / clock.total)})`;
        const wrongTry = () => { tone(150, .25, 'square', .04); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); typed = []; draw(); st.textContent = 'No! Riprova…'; };
        const submit = () => {
          if (done) return;
          if (typed.length < hiddenN()) { st.textContent = 'Completa la parola'; return; }
          let k = 0; const g = [...A].map((ch, i) => q.shown[i] ? ch : typed[k++]).join('');
          if (g === A) end('ok'); else wrongTry();
        };
        const add = c => { if (done || p.bot || typed.length >= hiddenN()) return; typed.push(c); sfx.click(); draw(); st.textContent = ''; if (typed.length === hiddenN()) setTimeout(submit, 160); };
        const del = () => { if (done || p.bot) return; typed.pop(); draw(); };
        let screamB;
        const paintScream = () => { if (screamB) { screamB.textContent = `📣 Urlo del pubblico (${urli})`; screamB.disabled = urli <= 0 || done; } };
        function scream() {
          if (done || urli <= 0) return;
          urli--; paintScream(); hud();
          const keep = Math.max(1, Math.round(A.length * .25)), hid = shuffle([...A].map((_, i) => i).filter(i => !q.shown[i]));
          hid.slice(0, Math.max(hid.length > 1 ? 1 : 0, hid.length - keep)).forEach(i => { q.shown[i] = true; });
          typed = []; draw(); st.textContent = 'Il pubblico urla la risposta!';
          levelT = 2.6; roar(26); crowd(.28, 2.6); S.flashWith(PAL.goldHi);
          host.say(pickR(['Urlo del pubblico! Ascolta bene!', 'Pubblico, tocca a voi: urlate!', 'Che boato! Hai sentito?']), {mood: 'surprised', gesture: 'point'});
        }
        if (!p.bot) {
          const kb = h('div'); kb.style.cssText = 'display:flex;flex-direction:column;gap:5px';
          ['QWERTYUIOP', 'ASDFGHJKL', '⌫ZXCVBNM↵'].forEach(r => {
            const row = h('div'); row.style.cssText = 'display:flex;gap:4px;justify-content:center';
            [...r].forEach(c => { const b = h('button', '', c === '↵' ? 'OK' : c); b.type = 'button'; b.tabIndex = -1; b.onpointerdown = e => e.preventDefault(); b.style.cssText = KEY + (c === '↵' || c === '⌫' ? 'flex:1.6;max-width:70px;' : ''); b.setAttribute('aria-label', c === '↵' ? 'Conferma' : c === '⌫' ? 'Cancella' : c); b.onclick = () => c === '⌫' ? del() : c === '↵' ? submit() : add(c); row.append(b); });
            kb.append(row);
          });
          card.append(kb);
          const acts = h('div', 'row'); acts.style.marginTop = '10px';
          if (canPass) { const b = h('button', 'btn danger', 'Passo allo sfidante'); b.onclick = () => end('pass'); acts.append(b); }
          if (canScream) { screamB = h('button', 'btn', ''); screamB.onclick = scream; paintScream(); acts.append(screamB); }
          if (acts.children.length) card.append(acts);
        }
        const key = e => {
          if (p.bot || done || e.ctrlKey || e.metaKey || e.altKey || e.repeat || document.querySelector('.ov')) return;
          if (/INPUT|TEXTAREA|BUTTON/.test(e.target.tagName) && e.key === 'Enter') return;
          if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); add(e.key.toUpperCase()); }
          else if (e.key === 'Backspace') { e.preventDefault(); del(); }
          else if (e.key === 'Enter') { e.preventDefault(); submit(); }
        };
        addEventListener('keydown', key);
        // CPU plan
        let plan = null;
        if (p.bot) {
          const win = Math.min(clock.left, 30), knows = Math.random() < know(p, q, clock.total);
          plan = {knows, answerAt: knows ? rand(2, Math.max(3, win * .6)) : null};
          if (!knows) {
            if (canPass && Math.random() < passProb) plan.passAt = rand(1.5, 4);
            else { if (canScream && urli > 0 && Math.random() < .6) plan.screamAt = rand(2, 5); plan.wrongAt = rand(win * .35, win * .6); }
          }
        }
        const botStep = () => {
          if (plan.passAt != null && el >= plan.passAt) return end('pass');
          if (plan.screamAt != null && el >= plan.screamAt) { plan.screamAt = null; scream(); if (Math.random() < .8) { plan.knows = true; plan.wrongAt = null; plan.answerAt = el + rand(1.5, 4); } }
          if (plan.wrongAt != null && el >= plan.wrongAt) { plan.wrongAt = null; typed = Array.from({length: hiddenN()}, () => pickR([...'AEIOURSTLNCM'])); draw(); setTimeout(() => { if (!done) wrongTry(); }, 380); }
          if (plan.knows && el >= plan.answerAt) { const hid = [...A].filter((c, i) => !q.shown[i]); if (typed.length < hid.length) { typed.push(hid[typed.length]); draw(); } if (typed.length >= hid.length) end('ok'); }
        };
        const speed = p.bot ? (watch ? 1.5 : 3) : 1;
        const iv = setInterval(() => {
          if (done) return;
          const d = .1 * speed; clock.left -= d; el += d;
          bar.style.transform = `scaleX(${Math.max(0, clock.left / clock.total)})`;
          const s = Math.max(0, Math.ceil(clock.left)); tl.textContent = s; if (clock.left < 6 && s !== lastS) { lastS = s; sfx.tick(); }
          if (p.bot) botStep();
          if (clock.left <= 0) end('time');
        }, 100);
        ctx.onExit(() => { clearInterval(iv); removeEventListener('keydown', key); });
        function end(r) {
          if (done) return; done = true; clearInterval(iv); removeEventListener('keydown', key);
          card.querySelectorAll('button').forEach(b => { b.disabled = true; });
          if (r === 'ok') { draw('ok'); sfx.ok(); S.flashWith(PAL.ok); st.textContent = 'Esatto!'; }
          else if (r === 'time') { draw('reveal'); sfx.bad(); S.flashWith(PAL.bad); st.innerHTML = `Tempo scaduto! Era <b style="color:var(--gold-hi)">${A}</b>`; }
          else st.textContent = 'Passo!';
          setTimeout(() => res(r), r === 'time' ? 1800 : r === 'ok' ? 900 : 350);
        }
        draw(); ctx.dock(card);
      }));
    }

    // ---------- duel ----------
    async function duel(ch, cl, ultima) {
      const time = ultima ? 15 : 30;
      watch = !ch.bot || !cl.bot;
      if (ultima) { const L = Math.max(1, ch.data.lives); ch.data.lives = cl.data.lives = L; }
      hud(); cl.data.trap.led(PAL.goldHi); center.led(PAL.goldHi);
      face(ch, cl.data.obj.position, .8);
      let cur = ch, k = 0;
      for (;;) {
        const other = cur === ch ? cl : ch, q = drawDef(), tag = `${ultima ? 'Ultima sfida' : 'Duello'} · ${cur === ch ? 'Campione' : 'Sfidante'} · Domanda ${++k}`;
        shot(cur, other); await hot(cur);
        const r = await turn(cur, q, {clock: {left: time, total: time}, n: tag, canPass: !ultima && cur === ch, canScream: cur === ch});
        if (r === 'pass') {
          talk(`${ch.name} passa! ${cl.name}, tocca a te: se indovini, rubi una vita!`, {mood: 'surprised', gesture: 'point', to: cl});
          shot(cl, ch); await hot(cl);
          const r2 = await turn(cl, q, {clock: {left: time, total: time}, n: `Domanda passata · ${cl.name}`});
          if (r2 === 'ok') {
            if (ch.data.lives > 0) { ch.data.lives--; cl.data.lives++; cl.data.obj.celebrate(); ch.data.obj.setMood('sad'); await talk(`Giusto! ${cl.name} ruba una vita al campione!`, {mood: 'happy', gesture: 'clap', to: cl}); }
            else { cl.data.obj.setMood('happy'); talk(`Giusto, ${cl.name}! Ma il campione non ha vite da rubare.`, {to: cl}); }
          } else if (cl.data.lives > 0) { cl.data.lives--; cl.data.obj.setMood('sad'); talk(`${cl.name} perde una vita!`, {mood: 'sad', to: cl}); }
          else { await fall(cl); return ch; }
          hud(); cur = ch; continue;
        }
        if (r === 'ok') { cur.data.obj.setMood('happy'); if (watch || Math.random() < .3) host.react('right', cur); cur = other; continue; }
        if (cur.data.lives > 0) { cur.data.lives--; hud(); cur.data.obj.setMood('sad'); await talk(`${cur.name} perde una vita! Ne restano ${cur.data.lives}.`, {mood: 'sad', gesture: 'shrug', to: cur}); cur = other; continue; }
        await fall(cur); return other;
      }
    }

    async function crown(p) {
      const old = p.data.trap;
      await ctx.w(center.close());
      await talk(`${p.name}, sei il nuovo campione! Vieni al centro!`, {mood: 'happy', gesture: 'celebrate', to: p});
      old.led('#15171f'); old.plate.set([{t: '—', fs: .5, color: PAL.mut}]);
      p.data.obj.celebrate();
      await walkTo(p, center.feet, 1.8);
      champ = p; p.data.trap = center; p.data.lives = Math.max(1, p.data.lives); urli = Math.max(urli, 1);
      face(p, V(...WIDE[0]), .6); hud();
    }

    async function lecca() {
      const c = champ; watch = !c.bot;
      const effs = [pickR(EFFS), pickR(EFFS)];
      tiles.forEach((t, i) => { t.t.rotation.y = 0; t.b.set(effTxt(effs[i]).map((s, k) => ({t: s, fs: k ? .14 : .3, color: k ? PAL.goldHi : PAL.ivory}))); });
      const bp = board.position, d = V(Math.sin(board.rotation.y), 0, Math.cos(board.rotation.y));
      S.go([bp.x + d.x * 5, 2.6, bp.z + d.z * 5], [bp.x, 2.1, bp.z]);
      talk(`${c.name}, è il momento del lecca-lecca! Piede bianco o piede nero?`, {mood: 'happy', gesture: 'point', to: c});
      await hot(c);
      const i = await choose(c, {kicker: 'Lecca-lecca', title: 'Scegli una casella: piede bianco o piede nero?', items: [{label: 'Piede bianco', value: 0, tag: '◻'}, {label: 'Piede nero', value: 1, tag: '◼'}], bot: () => { const b = val(effs[0]) >= val(effs[1]) ? 0 : 1; return ctx.botChance(c.skill) ? b : 1 - b; }});
      sfx.whoosh();
      await ctx.w(tween(tiles[i].t.rotation, {y: Math.PI}, .8, 'inOutBack'));
      const e = effs[i];
      if (e.k === 'money') pot += e.v; else if (e.k === 'life') c.data.lives++; else if (e.k === 'scream') urli++;
      else if (e.k === 'double') pot *= 2; else if (e.k === 'half') pot = Math.floor(pot / 1000) * 500; else pot = 0;
      const good = !['half', 'zero'].includes(e.k);
      (good ? sfx.ok : sfx.bad)(); S.flashWith(good ? PAL.ok : PAL.bad); if (good) crowd(.12, 1.6);
      hud();
      const msg = {money: `Più ${eur(e.v || 0)}! Il montepremi sale a ${eur(pot)}!`, life: 'Una vita in più! Preziosissima!', scream: 'Un urlo del pubblico in più!', double: `Raddoppio! Montepremi a ${eur(pot)}!`, half: `Ahi, dimezzato! Restano ${eur(pot)}.`, zero: 'Azzerato! Si riparte da zero!'}[e.k];
      await talk(msg, {mood: good ? 'happy' : 'sad', gesture: good ? 'clap' : 'shrug', to: c});
      tween(tiles[1 - i].t.rotation, {y: Math.PI}, .8, 'inOutBack');
      await pause(1400); wide();
    }

    // ---------- finals ----------
    async function botole(c, prize) {
      const q = pickR(BOTOLE), order = shuffle([...Array(10).keys()]); // trap k shows opts[order[k]]
      const right = order.indexOf(q.right);
      ring.forEach((t, k) => { t.led(PAL.gold); t.plate.set([{t: q.opts[order[k]], fs: .42}, {t: 'BOTOLA ' + (k + 1), fs: .26, color: PAL.goldHi, font: 'Outfit'}]); });
      wide();
      await talk(`Le 10 botole! ${q.q} Dieci risposte, dieci botole: ${c.name}, mettiti su quella giusta!`, {mood: 'think', gesture: 'point', to: c});
      const items = order.map((o, k) => ({label: q.opts[o], value: k}));
      let pick = await choose(c, {kicker: `Le 10 botole · ${eur(prize)}`, title: esc(q.q), items, time: 90, onTime: -1, bot: () => ctx.botChance(.25 + c.skill * .5) ? right : pickR([...Array(10).keys()].filter(k => k !== right))});
      if (pick < 0) { talk('Tempo scaduto senza scegliere!', {mood: 'sad'}); await fall(c); return 0; }
      await walkTo(c, ring[pick].feet, 1.9); c.data.trap = ring[pick]; ring[pick].led(PAL.goldHi);
      face(c, V(0, 0, 0)); wide();
      ctx.dock(h('div', 'card', `<div class="meta"><span>Le 10 botole</span>${who(c)}</div><h2>${esc(q.q)}</h2><p class="msg">${esc(c.name)} è sulla botola ${pick + 1}: «${esc(q.opts[order[pick]])}». Si aprono le prime cinque…</p>`));
      await pause(1200);
      const first = shuffle([...Array(10).keys()].filter(k => k !== pick && k !== right)).slice(0, 5);
      for (const k of first) { sfx.open(); ring[k].open(); ring[k].led('#15171f'); await pause(650); }
      host.react('suspense');
      const rest = [...Array(10).keys()].filter(k => k !== pick && !first.includes(k)); const closed = [pick, ...rest];
      const sw = await choose(c, {kicker: 'Cambi risposta? Ti giochi metà montepremi', title: `Restano chiuse: ${[pick, ...rest].map(k => `«${esc(q.opts[order[k]])}»`).join(', ')}`, time: 30, onTime: pick, one: true,
        items: [{label: `Resto sulla botola ${pick + 1}`, value: pick, tag: '✓'}, ...rest.map(k => ({label: `Cambio: ${q.opts[order[k]]} (metà montepremi)`, value: k, tag: k + 1}))],
        bot: () => pick !== right && ctx.botChance(c.skill) ? pickR(rest) : pick});
      if (sw !== pick) { prize = Math.round(prize / 2); talk(`Cambia! Ora in palio ci sono ${eur(prize)}.`, {mood: 'surprised', to: c}); ring[pick].led(PAL.gold); pick = sw; await walkTo(c, ring[pick].feet, 1.4); c.data.trap = ring[pick]; ring[pick].led(PAL.goldHi); face(c, V(0, 0, 0)); }
      const seq = shuffle(closed.filter(k => k !== pick && k !== right));
      if (pick !== right) seq.splice(Math.floor(Math.random() * (seq.length + 1)), 0, pick);
      for (const k of seq) {
        sfx.drum(); await pause(1100);
        if (k === pick) { await fall(c); return 0; }
        sfx.open(); ring[k].open(); ring[k].led('#15171f'); await pause(500);
      }
      ring[right].led(PAL.ok); return prize;
    }

    async function passi(c, prize) {
      const qs = shuffle(PASSI).slice(0, 10).map(x => ({d: x.q, a: x.a, shown: reveal(x.a.length, (x.a.length >= 7 ? 2 : 1) + 2 - ctx.qDiff)}));
      // the first letter is always visible
      qs.forEach(q => { if (!q.shown[0]) { const j = q.shown.lastIndexOf(true); q.shown[j] = false; q.shown[0] = true; } });
      const clock = {left: 180, total: 180};
      ring.forEach(t => t.led(PAL.gold));
      await talk(`I 10 passi! ${c.name}: dieci domande in tre minuti. Ogni risposta giusta è un passo. Puoi passare!`, {mood: 'happy', gesture: 'point', to: c});
      let step = 0;
      while (step < 10) {
        S.go([c.data.obj.position.x * 1.5 + .1, 4.2, c.data.obj.position.z * 1.5 + 4.5], [c.data.obj.position.x, 1.4, c.data.obj.position.z]);
        const q = qs.shift();
        const r = await turn(c, q, {clock, n: `I 10 passi · Passo ${step + 1}/10`, canPass: true, passProb: 1});
        if (r === 'pass') { qs.push(q); continue; }
        if (r === 'time') { talk('Tempo finito!', {mood: 'sad'}); await fall(c); return 0; }
        ring[step].led(PAL.ok); await walkTo(c, ring[step].feet, .9); c.data.trap = ring[step]; step++;
      }
      return prize;
    }

    // ---------- show: una manche = campione + sfidanti fino all'ultima sfida e alla finale ----------
    function seat(lead) {
      champ = lead; pot = 0; urli = 1; lastG = null;
      ring.forEach(t => { t.close(); t.led('#15171f'); t.plate.set([' ']); });
      let k = 0;
      for (const p of P) {
        const tr = p === lead ? center : slot(k++), b = p.data.obj;
        p.alive = true; p.data.trap = tr; p.data.lives = p === lead ? 3 : 0;
        b.visible = true; b.setMood('neutral'); b.lookAt(null); b.position.copy(tr.feet); b.rotation.y = p === lead ? 0 : Math.atan2(-tr.feet.x, -tr.feet.z);
        if (p !== lead) tr.led('#5a4a28');
      }
      center.led(ctx.accent.a); hud();
    }
    const log = [];
    for (; mi < M;) {
      const lead = P[mi++ % N];
      seat(lead); wide(mi > 1);
      if (mi === 1) {
        await talk(`Benvenuti a Caduta Libera! Al centro il nostro campione, ${champ.name}: tre vite e una botola sotto i piedi!`, {mood: 'happy', gesture: 'wave', to: champ});
        crowd(.15, 2); champ.data.obj.celebrate();
        await talk(`Intorno a lui ${N === 2 ? 'uno sfidante' : (N - 1) + ' sfidanti'}, ognuno sulla sua botola. Chi resta senza tempo… cade!`, {mood: 'happy', gesture: 'point'});
      } else await talk(`Manche ${mi} di ${M}: ${champ.name} è il nuovo campione al centro!`, {mood: 'happy', gesture: 'wave', to: champ});

      while (alive().length > 1) {
        const want = lastG ? (lastG === 'M' ? 'F' : 'M') : null;
        let el = alive().filter(p => !want || p.data.g === want); if (!el.length) el = alive();
        watch = !champ.bot || el.some(p => !p.bot); wide(); hud();
        let chal = el[0];
        if (el.length > 1) {
          await hot(champ);
          chal = await choose(champ, {kicker: `Il campione sceglie${want ? (want === 'F' ? ' · tocca a una donna' : ' · tocca a un uomo') : ''}`, title: 'Chi sfidi adesso?',
            items: el.map(p => ({label: esc(p.name) + (p.bot ? ' · CPU' : ''), value: p, tag: p.data.g === 'F' ? '♀' : '♂'})), bot: () => pickR(el)});
        }
        lastG = chal.data.g;
        chal.data.obj.setMood('surprised'); chal.data.obj.wave();
        await talk(`${chal.name}, tocca a te! Sfidi ${champ.name}!`, {mood: 'happy', gesture: 'point', to: chal});
        const winner = await duel(champ, chal, false);
        ring.forEach(t => { if (P.some(p => p.alive && p.data.trap === t)) t.led('#5a4a28'); });
        if (winner === champ) { champ.data.obj.celebrate(); await lecca(); }
        else await crown(chal);
      }
      const last = alive()[0];
      watch = !champ.bot || !last.bot; wide();
      await talk(`Resta solo ${last.name}! Ultima sfida: stesse vite, quindici secondi a risposta!`, {mood: 'surprised', gesture: 'point', to: last});
      const w = await duel(champ, last, true);
      if (w !== champ) await crown(w);
      hud();

      // final
      const c = champ; watch = !c.bot; wide();
      const prize0 = Math.max(pot, 10000);
      await talk(`${c.name}, sei in finale! In palio ${eur(prize0)}. Le 10 botole o i 10 passi?`, {mood: 'happy', gesture: 'celebrate', to: c});
      await hot(c);
      const kind = await choose(c, {kicker: `Finale · ${eur(prize0)}`, title: 'Scegli il gioco finale', one: true,
        items: [{label: 'Le 10 botole: una domanda, 10 risposte, 90 secondi', value: 'b', tag: '10'}, {label: 'I 10 passi: 10 domande in 3 minuti, puoi passare', value: 'p', tag: '→'}], bot: () => pickR(['b', 'p'])});
      const won = kind === 'b' ? await botole(c, prize0) : await passi(c, prize0);
      pot = won; c.data.won += won; hud();
      log.push(won ? `${c.name} supera la finale (${kind === 'b' ? 'Le 10 botole' : 'I 10 passi'}): ${eur(won)}.` : `${c.name} cade in finale: il montepremi resta in studio.`);
      if (won) { S.burst(PAL.goldHi, 220, 7); crowd(.3, 3.5); c.data.obj.celebrate(3000); await host.react('win', c, {value: eur(won)}); }
      else await host.react('lose', c);
      if (mi < M) await pause(1500);
    }
    host.react('outro', champ);
    ctx.dock();
    const top = [...P].sort((x, y) => y.data.won - x.data.won)[0];
    ctx.finish({
      win: top.data.won > 0 && !top.bot,
      title: top.data.won ? `${top.name} vince ${eur(top.data.won)}!` : 'CADUTA LIBERA!',
      lines: log,
      ranking: P.map(p => ({player: p, score: p.data.won}))
    });
  }
};
