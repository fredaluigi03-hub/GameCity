import {THREE, newStage, tween, label3d, mat, person, glow, quality, PAL} from '../engine.js';
import {h, sfx, norm, near, countdown, shuffle, tone} from '../ui.js';
import {createHost, HOSTS} from '../host.js';
import {buildThemes, matchItem} from './fight_data.js';

const TIME = 45, CRONO = 20, TO_WIN = 2, MAX_M = 5, CANVAS = 1.06;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const pick = a => a[Math.floor(Math.random() * a.length)];
// envelope: fast attack, short hold, smooth release (u in 0..1)
const env = (u, a, hold) => u <= 0 || u >= 1 ? 0 : u < a ? 1 - (1 - u / a) ** 3 : u < a + hold ? 1 : .5 + .5 * Math.cos(Math.PI * (u - a - hold) / (1 - a - hold));
const mix = (A, B, w) => w <= 0 ? A : {sx: A.sx + (B.sx - A.sx) * w, sz: A.sz + (B.sz - A.sz) * w, ex: A.ex + (B.ex - A.ex) * w};

export default {
  id: 'fight', name: 'Fight List', tag: 'Il ring delle liste', desc: 'Elenca a raffica in 45 secondi e manda KO lo sfidante', c1: '#ff3b30', c2: '#3b9bff',
  players: {min: 1, max: 4, def: 2, rival: true}, questions: true,
  guide: `
    <h4 style="margin:4px 0 6px;color:var(--gold);font-size:0.95rem">🥊 Il Ring delle Liste</h4>
    <p>Due sfidanti salgono sul ring e si affrontano a colpi di parole! Ad ogni manche viene estratto un <b>tema comune</b> (es. <i>"Frutti"</i>, <i>"Città europee"</i>, <i>"Cose che si trovano in spiaggia"</i>, <i>"Personaggi storici"</i>): entrambi i contendenti giocano sullo stesso argomento passandosi il dispositivo o sfidando la CPU.</p>

    <h4 style="margin:10px 0 6px;color:var(--gold);font-size:0.95rem">⏱️ 45 Secondi a Raffica &amp; Punteggi</h4>
    <ul style="margin:4px 0 8px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li><b>45 secondi sul cronometro:</b> scrivi a tutta velocità più risposte valide possibili.</li>
      <li><b>Parole Comuni:</b> valgono <b>1 punto</b>.</li>
      <li><b>Parole Rare / Difficili:</b> colpi pesanti da <b>3 punti</b>!</li>
      <li>Non contano doppioni o risposte fuori lista. Il motore lessicale è flessibile: accetta accenti, piccoli errori di battitura e cognomi dei personaggi noti.</li>
    </ul>

    <h4 style="margin:10px 0 6px;color:var(--gold);font-size:0.95rem">⚡ Gli Aiuti Speciali</h4>
    <p>Ciascun giocatore ha a disposizione due aiuti strategici (utilizzabili una sola volta per incontro):</p>
    <ul style="margin:4px 0 8px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li><b>Crono (+20s):</b> prolunga il tempo di digitazione di 20 secondi extra per sferrare altri colpi.</li>
      <li><b>Jolly:</b> suggerisce all'istante una parola valida ancora non detta, pronta da incassare premendo Invio.</li>
    </ul>

    <h4 style="margin:10px 0 6px;color:var(--gold);font-size:0.95rem">🏆 Vittoria per KO &amp; Formati di Gara</h4>
    <ul style="margin:4px 0 8px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li>Vince la manche chi totalizza più punti (pari = manche nulla). Il primo che conquista <b>2 manche</b> manda KO l'avversario e vince il match!</li>
      <li><b>1 Giocatore:</b> duello contro la CPU; <b>2 Giocatori:</b> testa a testa sullo stesso schermo; <b>3 Giocatori:</b> girone all'italiana (tutti contro tutti); <b>4 Giocatori:</b> torneo a eliminazione (Semifinali e Finale).</li>
    </ul>

    <h4 style="margin:10px 0 6px;color:var(--gold);font-size:0.95rem">🎮 Comandi</h4>
    <ul style="margin:4px 0 4px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li>Digita la parola e premi <b>Invio</b> per convalidarla istantaneamente.</li>
      <li>Tasti/pulsanti <b>Crono</b> e <b>Jolly</b> posizionati a portata di mano accanto alla barra di digitazione.</li>
    </ul>
  `,
  rules: [
    'Duello 1 contro 1 a manche: a ogni manche esce un tema a caso (es. “Frutti”), uguale per entrambi.',
    'Hai 45 secondi per scrivere più risposte valide possibili: le comuni valgono 1 punto, le rare 3.',
    'Doppioni e risposte fuori lista non contano. Accenti, piccoli errori di battitura e i cognomi dei personaggi noti sono accettati.',
    'Aiuti, una volta per incontro: Crono (+20 secondi) e Jolly (ti suggerisce una risposta giusta, premi Invio per incassarla).',
    'Vince la manche chi fa più punti (pari = manche nulla). Vince l’incontro chi conquista 2 manche; dopo 5 manche decidono i punti totali.',
    'Da solo sfidi la CPU; in due giocate a turno sullo stesso tema passandovi il dispositivo; in 3 si gioca un girone (tutti contro tutti: classifica per incontri vinti, poi manche vinte); in 4 un torneo a eliminazione con semifinali e finale.',
    'Difficoltà: il livello sceglie i temi (facili, medi o difficili); la difficoltà CPU decide quanto è forte lo sfidante.'
  ],
  async start(ctx) {
    const S = ctx.stage = newStage({c1: this.c1, c2: this.c2, bg: '#0b0709', cam: [0, 7.5, 16], look: [0, 2.3, 0]});
    const A1 = ctx.accent.a, A2 = ctx.accent.b;
    const CAM = {wide: [[0, 4.2, 11], [0, 2.3, 0]], duel: [[0, 3.0, 8.4], [0, 2.1, 0]]};
    const Q = []; const later = (s, fn) => Q.push({at: S.t + s, fn});

    // ---------- ring ----------
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(6.9, 1, 6.9), mat('#141a30', {roughness: .6, metalness: .2})); skirt.position.y = .5; S.add(skirt);
    const band = new THREE.Mesh(new THREE.BoxGeometry(6.94, .05, 6.94), mat(PAL.gold, {roughness: .3, metalness: .8})); band.position.y = .88; S.add(band);
    const canvasM = new THREE.Mesh(new THREE.BoxGeometry(6.6, .06, 6.6), mat('#cbc3ae', {roughness: .95, metalness: 0})); canvasM.position.y = 1.03; S.add(canvasM);
    const logo = new THREE.Mesh(new THREE.CircleGeometry(1, 64), mat('#1b2140', {roughness: .8, metalness: 0})); logo.rotation.x = -Math.PI / 2; logo.position.y = CANVAS + .002; S.add(logo);
    const logoR = new THREE.Mesh(new THREE.RingGeometry(1, 1.07, 64), mat(A1, {roughness: .6, metalness: .1})); logoR.rotation.x = -Math.PI / 2; logoR.position.y = CANVAS + .003; S.add(logoR);
    const skirtLbl = label3d(['FIGHT LIST'], {w: 3, h: .55, bg: null, border: null, color: PAL.goldHi, fs: .8}); skirtLbl.position.set(0, .46, 3.46); S.add(skirtLbl);
    const C = 2.95, corners = [[-C, -C], [C, -C], [C, C], [-C, C]];
    const postM = mat('#c9ccd4', {metalness: .9, roughness: .3}), pads = [];
    corners.forEach(([x, z], i) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.5, 12), postM); post.position.set(x, CANVAS + .75, z); S.add(post);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(.24, 1.02, .24), mat(i % 2 ? '#e9e4d8' : PAL.gold, {roughness: .5, metalness: .05}));
      pad.position.set(x * .97, CANVAS + .82, z * .97); pad.rotation.y = Math.PI / 4; S.add(pad); pads.push(pad);
    });
    // ropes: 3 per side, tubes along a slightly sagging curve
    const ropes = [], ropeMs = [mat(A1, {roughness: .45, metalness: .05}), mat('#e9e4d8', {roughness: .45, metalness: .05}), mat(A2, {roughness: .45, metalness: .05})];
    [1.22, .82, .42].forEach((hy, r) => corners.forEach(([x0, z0], i) => {
      const [x1, z1] = corners[(i + 1) % 4], pts = [];
      for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push(new THREE.Vector3(x0 + (x1 - x0) * u, CANVAS + hy - .045 * 4 * u * (1 - u), z0 + (z1 - z0) * u)); }
      const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .026, 8, false), ropeMs[r]); rope.userData.ph = i + r * 4; S.add(rope); ropes.push(rope);
    }));
    let ropeWob = 0;
    // overhead lamp rig + ring light
    const rigM = mat('#0d0f16', {metalness: .7, roughness: .4});
    [[0, -2.3, 4.8, .12], [0, 2.3, 4.8, .12], [-2.3, 0, .12, 4.6], [2.3, 0, .12, 4.6]].forEach(([x, z, w, d]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, .12, d), rigM); b.position.set(x, 7.6, z); b.userData.noShadow = true; S.add(b); });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, l = new THREE.Mesh(new THREE.CircleGeometry(.12, 16), glow('#fff3dc')); l.rotation.x = Math.PI / 2; l.position.set(Math.cos(a) * 2.3, 7.53, Math.sin(a) * 2.3); S.add(l); }
    const ringLight = new THREE.SpotLight('#fff1dc', 70, 20, .55, .6, 1.4); ringLight.position.set(0, 8.4, 0); ringLight.target.position.set(0, 1, 0); S.add(ringLight); S.add(ringLight.target);
    // jumbotron
    const jumbo = new THREE.Group(); jumbo.position.set(0, 5.3, 0); S.add(jumbo);
    const jBox = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.6, .45), mat('#0b0e1c', {metalness: .6, roughness: .4})); jBox.userData.noShadow = true; jumbo.add(jBox);
    const jl = label3d([{t: 'FIGHT LIST', fs: .4}], {w: 4.2, h: 1.45, px: 150, fs: .3, radius: .06, accent: A1}); jl.position.z = .231; jumbo.add(jl);
    const jBack = new THREE.Mesh(jl.geometry, jl.material); jBack.position.z = -.231; jBack.rotation.y = Math.PI; jumbo.add(jBack);
    [-1.9, 1.9].forEach(x => { const c = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, 3.5, 6), postM); c.position.set(x, 2.55, 0); c.userData.noShadow = true; jumbo.add(c); });

    // ---------- crowd ----------
    const rows = quality.low ? 3 : 5, seats = [];
    const blM = mat('#0c0f1d', {roughness: .85, metalness: .1});
    for (let r = 0; r < rows; r++) {
      const y = r * .45, zb = -6.6 - r * 1.05, xs = 6.9 + r * 1.05;
      if (r) {
        const back = new THREE.Mesh(new THREE.BoxGeometry(19.5 + r * 2.1, y, 1.05), blM); back.position.set(0, y / 2, zb); back.userData.noShadow = true; S.add(back);
        [-1, 1].forEach(s => { const sd = new THREE.Mesh(new THREE.BoxGeometry(1.05, y, 9.6), blM); sd.position.set(s * xs, y / 2, -.9); sd.userData.noShadow = true; S.add(sd); });
      }
      for (let x = -9.3; x <= 9.31; x += .62) seats.push([x + (Math.random() - .5) * .16, y, zb + (Math.random() - .5) * .14]);
      for (let z = -5.4; z <= 3.61; z += .62) [-1, 1].forEach(s => seats.push([s * xs + (Math.random() - .5) * .14, y, z + (Math.random() - .5) * .16]));
    }
    const NC = seats.length, wM = new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .85, metalness: 0});
    const bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.19, .42, 3, 8), wM, NC), heads = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 10, 8), wM, NC);
    const col = new THREE.Color(), ph = [], jump = [];
    for (let i = 0; i < NC; i++) {
      bodies.setColorAt(i, Math.random() < .14 ? col.set(pick(PAL.players)).multiplyScalar(.28) : col.setHSL(.6 + Math.random() * .1, .15 + Math.random() * .15, .06 + Math.random() * .07));
      heads.setColorAt(i, col.setHSL(.06, .3, .1 + Math.random() * .1));
      ph.push(Math.random() * 6.3); jump.push(.4 + Math.random() * .8);
    }
    [bodies, heads].forEach(m => { m.userData.noShadow = true; m.frustumCulled = false; S.add(m); });
    const flashes = Array.from({length: 6}, () => { const f = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 6), glow('#ffffff')); f.visible = false; S.add(f); return f; });
    let excite = .2, crowdT = 0;
    const pop = () => { const f = pick(flashes), s = pick(seats); f.position.set(s[0], s[1] + 1.25, s[2] + .1); f.visible = true; later(.07, () => { f.visible = false; }); };
    const cheer = k => { excite = Math.min(1.2, excite + k); };
    const m4 = new THREE.Matrix4();

    // ---------- fighters ----------
    const gloveG = (() => { const g = new THREE.SphereGeometry(.088, 16, 12); g.scale(1, 1.15, 1.1); return g; })(), cuffG = new THREE.CylinderGeometry(.056, .062, .09, 12);
    function fighter(look, x0, dir, phase) {
      const g = new THREE.Group(), p = person({...look, shirt: look.skin, suit: look.skin, tie: look.skin, shoes: '#ececec'});
      g.add(p); S.add(g);
      const J = p.joints, gloveM = mat('#b02a2a', {roughness: .32, metalness: .05}), cuffM = mat('#efe9dc', {roughness: .6, metalness: 0});
      J.LA.hand.visible = J.RA.hand.visible = false;
      [J.LA, J.RA].forEach(A => { const gl = new THREE.Group(); gl.position.y = -.31; A.el.add(gl);
        const b = new THREE.Mesh(gloveG, gloveM); b.position.y = -.035; gl.add(b);
        const c = new THREE.Mesh(cuffG, cuffM); c.position.y = .045; gl.add(c); });
      const belt = new THREE.Mesh(new THREE.CylinderGeometry(.165, .165, .07, 18, 1, true), cuffM); belt.scale.z = .72; belt.position.y = .08; J.hips.add(belt);
      return {g, p, J, gloveM, x0, dir, ph: phase, acts: [], lead: 0, hs: 1, cheer: false, ch: 0, down: false,
        c: {lsx: -.8, lsz: -.28, lex: -2.25, rsx: -.62, rsz: .3, rex: -2.4, tw: -.22, ln: .1, fw: 0}};
    }
    const fA = fighter({skin: '#d9a37e', hair: '#2a1d14', hairStyle: 'short', pants: PAL.players[0]}, -.62, 1, 0);
    const fB = fighter({skin: '#8d5a3c', hair: '#111111', hairStyle: 'bald', pants: PAL.players[1]}, .62, -1, .8);
    const act = (F, k, delay, d, o = {}) => F.acts.push({k, t0: S.t + delay, d, at: o.at ?? .3, hold: o.hold ?? .15, amp: o.amp ?? 1});

    function drive(F, O, dt, t) {
      const now = S.t, w = {};
      F.acts = F.acts.filter(a => now < a.t0 + a.d);
      for (const a of F.acts) { const e = env((now - a.t0) / a.d, a.at, a.hold) * a.amp; if (e > (w[a.k] || 0)) w[a.k] = e; }
      const jl = w.jabL || 0, jr = w.jabR || 0, up = w.upper || 0, wd = w.wind || 0, hit = w.hit || 0, bl = w.block || 0;
      F.ch += ((F.cheer ? 1 : 0) - F.ch) * Math.min(1, dt * 6);
      const ch = F.ch, dn = F.down ? 1 : 0;
      let L = {sx: -.8, sz: -.28, ex: -2.25}, R = {sx: -.62, sz: .3, ex: -2.4};
      L = mix(L, {sx: -1.05, sz: -.45, ex: -2.6}, bl); R = mix(R, {sx: -1.05, sz: .45, ex: -2.6}, bl);
      L = mix(L, {sx: -1.55, sz: -.06, ex: -.1}, jl); R = mix(R, {sx: -1.55, sz: .06, ex: -.1}, jr);
      R = mix(R, {sx: -.35, sz: .2, ex: -1.9}, wd); R = mix(R, {sx: -2.05, sz: .12, ex: -1.25}, up);
      L = mix(L, {sx: -.25, sz: 2.65, ex: -.35}, ch); R = mix(R, {sx: -.25, sz: -2.65, ex: -.35}, ch);
      L = mix(L, {sx: -2.6, sz: .5, ex: -.2}, dn); R = mix(R, {sx: -2.6, sz: -.5, ex: -.2}, dn);
      const tgt = {lsx: L.sx, lsz: L.sz, lex: L.ex, rsx: R.sx, rsz: R.sz, rex: R.ex,
        tw: (-.22 - .38 * jl + .38 * jr + .55 * up - .45 * wd) * (1 - ch) * (1 - dn), ln: (.1 + .08 * (jl + jr) + .12 * up - .38 * hit + .12 * bl - .1 * ch) * (1 - dn),
        fw: dn ? F.c.fw : .3 * Math.max(jl, jr) + .42 * up - .22 * hit - .08 * bl};
      const k = 1 - Math.exp(-dt * 30), c = F.c;
      for (const key in tgt) c[key] += (tgt[key] - c[key]) * k;
      const J = F.J;
      J.LA.sh.rotation.set(c.lsx, 0, c.lsz); J.LA.el.rotation.set(c.lex, 0, 0);
      J.RA.sh.rotation.set(c.rsx, 0, c.rsz); J.RA.el.rotation.set(c.rex, 0, 0);
      J.spine.rotation.x = c.ln; J.spine.rotation.y = c.tw;
      J.head.rotation.x += (.12 - .55 * hit) * (1 - dn); J.head.rotation.z += .22 * hit * F.hs;
      const bob = dn ? 0 : Math.abs(Math.sin(t * 5.4 + F.ph)) * .028 * (1 - ch * .6);
      J.hips.position.y = .91 + bob - .06 * wd;
      J.LL.hip.rotation.set(-.3 * (1 - dn), 0, .05); J.LL.knee.rotation.x = .32 * (1 - dn) + .1 * dn;
      J.RL.hip.rotation.set(.22 * (1 - dn), 0, -.05); J.RL.knee.rotation.x = .36 * (1 - dn) + .1 * dn;
      if (!dn) {
        F.g.position.set(F.x0 + F.dir * (c.fw + Math.sin(t * .9 + F.ph) * .08), CANVAS, Math.sin(t * .55 + F.ph * .3) * .3);
        F.g.rotation.y = Math.atan2(O.g.position.x - F.g.position.x, O.g.position.z - F.g.position.z);
      }
    }
    S.on((dt, t) => {
      drive(fA, fB, dt, t); drive(fB, fA, dt, t);
      for (let i = Q.length - 1; i >= 0; i--) if (S.t >= Q[i].at) { const f = Q[i].fn; Q.splice(i, 1); f(); }
      ropeWob = Math.max(0, ropeWob - dt * 1.5);
      for (const r of ropes) r.position.y = Math.sin(t * 34 + r.userData.ph) * ropeWob * .014;
      excite = Math.max(.15, excite - dt * .35);
      if (Math.random() < dt * excite * 4) pop();
      if (quality.low && (crowdT ^= 1)) return;
      for (let i = 0; i < NC; i++) {
        const [x, y, z] = seats[i], j = Math.max(0, Math.sin(t * (3 + jump[i] * 3) + ph[i])) * (.012 + excite * .2 * jump[i]);
        m4.makeTranslation(x, y + .55 + j, z); bodies.setMatrixAt(i, m4);
        m4.makeTranslation(x, y + 1.08 + j, z); heads.setMatrixAt(i, m4);
      }
      bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
    });

    // ---------- strikes ----------
    function impact(D, delay, type, amp, big) {
      act(D, type, delay, type === 'block' ? .4 : .55 + (big ? .25 : 0), {amp, at: .2, hold: .1});
      if (type === 'block') tone(260, .08, 'square', .04, delay);
      else { tone(90, .22, 'sine', .25, delay, -50); tone(160, .07, 'sawtooth', .05, delay); if (big) tone(55, .45, 'sine', .3, delay, -25); }
      later(delay, () => { D.hs = Math.random() < .5 ? -1 : 1; S.shakeIt(big ? .7 : type === 'hit' ? .3 : .12); cheer(big ? .9 : .3); if (big) { ropeWob = 1; pop(); pop(); } });
    }
    function strike(A, D, kind) {
      if (A.down || D.down) return;
      tone(300, .25, 'sawtooth', .02, 0, 500);
      if (kind === 'jab') { act(A, (A.lead ^= 1) ? 'jabL' : 'jabR', 0, .42); impact(D, .13, Math.random() < .3 ? 'block' : 'hit', .7); }
      else if (kind === 'heavy') { act(A, 'wind', 0, .5, {at: .6, hold: .1}); act(A, 'upper', .28, .55); impact(D, .45, 'hit', 1.25, true); }
      else { act(A, 'jabL', 0, .4); act(A, 'jabR', .18, .4); act(A, 'wind', .3, .4, {at: .6, hold: .1}); act(A, 'upper', .48, .5);
        impact(D, .12, 'hit', .6); impact(D, .3, 'hit', .7); impact(D, .63, 'hit', 1.3, true); }
    }
    let camBusy = 0;
    function cut(pos, look, hold = 1.3) {
      if (S.t < camBusy) return; camBusy = S.t + hold + 1.5;
      S.go(pos, look, {snap: true}); later(hold, () => S.go(...CAM.duel));
    }
    const fx = F => F.g.position.x;
    const heavyCut = (A, D) => cut([fx(A) - A.dir * 1.9, 2.55, 1.7], [fx(D), 2.2, 0]);
    const comboCut = D => cut([fx(D) * .3, 1.6, 3.4], [0, 2.3, 0]);
    function ko(W, L) {
      strike(W, L, 'combo');
      later(.7, () => { L.down = true; tween(L.p.rotation, {x: -1.5}, .9, 'bounce'); tone(70, .7, 'sine', .3, .25, -30); ropeWob = 1.2; cheer(1.2); for (let i = 0; i < 5; i++) pop(); });
      later(.75, () => { camBusy = 0; cut([fx(L) - L.dir * 1.2, 1.5, 2.8], [fx(L), 1.2, 0], 2.4); });
      later(1.9, () => { W.cheer = true; });
    }
    const gong = () => { tone(196, 1.6, 'sine', .12); tone(392, 1.2, 'sine', .05); tone(590, .9, 'triangle', .03); };

    // ---------- host ----------
    const host = createHost(ctx, {...HOSTS.fight, position: [-4.6, 0, 3.6]});
    let hostT = 0;
    const shout = (txt, force) => { const n = performance.now(); if (!force && n - hostT < 4500) return; hostT = n; host.say(txt, {mood: 'surprised'}); };
    const LN = {
      streak: ['Combo! {n} non si ferma più!', 'Tre colpi di fila! Che serie di {n}!', 'Raffica di {n}! L’avversario è alle corde!', 'Uno, due, tre! Che combinazione!'],
      heavy: ['Parola rara! Colpo da tre punti!', 'Montante da tre! {n} fa male!', 'Che gancio! Tre punti pesantissimi!'],
      last: ['Allo scadere! Che colpo di {n}!', 'Sul gong! Incredibile!', 'All’ultimo secondo! Valida!'],
      crono: ['{n} chiama il Crono! Venti secondi in più!', 'Crono! {n} si prende altro tempo!'],
      jolly: ['{n} gioca il Jolly!', 'Jolly sul tavolo per {n}!']
    };
    const line = (k, p) => pick(LN[k]).replace(/\{n\}/g, p.name);

    // ---------- seats ----------
    const P = ctx.players;
    while (P.length < 2) P.push({id: P.length, name: `Rival CPU`, color: A2, bot: true, skill: .6, score: 0, alive: true, data: {}});
    P.forEach(p => { p.data.mw = 0; p.data.wins = 0; });
    ctx.scoreboard();
    const themes = shuffle(ctx.pool(buildThemes(norm))); let ti = 0;
    const nextTheme = () => themes[ti++ % themes.length];
    const match = (th, v) => matchItem(th, v, norm, near);

    let duelA, duelB, cur = new Map(), manche = 0, theme = null;
    const fOf = p => fA.who === p ? fA : fB, opp = F => F === fA ? fB : fA;
    function board() {
      if (!duelA) return;
      jl.set([{t: `${duelA.name.toUpperCase()}   ${duelA.data.dm} – ${duelB.data.dm}   ${duelB.name.toUpperCase()}`, fs: .24},
        {t: `${cur.get(duelA) || 0}  :  ${cur.get(duelB) || 0}`, fs: .4},
        {t: theme ? `MANCHE ${manche} · ${theme.n.toUpperCase()}` : 'FIGHT LIST', fs: .17, color: PAL.goldHi}]);
    }
    function onWord(p, it, left) {
      cur.set(p, (cur.get(p) || 0) + it.p); board();
      const A = fOf(p), D = opp(A), d = p.data, now = S.t;
      d.hits = (d.hits || []).filter(x => now - x < 5); d.hits.push(now);
      if (d.hits.length >= 3) { d.hits = []; strike(A, D, 'combo'); comboCut(D); shout(line('streak', p)); }
      else if (it.p === 3) { strike(A, D, 'heavy'); heavyCut(A, D); if (Math.random() < .5) shout(line('heavy', p)); }
      else strike(A, D, 'jab');
      if (left < 3) shout(line('last', p), true);
    }

    // ---------- UI ----------
    const chipHtml = (t, pts, sm) => `<span class="chip" style="${sm ? 'font-size:.8rem;padding:4px 8px;' : ''}${pts === 3 ? 'border-color:var(--gold);' : ''}">${t} <small style="color:${pts === 3 ? 'var(--gold-hi)' : 'var(--mut)'}">+${pts}</small></span>`;
    function readyCard(p, th, extra = '') {
      return ctx.w(new Promise(res => {
        const c = h('div', 'card');
        c.innerHTML = `<div class="meta"><span>Manche ${manche}</span><span class="who" style="--pc:${p.color}">${esc(p.name)}</span><span>${TIME} s</span></div><h2>Tema: ${th.n}</h2><p class="msg">Scrivi più risposte valide possibili: comuni +1, rare +3. ${extra}</p><div class="row"><button class="btn pri">Via!</button></div>`;
        ctx.dock(c); const b = c.querySelector('button'); b.focus();
        b.onclick = () => { sfx.click(); res(); };
      }));
    }
    function runHuman(p, th) {
      return ctx.w(new Promise(res => {
        const card = h('div', 'card');
        card.innerHTML = `<div class="meta"><span>Manche ${manche} · ${th.n}</span><span class="who" style="--pc:${p.color}">${esc(p.name)}</span><span><b class="left">${TIME}</b> s</span></div>
          <div class="timer"><i></i></div><div class="chips" style="max-height:92px;overflow:auto"></div>
          <p class="msg fb" style="min-height:1.3em;margin:-4px 0 10px">Punti manche: <b>0</b></p>
          <form class="in"><input autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send" aria-label="Risposta" placeholder="Scrivi una risposta…"><button class="btn pri">Invia</button></form>
          <div class="row"><button type="button" class="btn crono">Crono +20 s</button><button type="button" class="btn jolly">Jolly</button></div>`;
        ctx.dock(card);
        const input = card.querySelector('input'), chips = card.querySelector('.chips'), fb = card.querySelector('.fb');
        const bCrono = card.querySelector('.crono'), bJolly = card.querySelector('.jolly');
        bCrono.disabled = !!p.data.crono; bJolly.disabled = !!p.data.jolly; input.focus();
        const said = new Set(); let pts = 0, done = false;
        const say = (msg, color) => { fb.innerHTML = `${msg} · Punti manche: <b>${pts}</b>`; fb.style.color = color || ''; };
        const cd = countdown(ctx, TIME, {bar: card.querySelector('.timer i'), label: card.querySelector('.left'), onEnd: () => {
          done = true; input.disabled = bCrono.disabled = bJolly.disabled = true; card.querySelector('form .btn').disabled = true;
          say('Tempo scaduto!'); gong(); setTimeout(() => res({pts, words: [...said]}), 900);
        }});
        card.querySelector('form').onsubmit = e => {
          e.preventDefault(); if (done) return;
          const v = input.value; input.value = ''; if (!norm(v)) return;
          const it = match(th, v);
          if (!it || said.has(it)) {
            say(it ? `${it.t}: già scritta` : `«${esc(v.trim())}» non è nella lista`, 'var(--bad)'); tone(180, .16, 'square', .04);
            input.animate([{transform: 'translateX(-6px)'}, {transform: 'translateX(6px)'}, {transform: 'none'}], {duration: 220}); return;
          }
          said.add(it); pts += it.p; ctx.addScore(p, it.p); if (it.p === 3) p.data.dr = (p.data.dr || 0) + 1;
          chips.insertAdjacentHTML('beforeend', chipHtml(esc(it.t), it.p)); chips.scrollTop = chips.scrollHeight;
          say(it.p === 3 ? `Rara! ${esc(it.t)} +3` : `${esc(it.t)} +1`, it.p === 3 ? 'var(--gold-hi)' : 'var(--ok)');
          if (it.p === 3) [660, 880, 1320].forEach((f, i) => tone(f, .14, 'triangle', .07, i * .05)); else tone(760, .08, 'triangle', .06);
          onWord(p, it, cd.left());
        };
        bCrono.onclick = () => { if (done || p.data.crono) return; p.data.crono = true; bCrono.disabled = true; cd.adj(CRONO); say('Crono: +20 secondi!', 'var(--gold-hi)'); sfx.open(); shout(line('crono', p)); input.focus(); };
        bJolly.onclick = () => {
          if (done || p.data.jolly) return;
          const rest = th.items.filter(i => !said.has(i)), easy = rest.filter(i => i.p === 1), it = pick(easy.length ? easy : rest);
          if (!it) return;
          p.data.jolly = true; bJolly.disabled = true; input.value = it.t; say(`Jolly: «${esc(it.t)}», premi Invio`, 'var(--gold-hi)'); sfx.open(); shout(line('jolly', p)); input.focus();
        };
      }));
    }
    function panel(p, side) {
      const el = h('div', 'card');
      el.style.cssText = `position:absolute;top:118px;${side}:12px;width:min(270px,42vw);padding:14px 16px`;
      el.innerHTML = `<div class="meta"><span class="who" style="--pc:${p.color}">${esc(p.name)}${p.bot ? ' · CPU' : ''}</span><span><b class="t">${TIME}</b> s</span></div><div class="timer" style="margin-bottom:10px"><i></i></div>
        <div class="disp" style="font-size:1.9rem;line-height:1"><b class="pts">0</b> <small style="font-size:.85rem;color:var(--mut)">punti</small></div>
        <div class="chips" style="max-height:104px;overflow:hidden;margin:8px 0 6px;gap:5px"></div><div class="ty msg" style="min-height:1.3em;font-size:.9rem;text-align:left"></div>`;
      ctx.sideAdd(el); ctx.onExit(() => el.remove());
      const q = s => el.querySelector(s), chips = q('.chips'), ty = q('.ty');
      return {
        time(l) { q('.t').textContent = Math.max(0, Math.ceil(l)); q('.timer i').style.transform = `scaleX(${Math.max(0, Math.min(1, l / TIME))})`; },
        add(it, pts) { q('.pts').textContent = pts; chips.insertAdjacentHTML('afterbegin', chipHtml('•••••', it.p, true)); },
        typing(s, color) { ty.style.color = color || ''; ty.innerHTML = s; },
        reveal(words) { chips.style.maxHeight = '160px'; chips.style.overflow = 'auto'; chips.innerHTML = words.map(i => chipHtml(esc(i.t), i.p, true)).join('') || '<span class="msg">Nessuna risposta</span>'; ty.innerHTML = ''; },
        remove() { el.remove(); }
      };
    }
    async function runBot(p, th, pn, scale = 1) {
      const sk = p.skill, said = new Set(); let pts = 0, T = TIME;
      const known = th.items.filter(it => Math.random() < (it.p === 3 ? Math.max(.05, sk - .32) : Math.min(.92, sk + .18)))
        .map(it => ({it, k: Math.random() + (it.p === 3 ? .35 : 0)})).sort((a, b) => a.k - b.k).map(x => x.it);
      const t0 = performance.now(), left = () => T - (performance.now() - t0) / 1000 * scale;
      const iv = setInterval(() => pn.time(left()), 100); ctx.onExit(() => clearInterval(iv));
      const wait = ms => ctx.sleep(Math.max(0, Math.min(ms / scale, left() * 1000 / scale)));
      let i = 0;
      while (left() > 0) {
        pn.typing('<i>pensa…</i>');
        await wait((1100 + Math.random() * 1900 + said.size * 130) * (1.5 - sk));
        if (left() <= 0) break;
        if (!p.data.crono && left() < 7 && i < known.length && Math.random() < sk) { p.data.crono = true; T += CRONO; pn.typing('Crono: +20 s', 'var(--gold-hi)'); shout(line('crono', p)); await wait(600); }
        let word;
        if (i < known.length && Math.random() < (1 - sk) * .2) word = pick(pick(themes).items).t; // a wrong guess
        else if (i < known.length) word = known[i++].t;
        else if (!p.data.jolly && left() > 4) { const rest = th.items.filter(x => !said.has(x)); if (!rest.length) break; p.data.jolly = true; word = pick(rest).t; pn.typing('Jolly!', 'var(--gold-hi)'); shout(line('jolly', p)); await wait(700); }
        else { await wait(1500); continue; }
        if (norm(word).length >= 6 && Math.random() < (1 - sk) * .3) { const j = 2 + Math.floor(Math.random() * (word.length - 3)); word = word.slice(0, j) + word[j] + word.slice(j); } // doubled letter: Levenshtein 1, still accepted by near()
        for (let c = 1; c <= word.length && left() > 0; c++) { pn.typing(`sta scrivendo ${'•'.repeat(c)}<span style="opacity:.6">▌</span>`); await wait(60 + Math.random() * 90); }
        if (left() <= 0) break;
        const it = match(th, word);
        if (it && !said.has(it)) { said.add(it); pts += it.p; ctx.addScore(p, it.p); if (it.p === 3) p.data.dr = (p.data.dr || 0) + 1; pn.add(it, pts); pn.typing(`+${it.p}`, 'var(--ok)'); onWord(p, it, left()); }
        else pn.typing('✗ non valida', 'var(--bad)');
        await wait(250);
      }
      clearInterval(iv); pn.time(0); pn.typing('Tempo!');
      return {pts, words: [...said]};
    }
    function resultCard(a, b, ra, rb, w, last) {
      return ctx.w(new Promise(res => {
        const miss = shuffle(theme.items.filter(i => i.p === 3 && !ra.words.includes(i) && !rb.words.includes(i))).slice(0, 5).map(i => i.t);
        const col = (p, r) => `<div><div class="meta" style="margin-bottom:4px"><span class="who" style="--pc:${p.color}">${esc(p.name)}</span><span>${r.words.length} parole</span></div><div class="disp" style="font-size:2.2rem;line-height:1">${r.pts} <small style="font-size:.85rem;color:var(--mut)">punti</small></div><div class="chips" style="max-height:96px;overflow:auto;margin-top:6px;gap:5px">${r.words.map(i => chipHtml(esc(i.t), i.p, true)).join('')}</div></div>`;
        const c = h('div', 'card');
        c.innerHTML = `<div class="meta"><span>Manche ${manche} · ${theme.n}</span><span>${a.data.dm} – ${b.data.dm}</span></div><h2>${w ? `Manche a ${esc(w.name)}!` : 'Manche pari: non conta!'}</h2><div class="row" style="align-items:flex-start">${col(a, ra)}${col(b, rb)}</div>${miss.length ? `<p class="msg" style="margin:4px 0 10px">Rare mancate: ${miss.map(esc).join(', ')}</p>` : ''}<div class="row"><button class="btn pri">${last ? 'Verdetto' : 'Prossima manche'}</button></div>`;
        ctx.dock(c); const bt = c.querySelector('button'); bt.focus(); bt.onclick = () => { sfx.click(); res(); };
      }));
    }

    // ---------- one duel (first to 2 manche) ----------
    async function duel(a, b, tag) {
      duelA = a; duelB = b; fA.who = a; fB.who = b;
      [[fA, a], [fB, b]].forEach(([F, p]) => {
        F.p.setClothes({pants: p.color}); F.gloveM.color.set(p.color); F.down = F.cheer = false; F.acts = [];
        tween(F.p.rotation, {x: 0}, .4); p.data.obj = F.g; Object.assign(p.data, {crono: false, jolly: false, dm: 0, dp: 0, hits: []});
      });
      pads[0].material.color.set(a.color); pads[2].material.color.set(b.color);
      manche = 0; theme = null; cur = new Map(); board();
      ctx.hud(`<span class="pill">${tag}</span>`);
      S.go(...CAM.wide);
      await host.say(`${tag}! Da questa parte del ring… ${a.name}!`, {to: a, gesture: 'point', mood: 'happy'});
      await host.say(`E dall’altra parte… ${b.name}!`, {to: b, gesture: 'point', mood: 'happy'});
      while (a.data.dm < TO_WIN && b.data.dm < TO_WIN && manche < MAX_M) {
        manche++; theme = nextTheme(); cur = new Map(); board();
        ctx.hud(`<span class="pill">${tag}</span><span class="pill">Manche <b>${manche}</b></span><span class="pill">${esc(a.name)} <b>${a.data.dm} – ${b.data.dm}</b> ${esc(b.name)}</span>`);
        S.go(...CAM.duel);
        if (a.data.dm === 1 && b.data.dm === 1) host.react('suspense');
        host.say(`Manche ${manche}! Il tema è: ${theme.n}!`, {mood: 'surprised', gesture: 'point'});
        let ra, rb;
        if (a.bot !== b.bot) {
          const hu = a.bot ? b : a, bo = a.bot ? a : b;
          await ctx.passDevice(hu); await readyCard(hu, theme);
          gong(); cheer(.6);
          const pn = panel(bo, 'right');
          const [rh, rbo] = await Promise.all([runHuman(hu, theme), runBot(bo, theme, pn)]);
          [ra, rb] = a === hu ? [rh, rbo] : [rbo, rh];
          pn.reveal(rbo.words); await resultsFlow(a, b, ra, rb); pn.remove();
        } else if (!a.bot && !b.bot) {
          await ctx.passDevice(a); await readyCard(a, theme); gong(); ra = await runHuman(a, theme);
          await ctx.passDevice(b); await readyCard(b, theme, `<b>Da battere: ${ra.pts} punti.</b>`); gong(); rb = await runHuman(b, theme);
          await resultsFlow(a, b, ra, rb);
        } else { // two CPUs (not produced by the seat logic, kept for safety): fast simulation
          const pa = panel(a, 'left'), pb = panel(b, 'right');
          [ra, rb] = await Promise.all([runBot(a, theme, pa, 3), runBot(b, theme, pb, 3)]);
          pa.reveal(ra.words); pb.reveal(rb.words); await resultsFlow(a, b, ra, rb); pa.remove(); pb.remove();
        }
      }
      let w = a.data.dm > b.data.dm ? a : b.data.dm > a.data.dm ? b : null;
      if (!w || (a.data.dm < TO_WIN && b.data.dm < TO_WIN)) { // after MAX_M: total points, then rare words, then coin
        w = a.data.dp !== b.data.dp ? (a.data.dp > b.data.dp ? a : b) : (a.data.dr || 0) !== (b.data.dr || 0) ? ((a.data.dr || 0) > (b.data.dr || 0) ? a : b) : pick([a, b]);
        const l0 = w === a ? b : a; if (w.data.dm <= l0.data.dm) { w.data.mw += l0.data.dm - w.data.dm + 1; w.data.dm = l0.data.dm + 1; }
        await host.say(`Decidono i cartellini! ${w.name} vince ai punti!`, {to: w, mood: 'surprised'});
      }
      const l = w === a ? b : a; w.data.wins++;
      board(); ko(fOf(w), fOf(l));
      await ctx.sleep(2300);
      await host.say(`KO! ${w.name} ${/^(Finale|Incontro)/.test(tag) ? 'vince il match' : 'passa il turno'}!`, {to: w, gesture: 'celebrate', mood: 'happy'});
      return {w, l};
    }
    async function resultsFlow(a, b, ra, rb) {
      a.data.dp += ra.pts; b.data.dp += rb.pts;
      const w = ra.pts > rb.pts ? a : rb.pts > ra.pts ? b : null;
      if (w) { w.data.dm++; w.data.mw++; strike(fOf(w), opp(fOf(w)), 'combo'); comboCut(opp(fOf(w))); }
      board(); gong();
      if (w) host.react('right', w, {value: `${Math.max(ra.pts, rb.pts)} punti`}); else host.say('Pari! Manche nulla, si rigioca!', {mood: 'surprised'});
      const last = a.data.dm >= TO_WIN || b.data.dm >= TO_WIN || manche >= MAX_M;
      await resultCard(a, b, ra, rb, w, last);
    }

    // ---------- show ----------
    S.go(...CAM.wide);
    await host.react('intro', P.find(p => !p.bot));
    const tabellone = (titolo, righe) => ctx.w(new Promise(res => {
      const c = h('div', 'card');
      c.innerHTML = `<div class="meta"><span>${titolo}</span><span>${P.length} lottatori</span></div><h2>Tabellone</h2><p class="msg">${righe.join('<br>')}</p><div class="row"><button class="btn pri">Al ring!</button></div>`;
      ctx.dock(c); const b = c.querySelector('button'); b.focus(); b.onclick = () => { sfx.click(); res(); };
      if (!P.some(p => !p.bot)) setTimeout(() => { if (!ctx.dead) { sfx.click(); res(); } }, 2000);
    }));
    const vs = (x, y, t) => `${t}: <b>${esc(x.name)}</b> contro <b>${esc(y.name)}</b>`;
    if (ctx.cfg?.finalOnly) {
      const f1 = P.find(p => !p.bot) || P[0];
      const f2 = P.find(p => p !== f1) || P[1] || P[0];
      await host.say(`Benvenuti direttamente alla Gran Finale di The Floor! ${f1.name} contro ${f2.name} per il titolo di campione!`, {mood: 'happy', gesture: 'celebrate'});
      await duel(f1, f2, 'Gran Finale');
    } else if (P.length === 2) await duel(P[0], P[1], 'Incontro');
    else if (P.length === 3) { // girone: tutti contro tutti
      const s = shuffle(P), g = [[s[0], s[1]], [s[0], s[2]], [s[1], s[2]]];
      await tabellone('Girone all’italiana', g.map(([x, y], i) => vs(x, y, `Incontro ${i + 1}`)));
      for (const [i, [x, y]] of g.entries()) await duel(x, y, `Incontro ${i + 1} di 3`);
    } else {
      const s = shuffle(P);
      await tabellone('Torneo a eliminazione', [vs(s[0], s[1], 'Semifinale 1'), vs(s[2], s[3], 'Semifinale 2'), 'Poi la finale.']);
      const s1 = await duel(s[0], s[1], 'Semifinale 1'); s1.l.alive = false; ctx.scoreboard();
      const s2 = await duel(s[2], s[3], 'Semifinale 2'); s2.l.alive = false; ctx.scoreboard();
      const f = await duel(s1.w, s2.w, 'Finale'); f.l.alive = false; ctx.scoreboard();
    }
    // incontri vinti, poi manche vinte, poi punti parola
    const order = [...P].sort((x, y) => y.data.wins - x.data.wins || y.data.mw - x.data.mw || y.score - x.score);
    const champ = order[0], human = P.find(p => !p.bot && p !== champ) || P.find(p => !p.bot);
    S.burst(champ.color);
    await host.react(champ.bot ? 'lose' : 'win', champ.bot ? human : champ, {value: champ.score});
    ctx.finish({
      title: P.length === 2 ? `${champ.name} vince per KO!` : `${champ.name} campione!`,
      ranking: order.map(p => ({player: p, score: p.data.wins})),
      lines: ['Classifica per incontri vinti (a pari merito: manche vinte).', 'Punti parola: ' + P.map(p => `${esc(p.name)} ${p.score}`).join(' · ')]
    });
  }
};
