// Hit — format Name That Tune: Playlist, Bid-a-Note, Melody Roulette, Sette per Trenta (Golden Medley).
// Melodies are public-domain / traditional, synthesized live (hit_audio.js, catalogue in hit_data.js).
// Italian pop songs (SONGS) are only used as text-clue rounds, never played.
import {THREE, newStage, tween, label3d, mat, glow, person, chair, podium, PAL} from '../engine.js';
import {h, sfx, shuffle, countdown, rnd, eur, tone} from '../ui.js';
import {SONGS} from '../data.js';
import {createHost, HOSTS} from '../host.js';
import {TUNES, matches} from './hit_data.js';
import {createBand} from './hit_audio.js';

const WHEEL = [500, 1000, 1500, 2000, 2500, 3000, 1000, 1500, 2000, 500, 2500, 5000];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// CPU: chance of knowing the tune after n notes (or n clues) — grows with notes heard, lower for hard tunes
const pc = (p, t, n) => Math.min(.95, (p.skill ?? .6) * 1.25 * (1 - Math.exp(-n / (1 + (t.d ?? 2) * 1.1))));

export default {
  id: 'hit', name: 'Hit', tag: 'Indovina la canzone', desc: 'L’orchestra suona, tu prenoti e indovini il titolo', c1: '#9a6cc8', c2: '#4fb3a9',
  players: {min: 1, max: 4, def: 2, rival: true}, questions: true,
  guide: `
    <h4 style="margin:4px 0 6px;color:var(--gold);font-size:0.95rem">🎶 L'Orchestra dal Vivo &amp; Le Tre Sfide</h4>
    <p>Due squadre (o due concorrenti) e un'orchestra polifonica 3D che suona dal vivo melodie classiche, canzoni pop e brani celebri:</p>
    <ul style="margin:4px 0 8px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li><b>1. Playlist (da 3 a 6 brani):</b> l'orchestra esegue un medley di brani. Prenotati per primo al pulsante o con la barra Spazio e digita il titolo (+200 € a risposta). Chi ne indovina di più vince il primo prezioso <b>Jolly</b> per il finale!</li>
      <li><b>2. Bid-a-Note (Asta delle Note):</b> dopo un indizio sul testo o sull'autore, le squadre si sfidano al ribasso offrendo con quante note riconoscono il brano (da 7 note a scendere: <i>"La indovino con 5 note... Io con 4!"</i>). Chi dice <i>"Ti sfido!"</i> costringe l'avversario a indovinare con le note dichiarate. Chi arriva per primo a 3 punti guadagna 1.000 € e un <b>Jolly</b>.</li>
      <li><b>3. Melody Roulette:</b> a turno una squadra gira la grande ruota per determinare il valore economico del brano in palio. Chi indovina incassa la somma estratta.</li>
    </ul>

    <h4 style="margin:10px 0 6px;color:var(--gold);font-size:0.95rem">⏱️ Sette per Trenta (7x30 Finale)</h4>
    <p>La squadra con il montepremi più alto accede al gioco finale più avvincente:</p>
    <ul style="margin:4px 0 8px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li><b>30 secondi complessivi per 7 brani musicali:</b> il cronometro scorre <b>SOLO mentre l'orchestra suona</b>!</li>
      <li>Premi <b>STOP</b> (o barra Spazio) per bloccare l'orologio, poi digita il titolo o passa.</li>
      <li>I brani passati tornano in coda se resta tempo a disposizione. Attenzione: un singolo <b>errore</b> interrompe definitivamente il gioco finale!</li>
      <li><b>Uso dei Jolly:</b> ogni Jolly accumulato indovina automaticamente un brano per te senza rischiare errori.</li>
      <li><b>Premi:</b> <b>500 €</b> per ciascun brano indovinato + un <b>Super Bonus di 5.000 € extra</b> se completi tutti e 7 i brani!</li>
    </ul>

    <h4 style="margin:10px 0 6px;color:var(--gold);font-size:0.95rem">🎮 Comandi</h4>
    <ul style="margin:4px 0 4px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li>Premi la <b>barra Spazio</b> (o i tasti <b>Q / P</b> in base alla postazione) oppure clicca sul pulsante PRENOTA / STOP a schermo.</li>
      <li>Digita il titolo nella casella di testo e premi Invio (sono tollerati articoli omessi e lievi errori di battitura).</li>
    </ul>
  `,
  rules: [
    'Due squadre (o due giocatori) e un’orchestra dal vivo: suona melodie classiche, popolari e filastrocche. Da solo sfidi un rivale CPU. La difficoltà sceglie brani più facili o più ostici, il tempo per rispondere e la velocità degli indizi. Con meno giocatori si suonano più brani.',
    '<b>Playlist</b>: da 3 a 6 brani (più giocatori, meno brani), prenota per primo (pulsante, oppure Spazio / Q e P) e scrivi il titolo. Chi ne indovina di più vince il primo <b>jolly</b>.',
    '<b>Bid-a-Note</b>: dopo un indizio le squadre si alternano a offrire con quante note (da 7 in giù) riconoscono il brano. Chi non vuole scendere dice <b>«Ti sfido!»</b> e l’ultimo offerente deve indovinare con le sue note. Giusto = punto; sbagliato = punto all’avversario, ma il punto vincente va guadagnato. Vince chi arriva a 3 (+1.000 € e un jolly).',
    '<b>Melody Roulette</b>: 2-4 giri, a turno una squadra gira la ruota che decide quanto vale il brano (anche una hit italiana a indizi). Chi indovina incassa.',
    '<b>Sette per Trenta</b>: la squadra in testa affronta 7 brani in 30 secondi. Il cronometro corre solo mentre l’orchestra suona: premi STOP, poi rispondi o passa. I passati tornano se resta tempo; un errore chiude il gioco. Il jolly indovina un brano per te. 500 € a titolo, 5.000 € extra se li prendi tutti.'
  ],
  async start(ctx) {
    const band = createBand(ctx); // synchronous: we are still inside the click that started the show
    const S = ctx.stage = newStage({c1: this.c1, c2: this.c2, bg: '#0a0716', cam: [0, 3.6, 11.5], look: [0, 2, -1]});
    S.par = .35;
    const Y = .4;
    const M = {
      black: mat('#09090c', {roughness: .12, metalness: .15}), ivory: mat('#f1ede2', {roughness: .3, metalness: 0}), key: mat('#0d0d0f', {roughness: .3}),
      wood: mat('#7a3e1c', {roughness: .32, metalness: .05}), dark: mat('#151826', {roughness: .5, metalness: .4}), brass: mat('#c9a04a', {metalness: 1, roughness: .26}),
      chrome: mat('#d9dce3', {metalness: 1, roughness: .2}), shell: mat('#5a1f2a', {roughness: .28, metalness: .35}), head: mat('#e8e2d4', {roughness: .75, metalness: 0}),
      gold: mat(PAL.gold, {metalness: 1, roughness: .3})
    };
    const box = (w, hh, d, m, x, y, z, p) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), m); o.position.set(x, y, z); p.add(o); return o; };
    const cyl = (r0, r1, hh, m, x, y, z, p, seg = 20) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, hh, seg), m); o.position.set(x, y, z); p.add(o); return o; };

    // ---------- orchestra riser ----------
    box(11.5, .4, 4.4, mat('#121831', {roughness: .45, metalness: .25}), 0, .2, -4.6, S.scene);
    box(11.52, .04, .04, M.gold, 0, .41, -2.4, S.scene);
    const tux = (o = {}) => person({suit: '#15161c', shirt: '#f2efe8', tie: '#121212', ...o});
    const station = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, Y, z); g.rotation.y = ry; S.add(g); return g; };

    // grand piano + pianist (profile, facing the centre)
    const pst = station(-4.7, -4.7, Math.PI / 2 - .3);
    {
      const sh = new THREE.Shape(); sh.moveTo(.75, .5); sh.lineTo(-.75, .5); sh.lineTo(-.75, 1.1); sh.bezierCurveTo(-.75, 1.7, -.1, 1.6, .05, 2.3); sh.lineTo(.75, 2.3); sh.closePath();
      const bodyG = new THREE.ExtrudeGeometry(sh, {depth: .32, bevelEnabled: false}); bodyG.rotateX(Math.PI / 2); bodyG.translate(0, .98, 0);
      pst.add(new THREE.Mesh(bodyG, M.black));
      const lidG = new THREE.ExtrudeGeometry(sh, {depth: .02, bevelEnabled: false}); lidG.rotateX(Math.PI / 2); lidG.translate(-.75, 0, 0);
      const lid = new THREE.Group(); lid.position.set(.75, 1.0, 0); lid.rotation.z = -.5; lid.add(new THREE.Mesh(lidG, M.black)); pst.add(lid);
      box(1.5, .1, .14, M.black, 0, .7, .45, pst);
      box(1.36, .03, .15, M.ivory, 0, .765, .42, pst);
      for (let i = 0; i < 26; i++) if ([1, 2, 4, 5, 6].includes(i % 7)) box(.022, .025, .09, M.key, -.66 + i * .052 + .026, .785, .39, pst);
      [[-.6, .7], [.6, .7], [.4, 2.0]].forEach(([x, z]) => cyl(.04, .03, .66, M.black, x, .33, z, pst, 10));
      box(.7, .07, .34, M.black, 0, .415, -.02, pst); [-.3, .3].forEach(x => box(.04, .38, .3, M.black, x, .19, -.02, pst));
    }
    const pianist = tux({hair: '#2a1d14', hairStyle: 'slick', skin: '#e3b894'}); pianist.position.set(0, 0, -.02); pianist.sit(true); pst.add(pianist);

    // violinist
    const vst = station(-1.8, -3.5, .25);
    { const c = chair(PAL.navy2); vst.add(c); }
    const violinist = tux({female: true, hair: '#6b3a1f', hairStyle: 'bun', skin: '#efcaa9', suit: '#18151c'}); violinist.sit(true); vst.add(violinist);
    {
      const sp = violinist.joints.spine, v = new THREE.Group(); v.position.set(.13, .5, .2); v.rotation.set(-.15, .45, -.45); sp.add(v);
      const vb = new THREE.Mesh(new THREE.SphereGeometry(.1, 16, 10), M.wood); vb.scale.set(1, .32, 1.75); v.add(vb);
      box(.03, .02, .26, M.key, 0, .03, .27, v); cyl(.02, .02, .04, M.wood, 0, .03, .42, v, 8);
      const bow = cyl(.006, .006, .68, mat('#3a2414', {roughness: .5}), .3, 0, 0, violinist.joints.RA.el, 6); bow.rotation.z = Math.PI / 2; bow.position.y = -.31;
    }
    // drum kit + drummer
    const dst = station(.4, -5.6, 0);
    { const st = new THREE.Group(); dst.add(st); cyl(.2, .22, .45, M.dark, 0, .22, 0, st); box(.42, .06, .42, M.dark, 0, .47, 0, st); }
    const drummer = tux({hair: '#151515', hairStyle: 'curly', skin: '#c99272'}); drummer.position.set(0, 0, 0); drummer.sit(true); dst.add(drummer);
    const kit = new THREE.Group(); kit.position.z = .1; dst.add(kit);
    {
      const drum = (r, d, x, y, z, rx = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.x = rx; kit.add(g); cyl(r, r, d, M.shell, 0, 0, 0, g, 28); cyl(r * 1.01, r * 1.01, .012, M.head, 0, d / 2, 0, g, 28); cyl(r * 1.02, r * 1.02, .02, M.chrome, 0, -d / 2, 0, g, 28); return g; };
      drum(.29, .34, 0, .3, .8, Math.PI / 2);                  // kick (head facing the audience)
      drum(.17, .12, .28, .62, .5);                            // snare
      drum(.14, .14, .16, .82, .78, -.35); drum(.15, .15, -.18, .82, .78, -.35); // rack toms
      drum(.2, .3, -.5, .45, .5);                              // floor tom
      const cym = (r, x, y, z, tilt) => { cyl(.012, .012, y, M.chrome, x, y / 2, z, kit, 6); const c = cyl(r, .01, .02, M.brass, x, y, z, kit, 32); c.rotation.x = tilt; return c; };
      const hh = cym(.17, .55, .88, .5, 0); cyl(.17, .01, .02, M.brass, .55, .9, .5, kit, 32); kit.userData.hh = hh;
      kit.userData.ride = cym(.25, -.65, 1.1, .75, .25); kit.userData.crash = cym(.21, .62, 1.25, .85, .3);
      [drummer.joints.LA.el, drummer.joints.RA.el].forEach(el => { const s = cyl(.009, .006, .4, mat('#d8c7a0', {roughness: .5}), 0, -.31, .16, el, 6); s.rotation.x = Math.PI / 2; });
    }
    // double bass + bassist (standing)
    const bst = station(2.7, -4.5, -.35);
    const bassist = tux({hair: '#b9b6b0', hairStyle: 'short', skin: '#e6bf9c'}); bst.add(bassist);
    {
      const db = new THREE.Group(); db.position.set(.22, 0, .38); db.rotation.set(-.16, .35, .08); bst.add(db);
      const lb = new THREE.Mesh(new THREE.SphereGeometry(.31, 24, 16), M.wood); lb.scale.set(1, 1.15, .36); lb.position.y = .58; db.add(lb);
      const ub = new THREE.Mesh(new THREE.SphereGeometry(.24, 24, 16), M.wood); ub.scale.set(1, 1.1, .36); ub.position.y = 1.0; db.add(ub);
      box(.06, .72, .05, M.key, 0, 1.45, .06, db); box(.07, .5, .04, M.wood, 0, 1.6, .02, db);
      cyl(.05, .05, .08, M.wood, 0, 1.88, 0, db, 10); cyl(.008, .008, .3, M.chrome, 0, .15, 0, db, 6);
      for (let i = 0; i < 4; i++) cyl(.003, .003, 1.4, M.ivory, -.03 + i * .02, 1.15, .12, db, 4);
    }
    // trumpet player
    const tst = station(4.3, -3.8, -.5);
    { const c = chair(PAL.navy2); tst.add(c); }
    const trumpeter = tux({hair: '#3a2a1a', hairStyle: 'short', skin: '#dcae88'}); trumpeter.sit(true); tst.add(trumpeter);
    {
      const tr = new THREE.Group(); tr.position.set(0, .07, .1); trumpeter.joints.head.add(tr);
      const tube = cyl(.014, .014, .34, M.brass, 0, 0, .18, tr, 10); tube.rotation.x = Math.PI / 2;
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(.075, .016, .15, 24, 1, true), mat('#c9a04a', {metalness: 1, roughness: .26, side: THREE.DoubleSide}));
      bell.rotation.x = Math.PI / 2; bell.position.z = .41; tr.add(bell);
      for (let i = 0; i < 3; i++) cyl(.011, .011, .07, M.brass, 0, -.035, .17 + i * .03, tr, 8);
      trumpeter.userData.horn = tr;
    }

    // ---------- big LED screen + note counter ----------
    const frame = box(6.7, 2.5, .16, M.dark, 0, 5.1, -6.9, S.scene);
    const screen = label3d([{t: 'HIT', fs: .4, color: PAL.goldHi}], {w: 6.4, h: 2.25, px: 110, fs: .3}); screen.position.set(0, 5.1, -6.8); S.add(screen);
    box(3.6, .9, .14, M.dark, 0, 3.35, -6.9, S.scene); frame.userData.noShadow = true;
    const counter = label3d([{t: 'NOTE', fs: .3, color: PAL.mut, font: 'Outfit'}, {t: '0', fs: .55, color: PAL.goldHi}], {w: 1.1, h: .78, px: 150}); counter.position.set(-1.15, 3.35, -6.8); S.add(counter);
    const lampOff = mat('#1a1f33', {roughness: .4}), lampAv = mat('#4a3f22', {roughness: .35, metalness: .4}), lampOn = glow(PAL.goldHi);
    const lamps = Array.from({length: 7}, (_, i) => { const l = new THREE.Mesh(new THREE.SphereGeometry(.1, 16, 12), lampOff); l.position.set(-.35 + i * .28, 3.35, -6.78); S.add(l); return l; });
    let avail = 7, shown = -1;
    const setLamps = lit => lamps.forEach((l, i) => { l.material = i < lit ? lampOn : i < avail ? lampAv : lampOff; });
    const showCount = n => { if (n === shown) return; shown = n; counter.set([{t: 'NOTE', fs: .3, color: PAL.mut, font: 'Outfit'}, {t: String(n), fs: .55, color: PAL.goldHi}]); setLamps(Math.min(n, avail)); };
    const scr = (a, b = '') => screen.set([{t: a, fs: .32, color: PAL.goldHi}, ...(b ? [{t: b, fs: .16, color: PAL.ivory, font: 'Outfit'}] : [])]);
    setLamps(0);

    // ---------- the wheel ----------
    const N = WHEEL.length, SEG = Math.PI * 2 / N;
    const wheel = new THREE.Group(); wheel.position.set(5.7, 0, -.6); wheel.rotation.y = -.7; S.add(wheel);
    box(.12, 2.4, .12, M.dark, -.5, 1.2, -.25, wheel).rotation.z = -.2; box(.12, 2.4, .12, M.dark, .5, 1.2, -.25, wheel).rotation.z = .2;
    cyl(.9, 1, .08, M.dark, 0, .04, -.25, wheel, 32);
    const spinner = new THREE.Group(); spinner.position.set(0, 2.5, 0); wheel.add(spinner);
    {
      const cv = document.createElement('canvas'); cv.width = cv.height = 1024; const x = cv.getContext('2d'), C = 512;
      const cols = ['#1d2550', '#2a1f45', '#173a3d'];
      WHEEL.forEach((v, i) => {
        const a0 = -Math.PI / 2 + (i - .5) * SEG, a1 = a0 + SEG;
        x.beginPath(); x.moveTo(C, C); x.arc(C, C, 510, a0, a1); x.closePath(); x.fillStyle = v === 5000 ? '#9c7a32' : cols[i % 3]; x.fill();
        x.strokeStyle = PAL.gold; x.lineWidth = 6; x.stroke();
        x.save(); x.translate(C, C); x.rotate(a0 + SEG / 2 + Math.PI / 2); x.fillStyle = PAL.ivory; x.font = '86px "Bebas Neue", Outfit, Arial'; x.textAlign = 'center';
        x.fillText(v.toLocaleString('it-IT'), 0, -330); x.font = '50px "Bebas Neue", Outfit, Arial'; x.fillStyle = PAL.goldHi; x.fillText('€', 0, -260); x.restore();
      });
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
      spinner.add(new THREE.Mesh(new THREE.CircleGeometry(1.7, 96), new THREE.MeshStandardMaterial({map: tx, roughness: .38, metalness: .2})));
      const back = cyl(1.72, 1.72, .1, M.dark, 0, 0, -.06, spinner, 64); back.rotation.x = Math.PI / 2;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.72, .05, 12, 96), M.gold); spinner.add(rim);
      for (let i = 0; i < N; i++) { const a = (i - .5) * SEG, pg = cyl(.022, .022, .1, M.chrome, Math.sin(a) * 1.6, Math.cos(a) * 1.6, .05, spinner, 8); pg.rotation.x = Math.PI / 2; }
      const hub = cyl(.2, .2, .12, M.gold, 0, 0, .05, spinner, 32); hub.rotation.x = Math.PI / 2;
    }
    const ptr = new THREE.Group(); ptr.position.set(0, 4.32, .12); wheel.add(ptr);
    { const c = new THREE.Mesh(new THREE.ConeGeometry(.11, .3, 16), glow(PAL.goldHi)); c.rotation.z = Math.PI; c.position.y = -.1; ptr.add(c); }
    let kick = 0, lastSeg = 0;
    S.on(dt => {
      const s = Math.round(spinner.rotation.z / SEG);
      if (s !== lastSeg) { lastSeg = s; kick = 1; sfx.tick(); }
      kick *= Math.exp(-dt * 12); ptr.rotation.z = kick * .45;
    });
    async function spin() {
      const i = rnd(0, N - 1), cur = spinner.rotation.z, want = i * SEG + (Math.random() - .5) * SEG * .6;
      const target = cur + (5 + rnd(0, 2)) * Math.PI * 2 + (((want - cur) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      sfx.whoosh();
      await ctx.w(tween(spinner.rotation, {z: target}, 5.2, 'out'));
      return WHEEL[i];
    }

    // ---------- sides, podiums, buzzers ----------
    const players = ctx.players;
    while (players.length < 2) players.push({id: players.length, name: `Rival CPU`, color: ctx.accent.b, bot: true, skill: .6, score: 0, alive: true, data: {}});
    const all = players, n = all.length, qd = ctx.qDiff;
    const PL = Math.ceil(12 / n), ROUL = 2 * Math.ceil(4 / n);        // fewer players -> more tunes
    const TM = [1.4, 1, .75][qd - 1], CL = [4800, 3500, 2600][qd - 1]; // answer-time factor, ms between text clues
    const sides = [0, 1].map(k => {
      const members = all.filter((_, i) => i % 2 === k);
      return {k, members, color: members[0].color, name: members.length === 1 ? members[0].name : 'Squadra ' + members.map(m => m.name).join(' & '), turn: 0, jolly: 0};
    });
    const money = s => s.members.reduce((a, p) => a + p.score, 0);
    const other = s => sides[1 - s.k];
    const who = s => s.members[s.turn % s.members.length];
    const rotate = () => sides.forEach(s => s.turn++);
    sides.forEach(s => s.members.forEach((p, j) => {
      const sg = s.k ? 1 : -1, g = new THREE.Group(); g.position.set(sg * (2.6 + j * 1.35), 0, 2.8 - j * .3); g.rotation.y = -sg * .28; S.add(g);
      const pod = podium(p.color, p.name); g.add(pod); pod.light(false);
      const pp = person({suit: new THREE.Color(p.color).multiplyScalar(.42).getStyle(), shirt: '#f2efe8', tie: p.color, female: p.id % 2 === 1, hair: ['#2a1d14', '#6b3a1f', '#1c1416', '#b08a50'][p.id % 4], skin: ['#e9c3a0', '#d9a77f', '#efcaa9', '#c99272'][p.id % 4]});
      pp.position.set(0, 0, -.55); g.add(pp);
      cyl(.13, .15, .05, M.dark, 0, 1.13, .2, g, 24);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), glow(p.color)); cap.position.set(0, 1.15, .2); g.add(cap); cap.userData.y = 1.15;
      p.data = {...p.data, obj: pp, pod, cap, side: s};
    }));
    const lightSide = s => sides.forEach(x => x.members.forEach(p => p.data.pod.light(x === s ? true : false)));
    const press = p => {
      const c = p.data.cap; tone(196, .28, 'square', .07); tone(392, .2, 'triangle', .05, .02);
      tween(c.position, {y: c.userData.y - .035}, .05).then(() => tween(c.position, {y: c.userData.y}, .45, 'spring'));
      lightSide(p.data.side); S.flashWith(p.color);
    };

    // ---------- musicians follow the actual notes ----------
    const last = (arr, now) => { let e = null; for (const x of arr) { if (x.t <= now) e = x; else break; } return e; };
    let pianoX = 0, bassY = 0, bowDir = 1, bowNote = null;
    S.on(dt => {
      const c = band.cur, now = band.now(), live = c && now < c.end + .15;
      const P = e => e ? Math.exp(-(now - e.t) * 16) : 0;
      const mel = live ? last(c.ev.m, now) : null, on = mel && now < mel.t + mel.d, lead = live ? c.ins : null;
      if (live) showCount(c.heard());
      // piano
      let J = pianist.joints;
      J.LA.sh.rotation.x -= .5; J.LA.el.rotation.x -= .9; J.RA.sh.rotation.x -= .5; J.RA.el.rotation.x -= .9;
      if ((lead === 'piano' || lead === 'organ') && mel) {
        pianoX += (clamp((mel.m - 64) / 20, -1, 1) - pianoX) * Math.min(1, dt * 18);
        J.RA.el.rotation.x += .2 * P(mel); J.LA.el.rotation.x += .12 * P(last(c.ev.b, now) || mel);
      } else pianoX *= Math.exp(-dt * 3);
      J.RA.sh.rotation.z -= pianoX * .3;
      // violin
      J = violinist.joints;
      J.LA.sh.rotation.x -= 1.35; J.LA.sh.rotation.z += .15; J.LA.el.rotation.x -= .5;
      J.RA.sh.rotation.x -= 1.0; J.RA.el.rotation.x -= .6;
      if (lead === 'strings' && mel) {
        if (bowNote !== mel) { bowNote = mel; bowDir = -bowDir; }
        const k = on ? clamp((now - mel.t) / mel.d, 0, 1) : 1;
        J.RA.sh.rotation.z += (bowDir > 0 ? k : 1 - k) * .55 - .2;
        J.LA.sh.rotation.x += clamp((mel.m - 70) / 24, -1, 1) * .12;
      }
      // drums
      J = drummer.joints;
      J.LA.sh.rotation.x -= .75; J.LA.el.rotation.x -= .85; J.RA.sh.rotation.x -= .75; J.RA.el.rotation.x -= .85; J.RA.sh.rotation.z += .25;
      if (live && c.kit) {
        J.LA.el.rotation.x += .4 * P(last(c.ev.s, now)) - .15; J.RA.el.rotation.x += .28 * P(last(c.ev.h, now)) - .1;
        J.RL.knee.rotation.x -= .25 * P(last(c.ev.k, now));
        kit.userData.hh.rotation.z = P(last(c.ev.h, now)) * .08;
      }
      // bass
      J = bassist.joints;
      J.LA.sh.rotation.x -= 1.45; J.LA.el.rotation.x -= .45; J.RA.sh.rotation.x -= .7; J.RA.sh.rotation.z += .35; J.RA.el.rotation.x -= .8;
      if (live && c.kit) { const b = last(c.ev.b, now); J.RA.el.rotation.x += .3 * P(b); if (b) bassY += (clamp((b.m - 43) / 7, -1, 1) - bassY) * Math.min(1, dt * 10); }
      J.LA.sh.rotation.x += bassY * .12;
      // trumpet
      J = trumpeter.joints;
      J.LA.sh.rotation.x -= 1.15; J.LA.sh.rotation.z -= .3; J.LA.el.rotation.x -= 1.25; J.RA.sh.rotation.x -= 1.15; J.RA.sh.rotation.z += .3; J.RA.el.rotation.x -= 1.25;
      if (lead === 'brass' && on) { J.head.rotation.x -= .07 + P(mel) * .04; J.RA.el.rotation.z += P(mel) * .08; }
    });

    // ---------- host, HUD, helpers ----------
    const host = createHost(ctx, {...HOSTS.hit, position: [-1.2, 0, 1.6], lookAt: null});
    const say = (t, o) => host.say(t, o);
    let extraHud = '';
    const hud = () => ctx.hud(sides.map(s => `<span class="pill" style="border-color:${s.color}">${esc(s.name)} <b>${eur(money(s))}</b>${s.jolly ? ` · jolly ${s.jolly}` : ''}</span>`).join('') + extraHud);
    hud();
    const SHOT = {wide: [[0, 3.6, 11.5], [0, 2, -1]], band: [[0, 2.8, 5.4], [0, 1.6, -4.6]], wheel: [[2.4, 3, 6.2], [5.5, 2.5, -.6]], screen: [[0, 3.6, 4.5], [0, 4.4, -6.8]]};
    const shot = k => S.go(...SHOT[k]);
    const shotSide = s => S.go([(s.k ? 1 : -1) * 1.3, 2.3, 7.6], [(s.k ? 1 : -1) * 3, 1.4, 2.8]);
    const card = html => { const c = h('div', 'card', html); ctx.dock(c); return c; };
    const msg = (big, sub = '', col = 'var(--gold)') => card(`<div class="big disp" style="color:${col}">${big}</div>${sub ? `<p class="msg">${sub}</p>` : ''}`);
    const dl = (id, arr) => { const d = document.createElement('datalist'); d.id = id; d.innerHTML = arr.map(t => `<option value="${esc(t)}">`).join(''); ctx.sideAdd(d); };
    dl('hitTunes', TUNES.map(t => t.t).sort((a, b) => a.localeCompare(b, 'it'))); dl('hitSongs', SONGS.map(s => s[0]).sort((a, b) => a.localeCompare(b, 'it')));
    let holder = null;
    const turn = async p => { if (p.bot || !ctx.players.includes(p)) return; if (holder !== p) { await ctx.passDevice(p); holder = p; } ctx.setActive(p); };
    const pool = shuffle(TUNES).sort((a, b) => Math.abs(a.d - qd) - Math.abs(b.d - qd)); // tunes of the chosen level first
    const draw = f => { let i = pool.findIndex(f); if (i < 0) i = pool.findIndex(t => !t.audio); return pool.splice(Math.max(0, i), 1)[0]; };
    const songs = shuffle(SONGS);
    const songItem = () => { const s = songs.pop(); return {t: s[0], alt: [], song: s, d: 2}; };
    const titles = it => [it.t, ...it.alt];
    const songClues = ([title, artist, year, genre]) => [
      `Genere: <b>${genre}</b>, anni <b>${String(Math.floor(year / 10) * 10).slice(2)}</b>`, `Anno: <b>${year}</b>`,
      `Artista: <b>${artist.split(/\s+/).map(w => w[0].toUpperCase() + '.').join(' ')}</b>`,
      `Titolo: <b>${title.split(/\s+/).map(w => w[0] + ' ' + '_ '.repeat(Math.max(0, w.replace(/[^A-Za-zÀ-ÿ]/g, '').length - 1)).trim()).join('&nbsp;&nbsp; ')}</b>`];

    // typed answer (human): {act:'ok'|'time'|extra id, v}
    function askTitle(p, {prompt, list = 'hitTunes', time = 12, extra = []}) {
      return ctx.w(new Promise(res => {
        const c = h('div', 'card');
        c.innerHTML = `<div class="meta"><span class="who" style="--pc:${p.color}">${esc(p.name)}</span><span>${time} secondi</span></div><h2>${prompt}</h2><div class="timer"><i></i></div><form class="in"><input autocomplete="off" list="${list}" aria-label="Titolo" placeholder="Scrivi il titolo…"><button class="btn pri">Rispondi</button></form>`;
        let done = false;
        const fin = r => { if (done) return; done = true; cd.stop(); res(r); };
        const row = h('div', 'row'); row.style.marginTop = '10px';
        extra.filter(Boolean).forEach(x => { const b = h('button', 'btn', x.label); b.type = 'button'; b.onclick = () => fin({act: x.id}); row.append(b); });
        if (row.children.length) c.append(row);
        const inp = c.querySelector('input');
        c.querySelector('form').onsubmit = e => { e.preventDefault(); if (inp.value.trim()) fin({act: 'ok', v: inp.value}); };
        const cd = countdown(ctx, time, {bar: c.querySelector('.timer i'), onEnd: () => fin({act: 'time'})});
        ctx.dock(c); setTimeout(() => inp.focus(), 60);
      }));
    }
    // answer by human or CPU -> {ok, guess, act}
    async function answer(p, item, {prob, prompt, time = 12, extra = [], botAct, race = false}) {
      const list = item.song ? 'hitSongs' : 'hitTunes';
      if (!p.bot) {
        if (race) { holder = p; ctx.setActive(p); } else await turn(p); // races: both sides already sit at the device
        const r = await askTitle(p, {prompt, list, time: Math.round(time * TM), extra});
        return {act: r.act, ok: r.act === 'ok' && matches(r.v, titles(item), !item.song), guess: r.v};
      }
      card(`<div class="meta"><span class="who" style="--pc:${p.color}">${esc(p.name)} · CPU</span></div><h2>${esc(p.name)} ci pensa…</h2>`);
      await ctx.botThink(900, 2100);
      const act = botAct ? botAct() : 'ok';
      if (act !== 'ok') return {act, ok: false};
      const ok = Math.random() < prob;
      const others = item.song ? SONGS.map(s => s[0]) : TUNES.map(t => t.t);
      return {act, ok, guess: ok ? item.t : shuffle(others.filter(t => t !== item.t))[0]};
    }
    async function verdict(r, p) {
      (r.ok ? sfx.ok : sfx.bad)();
      msg(r.ok ? 'ESATTO!' : r.act === 'time' ? 'TEMPO!' : 'NO!', `${esc(p.name)}: «${esc(r.guess || '—')}»`, r.ok ? 'var(--ok)' : 'var(--bad)');
      const o = p.data.obj; if (o) (r.ok ? o.celebrate() : o.shrug());
      if (r.ok) { S.burst(p.color, 70, 6); S.flashWith(PAL.ok); }
      await ctx.sleep(1300);
    }
    async function reveal(item, sub = '') {
      const extra = item.song ? `${item.song[1]} · ${item.song[2]}` : item.cat;
      scr(item.t.toUpperCase(), sub || extra);
      msg(esc(item.t), esc(item.song ? extra : item.hint));
      await ctx.sleep(1800);
    }

    // ---------- buzzer race (Playlist, Roulette) ----------
    const synthSrc = (tune, from) => {
      host.stop(); // never talk over the band
      const hd = band.play(tune, {from}), t0 = performance.now(), lim = (hd.end - hd.t0 + 2.5) * 1000;
      return {step: () => hd.heard(), over: () => band.now() > hd.end + .5 || performance.now() - t0 > lim, stop: () => band.stop()};
    };
    const textSrc = (item, from) => {
      const cl = songClues(item.song); let lvl = Math.max(1, from), boxEl = null;
      const t0 = performance.now() - (lvl - 1) * CL, add = i => boxEl?.append(h('span', 'chip', cl[i]));
      return {text: true, mount(el) { boxEl = el; for (let i = 0; i < lvl; i++) add(i); },
        step() { const l = Math.min(4, 1 + Math.floor((performance.now() - t0) / CL)); while (lvl < l) { add(lvl); lvl++; sfx.click(); } return lvl; },
        over: () => performance.now() - t0 > 4 * CL + 5000, stop() {}};
    };
    function waitBuzz(live, src, item, label) {
      return ctx.w(new Promise(res => {
        let done = false, lastStep = 0; const sched = new Map();
        const c = h('div', 'card');
        c.innerHTML = `<div class="meta"><span>${label}</span><span class="nc"></span></div><h2>${src.text ? 'Indovina la hit italiana dagli indizi' : 'Ascolta l’orchestra…'}</h2><div class="chips"></div><div class="row bz" style="margin-top:12px"></div>`;
        src.mount?.(c.querySelector('.chips'));
        const nc = c.querySelector('.nc'), bz = c.querySelector('.bz');
        const humans = live.filter(s => !who(s).bot), keys = {};
        humans.forEach(s => {
          const k = humans.length === 1 ? 'Space' : s.k ? 'KeyP' : 'KeyQ'; keys[k] = s;
          const b = h('button', 'btn pri', `Prenota · ${esc(who(s).name)} <small>[${k === 'Space' ? 'Spazio' : k.slice(3)}]</small>`);
          b.style.borderColor = s.color; b.onclick = () => fin(s); bz.append(b);
        });
        if (!humans.length) bz.append(h('span', 'chip', 'Le squadre CPU ascoltano…'));
        const fin = s => { if (done) return; done = true; clearInterval(iv); removeEventListener('keydown', key); res(s); };
        const key = e => { if (e.repeat || e.target.tagName === 'INPUT') return; const s = keys[e.code]; if (s) { e.preventDefault(); fin(s); } };
        addEventListener('keydown', key);
        const iv = setInterval(() => {
          if (ctx.dead) return;
          const st = src.step(); nc.textContent = src.text ? `Indizio ${st}/4` : `Note: ${st}`;
          if (st > lastStep) {
            lastStep = st;
            for (const s of live) { const p = who(s); if (p.bot && !sched.has(s) && Math.random() < pc(p, item, st) * .3) sched.set(s, performance.now() + 350 + Math.random() * 700); }
          }
          for (const [s, t] of sched) if (performance.now() >= t) return fin(s);
          if (src.over()) fin(null);
        }, 50);
        ctx.onExit(() => { clearInterval(iv); removeEventListener('keydown', key); });
        ctx.dock(c);
      }));
    }
    async function race(item, label) {
      const locked = new Set(); let from = 0, replays = 0;
      for (;;) {
        const live = sides.filter(s => !locked.has(s));
        if (!live.length) return null;
        shot(item.song ? 'screen' : 'band');
        avail = 7; shown = -1; showCount(0);
        const src = item.song ? textSrc(item, from) : synthSrc(item, from);
        const s = await waitBuzz(live, src, item, label);
        const heard = src.step(); src.stop();
        if (!s) { if (!item.song && replays++ < 1) { from = 0; await say('Ve la rifaccio sentire!'); continue; } return null; }
        from = heard;
        const p = who(s); press(p); shotSide(s);
        const r = await answer(p, item, {prob: clamp(pc(p, item, heard) + .25, .2, .95), prompt: `${esc(p.name)}, qual è il titolo?`, race: true});
        await verdict(r, p);
        if (r.ok) return {side: s, p};
        locked.add(s);
        if (locked.size < sides.length) await say(`Niente da fare. ${other(s).name}, tocca a voi: si riparte!`);
      }
    }

    // ================= 1. PLAYLIST =================
    shot('wide'); scr('HIT', 'In diretta con l’orchestra');
    await host.react('intro', ctx.players[0]);
    await say(`Stasera si sfidano ${sides[0].name} e ${sides[1].name}. Si parte con la Playlist: chi indovina più titoli vince il primo jolly!`, {mood: 'happy', gesture: 'wave'});
    const pl = [0, 0];
    for (let i = 0; i < PL; i++) {
      const t = draw(x => !x.audio);
      scr('PLAYLIST', `Brano ${i + 1} di ${PL}`); extraHud = `<span class="pill">Playlist <b>${pl[0]} – ${pl[1]}</b></span>`; hud();
      const r = await race(t, `Playlist · brano ${i + 1}/${PL}`);
      if (r) { pl[r.side.k]++; ctx.addScore(r.p, 200); await host.react('right', r.p, {value: '200 €'}); } else await host.react('wrong');
      lightSide(null); await reveal(t); rotate(); extraHud = `<span class="pill">Playlist <b>${pl[0]} – ${pl[1]}</b></span>`; hud();
    }
    for (let k = 0; pl[0] === pl[1] && k < 2; k++) {
      await say('Parità! Spareggio: un brano secco.', {mood: 'surprised'});
      const t = draw(x => !x.audio); scr('SPAREGGIO');
      const r = await race(t, 'Playlist · spareggio'); if (r) { pl[r.side.k]++; ctx.addScore(r.p, 200); }
      lightSide(null); await reveal(t);
    }
    let plWin = pl[0] === pl[1] ? null : sides[pl[0] > pl[1] ? 0 : 1];
    if (plWin) { plWin.jolly++; S.burst(plWin.color, 120, 7); await say(`${plWin.name} vince la Playlist e si prende il primo jolly!`, {mood: 'happy', gesture: 'clap', to: plWin.members[0]}); }
    else await say('Ancora pari: il primo jolly resta nel mio cassetto.', {mood: 'think'});
    hud();

    // ================= 2. BID-A-NOTE =================
    shot('wide'); scr('BID-A-NOTE', 'Con quante note lo riconosci?');
    await say('Bid-a-Note! Vi do un indizio, voi offrite con quante note riconoscete il brano. Chi non vuole scendere dice: ti sfido!', {mood: 'happy', gesture: 'point'});
    const pts = [0, 0]; const bidHud = () => { extraHud = `<span class="pill">Bid-a-Note <b>${pts[0]} – ${pts[1]}</b></span>`; hud(); };
    bidHud();
    let opener = plWin ? other(plWin) : sides[0];
    function askBid(p, cur, can, t, status) {
      return ctx.w(new Promise(res => {
        const c = h('div', 'card');
        c.innerHTML = `<div class="meta"><span class="who" style="--pc:${p.color}">${esc(p.name)}</span><span>${esc(t.cat)}</span></div><h2>Indizio: ${esc(t.hint)}</h2><p class="msg">${status}</p><div class="timer"><i></i></div><div class="row nums" style="flex-wrap:wrap"></div>`;
        let done = false; const fin = v => { if (done) return; done = true; cd.stop(); res(v); };
        const row = c.querySelector('.nums');
        for (let n = Math.min(7, cur - 1); n >= 1; n--) { const b = h('button', 'btn', `${n} not${n === 1 ? 'a' : 'e'}`); b.onclick = () => fin(n); row.append(b); }
        if (can) { const b = h('button', 'btn pri', 'Ti sfido!'); b.onclick = () => fin('sfida'); row.append(b); }
        const cd = countdown(ctx, 20, {bar: c.querySelector('.timer i'), onEnd: () => fin(can ? 'sfida' : Math.min(7, cur - 1))});
        ctx.dock(c);
      }));
    }
    function botBid(p, t, cur, lastBid) {
      let need = 8; for (let n = 1; n <= 7; n++) if (pc(p, t, n) >= .5) { need = n; break; }
      need = clamp(need + rnd(-1, 1), 1, 8);
      if (!lastBid) return Math.min(7, need + 1);
      if (cur - 1 >= need) return cur - 1 - (cur - 2 >= need && Math.random() < .25 ? 1 : 0);
      return 'sfida';
    }
    for (let r = 0; r < 9 && Math.max(...pts) < 3; r++) {
      const t = draw(x => !x.audio);
      let cur = 8, lastBid = null, bidder = opener, ans = null;
      avail = 7; shown = -1; showCount(0); scr('BID-A-NOTE', `Indizio: ${t.cat}`); shot('wide');
      await say(`Indizio: ${t.hint}.`, {mood: 'think'});
      while (!ans) {
        const p = who(bidder); lightSide(bidder);
        const status = lastBid ? `Offerta attuale: <b>${cur} not${cur === 1 ? 'a' : 'e'}</b> (${esc(who(lastBid).name)}). Scendi o sfida.` : 'Apri tu l’asta: con quante note lo riconosci?';
        let ch;
        if (p.bot) { card(`<div class="meta"><span class="who" style="--pc:${p.color}">${esc(p.name)} · CPU</span></div><h2>Indizio: ${esc(t.hint)}</h2><p class="msg">${status}</p>`); await ctx.botThink(900, 1700); ch = botBid(p, t, cur, lastBid); }
        else { await turn(p); ch = await askBid(p, cur, !!lastBid, t, status); }
        if (ch === 'sfida') {
          ans = lastBid; sfx.drum(); S.shakeIt(.3);
          await say(`${p.name}: ti sfido! ${who(lastBid).name}, dimostralo in ${cur} not${cur === 1 ? 'a' : 'e'}.`, {mood: 'surprised', gesture: 'point', to: who(lastBid).data.obj});
        } else {
          cur = ch; lastBid = bidder; avail = cur; setLamps(0); sfx.click();
          msg(`${cur} NOT${cur === 1 ? 'A' : 'E'}`, `${esc(p.name)}: «Lo indovino in ${cur}!»`);
          await say(`${p.name}: lo indovino in ${cur} not${cur === 1 ? 'a' : 'e'}!`, {to: p.data.obj});
          if (cur === 1) { ans = bidder; await say('Una nota sola! Allora tocca subito a te.', {mood: 'surprised'}); }
          else bidder = other(bidder);
          if (!host.on) await ctx.sleep(900);
        }
      }
      const ap = who(ans); lightSide(ans);
      shot('band'); msg(`${cur} NOT${cur === 1 ? 'A' : 'E'}`, `Ascolta, ${esc(ap.name)}…`);
      await ctx.sleep(500);
      const hd = band.play(t, {count: cur, kit: false});
      await ctx.sleep(Math.max(0, hd.end - band.now()) * 1000 + 300);
      band.stop(); shotSide(ans);
      const res = await answer(ap, t, {prob: pc(ap, t, cur), prompt: `${esc(ap.name)}, in ${cur} not${cur === 1 ? 'a' : 'e'}: qual è il titolo?`, time: 15});
      await verdict(res, ap);
      if (res.ok) { pts[ans.k]++; ctx.addScore(ap, 300); host.react('right', ap, {value: '300 €'}); }
      else if (pts[other(ans).k] === 2) await say(`Punto a ${other(ans).name}? No: il punto vincente va guadagnato!`, {mood: 'think'});
      else { pts[other(ans).k]++; host.react('wrong', ap); }
      bidHud(); lightSide(null); await reveal(t);
      rotate(); opener = other(opener);
    }
    const bidWin = pts[0] === pts[1] ? null : sides[pts[0] > pts[1] ? 0 : 1];
    if (bidWin) { bidWin.jolly++; ctx.addScore(who(bidWin), 1000); S.burst(bidWin.color, 140, 7); await say(`${bidWin.name} vince il Bid-a-Note: mille euro e un jolly!`, {mood: 'happy', gesture: 'celebrate'}); }
    else await say('Bid-a-Note in parità: nessun jolly.', {mood: 'think'});
    extraHud = ''; hud();

    // ================= 3. MELODY ROULETTE =================
    shot('wheel'); scr('MELODY ROULETTE', 'La ruota decide quanto vale il brano');
    await say('Melody Roulette! La ruota decide il valore, e il primo che indovina incassa.', {mood: 'happy', gesture: 'point', to: wheel});
    for (let r = 0; r < ROUL; r++) {
      const item = r % 2 ? songItem() : draw(x => !x.audio), sp = sides[r % 2], p = who(sp);
      shot('wheel'); lightSide(sp);
      if (p.bot) { msg('LA RUOTA', `${esc(p.name)} gira la ruota…`); await ctx.botThink(700, 1300); }
      else {
        await turn(p);
        await ctx.w(new Promise(res => { const c = card(`<div class="meta"><span class="who" style="--pc:${p.color}">${esc(p.name)}</span><span>Giro ${r + 1}/${ROUL}</span></div><h2>Tocca a te girare la ruota</h2>`); const b = h('button', 'btn pri', 'Gira la ruota'); b.onclick = () => { b.disabled = true; res(); }; c.append(b); b.focus(); }));
      }
      msg('…', 'La ruota gira');
      const v = await spin();
      scr(eur(v), item.song ? 'Hit italiana: indizi a tempo' : 'Brano dell’orchestra'); sfx.ok();
      await say(`Questo brano vale ${eur(v)}!${item.song ? ' Ed è una hit italiana: solo indizi, niente musica.' : ''}`, {mood: 'surprised'});
      lightSide(null);
      const res = await race(item, `Melody Roulette · ${eur(v)}`);
      if (res) { ctx.addScore(res.p, v); await host.react('right', res.p, {value: eur(v)}); } else await host.react('wrong');
      hud(); lightSide(null); await reveal(item); rotate();
    }

    // ================= 4. SETTE PER TRENTA =================
    const lead = money(sides[0]) === money(sides[1]) ? (bidWin || plWin || sides[0]) : sides[money(sides[0]) > money(sides[1]) ? 0 : 1];
    const mp = lead.members.find(m => !m.bot) || who(lead);
    shot('screen'); scr('SETTE PER TRENTA', `Gioca ${lead.name}`); lightSide(lead);
    await say(`Gran finale: Sette per Trenta! ${mp.name}, sette brani in trenta secondi. Il tempo corre solo quando suona l’orchestra. Un errore e si chiude!`, {mood: 'happy', gesture: 'point', to: mp.data.obj});
    await turn(mp);
    const med = Array.from({length: 7}, () => draw(() => true));
    let left = 30, running = false, got = 0, failed = false;
    const clk = setInterval(() => { if (running && !ctx.dead) { left = Math.max(0, left - .1); const b = document.querySelector('.medT i'); if (b) b.style.transform = `scaleX(${left / 30})`; if (Math.abs(left - Math.round(left)) < .05 && left <= 5 && left > 0) sfx.tick(); } }, 100);
    ctx.onExit(() => clearInterval(clk));
    const medHud = () => { extraHud = `<span class="pill">Brani <b>${got}/7</b></span><span class="pill">Tempo <b>${Math.ceil(left)} s</b></span>`; hud(); };
    function waitMedley(t, hd) {
      return ctx.w(new Promise(res => {
        let done = false, lastStep = 0, at = 0;
        const c = card(`<div class="meta"><span class="who" style="--pc:${mp.color}">${esc(mp.name)}</span><span class="nc"></span></div><h2>Brano ${got + 1}… premi STOP quando lo riconosci</h2><div class="timer medT"><i style="transform:scaleX(${left / 30})"></i></div>`);
        const fin = v => { if (done) return; done = true; clearInterval(iv); removeEventListener('keydown', key); res(v); };
        if (!mp.bot) { const b = h('button', 'btn pri', 'STOP! <small>[Spazio]</small>'); b.style.marginTop = '12px'; b.onclick = () => fin('buzz'); c.append(b); }
        const key = e => { if (!mp.bot && !e.repeat && e.code === 'Space' && e.target.tagName !== 'INPUT') { e.preventDefault(); fin('buzz'); } };
        addEventListener('keydown', key);
        const nc = c.querySelector('.nc'), t0 = performance.now(), lim = (hd.end - hd.t0 + 2.5) * 1000;
        const iv = setInterval(() => {
          if (ctx.dead) return;
          const st = hd.heard(); nc.textContent = `${Math.ceil(left)} s · note ${st}`;
          if (mp.bot && st > lastStep) { lastStep = st; if (!at && Math.random() < pc(mp, t, st) * .35) at = performance.now() + 300 + Math.random() * 500; }
          if (at && performance.now() >= at) return fin('buzz');
          if (left <= 0) return fin('time');
          if (band.now() > hd.end + .3 || performance.now() - t0 > lim) fin('end');
        }, 50);
        ctx.onExit(() => { clearInterval(iv); removeEventListener('keydown', key); });
      }));
    }
    const pending = [...med];
    medHud();
    while (left > 0 && pending.length && !failed) {
      const t = pending.shift();
      shot('band');
      const hd = band.play(t); running = true;
      const ev = await waitMedley(t, hd);
      running = false; const heard = hd.heard(); band.stop(); medHud();
      if (ev === 'time') { pending.unshift(t); break; }
      if (ev === 'end') { pending.push(t); msg('PASSATO', 'Il brano torna in coda'); await ctx.sleep(700); continue; }
      press(mp); shotSide(lead);
      const k = pc(mp, t, heard);
      const r = await answer(mp, t, {prob: clamp(k + .2, .2, .95), prompt: 'Il cronometro è fermo: qual è il titolo?', time: 10,
        extra: [{id: 'pass', label: 'Passo'}, lead.jolly > 0 && {id: 'jolly', label: `Usa il jolly (${lead.jolly})`}],
        botAct: () => k >= .42 ? 'ok' : lead.jolly > 0 && k < .3 ? 'jolly' : 'pass'});
      if (r.act === 'jolly') { lead.jolly--; got++; ctx.addScore(mp, 500); sfx.ok(); msg('JOLLY!', `«${esc(t.t)}» indovinato dal jolly`); S.flashWith(PAL.goldHi); await ctx.sleep(1400); }
      else if (r.act === 'pass' || r.act === 'time') { pending.push(t); msg('PASSO', 'Il brano torna in coda, se resta tempo'); await ctx.sleep(900); }
      else { await verdict(r, mp); if (r.ok) { got++; ctx.addScore(mp, 500); scr(t.t.toUpperCase(), `${got} su 7`); } else { failed = true; await reveal(t, 'Errore: il medley finisce qui'); } }
      medHud();
    }
    clearInterval(clk); band.stop(); lightSide(null);
    if (got === 7) { ctx.addScore(mp, 5000); S.burst(PAL.goldHi, 200, 8); await say(`Sette su sette! ${mp.name}, cinquemila euro extra!`, {mood: 'happy', gesture: 'celebrate'}); }
    else await say(failed ? `Che peccato, ${mp.name}: un errore ferma tutto. ${got} brani su sette.` : `Tempo scaduto! ${got} brani su sette.`, {mood: got >= 4 ? 'happy' : 'sad'});
    extraHud = ''; hud();

    // ================= FINALE =================
    const ranking = sides.map(s => ({player: s.members.length === 1 ? s.members[0] : {name: s.name, color: s.color, bot: s.members.every(m => m.bot)}, score: money(s)}));
    const tie = ranking[0].score === ranking[1].score, top = ranking[0].score > ranking[1].score ? sides[0] : sides[1];
    shot('wide'); scr(tie ? 'PAREGGIO' : top.name.toUpperCase(), 'Vince la puntata');
    if (!tie) await host.react('win', top.members[0], {value: eur(money(top))});
    await host.react('outro');
    ctx.finish({ranking, title: tie ? 'Pareggio!' : top.members.length > 1 ? `Vince la ${top.name}!` : `Vince ${top.name}!`,
      lines: [`Sette per Trenta: ${got} brani su 7 per ${lead.name}.`]});
  }
};
