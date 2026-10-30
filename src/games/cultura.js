// Cultura Generale: adattamento del quiz a 15 domande con montepremi a scala (fastest finger + hot seat).
// Multiplayer: a ogni round "dito più veloce" giocano tutti quelli che non sono ancora stati al centro;
// il più veloce con l'ordine giusto si siede e gioca la scalata. Si ripete finché tutti hanno giocato
// (l'ultimo rimasto si siede di diritto). Classifica finale per montepremi vinto.
import {THREE, newStage, tween, anim, label3d, mat, glow, person, chair, podium, raycast, PAL} from '../engine.js';
import {h, sfx, eur, shuffle, tone, countdown} from '../ui.js';
import {createHost, HOSTS} from '../host.js';
import {QB, FF} from './cultura_data.js';

const LADDER = [50, 100, 200, 300, 500, 1000, 2000, 4000, 10000, 30000, 70000, 150000, 300000, 500000, 1000000];
const L4 = 'ABCD';
const safeFor = k => k >= 10 ? LADDER[9] : k >= 5 ? LADDER[4] : 0; // k = risposte giuste prima dell'errore (500 € a Q5, 30.000 € a Q10)
const money = n => n.toLocaleString('it-IT') + ' euro';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const pick1 = a => a[Math.floor(Math.random() * a.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fill = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
// d = fascia per ctx.pool (1 facile, 2 medio, 3 difficile), lv = livello originale 1-5 (usato da aiuti e CPU)
const BANK = QB.map(([cat, lv, q, r, ...w], id) => ({id, cat, lv, d: lv <= 2 ? 1 : lv === 3 ? 2 : 3, q, r, w}));

const LINES = {
  intro: ['Buonasera e benvenuti! Quindici domande separano qualcuno di voi dal milione di euro.', 'Benvenuti a Cultura Generale. Stasera la curiosità può valere un milione.', 'Buonasera! Luci basse, cuore in gola: si gioca per il milione.'],
  right: ['Esatto! {value} sono tuoi.', 'Giusto! E il pubblico applaude.', 'Corretta! Saliamo a {value}.', 'Sì! Lo sapevo che lo sapevi, {name}.', 'Risposta esatta. Che sangue freddo.'],
  wrong: ['Mi dispiace, {name}. Non era quella.', 'Purtroppo no. Era una domanda insidiosa.', 'No, peccato davvero. Ci eravamo affezionati.'],
  win: ['{name}, hai appena vinto un milione di euro!'],
  suspense: ['Vediamo…', 'Accendiamo la risposta giusta.', 'Silenzio in studio.', 'Il computer ci dice…', 'Lo vediamo insieme, {name}.'],
  outro: ['Grazie a tutti, e restate curiosi. Buonanotte!', 'È tutto per stasera. Alla prossima scalata!'],
  ffIntro: ['Cominciamo con il dito più veloce: metti in ordine le quattro risposte, il più in fretta possibile!', 'Dito più veloce! Chi ordina giusto e prima di tutti viene a sedersi qui con me.'],
  ffWin: ['{name}, il dito più veloce è il tuo! Vieni, accomodati di fronte a me.', 'Complimenti {name}! Vieni al centro, la sedia ti aspetta.'],
  ffNone: ['Nessuno ha trovato l’ordine giusto. Riproviamo!', 'Ordine sbagliato per tutti. Un’altra, forza!'],
  seat: ['{name}, eccoti al centro. Tre aiuti, quindici domande. Pronti?', 'Eccoci, {name}. Respira: si parte da cinquanta euro.', 'Bene, {name}. Ricorda le soglie: cinquecento e trentamila euro. Cominciamo.'],
  final: ['È la tua risposta definitiva?', 'La accendiamo? È definitiva?', 'Accendo questa. È la tua risposta definitiva?'],
  wait: ['Mmh. Ci pensi bene?', 'Indecisione… o è solo strategia?', 'Il pubblico trattiene il fiato.', 'Hai tutto il tempo che ti serve.'],
  fifty: ['Computer, togli due risposte sbagliate.', 'Cinquanta e cinquanta. Via due risposte!'],
  switch: ['Computer, cambio domanda! Azzeriamo e cambiamo.', 'Cambio domanda! La risposta non convinceva: vediamo la nuova.'],
  aud: ['Pubblico, tastierini alla mano: votate!', 'Chiediamo al pubblico in studio. Votate ora!'],
  phone: ['Facciamo una telefonata a casa.', 'Chiamiamo un amico. Trenta secondi!'],
  quit: ['Una scelta saggia, {name}. Porti a casa {value}.', 'Ti ritiri con {value}. Rispetto.'],
  safe1: ['Prima soglia! Cinquecento euro sono al sicuro.'],
  safe2: ['Seconda soglia! Trentamila euro sono garantiti.']
};

const FRIENDS = [
  {name: 'Zio Franco', who: 'Professore di storia in pensione', good: ['Storia', 'Geografia', 'Arte e Letteratura'], brag: false,
    hi: ['Pronto? Ah, sei tu! Ho già gli occhiali sul naso, leggi pure.', 'Pronto, chi parla? La televisione? Vai, ti ascolto.'],
    sure: ['Questa la spiegavo in classe ogni anno.', 'Non ho dubbi, me lo ricordo benissimo.'],
    unsure: ['Mmh… qui mi cogli impreparato.', 'Ai miei tempi questa non si studiava…'], bye: ['In bocca al lupo!', 'Fammi sapere, eh!']},
  {name: 'Giulia', who: 'Amica medico, precisa e prudente', good: ['Scienza', 'Cucina', 'Attualità'], brag: false, f: true,
    hi: ['Pronto? Sono qui, ho trenta secondi e un caffè. Leggi!', 'Ciao! Ok, concentrata. Vai.'],
    sure: ['Questa la so, ragionandoci torna tutto.', 'Ci metto la mano sul fuoco.'],
    unsure: ['Non è proprio il mio campo, te lo dico onestamente.', 'Ragiono per esclusione, ma non sono sicura.'], bye: ['Forza, ce la fai!', 'Un abbraccio, vai!']},
  {name: 'Marco', who: 'Cugino tifoso, sicuro di sé', good: ['Sport', 'Cinema e TV', 'Musica'], brag: true,
    hi: ['Prontooo! Tranquillo, ci penso io.', 'Eccomi! Dai, che è facile.'],
    sure: ['Facilissima, la sa pure mio nipote.', 'Ma dai, questa è un regalo!'],
    unsure: ['Allora… è facile, è facile…', 'Mi pare proprio… sì, sì.'], bye: ['Vai sereno!', 'Poi mi offri una cena, eh!']}
];

export default {
  id: 'cultura', name: 'Cultura Generale', tag: 'Quindici domande per il milione', desc: 'Dito più veloce, poi la scalata al milione con tre aiuti', c1: '#3b55d9', c2: '#8a5cd8',
  players: {min: 1, max: 4, def: 4}, questions: true,
  guide: `
    <h4 style="margin:4px 0 6px;color:var(--gold);font-size:0.95rem">⚡ Il Dito Più Veloce</h4>
    <p>Prima di salire sulla sedia centrale, i concorrenti affrontano la prova di qualificazione: <b>metti in ordine 4 opzioni</b> (cronologico, grandezza, logica). Chi risponde correttamente nel minor tempo conquista la sedia al centro dello studio. In più giocatori la prova si ripete dopo ogni scalata tra chi non ha ancora giocato.</p>

    <h4 style="margin:10px 0 6px;color:var(--gold);font-size:0.95rem">🪜 La Scalata al Milione (15 Domande)</h4>
    <p>Al centro dello studio affronti <b>15 domande a 4 scelte (A, B, C, D)</b> dal valore crescente, da 50 € fino a 1.000.000 €:</p>
    <ul style="margin:4px 0 8px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li><b>Soglie di Sicurezza:</b> raggiunta la <b>5ª domanda (500 €)</b> e la <b>10ª domanda (30.000 €)</b>, il traguardo è garantito! Se sbagli successivamente, precipiti all'ultima soglia raggiunta.</li>
      <li><b>Facoltà di Ritiro:</b> prima di confermare una risposta puoi scegliere di ritirarti con il premio della domanda precedente.</li>
      <li><b>Risposta Definitiva:</b> per ogni domanda la conduttrice chiede conferma: puoi ragionarci con calma prima di accendere la risposta!</li>
    </ul>

    <h4 style="margin:10px 0 6px;color:var(--gold);font-size:0.95rem">🆘 Gli Aiuti (Lifelines)</h4>
    <ul style="margin:4px 0 8px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li><b>50:50:</b> il computer elimina automaticamente due risposte errate, lasciando solo la risposta esatta e un'alternativa ingannevole.</li>
      <li><b>Switch (Cambio Domanda):</b> sostituisce la domanda corrente con una nuova dello stesso livello, azzerando le opzioni eliminate.</li>
      <li><b>Aiuto del Pubblico:</b> il pubblico in studio vota istantaneamente coi tastierini e viene mostrato un grafico a barre con le percentuali.</li>
      <li><b>Telefonata a Casa:</b> 30 secondi per consultare un amico esperto a scelta (Zio Franco per storia/geografia, Giulia per scienza/attualità o Marco per sport/musica/cinema).</li>
    </ul>

    <h4 style="margin:10px 0 6px;color:var(--gold);font-size:0.95rem">🎮 Comandi</h4>
    <ul style="margin:4px 0 4px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li>Tasti <b>A, B, C, D</b> o numeri <b>1, 2, 3, 4</b> da tastiera, oppure tocca direttamente le barre delle risposte.</li>
      <li>Clicca sulle icone degli aiuti o sul pulsante <b>Ritirati</b> nella dock quando vuoi incassare il premio sicuro.</li>
    </ul>
  `,
  rules: [
    'Dito più veloce: metti in ordine quattro risposte toccandole in sequenza. Chi ordina giusto nel minor tempo si siede al centro. Con pochi concorrenti le domande dito più veloce sono due, e contano risposte giuste e tempo totale.',
    'Al centro: 15 domande a 4 risposte, sempre più difficili, da 50 € a 1.000.000 €. La difficoltà delle domande scelta nel setup sposta l’intera scala. Prima di accendere una risposta la conduttrice chiede se è definitiva.',
    'Soglie di sicurezza alla 5ª (500 €) e alla 10ª domanda (30.000 €): se sbagli scendi all’ultima soglia raggiunta. Puoi ritirarti quando vuoi e tenere quanto hai vinto.',
    'Aiuti disponibili: 50:50, Cambio domanda (Switch), Aiuto del pubblico, Telefonata a casa.',
    'In più giocatori: dopo ogni partita si rifà il dito più veloce tra chi non ha ancora giocato, finché tutti sono passati al centro. Vince chi porta a casa di più.'
  ],
  async start(ctx) {
    const S = ctx.stage = newStage({c1: this.c1, c2: this.c2, bg: '#03040c', cam: [0, 3.6, 11], look: [0, 2.3, -1]});
    let turbo = false, skip = false, keyFn = null, plateFn = null;
    const T = ms => skip && !ctx.dead ? Promise.resolve() : ctx.sleep(skip ? 0 : turbo ? ms * .35 : ms);
    const W = p => ctx.w(p);

    // ---------- engine lights (optional dimming) ----------
    let key = null, hemi = null;
    S.scene.traverse(o => { if (o.isHemisphereLight) hemi = o; if (o.isSpotLight && o.position.x === 4 && o.position.y === 13) key = o; });
    const KEY0 = key?.intensity ?? 0, HEMI0 = hemi?.intensity ?? 0;
    const spot = new THREE.SpotLight('#dfe6ff', 0, 22, .42, .6, 1.4); spot.position.set(0, 8.5, 2.6); spot.target.position.set(0, .5, .3); S.add(spot); S.add(spot.target);

    // ---------- set: platform, chairs, console ----------
    const trimM = glow('#4f6fd0');
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.45, .2, 64), mat('#0b1022', {metalness: .6, roughness: .25})); plat.position.set(0, .1, .3); S.add(plat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.39, .022, 8, 128), trimM); ring.rotation.x = Math.PI / 2; ring.position.set(0, .2, .3); S.add(ring);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, s = new THREE.Mesh(new THREE.BoxGeometry(.03, .01, 3.2), trimM);
      s.position.set(Math.sin(a) * 4.3, .012, .3 + Math.cos(a) * 4.3); s.rotation.y = a; S.add(s);
    }
    const chH = chair('#2a2f4a'); chH.position.set(-1.15, .2, .3); chH.rotation.y = Math.PI / 2; S.add(chH);
    const chC = chair('#2a2f4a'); chC.position.set(1.15, .2, .3); chC.rotation.y = -Math.PI / 2; S.add(chC);
    const metal = mat('#b9bfcc', {metalness: 1, roughness: .22});
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.04, .07, .8, 16), metal); stem.position.set(0, .6, .3); S.add(stem);
    [-1, 1].forEach(sd => {
      const scr = new THREE.Mesh(new THREE.BoxGeometry(.04, .3, .46), mat('#0a0f22', {metalness: .5, roughness: .3, emissive: '#16244f', emissiveIntensity: .8}));
      scr.position.set(sd * .08, 1.05, .3); scr.rotation.z = -sd * .35; S.add(scr);
    });

    // ---------- hexagon plates ----------
    const hexShape = (w, hh) => { const s = new THREE.Shape(), a = hh / 2; s.moveTo(-w / 2, 0); s.lineTo(-w / 2 + a, a); s.lineTo(w / 2 - a, a); s.lineTo(w / 2, 0); s.lineTo(w / 2 - a, -a); s.lineTo(-w / 2 + a, -a); s.closePath(); return s; };
    const ST = {idle: ['#101a3e', '#000000'], sel: ['#b8781e', '#3a2204'], ok: ['#278a5e', '#08301d'], bad: ['#9c2c3c', '#2e080f'], off: ['#06080f', '#000000']};
    const paint = (pl, s, d = .35) => { tween(pl.face.color, ST[s][0], d); tween(pl.face.emissive, ST[s][1], d); };
    function hexPlate(w, hh, letter) {
      const g = new THREE.Group();
      const face = mat(ST.idle[0], {metalness: .45, roughness: .32, emissive: '#000000'});
      g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(hexShape(w, hh), {depth: .06, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2}), face));
      const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(hexShape(w + .14, hh + .1), {depth: .04, bevelEnabled: false}), metal); rim.position.z = -.03; g.add(rim);
      const tx = label3d(' ', {w: w - (letter ? .8 : .5), h: hh * .9, px: 200, bg: null, border: null, fs: .6}); tx.position.set(letter ? .2 : 0, 0, .1); g.add(tx);
      let lt = null;
      if (letter) { lt = label3d(letter + ':', {w: .4, h: hh * .9, px: 200, bg: null, border: null, color: PAL.gold, fs: .62}); lt.position.set(-w / 2 + .45, 0, .1); g.add(lt); }
      Object.assign(g, {face, tx, lt});
      return g;
    }
    const board = new THREE.Group(); board.position.set(0, 0, -3.2); S.add(board);
    const qPlate = hexPlate(5.8, .8); qPlate.position.set(0, 4.35, 0); board.add(qPlate);
    const plates = [0, 1, 2, 3].map(i => { const p = hexPlate(2.75, .56, L4[i]); p.position.set(i % 2 ? 1.5 : -1.5, i < 2 ? 3.45 : 2.75, 0); p.userData.id = i; board.add(p); return p; });
    [4.35, 3.45, 2.75].forEach(y => { const l = new THREE.Mesh(new THREE.BoxGeometry(9.5, .02, .02), metal); l.position.set(0, y, -.06); board.add(l); });
    const wrap2 = s => { if (s.length <= 44) return [s]; const mid = s.length / 2; let b = -1; for (let i = 0; i < s.length; i++) if (s[i] === ' ' && (b < 0 || Math.abs(i - mid) < Math.abs(b - mid))) b = i; return b < 0 ? [s] : [s.slice(0, b), s.slice(b + 1)]; };
    function showBoard(q, opts) {
      chart.visible = false;
      const L = wrap2(q); qPlate.tx.set(L.map(t => ({t, fs: L.length > 1 ? .4 : .5, font: 'Outfit'})));
      plates.forEach((pl, i) => { pl.tx.set([{t: opts[i], font: 'Outfit', fs: .6}]); pl.lt.set(L4[i] + ':'); paint(pl, 'idle', .15); });
      [qPlate, ...plates].forEach((pl, j) => { pl.rotation.x = -Math.PI / 2; tween(pl.rotation, {x: 0}, .7 + j * .1, 'spring'); });
      sfx.whoosh();
    }
    const offPlate = i => { paint(plates[i], 'off'); plates[i].tx.set(' '); plates[i].lt.set(' '); };

    // ---------- LED prize ladder ----------
    const ladder = new THREE.Group(); ladder.position.set(4.7, 3.35, -1.4); ladder.rotation.y = -.55; S.add(ladder);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(2.5, 5.2, .16), mat('#0a0f22', {metalness: .6, roughness: .35})); fr.position.set(0, .1, -.1); ladder.add(fr);
    const bz = new THREE.Mesh(new THREE.BoxGeometry(2.62, 5.32, .1), metal); bz.position.set(0, .1, -.16); ladder.add(bz);
    const rowY = i => -2.3 + i * .29;
    const cursor = new THREE.Mesh(new THREE.BoxGeometry(2.25, .26, .02), mat('#b8781e', {emissive: '#5a3606', emissiveIntensity: .9, metalness: .3, roughness: .4}));
    cursor.position.set(0, rowY(0), .0); cursor.visible = false; ladder.add(cursor);
    const pips = LADDER.map((v, i) => {
      const safe = i === 4 || i === 9 || i === 14;
      const n = label3d(String(i + 1), {w: .4, h: .26, px: 200, bg: null, border: null, color: PAL.mut, fs: .8}); n.position.set(-.85, rowY(i), .02); ladder.add(n);
      const a = label3d(eur(v), {w: 1.5, h: .26, px: 200, bg: null, border: null, color: safe ? PAL.goldHi : PAL.ivory, fs: .82}); a.position.set(.3, rowY(i), .02); ladder.add(a);
      const pip = new THREE.Mesh(new THREE.CircleGeometry(.04, 16), new THREE.MeshBasicMaterial({color: '#262b40', toneMapped: false})); pip.position.set(-.58, rowY(i), .02); ladder.add(pip);
      return pip;
    });
    const icons = {};
    [['fifty', '50:50'], ['switch', '🔄'], ['aud', '👥'], ['phone', '📞']].forEach(([id, t], j) => {
      const g = new THREE.Group(); g.position.set(-.85 + j * .57, 2.28, .02); ladder.add(g);
      const discM = mat('#141d44', {metalness: .5, roughness: .3});
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .05, 32), discM); disc.rotation.x = Math.PI / 2; g.add(disc);
      const rg = new THREE.Mesh(new THREE.TorusGeometry(.24, .02, 8, 40), metal); g.add(rg);
      const lb = label3d(t, {w: .42, h: .42, px: 200, bg: null, border: null, fs: id === 'fifty' ? .36 : .52}); lb.position.z = .04; g.add(lb);
      const x = new THREE.Group(); x.visible = false; g.add(x);
      [1, -1].forEach(s => { const b = new THREE.Mesh(new THREE.BoxGeometry(.52, .05, .02), mat('#9c2c3c', {emissive: '#2e080f'})); b.rotation.z = s * Math.PI / 4; b.position.z = .07; x.add(b); });
      icons[id] = {g, discM, lb, x};
    });
    function resetLadder() {
      cursor.visible = false; pips.forEach(p => p.material.color.set('#262b40'));
      for (const id in icons) { const ic = icons[id]; ic.x.visible = false; ic.discM.color.set('#141d44'); ic.lb.material.opacity = 1; }
    }
    function useIcon(id) {
      const ic = icons[id]; ic.x.visible = true; ic.x.scale.setScalar(.01); tween(ic.x.scale, [1, 1, 1], .6, 'spring');
      tween(ic.discM.color, '#080b18', .5); tween(ic.lb.material, {opacity: .3}, .5);
      tween(ic.g.scale, [1.25, 1.25, 1], .2).then(() => tween(ic.g.scale, [1, 1, 1], .5, 'spring'));
    }

    // ---------- audience bar chart (lifeline) ----------
    const chart = new THREE.Group(); chart.position.set(-4.7, 3.2, -1.4); chart.rotation.y = .55; chart.visible = false; S.add(chart);
    const cp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.1, .12), mat('#0a0f22', {metalness: .6, roughness: .35})); cp.position.z = -.08; chart.add(cp);
    const cb = new THREE.Mesh(new THREE.BoxGeometry(2.72, 3.22, .08), metal); cb.position.z = -.14; chart.add(cb);
    const bars = [0, 1, 2, 3].map(j => {
      const g = new THREE.BoxGeometry(.38, 1, .08); g.translate(0, .5, 0);
      const b = new THREE.Mesh(g, mat('#c9a24a', {emissive: '#3a2a08', metalness: .4, roughness: .35})); b.position.set(-.9 + j * .6, -1.1, .02); b.scale.y = .01; chart.add(b);
      const l = label3d(L4[j], {w: .4, h: .3, px: 200, bg: null, border: null, color: PAL.gold, fs: .8}); l.position.set(-.9 + j * .6, -1.32, .03); chart.add(l);
      const pct = label3d(' ', {w: .6, h: .26, px: 200, bg: null, border: null, fs: .8}); pct.position.set(-.9 + j * .6, -.9, .03); chart.add(pct);
      return {b, pct};
    });

    // ---------- audience silhouettes ----------
    const seatsA = [];
    [-1, 1].forEach(sd => { for (let r = 0; r < 3; r++) for (let j = 0; j < 10; j++) { const R = 7.6 + r * 1.1, a = (38 + j * 7.2 + (r % 2) * 3.6) * Math.PI / 180; seatsA.push({x: sd * R * Math.sin(a), y: r * .5, z: -R * Math.cos(a) + .3, ph: Math.random() * 6}); } });
    const silM = mat('#10142a', {roughness: .9, metalness: 0});
    const mk = (geo) => { const m = new THREE.InstancedMesh(geo, silM, seatsA.length); m.userData.noShadow = true; S.add(m); return m; };
    const blocks = mk(new THREE.BoxGeometry(.62, 1, .62)), bodies = mk(new THREE.CapsuleGeometry(.2, .45, 4, 8)), heads = mk(new THREE.SphereGeometry(.13, 10, 8));
    const dm = new THREE.Object3D();
    const placeAud = (t, cheer) => {
      seatsA.forEach((s, i) => {
        const yo = cheer > .01 ? Math.abs(Math.sin(t * 8 + s.ph)) * .1 * cheer : 0;
        if (t === 0) { dm.position.set(s.x, (s.y + .45) / 2, s.z); dm.scale.set(1, s.y + .45, 1); dm.rotation.y = Math.atan2(s.x, s.z - .3); dm.updateMatrix(); blocks.setMatrixAt(i, dm.matrix); dm.scale.set(1, 1, 1); }
        dm.position.set(s.x, s.y + .45 + .42 + yo, s.z); dm.updateMatrix(); bodies.setMatrixAt(i, dm.matrix);
        dm.position.y += .55; dm.updateMatrix(); heads.setMatrixAt(i, dm.matrix);
      });
      blocks.instanceMatrix.needsUpdate = bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
    };
    placeAud(0, 0);
    let cheer = 0;
    S.on((dt, t) => { if (cheer > 0) { cheer = Math.max(0, cheer - dt * .45); placeAud(t + .001, cheer); } });

    // ---------- players at fastest-finger podiums ----------
    const SKIN = ['#f0d0b4', '#e2b893', '#c99272', '#8d5a3b', '#efcaa9'], HAIR = ['#2a1d14', '#6b4a2a', '#c9a46a', '#1c1416', '#8a8378'];
    const n = ctx.players.length;
    ctx.players.forEach((p, i) => {
      const x = (i - (n - 1) / 2) * 1.75, female = Math.random() < .5;
      const pd = podium(p.color, p.name); pd.position.set(x, 0, -1.9); S.add(pd);
      const P = person({suit: pick1(['#1f2740', '#2b2433', '#1d3340', '#33302a']), shirt: '#f1ece2', tie: p.color, skin: pick1(SKIN), hair: pick1(HAIR), hairStyle: female ? pick1(['long', 'bob', 'bun']) : pick1(['short', 'slick', 'curly']), female});
      P.position.set(x, 0, -2.45); S.add(P);
      Object.assign(p.data, {person: P, podium: pd, home: [x, 0, -2.45], obj: P});
    });

    // ---------- host ----------
    const host = createHost(ctx, {...HOSTS.cultura, position: [-1.15, .2, .3], lookAt: [1.15, 1.3, .3], lines: LINES});
    tween(host.p.rotation, {y: Math.PI / 2}, .1); host.p.sit(true);
    const talk = (t, o) => (turbo || skip) ? Promise.resolve() : host.say(t, o);

    // ---------- input plumbing ----------
    const onKey = e => { if (keyFn && !/INPUT|TEXTAREA/.test(e.target.tagName) && e.key.length === 1) keyFn(e.key.toLowerCase()); };
    const onDown = e => { if (!plateFn || e.target.id !== 'gl') return; const o = raycast(plates, e); if (o) plateFn(o.userData.id); };
    addEventListener('keydown', onKey); addEventListener('pointerdown', onDown);
    ctx.onExit(() => { removeEventListener('keydown', onKey); removeEventListener('pointerdown', onDown); });
    const clearInput = () => { keyFn = plateFn = null; };

    // ---------- cameras & lights ----------
    const CAM = {
      wide: [[0, 3.6, 11], [0, 2.3, -1]], ff: [[0, 3.4, 7.2], [0, 2.4, -2.2]], board: [[0, 2.5, 4.6], [0, 2.85, -3.2]],
      cont: [[-3.2, 1.85, 2.9], [1.15, 1.3, .3]], host: [[3.3, 1.85, 2.9], [-1.15, 1.35, .3]], tight: [[-2.0, 1.55, 1.9], [1.15, 1.3, .3]],
      ladder: [[1.4, 3.3, 4.4], [4.7, 3.3, -1.4]], chart: [[-1.4, 3.1, 4.4], [-4.7, 3.2, -1.4]]
    };
    const shot = (k, o) => { if (!skip) S.go(...CAM[k], o); };
    const C1 = new THREE.Color('#4f6fd0'), C2 = new THREE.Color('#7a58c8'), C3 = new THREE.Color('#b8456a'), WHITE = new THREE.Color('#ffffff');
    const levelCol = k => C1.clone().lerp(C2, Math.min(1, k / 9)).lerp(C3, Math.max(0, (k - 9) / 5));
    async function lightsFor(k) {
      const col = levelCol(k);
      tween(trimM.color, col, 1.4); tween(spot.color, col.clone().lerp(WHITE, .55), 1.2);
      await W(Promise.all([key ? tween(key, {intensity: KEY0 * .2}, .35, 'in') : 0, tween(spot, {intensity: 0}, .3), hemi ? tween(hemi, {intensity: HEMI0 * .3}, .35) : 0]));
      if (key) tween(key, {intensity: KEY0 * (1 - k * .035)}, 1.3); if (hemi) tween(hemi, {intensity: HEMI0 * (1 - k * .04)}, 1.3);
      tween(spot, {intensity: 25 + k * 1.5, angle: .42}, 1.1);
    }
    const tense = () => { if (key) tween(key, {intensity: KEY0 * .4}, .8); if (hemi) tween(hemi, {intensity: HEMI0 * .25}, .8); tween(spot, {angle: .24}, .8); };
    const relax = k => { if (key) tween(key, {intensity: KEY0 * (1 - k * .035)}, 1); if (hemi) tween(hemi, {intensity: HEMI0 * (1 - k * .04)}, 1); tween(spot, {angle: .42}, 1); };
    const beat = () => { tone(58, .35, 'sine', .18); tone(52, .3, 'sine', .14, .18); };

    // ---------- walking ----------
    const turn = (o, yaw, d = .3) => { let df = yaw - o.rotation.y; while (df > Math.PI) df -= Math.PI * 2; while (df < -Math.PI) df += Math.PI * 2; return W(tween(o.rotation, {y: o.rotation.y + df}, d, 'sine')); };
    async function walk(P, pts) {
      const sp = turbo ? 4 : 1.6;
      const stop = anim.on((dt, t) => { P.rig.position.y = Math.abs(Math.sin(t * 9)) * .035; });
      for (const [x, y, z] of pts) {
        const dist = Math.hypot(x - P.position.x, z - P.position.z); if (dist < .01) continue;
        await turn(P, Math.atan2(x - P.position.x, z - P.position.z), turbo ? .1 : .25);
        await W(tween(P.position, [x, y, z], Math.max(.25, dist / sp), 'inout'));
      }
      stop(); P.rig.position.y = 0;
    }
    const gapX = p => p.data.home[0] + (p.data.home[0] >= 0 ? .85 : -.85);
    async function toSeat(p) {
      const P = p.data.person, [, , hz] = p.data.home, gx = gapX(p);
      await walk(P, [[gx, 0, hz], [gx, 0, -1.0], [.62, .2, .3]]);
      await turn(P, -Math.PI / 2); P.sit(true);
      await W(tween(P.position, {x: 1.15}, .6, 'inout'));
      P.lookAt(host.p.head);
    }
    async function toPodium(p) {
      const P = p.data.person, [hx, , hz] = p.data.home, gx = gapX(p);
      P.lookAt(null); P.sit(false); await W(tween(P.position, {x: .62}, .5, 'inout'));
      await walk(P, [[gx, .0, -1.0], [gx, 0, hz], [hx, 0, hz]]); await turn(P, 0);
    }

    // ---------- DOM helpers ----------
    const card = (html, cls = 'card') => { const c = h('div', cls); c.innerHTML = html; return c; };
    const who = p => `<span class="who" style="--pc:${p.color}">${esc(p.name)}${p.bot ? ' · CPU' : ''}</span>`;
    const clickOf = b => W(new Promise(r => { b.onclick = () => { sfx.click(); r(); }; }));
    const hud = (p, k) => ctx.hud(`<span class="pill">${esc(p.name)}</span><span class="pill">Domanda <b>${k + 1}/15</b></span><span class="pill">In palio <b>${eur(LADDER[k])}</b></span><span class="pill">Garantiti <b>${eur(safeFor(k))}</b></span>`);
    const audHTML = (v, removed) => `<div style="display:flex;gap:10px;align-items:flex-end;height:78px;padding:6px 8px;border-radius:12px;background:rgba(244,239,227,.04)">${v.map((x, i) => `<div style="flex:1;text-align:center;font-size:.8rem;color:var(--mut)"><div style="height:${Math.max(2, x * .5)}px;background:var(--gold);border-radius:4px 4px 0 0;opacity:${removed.has(i) ? .25 : 1}"></div><b style="color:var(--tx)">${L4[i]}</b> ${x}%</div>`).join('')}</div>`;

    // ---------- data ----------
    const usedQ = new Set(), usedF = new Set();
    function drawQuestion(k) { // fascia: 3 blocchi da 5 domande, spostata da qDiff (1 facile = parte più in basso)
      const pl = ctx.pool(BANK, clamp(Math.floor(k / 5) + 1 + ctx.qDiff - 2, 1, 3));
      const x = pick1(pl.filter(x => !usedQ.has(x.id)).length ? pl.filter(x => !usedQ.has(x.id)) : pl); usedQ.add(x.id);
      const opts = shuffle([x.r, ...x.w]); return {q: x.q, cat: x.cat, d: x.lv, opts, right: opts.indexOf(x.r)};
    }
    function drawFF() {
      let pool = FF.filter((f, i) => !usedF.has(i)); if (!pool.length) { usedF.clear(); pool = FF; }
      const f = pick1(pool); usedF.add(FF.indexOf(f)); return f;
    }

    // ================= FASTEST FINGER =================
    async function ffPlay(c, f) {
      if (c.retired || !c.alive) return {ok: false, t: 99};
      const order = shuffle([0, 1, 2, 3]), opts = order.map(r => f.items[r]);
      shot('ff');
      const ready = h('button', 'btn pri', 'Via!');
      ctx.dock((() => { const x = card(`<div class="meta"><span>Dito più veloce</span>${who(c)}<span>20 secondi</span></div><h2>Tocca a ${esc(c.name)}: preparati!</h2><p style="color:var(--mut);margin-bottom:12px">Ti verranno mostrate quattro risposte: toccale nell’ordine giusto, anche sui pannelli o con i tasti A–D. Il tempo parte quando compare la domanda.</p>`); x.append(ready); return x; })());
      ready.focus();
      let readyDone = false;
      const unsubReady = ctx.onForfeit ? ctx.onForfeit(fp => {
        if (fp === c && !readyDone) {
          readyDone = true;
          ready.click();
        }
      }) : null;
      await clickOf(ready);
      readyDone = true;
      if (unsubReady) unsubReady();
      if (c.retired || !c.alive) return {ok: false, t: 99};
      showBoard(f.q, opts); host.ask(f.q);
      const x = card(`<div class="meta"><span>Dito più veloce</span>${who(c)}<span class="sq">—</span></div><h2>${esc(f.q)}</h2><div class="timer"><i></i></div>`);
      const box = h('div', 'opts'), seq = [];
      const btns = opts.map((o, j) => { const b = h('button', 'opt', `<b>${L4[j]}</b><span>${esc(o)}</span>`); b.onclick = () => tap(j); box.append(b); return b; });
      const again = h('button', 'btn', 'Ricomincia'), row = h('div', 'row'); row.style.marginTop = '12px'; row.append(again); x.append(box, row); ctx.dock(x);
      const sq = x.querySelector('.sq');
      let done = false, t0 = performance.now(), fin;
      const end = new Promise(r => { fin = r; });
      const cd = countdown(ctx, 20, {bar: x.querySelector('.timer i'), onEnd: () => finish()});
      const unsubFf = ctx.onForfeit ? ctx.onForfeit(fp => {
        if (fp === c) finish();
      }) : null;
      ctx.onExit(() => { if (unsubFf) unsubFf(); });
      function tap(j) {
        if (done || seq.includes(j)) return;
        seq.push(j); sfx.click(); btns[j].disabled = true; btns[j].classList.add('picked'); btns[j].querySelector('b').textContent = seq.length;
        plates[j].lt.set(String(seq.length)); paint(plates[j], 'sel', .2);
        sq.textContent = seq.map(k => L4[k]).join(' – ');
        if (seq.length === 4) finish();
      }
      again.onclick = () => { if (done) return; seq.length = 0; sq.textContent = '—'; btns.forEach((b, j) => { b.disabled = false; b.classList.remove('picked'); b.querySelector('b').textContent = L4[j]; plates[j].lt.set(L4[j] + ':'); paint(plates[j], 'idle', .2); }); };
      function finish() {
        if (done) return; done = true;
        if (unsubFf) unsubFf();
        cd.stop(); clearInput(); fin();
      }
      keyFn = k => { const j = 'abcd'.indexOf(k); if (j >= 0) tap(j); };
      plateFn = tap;
      await W(end);
      const t = (performance.now() - t0) / 1000, ok = seq.length === 4 && seq.every((j, r) => order[j] === r);
      btns.forEach(b => { b.disabled = true; });
      plates.forEach(pl => paint(pl, 'idle', .2));
      await T(400);
      for (let r = 0; r < 4; r++) { const j = order.indexOf(r); paint(plates[j], 'ok', .25); plates[j].lt.set(String(r + 1)); btns[j].classList.add('right'); tone(520 + r * 130, .18, 'triangle', .07); await T(420); }
      const correct = [0, 1, 2, 3].map(r => L4[order.indexOf(r)]).join(' – ');
      ctx.dock(card(`<div class="meta"><span>Dito più veloce</span>${who(c)}<span></span></div><div class="big disp" style="color:${ok ? 'var(--ok)' : 'var(--bad)'}">${ok ? t.toFixed(2) + ' s' : seq.length < 4 ? 'Tempo scaduto' : 'Ordine sbagliato'}</div><p>Ordine esatto: <b>${correct}</b></p>`, 'card msg'));
      (ok ? sfx.ok : sfx.bad)();
      await T(1500);
      return {ok, t};
    }

    async function ffRound(cands) {
      for (let tries = 0; ; tries++) {
        shot('ff'); ctx.hud('<span class="pill">Dito più veloce</span>');
        ctx.players.forEach(c => c.data.podium.light(cands.includes(c)));
        cands.forEach(c => c.data.podium.setLabel(c.name));
        await talk(pick1(LINES.ffIntro), {mood: 'happy', gesture: 'point'});
        const res = new Map(), humans = cands.filter(c => !c.bot), reps = cands.length < 2 ? 1 : Math.ceil(4 / cands.length); // meno concorrenti = più domande
        const agg = rs => ({k: rs.filter(x => x.ok).length, t: rs.reduce((a, x) => a + (x.ok ? x.t : 0), 0)});
        for (const c of humans) { clearInput(); await ctx.passDevice(c); ctx.setActive(c); const rs = []; for (let i = 0; i < reps; i++) rs.push(await ffPlay(c, drawFF())); res.set(c, agg(rs)); }
        if (!humans.length) {
          const f = drawFF(); showBoard(f.q, shuffle(f.items));
          ctx.dock(card('<div class="meta"><span>Dito più veloce</span><span>CPU</span></div><h2>I concorrenti CPU stanno ordinando…</h2>', 'card msg'));
          await T(1800);
        }
        for (const c of cands.filter(c => c.bot)) res.set(c, agg(Array.from({length: reps}, () => ({ok: Math.random() < c.skill, t: 3.6 + (1 - c.skill) * 7 + Math.random() * 4.5}))));
        const ranked = [...res].sort((a, b) => (b[1].k - a[1].k) || a[1].t - b[1].t);
        ranked.forEach(([c, r]) => c.data.podium.setLabel([{t: c.name, fs: .45}, {t: fmt(r), fs: .4, color: r.k ? PAL.goldHi : PAL.bad}]));
        const win = ranked[0][1].k ? ranked[0][0] : null, fmt = r => r.k ? (reps > 1 ? r.k + '/' + reps + ' · ' : '') + r.t.toFixed(2) + ' s' : '✗';
        const list = ranked.map(([c, r]) => `<li style="--pc:${c.color}"><span class="dot"></span><span class="nm">${esc(c.name)}${c.bot ? '<small>CPU</small>' : ''}</span><b>${r.k ? fmt(r) : 'errato'}</b></li>`).join('');
        const cont = h('button', 'btn pri', 'Continua');
        const rc = card(`<div class="meta"><span>Dito più veloce · tempi</span><span></span></div>${cands.length > 1 ? `<ol class="rank">${list}</ol>` : ''}<p style="margin:10px 0">${win ? `Al centro va <b>${esc(win.name)}</b>!` : tries >= 2 ? 'Nessun ordine giusto: si va al centro comunque.' : 'Nessun ordine giusto: si ripete.'}</p>`, 'card msg');
        rc.append(cont); ctx.dock(rc);
        if (win) { win.data.podium.light(PAL.goldHi); S.flashWith(PAL.goldHi); S.burst(win.color, 60, 4); cheer = 1; sfx.win(); await talk(fill(pick1(LINES.ffWin), {name: win.name}), {mood: 'happy', gesture: 'clap', to: win}); }
        else if (tries < 2) await talk(pick1(LINES.ffNone), {mood: 'surprised', gesture: 'shrug'});
        await (humans.length ? clickOf(cont) : Promise.race([clickOf(cont), T(2200)]));
        if (win) return win;
        if (tries >= 2) return pick1(cands);
      }
    }

    // ================= LIFELINES =================
    function votes(q, removed) {
      const avail = [0, 1, 2, 3].filter(i => !removed.has(i)), others = avail.filter(i => i !== q.right);
      let r = [0, .8, .66, .54, .43, .35][q.d] + rand(-.08, .08);
      if (avail.length === 2) r = Math.min(.95, r + .15);
      const v = [0, 0, 0, 0]; v[q.right] = r;
      const ws = others.map(() => Math.random() + .2), tot = ws.reduce((a, b) => a + b, 0);
      others.forEach((i, j) => { v[i] = (1 - r) * ws[j] / tot; });
      if (Math.random() < [0, 0, 0, .08, .15, .22][q.d]) { const t = pick1(others); [v[t], v[q.right]] = [v[q.right], v[t]]; } // pubblico ingannato
      const p = v.map(x => Math.floor(x * 100)), top = v.indexOf(Math.max(...v));
      p[top] += 100 - p.reduce((a, b) => a + b, 0);
      return p;
    }
    async function runLife(id, p, qRef, st) {
      lifes[id] = false; useIcon(id); clearInput();
      if (id === 'switch') {
        await talk(pick1(LINES.switch || ['Computer, cambio domanda!']), {to: p});
        sfx.whoosh();
        const newQ = drawQuestion(qRef.k);
        qRef.q = newQ;
        st.removed.clear();
        plates.forEach(pl => paint(pl, 'idle', .15));
        showBoard(newQ.q, newQ.opts);
        st.notes.push('<div style="color:var(--mut);font-size:.9rem">🔄 Cambio domanda: ecco la nuova domanda!</div>');
        await T(600);
        if (!turbo && !skip) host.ask(newQ.q);
        return;
      }
      const q = qRef.q;
      if (id === 'fifty') {
        await talk(pick1(LINES.fifty), {to: p}); sfx.whoosh();
        shuffle([0, 1, 2, 3].filter(i => i !== q.right && !st.removed.has(i))).slice(0, 2).forEach(i => { st.removed.add(i); offPlate(i); });
        st.notes.push('<div style="color:var(--mut);font-size:.9rem">50:50 · restano due risposte.</div>');
        await T(700); return;
      }
      if (id === 'aud') {
        ctx.dock(card(`<div class="meta"><span>Aiuto del pubblico</span>${who(p)}<span></span></div><h2>Il pubblico sta votando…</h2>`, 'card msg'));
        await talk(pick1(LINES.aud), {gesture: 'point'});
        const v = votes(q, st.removed);
        shot('chart'); chart.visible = true; chart.scale.setScalar(.01); tween(chart.scale, [1, 1, 1], .6, 'spring');
        bars.forEach(b => b.pct.set(' '));
        for (let i = 0; i < (skip ? 0 : 12); i++) { bars.forEach((b, j) => tween(b.b.scale, {y: st.removed.has(j) ? .01 : rand(.1, 1.6)}, .1)); sfx.tick(); await T(110); }
        bars.forEach((b, j) => { const y = Math.max(.01, v[j] / 50); tween(b.b.scale, {y}, .9, 'spring'); b.pct.position.y = -1.1 + y + .16; b.pct.set(v[j] + '%'); });
        sfx.ok(); st.notes.push(audHTML(v, st.removed));
        const top = v.indexOf(Math.max(...v)); st.hint = top; st.conf = v[top] / 100;
        await T(1600);
        await talk(v[top] >= 60 ? 'Il pubblico sembra avere le idee chiare.' : 'Il pubblico è diviso. Decidi tu.', {to: p});
        shot('board'); return;
      }
      // phone
      let f;
      if (p.bot) f = pick1(FRIENDS);
      else {
        const c = card(`<div class="meta"><span>Telefonata a casa</span>${who(p)}<span></span></div><h2>Chi vuoi chiamare?</h2>`), box = h('div', 'opts three');
        const picks = FRIENDS.map(fr => { const b = h('button', 'opt', `<b>📞</b><span><strong>${fr.name}</strong> · ${fr.who}</span>`); box.append(b); return b; });
        c.append(box); ctx.dock(c); picks[0].focus();
        f = await W(new Promise(r => picks.forEach((b, i) => { b.onclick = () => { sfx.click(); r(FRIENDS[i]); }; })));
      }
      await talk(pick1(LINES.phone), {to: p});
      const good = f.good.includes(q.cat), knows = Math.random() < clamp(.97 - q.d * .13 + (good ? .2 : 0), .12, .97);
      const avail = [0, 1, 2, 3].filter(i => !st.removed.has(i));
      const ans = knows ? q.right : pick1(avail);
      const conf = Math.round(knows ? rand(f.brag ? 88 : 72, f.brag ? 100 : 95) : f.brag ? rand(65, 90) : rand(25, 55));
      const say = conf >= 70 ? `Vai sulla ${L4[ans]}, ${q.opts[ans]}. Sicur${f.f ? 'a' : 'o'} al ${conf} per cento.` : `Io direi la ${L4[ans]}, ${q.opts[ans]}… ma sono sicur${f.f ? 'a' : 'o'} sì e no al ${conf} per cento.`;
      const tr = h('div'); tr.style.cssText = 'display:grid;gap:6px;font-size:.95rem;margin-top:8px';
      const c = card(`<div class="meta"><span>📞 ${f.name} · ${f.who}</span>${who(p)}<span class="cd">30</span></div><h2>Chiamata in corso…</h2>`); c.append(tr); ctx.dock(c);
      const cd = countdown(ctx, 30, {label: c.querySelector('.cd')});
      sfx.phone(); await T(1300);
      const line = (wh, t) => { const d = h('div', '', `<b style="color:${wh === 'f' ? 'var(--gold-hi)' : 'var(--tx)'}">${wh === 'f' ? f.name : wh === 'h' ? 'Sara' : esc(p.name)}:</b> ${esc(t)}`); tr.append(d); };
      line('f', pick1(f.hi)); await T(1300);
      line('h', `Ciao ${f.name}, sono Sara Bianchi. ${p.name} è qui con me e ha bisogno di te: trenta secondi.`); await T(1500);
      line('p', `${q.q} ${q.opts.map((o, i) => st.removed.has(i) ? '' : `${L4[i]}: ${o}.`).join(' ')}`); await T(2200);
      line('f', pick1(knows || f.brag ? f.sure : f.unsure)); await T(1400);
      line('f', say); await T(1500);
      line('f', pick1(f.bye)); cd.stop(); sfx.click();
      st.notes.push(`<div style="font-size:.9rem;color:var(--mut)">📞 <b style="color:var(--tx)">${f.name}</b>: «${esc(say)}»</div>`);
      st.hint = ans; st.conf = conf / 100;
      await T(1200);
    }

    // ================= HOT SEAT =================
    let lifes = {};
    function qCard(p, q, k, st, watch) {
      const c = card(`<div class="meta"><span>${esc(q.cat)} · Domanda ${k + 1}/15</span>${who(p)}<span>${eur(LADDER[k])}</span></div><h2>${esc(q.q)}</h2>`);
      const box = h('div', 'opts');
      const btns = q.opts.map((o, i) => { const b = h('button', 'opt', `<b>${L4[i]}</b><span>${esc(o)}</span>`); if (st.removed.has(i)) { b.disabled = true; b.style.visibility = 'hidden'; } if (watch) b.disabled = true; box.append(b); return b; });
      c.append(box);
      if (st.notes.length) { const nt = h('div', '', st.notes.join('')); nt.style.cssText = 'display:grid;gap:8px;margin-top:10px'; c.append(nt); }
      const row = h('div', 'row'); row.style.marginTop = '12px'; c.append(row);
      const lb = {};
      if (!watch) {
        [['fifty', '50:50'], ['switch', '🔄 Switch'], ['aud', '👥 Pubblico'], ['phone', '📞 Casa']].forEach(([id, t]) => { const b = h('button', 'btn', t); b.disabled = !lifes[id]; b.setAttribute('aria-label', 'Aiuto ' + t); row.append(b); lb[id] = b; });
        const quit = h('button', 'btn danger', k ? `Ritirati · ${eur(LADDER[k - 1])}` : 'Ritirati'); quit.disabled = !k; row.append(quit); lb.quit = quit;
      } else {
        const msg = h('div', '', `<span style="color:var(--mut)">${esc(p.name)} sta pensando…</span>`); msg.style.cssText = 'flex:2;align-self:center';
        const ff = h('button', 'btn', '⏩ Salta'); ff.onclick = () => { skip = true; host.stop(); ff.disabled = true; };
        row.append(msg, ff); if (skip) ff.disabled = true;
      }
      ctx.dock(c);
      return {btns, lb, c};
    }
    function humanAct(p, q, k, st) {
      if (p.retired || !p.alive) return Promise.resolve({t: 'quit'});
      const {btns, lb} = qCard(p, q, k, st, false);
      return W(new Promise(res => {
        let done = false;
        const act = r => {
          if (done) return;
          done = true;
          if (unsub) unsub();
          res(r);
        };
        const unsub = ctx.onForfeit ? ctx.onForfeit(fp => {
          if (fp === p) act({t: 'quit'});
        }) : null;
        ctx.onExit(() => { if (unsub) unsub(); });
        btns.forEach((b, i) => { b.onclick = () => act({t: 'pick', i}); });
        ['fifty', 'switch', 'aud', 'phone'].forEach(id => { if (lb[id]) lb[id].onclick = () => act({t: 'life', id}); });
        lb.quit.onclick = () => act({t: 'quit'});
        keyFn = c => { const i = 'abcd'.indexOf(c); if (i >= 0 && !st.removed.has(i)) act({t: 'pick', i}); };
        plateFn = i => { if (!st.removed.has(i)) act({t: 'pick', i}); };
      }));
    }
    async function botAct(p, q, k, st) {
      qCard(p, q, k, st, true);
      await ctx.botThink(500, 1100);
      if (st.knows === undefined) st.knows = Math.random() < clamp(p.skill + .38 - q.d * .13, .06, .97);
      const avail = [0, 1, 2, 3].filter(i => !st.removed.has(i));
      if (st.knows) return {t: 'pick', i: q.right};
      if (st.hint != null && st.conf >= .5) return {t: 'pick', i: st.hint};
      const left = Object.keys(lifes).filter(id => lifes[id]);
      if (!st.usedHere && left.length && Math.random() < .85) { st.usedHere = true; return {t: 'life', id: pick1(left)}; }
      if (k > 0 && LADDER[k - 1] > safeFor(k) && Math.random() < (k >= 9 ? .75 : k >= 5 ? .5 : .2)) return {t: 'quit'};
      return {t: 'pick', i: st.hint != null && Math.random() < .6 ? st.hint : pick1(avail)};
    }
    async function confirmFinal(p, q, i) {
      const c = card(`<div class="meta"><span>Risposta definitiva?</span>${who(p)}<span></span></div><h2>${L4[i]}: ${esc(q.opts[i])}</h2><p style="color:var(--mut);margin-bottom:12px">È la tua risposta definitiva?</p>`);
      const row = h('div', 'row'), yes = h('button', 'btn pri', 'Sì, definitiva'), no = h('button', 'btn', 'No, ci ripenso');
      if (p.bot) {
        ctx.dock(c); await talk(pick1(LINES.final), {to: p}); await T(rand(500, 1000));
        c.append(h('p', '', `<b>${esc(p.name)}:</b> «Sì, è la mia risposta definitiva.»`)); await T(800); return true;
      }
      row.append(yes, no); c.append(row); ctx.dock(c); yes.focus();
      talk(pick1(LINES.final), {mood: 'think', to: p});
      return W(new Promise(r => { const f = v => () => { yes.disabled = no.disabled = true; sfx.click(); r(v); }; yes.onclick = f(true); no.onclick = f(false); }));
    }
    async function confirmQuit(p, k) {
      const c = card(`<div class="meta"><span>Ritiro</span>${who(p)}<span></span></div><h2>Ti ritiri con ${eur(LADDER[k - 1])}?</h2>`);
      const row = h('div', 'row'), yes = h('button', 'btn danger', 'Sì, mi ritiro'), no = h('button', 'btn pri', 'No, continuo');
      row.append(no, yes); c.append(row); ctx.dock(c); no.focus();
      talk(`Ci hai pensato bene? Porteresti a casa ${money(LADDER[k - 1])}.`, {mood: 'think', to: p});
      return W(new Promise(r => { yes.onclick = () => r(true); no.onclick = () => r(false); }));
    }
    async function reveal(p, q, i, k) {
      tense(); shot('tight');
      if (k >= 4) await talk(pick1(LINES.suspense), {mood: 'think', to: p});
      for (let b = 0, nB = skip ? 0 : turbo ? 1 : 2 + Math.floor(k / 4); b < nB; b++) { beat(); await T(650); }
      shot('board');
      const ok = i === q.right;
      const card2 = card(`<div class="meta"><span>${esc(q.cat)} · Domanda ${k + 1}/15</span>${who(p)}<span>${eur(LADDER[k])}</span></div><h2>${esc(q.q)}</h2>`);
      const box = h('div', 'opts'); q.opts.forEach((o, j) => { const b = h('button', 'opt' + (j === q.right ? ' right' : j === i ? ' wrong' : ''), `<b>${L4[j]}</b><span>${esc(o)}</span>`); b.disabled = true; box.append(b); }); card2.append(box);
      if (ok) { paint(plates[i], 'ok', .25); sfx.ok(); S.flashWith(PAL.ok); cheer = 1; ctx.dock(card2); }
      else { paint(plates[i], 'bad', .25); sfx.bad(); S.shakeIt(.35); S.flashWith(PAL.bad); await T(500); paint(plates[q.right], 'ok', .3); ctx.dock(card2); }
      relax(k);
      return ok;
    }

    async function hotSeat(p) {
      clearInput(); turbo = !!p.bot; skip = false;
      await ctx.passDevice(p); ctx.setActive(p);
      p.data.podium.light(PAL.goldHi);
      shot('wide'); resetLadder(); lifes = {fifty: true, switch: true, aud: true, phone: true};
      ctx.dock(card(`<div class="meta"><span>Al centro</span>${who(p)}<span></span></div><h2>${esc(p.name)} si siede al centro dello studio.</h2>`, 'card msg'));
      await toSeat(p); host.turnTo(p);
      shot('host');
      await host.say(fill(pick1(LINES.seat), {name: p.name}), {mood: 'happy', gesture: 'wave', to: p});
      let won = ctx.cfg?.finalOnly ? LADDER[9] : 0, res = '';
      const startK = ctx.cfg?.finalOnly ? 10 : 0;
      for (let k = startK; k < 15; k++) {
        if (p.retired || !p.alive) break;
        const qRef = { q: drawQuestion(k), k };
        hud(p, k);
        cursor.visible = true; tween(cursor.position, {y: rowY(k)}, .7, 'spring');
        if (!skip) { shot('ladder'); await lightsFor(k); await T(500); }
        const intro = k === 0 ? `${p.name}, prima domanda, per cinquanta euro.` : k === 14 ? 'Ultima domanda. Per un milione di euro. Silenzio in studio.' : `Domanda numero ${k + 1}, per ${money(LADDER[k])}.` + (k === 4 ? ' È la domanda della prima soglia (500 €).' : k === 9 ? ' Seconda soglia in vista (30.000 €).' : '');
        await talk(intro, {mood: k >= 12 ? 'think' : 'neutral', to: p});
        showBoard(qRef.q.q, qRef.q.opts);
        shot('board'); if (!turbo && !skip) host.ask(qRef.q.q);
        const st = {removed: new Set(), notes: []};
        let choice = null;
        while (choice === null) {
          if (p.retired || !p.alive) { choice = -1; break; }
          const act = p.bot ? await botAct(p, qRef.q, k, st) : await humanAct(p, qRef.q, k, st);
          clearInput();
          if (act.t === 'life') { await runLife(act.id, p, qRef, st); continue; }
          if (act.t === 'quit') { if (p.bot || await confirmQuit(p, k)) choice = -1; continue; }
          paint(plates[act.i], 'sel', .25); sfx.click(); shot('tight');
          if (await confirmFinal(p, qRef.q, act.i)) choice = act.i; else { paint(plates[act.i], 'idle'); shot('board'); }
        }
        if (choice === -1) {
          won = k ? LADDER[k - 1] : 0; res = `si ritira alla domanda ${k + 1} con ${eur(won)}`;
          paint(plates[qRef.q.right], 'ok'); shot('board');
          ctx.dock(card(`<div class="meta"><span>Ritiro</span>${who(p)}<span></span></div><h2>${esc(p.name)} si ritira.</h2><p>La risposta giusta era <b>${L4[qRef.q.right]}: ${esc(qRef.q.opts[qRef.q.right])}</b>.</p>`, 'card msg'));
          skip = false; await host.say(fill(pick1(LINES.quit), {name: p.name, value: money(won)}), {mood: 'happy', gesture: 'clap', to: p});
          break;
        }
        const ok = await reveal(p, qRef.q, choice, k);
        if (!ok) {
          won = safeFor(k); res = `sbaglia la domanda ${k + 1} e scende a ${eur(won)}`;
          skip = false; turbo = false;
          await host.react('wrong', p); await T(400);
          await host.say(`La risposta giusta era la ${L4[qRef.q.right]}: ${qRef.q.opts[qRef.q.right]}. ${won ? `Porti a casa comunque ${money(won)}.` : 'Purtroppo esci senza vincite.'}`, {mood: 'sad', to: p});
          break;
        }
        won = LADDER[k]; pips[k].material.color.set(PAL.gold); ctx.setScore(p, won);
        if (k === 14) {
          res = 'risponde a tutte e 15 le domande!';
          skip = false; turbo = false; sfx.win(); S.burst(PAL.goldHi, 220, 7); S.burst(p.color, 120, 5); cheer = 1.5; shot('wide');
          p.data.person.celebrate(); host.p.celebrate();
          await host.react('win', p); break;
        }
        if (k === 4 || k === 9) { S.flashWith(PAL.goldHi); S.burst(PAL.goldHi, 70, 5); await talk(pick1(k === 4 ? LINES.safe1 : LINES.safe2), {mood: 'happy', gesture: 'clap', to: p}); }
        else if (!skip) await (turbo ? T(700) : host.react('right', p, {value: money(won)}));
        await T(900);
      }
      skip = false; turbo = false;
      ctx.setScore(p, won); p.data.res = res;
      const cont = h('button', 'btn pri', 'Continua');
      const sc = card(`<div class="meta"><span>Fine della scalata</span>${who(p)}<span></span></div><div class="big disp" style="color:var(--gold)">${eur(won)}</div><p style="margin:8px 0 12px">${esc(p.name)} ${esc(res)}.</p>`, 'card msg');
      sc.append(cont); ctx.dock(sc); cont.focus();
      await (p.bot ? Promise.race([clickOf(cont), ctx.sleep(3200)]) : clickOf(cont));
      plates.forEach(pl => paint(pl, 'idle')); chart.visible = false; tense();
      shot('wide'); await toPodium(p); relax(0);
      p.data.podium.light(false);
    }

    // ================= SHOW =================
    shot('wide', {snap: true});
    ctx.dock(card('<div class="meta"><span>Cultura Generale</span><span></span></div><h2>Quindici domande per il milione.</h2>', 'card msg'));
    await host.say(pick1(LINES.intro), {mood: 'happy', gesture: 'wave'});
    if (ctx.cfg?.finalOnly) {
      const seat = ctx.players.find(p => !p.bot) || ctx.players[0];
      await host.say(`Benvenuto direttamente alla Scalata Finale per il Milione, ${seat.name}! Sei alla domanda 11 per ${eur(LADDER[10])}, con la soglia di ${eur(LADDER[9])} già garantita e tutti i 4 aiuti a disposizione!`, {mood: 'happy', gesture: 'celebrate', to: seat});
      await hotSeat(seat);
    } else {
    let queue = [...ctx.players];
    while (queue.length) {
      let seat;
      if (queue.length === 1 && ctx.players.length > 1) {
        seat = queue[0];
        await host.say(`${seat.name}, manchi solo tu: la sedia è tua di diritto.`, {mood: 'happy', to: seat});
      } else seat = await ffRound(queue);
      queue = queue.filter(c => c !== seat);
      await hotSeat(seat);
    }
    }
    shot('wide');
    await host.react('outro');
    if (ctx.players.length === 1) {
      const p = ctx.players[0], v = p.score;
      ctx.finish({win: v >= LADDER[9], title: v === 1e6 ? 'MILIONARIO!' : v ? `Porti a casa ${eur(v)}` : 'Nessuna vincita', lines: [`${p.name} ${p.data.res}.`], score: v});
    } else ctx.finish({ranking: ctx.players.map(p => ({player: p, score: p.score})), lines: ctx.players.map(p => `${p.name} ${p.data.res}.`)});
  }
};
