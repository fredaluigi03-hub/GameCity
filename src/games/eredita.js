// L'Eredità: quiz a eliminazione progressiva, duelli e La Ghigliottina finale.
import {THREE, newStage, tween, label3d, mat, glow, person, podium, deskTable, tune, PAL} from '../engine.js';
import {h, sfx, eur, norm, near, countdown, shuffle, sleep} from '../ui.js';
import {drawQ, CATS} from '../data.js';
import {createHost, HOSTS} from '../host.js';
import {CENC, TRIS, DATE, SCOSSA, DEFS, GHIGLIOTTINE, EXTRA_NAMES} from './eredita_data.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const pick = a => a[Math.floor(Math.random() * a.length)];
const SEAT_COLS = [...PAL.players, '#c9935e', '#8fae6b', '#a985c9'];
const SKINS = ['#e9c3a0', '#d9a77f', '#f0d0b4', '#c99272', '#e2b893', '#efcaa9', '#dcae88'];
const HAIRS = ['#2a1d14', '#6b4a2a', '#151515', '#b9b6b0', '#7a3b22', '#c9a46a', '#3b2a1e'];
const SUITS = ['#1d2a4a', '#3a2232', '#22343a', '#2a2a33', '#3b3326', '#1f3b2e', '#33284a'];
const RIGHT = [n => `Esatto, ${n}.`, n => `Bene, ${n}. È così.`, () => 'Corretto.', n => `Molto bene, ${n}.`, () => 'Giusto. Con eleganza.'];
const WRONG = [n => `No, ${n}, mi dispiace.`, () => 'Purtroppo no.', n => `Non è corretta, ${n}.`, () => 'Peccato, non era quella.'];

function createStudioLedWall(G, THREE) {
  const W = 1024, H = 1024;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const meshM = new THREE.MeshBasicMaterial({map: tex, toneMapped: false});
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.08, 6.4), meshM);
  mesh.position.set(0, 4.82, -.04);
  G.add(mesh);

  const trimM = new THREE.MeshStandardMaterial({color: '#1a2238', metalness: .85, roughness: .25});
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(3.18, .12, .12), trimM); t1.position.set(0, 8.04, -.02);
  const t2 = new THREE.Mesh(new THREE.BoxGeometry(3.18, .12, .12), trimM); t2.position.set(0, 1.6, -.02);
  G.add(t1, t2);

  const state = {
    title: 'L’EREDITÀ',
    phase: 'BENVENUTI IN STUDIO',
    sub: 'LA SFIDA TELEVISIVA',
    cat: '',
    q: '',
    timer1: null,
    timer2: null,
    p1: null,
    p2: null,
    letters: [],
    hint: '',
    activeP: null,
    jackpot: 0,
    clues: []
  };

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(' ');
    let line = '';
    const lines = [];
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = cx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line);
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    for (let k = 0; k < lines.length; k++) {
      cx.fillText(lines[k].trim(), x, startY + (k * lineHeight));
    }
  }

  const draw = () => {
    const g = cx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 700);
    g.addColorStop(0, '#111b36'); g.addColorStop(0.65, '#070b18'); g.addColorStop(1, '#02040a');
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);

    cx.strokeStyle = 'rgba(0, 210, 255, 0.05)'; cx.lineWidth = 1;
    for (let y = 0; y < H; y += 18) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
    for (let x = 0; x < W; x += 36) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, H); cx.stroke(); }

    cx.strokeStyle = 'rgba(216, 180, 90, 0.4)'; cx.lineWidth = 4;
    cx.beginPath(); cx.moveTo(34, 40); cx.lineTo(34, H - 40); cx.stroke();
    cx.beginPath(); cx.moveTo(W - 34, 40); cx.lineTo(W - 34, H - 40); cx.stroke();

    cx.fillStyle = 'rgba(47, 107, 255, 0.16)';
    cx.fillRect(44, 40, W - 88, 126);
    cx.strokeStyle = 'rgba(0, 210, 255, 0.45)'; cx.lineWidth = 2;
    cx.strokeRect(44, 40, W - 88, 126);

    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.font = '900 68px "Bebas Neue", Outfit, sans-serif';
    cx.fillStyle = '#ffd24a';
    cx.shadowColor = 'rgba(255, 210, 74, 0.6)'; cx.shadowBlur = 16;
    cx.fillText(state.title, W / 2, 88);
    cx.shadowBlur = 0;

    cx.font = '700 24px Outfit, sans-serif';
    cx.fillStyle = '#00d2ff';
    cx.fillText(state.phase.toUpperCase(), W / 2, 136);

    if (state.cat) {
      cx.font = '600 28px Outfit, sans-serif';
      cx.fillStyle = '#a0aec0';
      cx.fillText(state.cat.toUpperCase(), W / 2, 212);
    }

    if (state.p1 && state.p2) {
      const boxW = 380, boxH = 170;
      // P1 Box
      cx.fillStyle = 'rgba(10, 18, 38, 0.88)';
      cx.strokeStyle = state.activeP === state.p1.name ? (state.p1.color || '#38bdf8') : 'rgba(255,255,255,0.18)';
      cx.lineWidth = state.activeP === state.p1.name ? 5 : 2;
      cx.strokeRect(90, 260, boxW, boxH);
      cx.fillRect(90, 260, boxW, boxH);

      cx.font = '700 28px Outfit, sans-serif';
      cx.fillStyle = state.p1.color || '#38bdf8';
      cx.fillText(state.p1.name.toUpperCase(), 90 + boxW / 2, 305);

      cx.font = '900 84px "Bebas Neue", Outfit, sans-serif';
      cx.fillStyle = state.timer1 <= 10 ? '#f87171' : '#f1f5f9';
      cx.fillText(String(Math.ceil(state.timer1 ?? 45)), 90 + boxW / 2, 375);

      // P2 Box
      cx.strokeStyle = state.activeP === state.p2.name ? (state.p2.color || '#ec4899') : 'rgba(255,255,255,0.18)';
      cx.lineWidth = state.activeP === state.p2.name ? 5 : 2;
      cx.strokeRect(W - 90 - boxW, 260, boxW, boxH);
      cx.fillRect(W - 90 - boxW, 260, boxW, boxH);

      cx.font = '700 28px Outfit, sans-serif';
      cx.fillStyle = state.p2.color || '#ec4899';
      cx.fillText(state.p2.name.toUpperCase(), W - 90 - boxW / 2, 305);

      cx.font = '900 84px "Bebas Neue", Outfit, sans-serif';
      cx.fillStyle = state.timer2 <= 10 ? '#f87171' : '#f1f5f9';
      cx.fillText(String(Math.ceil(state.timer2 ?? 45)), W - 90 - boxW / 2, 375);

      if (state.hint) {
        cx.font = '600 36px Outfit, sans-serif';
        cx.fillStyle = '#ffffff';
        wrapText(`«${state.hint}»`, W / 2, 500, W - 160, 46);
      }

      if (state.letters && state.letters.length) {
        const n = state.letters.length;
        const tileW = Math.min(84, Math.floor((W - 140) / n) - 8);
        const tileH = 96;
        const totalW = n * (tileW + 8) - 8;
        const startX = (W - totalW) / 2;
        const startY = 640;

        for (let i = 0; i < n; i++) {
          const ch = state.letters[i] || '';
          const tx = startX + i * (tileW + 8);
          cx.fillStyle = ch ? 'rgba(216, 180, 90, 0.22)' : 'rgba(15, 23, 42, 0.7)';
          cx.strokeStyle = ch ? '#ffd24a' : 'rgba(255,255,255,0.2)';
          cx.lineWidth = ch ? 3 : 1.5;
          cx.strokeRect(tx, startY, tileW, tileH);
          cx.fillRect(tx, startY, tileW, tileH);

          if (ch) {
            cx.font = '900 58px "Bebas Neue", Outfit, sans-serif';
            cx.fillStyle = '#ffd24a';
            cx.fillText(ch, tx + tileW / 2, startY + tileH / 2 + 4);
          }
        }
      }
    } else {
      if (state.q) {
        cx.font = '700 42px Outfit, sans-serif';
        cx.fillStyle = '#ffffff';
        wrapText(state.q, W / 2, 320, W - 140, 54);
      }

      if (state.jackpot > 0) {
        cx.font = '900 86px "Bebas Neue", Outfit, sans-serif';
        cx.fillStyle = '#ffd24a';
        cx.fillText(`€ ${state.jackpot.toLocaleString('it-IT')}`, W / 2, 490);
      }

      if (state.sub) {
        cx.font = '500 30px Outfit, sans-serif';
        cx.fillStyle = '#94a3b8';
        wrapText(state.sub, W / 2, 600, W - 160, 42);
      }

      if (state.clues && state.clues.length) {
        const startY = 680;
        state.clues.forEach((c, idx) => {
          const cy = startY + idx * 48;
          cx.fillStyle = 'rgba(216, 180, 90, 0.16)';
          cx.strokeStyle = '#ffd24a'; cx.lineWidth = 1.5;
          cx.strokeRect(W / 2 - 200, cy - 20, 400, 40);
          cx.fillRect(W / 2 - 200, cy - 20, 400, 40);
          cx.font = '700 24px Outfit, sans-serif';
          cx.fillStyle = '#ffd24a';
          cx.fillText(c.toUpperCase(), W / 2, cy);
        });
      }
    }

    cx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    cx.fillRect(44, H - 85, W - 88, 48);
    cx.font = '600 20px Outfit, sans-serif';
    cx.fillStyle = '#64748b';
    cx.fillText('STUDIO TV · BROADCAST GAME SHOW ITALIA', W / 2, H - 60);

    tex.needsUpdate = true;
  };

  draw();

  return {
    update(patch) {
      Object.assign(state, patch);
      draw();
    },
    clear() {
      state.p1 = state.p2 = null;
      state.q = state.cat = state.sub = state.hint = '';
      state.letters = [];
      draw();
    }
  };
}

export default {
  id: 'eredita', name: 'L’Eredità', tag: 'Quiz a eliminazione + La Ghigliottina', desc: 'Format completo da 2 a 7 concorrenti con duelli, montepremi e Ghigliottina', c1: '#2f6bff', c2: '#ffd24a',
  players: {min: 1, max: 7, def: 7}, questions: true,
  guide: `
    <h4 style="margin:4px 0 6px;color:var(--gold);font-size:0.95rem">👥 Format a Eliminazione &amp; I Primi Giochi</h4>
    <p>Da 2 a 7 concorrenti si affrontano in una gara a eliminazione progressiva dove a ogni manche chi commette errori rischia l'uscita:</p>
    <ul style="margin:4px 0 8px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li><b>C'è o non c'è:</b> un tema centrale e termini proposti in sequenza. Decidi se la parola appartiene o meno all'argomento (+10.000 €; due errori e sei a rischio).</li>
      <li><b>1, 2, 3... quella!:</b> tre indizi per trovare l'unica risposta corretta (+10.000 €).</li>
      <li><b>Le Date:</b> quattro anni storici da abbinare ai rispettivi eventi (+10.000 €).</li>
      <li><b>La Scossa:</b> 9 opzioni sul tabellone. Attenzione: devi <b>EVITARE</b> la risposta esatta! Chi si salva guadagna 20.000 €; chi prende la scossa va al duello eliminatorio.</li>
      <li><b>La Sfida / Scalata Doppia:</b> duello a tempo (45 o 60 secondi) tra due concorrenti. Chi vince <b>eredita l'intero montepremi</b> dell'avversario eliminato!</li>
    </ul>

    <h4 style="margin:10px 0 6px;color:var(--gold);font-size:0.95rem">🔺 Il Triello &amp; I 100 Secondi</h4>
    <ul style="margin:4px 0 8px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li><b>Il Triello (3 concorrenti):</b> tabellone a 8 caselle tematiche con domande da 10.000 € a 30.000 €. Chi indovina sceglie la casella successiva. La casella <i>Imprevisto</i> permette di puntare fino a 60.000 €! I due con il montepremi più alto volano ai 100 secondi.</li>
      <li><b>I 100 Secondi (2 finalisti):</b> duello testa a testa con domande a raffica: se rispondi giusto mantieni la mano; se sbagli la mano passa all'avversario. Chi ha la mano quando scatta lo zero sul cronometro dei 100 secondi diventa campione e va alla Ghigliottina!</li>
    </ul>

    <h4 style="margin:10px 0 6px;color:var(--gold);font-size:0.95rem">🗡️ La Ghigliottina (Il Gioco Finale)</h4>
    <ul style="margin:4px 0 8px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li><b>5 coppie di parole:</b> scegli la parola giusta tra le due proposte per ogni coppia. Ogni errore fa scendere la lama e <b>dimezza</b> il montepremi accumulato!</li>
      <li><b>Il Minuto della Verità:</b> con i 5 indizi svelati hai 60 secondi per scrivere sul cartellino virtuale la parola che li accomuna tutti. Indovinando incassi l'intero montepremi in palio!</li>
    </ul>

    <h4 style="margin:10px 0 6px;color:var(--gold);font-size:0.95rem">🎮 Comandi</h4>
    <ul style="margin:4px 0 4px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li>Clicca sulle opzioni o usa i tasti numerici/lettere per rispondere durante le manche.</li>
      <li>Alla Ghigliottina: digita la parola nella casella di testo e premi Invio o 'Ghigliottina' prima dello scadere dei 60 secondi.</li>
    </ul>
  `,
  rules: [
    'Concorrenti in gara a eliminazione progressiva: a ogni manche chi sbaglia affronta la Sfida o la Scalata doppia.',
    'I concorrenti accumulano montepremi con le risposte corrette. Chi vince un duello eredita tutto il montepremi dell’avversario eliminato.',
    'Se rimangono 3 concorrenti si gioca Il Triello (domande da 10.000 a 60.000 €). Con 2 concorrenti si gioca I 100 secondi.',
    'Il finalista gioca La Ghigliottina: 5 coppie di parole per dimezzare o conservare il montepremi, poi 60 secondi per trovare la parola che le unisce tutte.'
  ],
  async start(ctx) {
    const S = ctx.stage = newStage({c1: this.c1, c2: this.c2, bg: '#02050f', cam: [0, 7, 24], look: [0, 3, -3]});
    const V = THREE.Vector3;

    // ---------- concorrenti ----------
    const P = ctx.players;
    const extra = EXTRA_NAMES.filter(n => !P.some(p => p.name === n));
    while (P.length < 2) P.push({id: P.length, name: extra.shift() || `CPU ${P.length + 1}`, color: '', bot: true, skill: .45 + Math.random() * .3, score: 0, alive: true, data: {}});
    P.forEach((p, i) => { p.color = SEAT_COLS[i % SEAT_COLS.length]; p.skill ??= .6; p.score ??= 0; });
    ctx.scoreboard();
    let dev = null;
    const handTo = async p => { if (!p.bot && p !== dev) { await ctx.passDevice(p); dev = p; } };
    const alive = () => P.filter(p => p.alive && !p.retired);
    const out = [];

    // ---------- set ----------
    const gold = mat(PAL.gold, {metalness: 1, roughness: .28});
    const lacquer = mat('#0d1532', {metalness: .55, roughness: .3});
    const wood = mat('#141c3c', {metalness: .35, roughness: .38});
    // ghigliottina
    const G = new THREE.Group(); G.position.set(0, 0, -9); S.add(G);
    const add = (geo, m, x, y, z = 0, p = G) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); p.add(o); return o; };
    add(new THREE.CylinderGeometry(3.7, 3.9, .22, 64), lacquer, 0, .11);
    add(new THREE.CylinderGeometry(3.2, 3.4, .5, 64), lacquer, 0, .25);
    add(new THREE.TorusGeometry(3.21, .035, 8, 96), gold, 0, .5).rotation.x = Math.PI / 2;
    for (const sx of [-1, 1]) {
      add(new THREE.BoxGeometry(.42, 8.2, .5), wood, sx * 1.75, 4.6);
      add(new THREE.BoxGeometry(.06, 7.4, .2), gold, sx * 1.52, 4.6);
      add(new THREE.BoxGeometry(.58, .18, .66), gold, sx * 1.75, .62);
      add(new THREE.BoxGeometry(.58, .12, .66), gold, sx * 1.75, 8.62);
      add(new THREE.BoxGeometry(.025, 7.4, .025), glow(tune(PAL.gold)), sx * 1.75, 4.6, .26);
    }
    add(new THREE.BoxGeometry(4.4, .6, .7), wood, 0, 8.95);
    add(new THREE.BoxGeometry(4.5, .07, .74), gold, 0, 8.66);
    add(new THREE.CylinderGeometry(.22, .22, .16, 24), gold, 0, 8.45, .05).rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(3.1, .7, .42), wood, 0, 1.2);
    add(new THREE.TorusGeometry(.3, .045, 10, 32, Math.PI), gold, 0, 1.55, .22).rotation.z = Math.PI;
    const logo = label3d([{t: 'L’EREDITÀ', color: PAL.goldHi}], {w: 4.4, h: 1, px: 170, bg: null, border: null, fs: .85});
    logo.position.set(0, 9.85, .36); G.add(logo);

    // Dynamic 3D Studio LED Jumbotron inside the Guillotine frame
    const ledWall = createStudioLedWall(G, THREE);

    // lama
    const shp = new THREE.Shape(); shp.moveTo(-1.45, 0); shp.lineTo(1.45, 0); shp.lineTo(1.45, -.55); shp.lineTo(-1.45, -1.25); shp.closePath();
    const bladeG = new THREE.ExtrudeGeometry(shp, {depth: .06, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2}); bladeG.translate(0, 0, -.03);
    const REST = 7.7, LOW = 2.85, MID = 5.3;
    const blade = new THREE.Group(); blade.position.y = REST; G.add(blade);
    add(bladeG, mat('#dfe4ee', {metalness: 1, roughness: .14}), 0, 0, 0, blade);
    add(new THREE.BoxGeometry(3, .36, .3), wood, 0, .18, 0, blade);
    add(new THREE.BoxGeometry(3.04, .05, .32), gold, 0, .36, 0, blade);
    const rope = add(new THREE.CylinderGeometry(.028, .028, 1, 8), mat('#8a7a5a', {roughness: .9, metalness: 0}), 0, 8);
    S.on(() => { const b = blade.position.y + .36, len = Math.max(.01, 8.45 - b); rope.scale.y = len; rope.position.y = b + len / 2; });
    const gs = new THREE.SpotLight('#fff1d6', 140, 32, .42, .6, 1.4); gs.position.set(0, 13, -2); gs.target.position.set(0, 4, -9); S.add(gs, gs.target);

    // podi adattivi in arco
    const N = P.length;
    const arcSpan = Math.min(Math.PI * 0.72, (N - 1) * 0.28);
    const C = 3.2, R = 7.5;
    P.forEach((p, i) => {
      const a = N === 1 ? 0 : (i / (N - 1) - .5) * arcSpan;
      const pod = podium(p.color, p.name); pod.position.set(Math.sin(a) * R, 0, C - Math.cos(a) * R); pod.rotation.y = -a; S.add(pod);
      const f = i % 2 === 1;
      const man = person({female: f, skin: SKINS[i % SKINS.length], hair: HAIRS[(i * 3) % HAIRS.length], hairStyle: f ? ['long', 'bob', 'bun'][i % 3] : ['short', 'curly', 'slick', 'bald'][i % 4], suit: SUITS[i % SUITS.length], tie: p.color});
      man.position.set(0, 0, -.32); pod.add(man);
      Object.assign(p.data, {pod, man, obj: man, state: 'dark', base: new THREE.Color(tune(p.color)), err: 0, risk: false});
    });
    const OFF = new THREE.Color('#161a26'), RISK = new THREE.Color(PAL.bad), WIN = new THREE.Color(PAL.goldHi);
    S.on((dt, t) => P.forEach(p => {
      if (!p.data?.pod) return;
      const d = p.data, m = d.pod.strip.color;
      if (d.state === 'out' || d.state === 'dark') m.lerp(OFF, Math.min(1, dt * 3));
      else if (d.state === 'active') m.copy(d.base).multiplyScalar(.82 + .2 * Math.sin(t * 6));
      else if (d.state === 'risk') m.copy(RISK).multiplyScalar(.6 + .3 * Math.sin(t * 9));
      else if (d.state === 'win') m.copy(WIN).multiplyScalar(.85 + .1 * Math.sin(t * 4));
      else m.lerp(d.base.clone().multiplyScalar(.55), Math.min(1, dt * 4));
    }));

    // conduttore + leggio
    const HX = -6.6, HZ = 3.6, yaw = Math.atan2(1 - HX, 9 - HZ);
    const host = createHost(ctx, {...HOSTS.eredita, position: [HX, 0, HZ], lookAt: [1, 1.6, 9]});
    const hp = host.p;
    const desk = deskTable(1.5); desk.position.set(HX + Math.sin(yaw) * .85, 0, HZ + Math.cos(yaw) * .85); desk.rotation.y = yaw; S.add(desk);

    // ---------- camera ----------
    const facing = p => new V(Math.sin(p.data.pod.rotation.y), 0, Math.cos(p.data.pod.rotation.y));
    const camWide = () => S.go([0, 4.4, 12.5], [0, 2.3, -3]);
    const camOn = p => { const o = p.data.pod.position, f = facing(p); S.go([o.x + f.x * 3.3 + .5, 2.25, o.z + f.z * 3.3], [o.x, 1.55, o.z]); };
    const camPair = (a, b) => {
      const A = a.data.pod.position, B = b.data.pod.position, m = A.clone().add(B).multiplyScalar(.5), f = facing(a).add(facing(b)).normalize(), d = A.distanceTo(B);
      S.go([m.x + f.x * (3.6 + d * .75), 2.6, m.z + f.z * (3.6 + d * .75)], [m.x, 1.5, m.z]);
    };
    const camHost = () => S.go([HX + Math.sin(yaw) * 3.4, 1.95, HZ + Math.cos(yaw) * 3.4], [HX, 1.55, HZ]);
    const camG = () => S.go([1.2, 4.8, 1.8], [.6, 4.6, -9]);
    const lookAll = t => alive().forEach(p => p.data.man.lookAt(t === p.data.man ? hp : t));

    // ---------- helpers di gioco ----------
    let stage = 0, jackpot = 0;
    const totalStages = Math.max(1, P.length);
    const pot = () => stage >= totalStages - 1 ? jackpot : P.reduce((s, p) => s + p.score, 0);
    const plate = p => p.data?.pod?.setLabel([{t: p.name, fs: .52}, {t: eur(p.score), fs: .34, color: PAL.goldHi}]);
    P.forEach(plate);

    const hud = () => {
      ctx.hud(`<span class="pill">Gioco <b>${stage}/${totalStages}</b></span><span class="pill">In gara <b>${alive().length}</b></span>${stage >= totalStages - 2 ? `<span class="pill">Montepremi <b>${eur(pot())}</b></span>` : ''}`);
      ctx.scoreboard();
    };
    const feel = (p, ok) => {
      const m = p.data.man; m.setMood(ok ? 'happy' : 'sad');
      if (ok) { if (Math.random() < .5) m.clap(); } else m.shrug();
      setTimeout(() => { if (!ctx.dead && p.alive) m.setMood('neutral'); }, 1800);
    };
    const endTurn = p => { if (p.alive && p.data.state === 'active') p.data.state = p.data.risk ? 'risk' : 'idle'; };
    async function turn(p) {
      await handTo(p); ctx.setActive(p);
      alive().forEach(endTurn);
      p.data.state = 'active'; camOn(p); host.turnTo(p); lookAll(p.data.man);
    }
    async function askP(p, q) {
      await turn(p); host.ask(q.q);
      ledWall.update({q: q.q, cat: q.cat || '', activeP: p.name});
      const r = await ctx.w(ctx.ask({...q, player: p}));
      feel(p, r.ok);
      return r;
    }
    const quick = (p, ok, always = false) => (always || !ok || Math.random() < .3) ? host.say(pick(ok ? RIGHT : WRONG)(p.name), {mood: ok ? 'happy' : 'sad', to: p}) : Promise.resolve();
    const setRisk = p => { p.data.risk = true; p.data.state = 'risk'; p.data.man.setMood('surprised'); };
    const mostErrors = (n, ex = []) => shuffle(alive().filter(p => !ex.includes(p))).sort((a, b) => b.data.err - a.data.err).slice(0, n);
    const resetRound = () => P.forEach(p => { p.data.err = 0; p.data.risk = false; if (p.alive) { p.data.state = 'idle'; p.data.man.setMood('neutral'); } });
    const used = new Set();

    function banner(n, title, rules) {
      const c = h('div', 'card');
      c.innerHTML = `<div class="meta"><span>Gioco ${n} di ${totalStages}</span><span>${alive().length} in gara</span></div><h2 class="disp" style="font-size:clamp(1.6rem,4vw,2.2rem);margin-bottom:6px">${title}</h2><p style="color:var(--mut);line-height:1.5">${rules}</p>`;
      ctx.dock(c);
    }
    async function opening(n, title, rules, line) {
      stage = n; hud(); banner(n, title, rules); camHost(); lookAll(hp); ctx.setActive(null);
      ledWall.update({phase: title, sub: rules, cat: `GIOCO ${n} DI ${totalStages}`, q: ''});
      await Promise.all([host.say(line, {mood: 'neutral', gesture: 'point', to: null}), ctx.sleep(2800)]);
    }

    // scelta generica a pulsanti
    function choose({p, title, q = '', opts, disabled = [], time = 0, cols = 2, bot, mark, onTimeout}) {
      if (p && (p.retired || !p.alive)) return Promise.resolve(onTimeout ? onTimeout() : 0);
      return ctx.w(new Promise(res => {
        const card = h('div', 'card');
        card.innerHTML = `<div class="meta"><span>${title}</span>${p ? `<span class="who" style="--pc:${p.color}">${esc(p.name)}${p.bot ? ' · CPU' : ''}</span>` : ''}<span></span></div>${q ? `<h2>${q}</h2>` : ''}${time ? '<div class="timer"><i></i></div>' : ''}<div class="opts" style="grid-template-columns:repeat(${cols},minmax(0,1fr))"></div>`;
        const box = card.querySelector('.opts');
        let done = false, tm = 0, cd = null;
        const btns = opts.map((o, i) => {
          const b = h('button', 'opt', `<b>${i + 1}</b><span>${o}</span>`);
          if (disabled.includes(i)) { b.disabled = true; b.style.opacity = '.3'; b.style.textDecoration = 'line-through'; } else if (p?.bot) b.disabled = true;
          b.onclick = () => fin(i); box.append(b); return b;
        });
        const key = e => { if (p?.bot || e.target.tagName === 'INPUT') return; const i = +e.key - 1; if (e.key.length === 1 && i >= 0 && i < opts.length && !btns[i].disabled) fin(i); };
        addEventListener('keydown', key);
        const clean = () => { if (unsub) unsub(); cd?.stop(); clearTimeout(tm); removeEventListener('keydown', key); };
        const unsub = ctx.onForfeit ? ctx.onForfeit(fp => {
          if (p && fp === p) fin(onTimeout ? onTimeout() : 0);
        }) : null;
        ctx.onExit(clean);
        async function fin(i) {
          if (done || ctx.dead) return; done = true; clean();
          if (i < 0 && onTimeout) i = onTimeout();
          btns.forEach(b => { b.disabled = true; });
          if (i >= 0) { btns[i].classList.add('picked'); sfx.click(); }
          const m = i >= 0 && mark ? mark(i) : null;
          if (m) { await sleep(650); btns[i].classList.remove('picked'); btns[i].classList.add(m); (m === 'right' ? sfx.ok : sfx.bad)(); await sleep(1100); } else await sleep(350);
          res(i);
        }
        if (time) cd = countdown(ctx, time, {bar: card.querySelector('.timer i'), onEnd: () => fin(-1)});
        if (p?.bot) tm = setTimeout(() => fin(bot()), 1200 + Math.random() * 1600);
        ctx.dock(card);
      }));
    }
    const pickOpponent = async p => {
      const others = alive().filter(o => o !== p);
      await host.say(`${p.name}, chi sfida nella Scalata doppia?`, {mood: 'think', to: p});
      const i = await choose({p, title: 'Scalata doppia', q: `${esc(p.name)}, scegli il tuo sfidante`, opts: others.map(o => esc(o.name)), cols: Math.min(3, others.length), bot: () => Math.floor(Math.random() * others.length)});
      p.data.man.point();
      return others[i] || others[0];
    };

    // ---------- Sfida / Scalata doppia ----------
    let defQ = [];
    const nextDef = () => { if (!defQ.length) defQ = shuffle(DEFS); return defQ.pop(); };
    async function duel(a, b, secs, title) {
      if (!alive().some(p => !p.bot)) secs = Math.min(secs, 25);
      setRisk(a); setRisk(b); camPair(a, b); lookAll(null); a.data.man.lookAt(b.data.man); b.data.man.lookAt(a.data.man);
      const card = h('div', 'card');
      card.innerHTML = `<div class="meta"><span>${title}</span><span class="tw"></span><span>Una lettera ogni 2 s</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">${[a, b].map(p => `<div class="ck" style="border:1px solid var(--line-soft);border-radius:12px;padding:8px 12px;transition:border-color .3s,opacity .3s"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="font-weight:700;color:${p.color}">${esc(p.name)}${p.bot ? ' · CPU' : ''}</span><b class="disp" style="font-size:1.8rem">${secs}</b></div><div class="timer" style="margin:6px 0 0"><i></i></div></div>`).join('')}</div>
        <h2 class="def">&nbsp;</h2><div class="tiles" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:14px;min-height:44px"></div>
        <form class="in" style="display:flex;gap:8px">
          <input autocomplete="off" aria-label="La tua risposta" placeholder="Scrivi la parola…" disabled style="flex:1">
          <button class="btn pri" disabled>Rispondi</button>
          <button type="button" class="btn forfeit-btn" style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#f87171;padding:0 12px;font-size:0.85rem">⚐ Ritirati</button>
        </form>`;
      const [ca, cb] = card.querySelectorAll('.ck'), defEl = card.querySelector('.def'), tiles = card.querySelector('.tiles'), tw = card.querySelector('.tw');
      const form = card.querySelector('form'), input = form.querySelector('input'), btn = form.querySelector('button'), forfeitBtn = form.querySelector('.forfeit-btn');
      const clock = new Map([[a, secs], [b, secs]]);
      let cur = a;
      const paint = () => {
        [[a, ca], [b, cb]].forEach(([p, el]) => {
          const s = clock.get(p); el.querySelector('b').textContent = Math.ceil(s);
          el.querySelector('.timer i').style.transform = `scaleX(${Math.max(0, s / secs)})`;
          el.style.borderColor = p === cur ? p.color : ''; el.style.opacity = p === cur ? '1' : '.55';
        });
        ledWall.update({
          phase: title,
          p1: {name: a.name, color: a.color},
          p2: {name: b.name, color: b.color},
          timer1: clock.get(a),
          timer2: clock.get(b),
          activeP: cur.name
        });
      };
      ctx.dock(card); paint();
      await host.say(`${title}: ${a.name} contro ${b.name}. ${secs} secondi a testa, e il cronometro corre solo durante il proprio turno. Comincia ${a.name}.`, {mood: 'think', gesture: 'point', to: a});

      const turnOnce = async (p, defObj) => {
        if (a.retired || b.retired) return false;
        const word = (defObj?.w || 'EREDITA').toUpperCase();
        const def = defObj?.t || 'Parola misteriosa';

        await handTo(p); ctx.setActive(p); cur = p; paint();
        const other = p === a ? b : a; p.data.state = 'active'; other.data.state = 'risk';
        camOn(p); host.turnTo(p);
        tw.textContent = `Tocca a ${p.name}`; defEl.textContent = def;
        const cells = [...word].map(() => { const t = h('span', ''); t.style.cssText = 'display:inline-grid;place-items:center;width:clamp(24px,6vw,40px);height:clamp(34px,7vw,48px);border:1px solid var(--line-soft);border-radius:8px;font-family:"Bebas Neue",Outfit,sans-serif;font-size:clamp(1.3rem,3.4vw,1.9rem);background:rgba(3,5,14,.5);transition:border-color .3s,color .3s'; return t; });
        tiles.replaceChildren(...cells);

        const currentRevealed = Array(word.length).fill('');
        const show = i => {
          cells[i].textContent = word[i];
          cells[i].style.borderColor = 'var(--gold)';
          currentRevealed[i] = word[i];
          ledWall.update({letters: currentRevealed});
        };
        const order = shuffle([...word.keys()]);
        let shown = 0;
        input.value = ''; input.disabled = btn.disabled = !!p.bot; input.placeholder = p.bot ? `${p.name} sta pensando…` : 'Scrivi la parola…'; if (!p.bot) input.focus();
        forfeitBtn.disabled = !!p.bot;

        ledWall.update({hint: def, letters: currentRevealed});
        host.ask(def);

        return ctx.w(new Promise(res => {
          let done = false, tm = 0;
          const cd = countdown(ctx, clock.get(p), {onEnd: () => end(false)});
          const rev = setInterval(() => { if (shown < order.length - 1) { show(order[shown++]); sfx.click(); } }, 2000);
          const pnt = setInterval(() => { clock.set(p, Math.max(0, cd.left())); paint(); }, 100);
          const unsubFf = ctx.onForfeit ? ctx.onForfeit(fp => {
            if (fp === p || fp === a || fp === b) end(false);
          }) : null;
          const stopAll = () => { if (unsubFf) unsubFf(); cd.stop(); clearInterval(rev); clearInterval(pnt); clearTimeout(tm); };
          ctx.onExit(stopAll);

          if (p.bot) {
            const k = Math.min(word.length - 1, Math.round(word.length * (1 - p.skill) * (.4 + Math.random()) * .9));
            tm = setTimeout(() => { input.value = word; end(true); }, (k * 2 + 1.2 + Math.random() * 2.0) * 1000);
          }
          form.onsubmit = e => {
            e.preventDefault(); if (done || p.bot) return;
            const g = input.value.trim(); if (!g) return;
            if (near(g, word)) end(true);
            else { sfx.bad(); input.value = ''; card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 400); }
          };
          forfeitBtn.onclick = () => {
            if (done || p.bot) return;
            p.retired = true;
            end(false);
          };

          function end(ok) {
            if (done) return; done = true; stopAll();
            clock.set(p, ok ? Math.max(0, cd.left()) : 0); paint();
            cells.forEach((c, i) => { show(i); c.style.borderColor = ok ? 'var(--ok)' : 'var(--bad)'; c.style.color = ok ? 'var(--ok)' : 'var(--bad)'; });
            input.disabled = btn.disabled = forfeitBtn.disabled = true;
            (ok ? sfx.ok : sfx.bad)(); if (ok) feel(p, true);
            setTimeout(() => res(ok), 1100);
          }
        }));
      };

      while (await turnOnce(cur, nextDef())) cur = cur === a ? b : a;
      const loser = cur, winner = cur === a ? b : a;
      winner.data.risk = false; winner.data.state = 'idle'; winner.data.man.setMood('happy'); winner.data.man.celebrate();
      loser.data.man.setMood('sad');
      camPair(a, b);
      await host.say(`Tempo scaduto per ${loser.name}! ${winner.name} vince la sfida.`, {mood: 'surprised', to: winner});

      if (loser.score > 0) {
        await host.say(`Colpo di scena! ${winner.name} eredita l’intero montepremi di ${loser.name}: ${eur(loser.score)}!`, {mood: 'happy', to: winner});
        ctx.addScore(winner, loser.score);
        ctx.setScore(loser, 0);
        plate(winner); plate(loser); hud();
      }

      ledWall.clear();
      return loser;
    }

    // ---------- lama ----------
    async function drop(full = true) {
      await ctx.w(tween(blade.position, {y: REST + .22}, .45, 'out'));
      await ctx.sleep(200);
      sfx.whoosh();
      const to = full ? LOW : MID;
      await ctx.w(tween(blade.position, {y: to}, full ? .38 : .26, 'in'));
      sfx.drop(); sfx.drum(); S.shakeIt(full ? 1 : .5); S.flashWith(full ? PAL.bad : PAL.goldHi);
      await ctx.w(tween(blade.position, {y: to + (full ? .34 : .2)}, .13, 'out'));
      await ctx.w(tween(blade.position, {y: to}, .55, 'bounce'));
    }
    const raise = () => ctx.w(tween(blade.position, {y: REST}, 2.2, 'inout'));

    async function eliminate(p, line) {
      p.alive = false; out.push(p); ctx.setActive(null);
      camG(); lookAll(blade); host.turnTo(blade);
      await host.say(line || `${p.name}, purtroppo per lei la partita finisce qui.`, {mood: 'sad'});
      S.dolly(1.4); await drop(true);
      p.data.state = 'out'; p.data.man.setMood('sad'); p.data.man.shrug(); p.data.man.lookAt(null);
      p.data.pod.setLabel([{t: p.name, color: PAL.mut}]);
      ctx.scoreboard(); hud();
      camOn(p); await ctx.sleep(1500);
      raise();
      alive().forEach(o => { if (Math.random() < .6) o.data.man.clap(); });
      await host.say(`Un applauso per ${p.name}. Grazie di aver giocato con noi.`, {mood: 'neutral', gesture: 'clap', to: p});
      resetRound();
    }

    // Auto-elimination hook
    ctx.onPlayerRetired = async p => {
      await eliminate(p, `Colpo di scena! ${p.name} ha deciso di ritirarsi dalla competizione.`);
    };

    // ---------- 0. Apertura dello Studio ----------
    camWide();
    await host.say('Buonasera e benvenuti a L’Eredità! I concorrenti sono pronti a sfidarsi per arrivare fino alla Ghigliottina.', {mood: 'happy', gesture: 'wave', to: null});
    for (const p of P) { p.data.state = 'idle'; camOn(p); sfx.tick(); p.data.man.lookAt(S.camera); if (!p.bot) p.data.man.wave(); await ctx.sleep(380); }
    camWide();
    await host.say(`Ecco i protagonisti di stasera: ${P.map(p => p.name).join(', ')}. In bocca al lupo a tutti!`, {mood: 'happy', gesture: 'point', to: P[0]});

    let qualStep = 1;

    // GIOCO 1: C'È O NON C'È (se concorrenti > 3)
    if (alive().length > 3) {
      await opening(qualStep++, 'C’è o non c’è?', 'Per ogni argomento arriva una parola: c’entra o no? 10.000 € a risposta corretta. Due errori e sei a rischio per La Sfida.',
        'Cominciamo con: C’è o non c’è. Diecimila euro per ogni risposta giusta, ma due errori vi mandano dritti alla Sfida.');
      const risk = [], topics = shuffle(CENC);
      let items = [], ti = 0, k = 0;
      for (let guard = 0; risk.length < 2 && guard < 35 && alive().length > 3; guard++) {
        const p = alive()[k++ % alive().length]; if (p.data.risk) continue;
        if (!items.length) {
          if (ti >= topics.length) break;
          const t = topics[ti++]; items = shuffle(t.i).map(([w, y]) => ({t: t.t, w, y}));
          camHost(); lookAll(hp);
          await host.say(`L’argomento è: ${t.t}.`, {mood: 'think', to: null});
        }
        const it = items.shift();
        const r = await askP(p, {q: `«${it.w}»: c’è o non c’è?`, opts: ['C’è', 'Non c’è'], right: it.y ? 0 : 1, time: 10, cat: it.t, n: `Errori ${p.data.err}/2`});
        if (r.ok) {
          ctx.addScore(p, 10000); plate(p); hud();
        } else if (++p.data.err >= 2) {
          setRisk(p); risk.push(p);
          await host.say(`${p.name}, secondo errore: è a rischio eliminazione.`, {mood: 'sad', to: p});
        }
        if (!p.data.risk) await quick(p, r.ok);
        endTurn(p);
      }
      if (risk.length < 2) {
        mostErrors(2 - risk.length, risk).forEach(p => { setRisk(p); risk.push(p); });
      }
      if (risk.length >= 2) {
        const loser = await duel(risk[0], risk[1], 45, 'La Sfida');
        await eliminate(loser);
      }
    }

    // GIOCO 2: 1, 2, 3... QUELLA! (se concorrenti > 3)
    if (alive().length > 3) {
      await opening(qualStep++, '1, 2, 3… quella!', 'Tre parole chiave e una sola risposta corretta. 10.000 € a risposta giusta. Due errori consecutivi e si va alla Scalata doppia.',
        'Secondo gioco: uno, due, tre… quella! Tre indizi, diecimila euro, ma non sbagliate due volte di fila.');
      const q = shuffle(TRIS);
      let qi = 0, risk = null;
      outer: for (let round = 0; round < 4; round++) for (const p of alive()) {
        let wrong = 0;
        while (qi < q.length) {
          const item = q[qi++];
          const r = item.r, w = item.w, clues = item.clues, cat = item.cat;
          const opts = shuffle([r, ...w]);
          const res = await askP(p, {q: `${clues} … quella?`, opts, right: opts.indexOf(r), time: 15, cat, n: wrong ? 'Secondo tentativo' : ''});
          if (res.ok) {
            ctx.addScore(p, 10000); plate(p); hud();
            await quick(p, true); break;
          }
          p.data.err++;
          if (++wrong === 2) { risk = p; break outer; }
          await host.say(`No, ${p.name}. Ne gioca un’altra: attenzione che un altro errore la manda a rischio.`, {mood: 'sad', to: p});
        }
        endTurn(p);
        if (qi >= q.length) break outer;
      }
      if (!risk) risk = mostErrors(1)[0];
      setRisk(risk); endTurn(risk);
      const opponent = await pickOpponent(risk);
      const loser = await duel(risk, opponent, 45, 'Scalata doppia');
      await eliminate(loser);
    }

    // GIOCO 3: LE DATE (se concorrenti > 3)
    if (alive().length > 3) {
      await opening(qualStep++, 'Le Date', 'Quattro anni e gli eventi storici: abbina ogni fatto al suo anno. 10.000 € a risposta esatta. Due errori e si va alla Scalata doppia.',
        'Terzo gioco: Le Date. Tanta storia e diecimila euro a evento indovinato.');
      let risk = null, k = 0;
      outer: for (const set of shuffle(DATE)) {
        const years = set.y.map(String);
        camHost(); lookAll(hp);
        await host.say(`Sul tabellone abbiamo: ${years.join(', ')}.`, {mood: 'think', to: null});
        for (const [e, y] of shuffle(set.e)) {
          const p = alive()[k++ % alive().length];
          const r = await askP(p, {q: `${e}: in che anno?`, opts: years, right: set.y.indexOf(y), time: 12, cat: `Le Date · ${years.join(' · ')}`, n: `Errori ${p.data.err}/2`});
          if (r.ok) {
            ctx.addScore(p, 10000); plate(p); hud();
          } else if (++p.data.err >= 2) {
            risk = p; break outer;
          }
          await quick(p, r.ok);
          endTurn(p);
        }
      }
      if (!risk) risk = mostErrors(1)[0];
      setRisk(risk); endTurn(risk);
      const loser = await duel(risk, await pickOpponent(risk), 45, 'Scalata doppia');
      await eliminate(loser);
    }

    // GIOCO 4: LA SCOSSA (se concorrenti > 3)
    if (alive().length > 3) {
      await opening(qualStep++, 'La Scossa', 'Nove opzioni: una sola è vera ed è quella da EVITARE! Chi si salva accumula 20.000 €. Chi prende la scossa va alla Scalata doppia.',
        'Quarto gioco: La Scossa. Evitate assolutamente la risposta giusta!');
      const qs = shuffle(SCOSSA);
      let hit = null, k = 0;
      for (let qi = 0; qi < qs.length && !hit; qi++) {
        const [q, r, w] = qs[qi], opts = shuffle([r, ...w]), right = opts.indexOf(r), taken = [], last = qi === qs.length - 1;
        camHost(); lookAll(hp);
        await host.say(qi ? `Nessuna scossa! Scossa flash: ${q}` : `Ecco la domanda: ${q}`, {mood: 'think', to: null});
        for (let n = 0; !hit && (last || n < alive().length); n++) {
          const p = alive()[k++ % alive().length];
          await turn(p);
          const free = () => opts.map((_, j) => j).filter(j => !taken.includes(j));
          const i = await choose({p, title: `La Scossa${qi ? ' flash' : ''}`, q: `${q}<small style="display:block;color:var(--mut);font-size:.8rem;margin-top:6px">Evita la risposta giusta!</small>`, opts, disabled: [...taken], time: 15, cols: 3,
            bot: () => { const f = free(), safe = f.filter(j => j !== right); return safe.length && Math.random() < p.skill + .2 ? pick(safe) : pick(f); },
            onTimeout: () => pick(free()), mark: j => j === right ? 'wrong' : 'right'});
          taken.push(i);
          if (i === right) {
            hit = p; S.flashWith('#9fd0ff'); S.shakeIt(.8); setRisk(p); p.data.man.shrug();
            await host.say(`Scossa! ${p.name}, «${r}» era proprio la risposta corretta!`, {mood: 'surprised', to: p});
          } else {
            ctx.addScore(p, 20000); plate(p); hud();
            feel(p, true); endTurn(p);
          }
        }
      }
      if (!hit) hit = pick(alive());
      const loser = await duel(hit, await pickOpponent(hit), 60, 'Scalata doppia');
      await eliminate(loser);
    }

    // ---------- IL TRIELLO (con esattamente 3 concorrenti) ----------
    if (alive().length >= 3) {
      stage = Math.max(stage + 1, totalStages - 2);
      await opening(stage, 'Il Triello', 'Scegli un argomento: domande da 10.000 a 30.000 €. Chi risponde bene incassa e sceglie ancora. Attenzione all’Imprevisto! I due con il punteggio più alto vanno ai 100 secondi.',
        'Siamo al Triello! Tre concorrenti in gara: qui si costruisce il vero montepremi per la finale.');
      const three = alive().slice(0, 3);
      const vals = shuffle([10000, 10000, 20000, 20000, 20000, 30000, 30000, 30000]);
      const cells = shuffle(CATS).slice(0, 8).map((c, i) => ({c, v: vals[i], done: false, imp: false}));
      pick(cells).imp = true;
      three.forEach(plate);
      let cur = three[0];

      ledWall.update({phase: 'IL TRIELLO', cat: 'SFIDA PER IL MONTEPREMI', jackpot: pot()});

      while (cells.some(c => !c.done)) {
        await turn(cur);
        const free = cells.map((c, i) => c.done ? -1 : i).filter(i => i >= 0);
        const ci = await choose({p: cur, title: 'Il Triello · tabellone', q: `${esc(cur.name)}, scegli l’argomento`, cols: 4,
          opts: cells.map(c => `${c.c}<small style="display:block;color:var(--gold);font-size:.78rem">${c.done ? '—' : eur(c.v)}</small>`),
          disabled: cells.map((c, i) => c.done ? i : -1).filter(i => i >= 0), bot: () => pick(free)});
        const cell = cells[ci]; cell.done = true;
        let val = cell.v, nopt = 4;
        if (cell.imp) {
          S.flashWith(PAL.bad); sfx.drum(); cur.data.man.setMood('surprised');
          await host.say(`Imprevisto! ${cur.name}, quanto vuole rischiare?`, {mood: 'surprised', to: cur});
          const vi = await choose({p: cur, title: 'Imprevisto', q: 'Quanto giochi? Meno risposte, più rischio.', cols: 3,
            opts: ['€ 20.000 · 2 risposte', '€ 40.000 · 3 risposte', '€ 60.000 · 4 risposte'], bot: () => cur.skill > .64 ? 2 : cur.skill > .52 ? 1 : 0});
          val = [20000, 40000, 60000][vi]; nopt = vi + 2;
        }
        const q = drawQ(used, {c: cell.c, opts: nopt});
        host.ask(q.q);
        ledWall.update({q: q.q, cat: cell.c, jackpot: pot()});
        const r = await ctx.w(ctx.ask({...q, time: 10, cat: `${cell.c} · ${eur(val)}${cell.imp ? ' · Imprevisto' : ''}`, n: `Montepremi ${eur(cur.score)}`, player: cur}));
        feel(cur, r.ok);
        const others = three.filter(o => o !== cur);
        if (r.ok) {
          ctx.addScore(cur, val); plate(cur); hud(); sfx.win();
          await host.say(`Esatto! ${eur(val)} per ${cur.name}.${cells.some(c => !c.done) ? ' Scelga ancora.' : ''}`, {mood: 'happy', to: cur});
        } else {
          if (cell.imp) { others.forEach(o => { ctx.addScore(o, val / 2); plate(o); }); hud(); }
          const nx = three[(three.indexOf(cur) + 1) % 3];
          await host.say(cell.imp ? `Sbagliato: i ${eur(val)} vanno divisi tra ${others[0].name} e ${others[1].name}. La mano passa a ${nx.name}.` : `${pick(WRONG)(cur.name)} La mano passa a ${nx.name}.`, {mood: 'sad', to: nx});
          endTurn(cur); cur = nx;
        }
        endTurn(cur);
      }
      const rk = [...three].sort((a, b) => b.score - a.score);
      let loser = rk[2];
      jackpot = Math.max(80000, three.reduce((s, p) => s + p.score, 0));
      await eliminate(loser, `Il Triello è concluso. ${loser.name}, il suo montepremi rimane in gioco, ma per lei finisce qui.`);
    }

    // ---------- I 100 SECONDI (con 2 finalisti) ----------
    if (alive().length >= 2) {
      stage = totalStages - 1;
      const [x, y] = alive().slice(0, 2).sort((a, b) => b.score - a.score);
      jackpot = Math.max(100000, jackpot, x.score + y.score);
      await opening(stage, 'I 100 secondi', `Cento secondi a testa per decidere il campione: chi tiene la mano allo scadere del tempo va dritto alla Ghigliottina con ${eur(jackpot)} in palio!`,
        `Siamo ai 100 secondi! ${x.name} contro ${y.name}. Chi ha la mano quando suona la campana va alla Ghigliottina!`);
      let finalist;
      {
        ctx.hud(`<span class="pill">Gioco <b>${stage}/${totalStages}</b> · I 100 secondi</span><span class="pill">Tempo <b class="t100">100</b></span><span class="pill">Montepremi <b>${eur(jackpot)}</b></span>`);
        const lab = ctx.ui.querySelector('.t100');
        let holder = x, shown = null, over = false, abort = null, left = 100, cd = null;
        const pause = () => { if (cd) { left = Math.max(0, cd.left()); cd.stop(); cd = null; } };
        const run = () => { cd = countdown(ctx, left, {label: lab, onEnd: () => { cd = null; left = 0; over = true; if (abort) abort(-2); }}); };
        camPair(x, y);

        while (!over) {
          if (shown !== holder) { pause(); await handTo(holder); shown = holder; }
          ctx.setActive(holder); x.data.state = y.data.state = 'idle'; holder.data.state = 'active'; camOn(holder); host.turnTo(holder);
          if (!cd && !over) run();
          const q = drawQ(used, {});
          ledWall.update({phase: 'I 100 SECONDI', cat: `MANO A ${holder.name.toUpperCase()}`, q: q.q, jackpot: jackpot});
          const r = await ctx.w(ctx.ask({...q, time: 8, cat: 'I 100 secondi', n: `Mano a ${holder.name}`, player: holder, extra: ({fin}) => { abort = fin; return null; }}));
          abort = null;
          if (r.pick === -2) break;
          feel(holder, r.ok);
          if (!r.ok) holder = holder === x ? y : x;
        }
        pause();
        finalist = holder;
        const other = holder === x ? y : x;
        sfx.drum(); S.flashWith(PAL.goldHi);
        await host.say(`Tempo scaduto! La mano vincente è di ${finalist.name}: è lei a volare alla Ghigliottina!`, {mood: 'surprised', gesture: 'point', to: finalist});
        await eliminate(other, `${other.name}, si ferma a un soffio dal sogno della Ghigliottina.`);
      }
    }

    // ---------- LA GHIGLIOTTINA (1 solo finalista) ----------
    stage = totalStages; hud();
    const finalist = alive()[0] || P[0];
    const f = finalist, puz = pick(GHIGLIOTTINE);
    let prize = Math.max(100000, jackpot, f.score);
    f.data.state = 'win'; lookAll(blade);
    banner(stage, 'La Ghigliottina', `Cinque coppie di parole per proteggere il montepremi di ${eur(prize)}. Ogni intruso dimezza la cifra. Poi 60 secondi per scrivere la parola vincente!`);
    camOn(f);
    ledWall.update({phase: 'LA GHIGLIOTTINA', cat: 'MONTEPREMI IN PALIO', jackpot: prize, q: 'SCEGLI LA PAROLA GIUSTA'});
    await host.say(`${f.name}, eccoci al momento della verità: La Ghigliottina. In palio ci sono ${eur(prize)}. Scelga bene le parole o la lama dimezzerà il montepremi!`, {mood: 'think', to: f});
    camG();
    await host.react('suspense');

    const clues = [];
    for (let i = 0; i < 5; i++) {
      const [good, bad] = puz.p[i], pair = shuffle([good, bad]), right = pair.indexOf(good);
      await handTo(f);
      const j = await choose({p: f, title: `La Ghigliottina · coppia ${i + 1} di 5`, q: `Quale parola scegli? <small style="color:var(--gold)">In palio ${eur(prize)}</small>`, opts: pair.map(esc), cols: 2,
        bot: () => Math.random() < .55 + f.skill * .25 ? right : 1 - right, mark: k => k === right ? 'right' : 'wrong'});
      clues.push(good);
      ledWall.update({clues: clues, jackpot: prize});

      const pl = label3d(good.toUpperCase(), {w: 2.3, h: .62, px: 160, fs: .66}); pl.position.set(3.6, 7.3 - i * .95, .4); pl.scale.setScalar(.001); G.add(pl);
      sfx.drum(); tween(pl.scale, {x: 1, y: 1, z: 1}, .6, 'overshoot');

      if (j !== right) {
        prize = Math.floor(prize / 2); jackpot = prize; hud();
        ledWall.update({jackpot: prize});
        f.data.man.setMood('sad');
        host.say(`L’intruso! La lama scende e il montepremi si dimezza: ${eur(prize)}.`, {mood: 'sad'});
        await drop(false); raise();
      } else {
        f.data.man.setMood('happy'); await quick(f, true);
      }
    }

    const sol = label3d('?', {w: 2.6, h: 1.1, px: 160, fs: .7}); sol.position.set(-3.7, 5.2, .4); sol.scale.setScalar(.001); G.add(sol);
    tween(sol.scale, {x: 1, y: 1, z: 1}, .7, 'spring');

    ledWall.update({phase: 'LA GHIGLIOTTINA', cat: '60 SECONDI PER RISPONDERE', sub: `Cinque indizi: ${clues.join(', ')}`, clues: clues});
    await host.say(`Ecco i cinque indizi sul tabellone: ${clues.join(', ')}. ${f.name}, ha un minuto di tempo per scrivere sul cartellino la parola segreta!`, {mood: 'think', to: f});
    await handTo(f);

    const guess = await ctx.w(new Promise(res => {
      const card = h('div', 'card');
      card.innerHTML = `<div class="meta"><span>La Ghigliottina · in palio ${eur(prize)}</span><span class="who" style="--pc:${f.color}">${esc(f.name)}${f.bot ? ' · CPU' : ''}</span><span><b class="t60" style="color:var(--gold);font-size:1.3rem">60</b> s</span></div><div class="chips">${clues.map(c => `<span class="chip">${esc(c.toUpperCase())}</span>`).join('')}</div><div class="timer"><i></i></div><form class="in"><input autocomplete="off" aria-label="La parola che lega i cinque indizi" placeholder="La parola che lega tutte e cinque…"><button class="btn pri">Ghigliottina</button></form>`;
      ctx.dock(card);
      const form = card.querySelector('form'), input = form.querySelector('input'), btn = form.querySelector('button');
      let done = false, tm = 0;
      const end = g => { if (done) return; done = true; cd.stop(); clearTimeout(tm); input.disabled = btn.disabled = true; res(g.trim()); };
      const cd = countdown(ctx, 60, {bar: card.querySelector('.timer i'), label: card.querySelector('.t60'), onEnd: () => end(input.value)});
      ctx.onExit(() => clearTimeout(tm));
      if (f.bot) {
        input.disabled = btn.disabled = true; input.placeholder = `${f.name} sta pensando…`;
        const g = Math.random() < .35 + f.skill * .4 ? puz.a : pick(GHIGLIOTTINE.filter(z => z !== puz)).a;
        tm = setTimeout(() => { input.value = g; end(g); }, (5 + Math.random() * 18) * 1000);
      } else {
        input.focus();
        form.onsubmit = e => { e.preventDefault(); if (input.value.trim()) end(input.value); };
      }
    }));

    const won = !!guess && norm(guess) === norm(puz.a);
    camG();
    await host.say(`${f.name} ha scritto sul cartellino: «${guess || '…'}». Vediamo se la Ghigliottina è stata vinta!`, {mood: 'think'});
    await ctx.sleep(900);
    sol.set(puz.a);

    ledWall.update({phase: won ? 'VITTORIA!' : 'FINE PARTITA', cat: won ? `CAMPIONE: ${f.name.toUpperCase()}` : 'LA GHIGLIOTTINA HA VINTO', q: `LA PAROLA ERA: ${puz.a}`, sub: puz.x});

    if (won) {
      ctx.setScore(f, prize);
      sfx.win(); S.flashWith(PAL.goldHi); S.burst(PAL.goldHi, 200, 8);
      camOn(f); f.data.man.setMood('happy'); f.data.man.celebrate();
      alive().concat(out).forEach(o => { if (o !== f) o.data.man.clap(); });
      await host.react('win', f, {value: eur(prize)});
    } else {
      S.dolly(1.2); await drop(true);
      f.data.man.setMood('sad'); f.data.man.shrug();
      await host.say(`La parola esatta era «${puz.a}». ${puz.x}`, {mood: 'sad'});
      camOn(f);
      await host.react('lose', f);
    }
    camWide();
    await host.react('outro', f);

    const ranking = [f, ...out.slice().reverse()].map(p => ({player: p, score: p === f && won ? prize : p.score}));
    ctx.finish({
      ranking, win: won && !f.bot,
      title: won ? `${f.name} vince ${eur(prize)}!` : 'La Ghigliottina ha vinto',
      lines: [`La parola era «${puz.a}».`, puz.x]
    });
  }
};
