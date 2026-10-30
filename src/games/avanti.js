import {THREE, newStage, tween, anim, label3d, mat, glow, person, chair, PAL, quality} from '../engine.js';
import {h, sfx, eur, shuffle, countdown, tone} from '../ui.js';
import {createHost, HOSTS} from '../host.js';
import {CATS, FAIRY, FUNERAL, WRONG} from './avanti_data.js';

const CASH = [1000, 2000, 3000, 5000, 10000, 15000, 20000, 30000, 50000, 75000, 100000, 150000, 200000];
const SUITS = ['#8a5a2b', '#2f6f6a', '#8a3a52', '#3d4f8a', '#5e6b2e', '#6a3d7a'];
const SKINS = ['#e9c3a0', '#dcae88', '#c99272', '#f0d0b4', '#b07a58'];
const HAIRS = ['#2a1d14', '#4a3020', '#1c1416', '#7a3b22', '#b9b6b0', '#c9a46a'];
const C = [0.9, 3.0], FIN = [1.6, 3.0], DUEL = [2.4, 3.8], PSPOT = [2.6, 3.9], BSPOT = [0.1, 4.0];
const SEAT = [5.7, .85, -1.5], QZ = -1.9, qx = i => -7.6 + i * 1.3;
const CAM = {
  wide: [[0, 3.4, 10.8], [0.6, 1.5, 0]], cont: [[0.2, 2.5, 7.6], [1.2, 1.5, 2.6]], champ: [[3.4, 2.8, 4.6], [5.7, 1.5, -1.5]],
  scroll: [[2.6, 2.6, 7.6], [3.0, 2.3, 3.7]], duel: [[1.4, 2.4, 8.4], [1.8, 1.5, 3.3]], fin: [[0.9, 2.3, 7.6], [1.4, 1.5, 3.2]],
  queue: [[-3.6, 2.6, 5.2], [-4.6, 1.1, -1.9]], perf: [[1.6, 2.3, 7.8], [1.9, 1.5, 3.5]]
};
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const mk = ([q, r, w]) => { const f = Math.random() < .5; return {q, opts: f ? [w, r] : [r, w], right: f ? 1 : 0}; };

// Paolo Brandi (fictional): sarcastic, jokey. {name} {value}
const L = {
  intro: ['Buonasera e benvenuti ad Avanti un altro! Io sono Paolo Brandi: stasera la fila è lunga e la mia pazienza corta.', 'Benvenuti! La sedia del campione è libera, il pidigozzaro gira e io ho già fame.'],
  next: ['Avanti il primo! {name}, venga, venga: non mordo. Il pidigozzaro forse sì.', '{name}, tocca a lei. Sorrida, e cerchi di non deludere sua zia che guarda da casa.', 'Prego {name}! Qui si gioca in piedi: le sedie sono per i campioni.', 'Avanti un altro! Ah no, quello lo dico dopo. {name}, benvenuto.'],
  cat: ['Categoria {value}! Due risposte per domanda: anche tirando a caso fa il cinquanta per cento.', '{value}! {name}, tre giuste su quattro e si va al pidigozzaro.', 'Si gioca su {value}. Concentrazione, {name}: due errori e la porta è quella.'],
  right: ['Giusto!', 'Esatto, {name}!', 'Bene! Non me l’aspettavo, ma bene.', 'Corretto. Il pubblico è sorpreso quanto me.', 'Sì! Continui così che poi ci crede.'],
  wrong: ['Sbagliato!', 'Eh no, {name}.', 'No! Ma con grande convinzione.', 'Ahia. Facciamo finta di niente.', 'Sbagliato. Glielo dico con affetto.'],
  won: ['Tre su quattro! {name}, si è guadagnato un giro al pidigozzaro.', 'Round superato! Adesso scelga un rotolo, e preghi.', 'Bravo {name}! Il pidigozzaro la aspetta: niente sbirciate.'],
  out: ['Mi dispiace {name}: avanti un altro!', 'E con questo, {name}, la salutiamo. Avanti un altro!', 'Fuori! {name}, l’uscita è da quella parte. Ci saluti la mamma.', 'Peccato {name}! Applausi, e avanti un altro!'],
  cash: ['{value}! Niente male, {name}: ci paga almeno il parcheggio.', '{value}! Applausi, e qualcuno controlli che non siano falsi.', '{value} a {name}! Il pidigozzaro stasera è generoso.'],
  short: ['Non basta: al campione mancano ancora {value}. Si continua!', 'Ancora {value} per scalzare il campione. Avanti col prossimo round!'],
  tie: ['Parità! E in parità vince il campione. Si continua, {name}.'],
  avanti: ['Avanti un altro! {name}, è scritto sul rotolo. Non l’ho scritto io. Cioè sì, ma non lo dica.', 'Il rotolo più temuto: avanti un altro! Arrivederci {name}.'],
  iett: ['Toccate ferro: è arrivato lo iettatore! {name}, punteggio azzerato. E adesso una domandina allegra.', 'Lo iettatore! Silenzio, che porta male anche parlarne. {name}, si riparte da zero.'],
  iettOk: ['Risposta giusta! Lo iettatore se ne va scontento. {name}, si riparte da zero, ma si riparte.'],
  pariglia: ['La pariglia! {name}, punteggio pari al campione: {value}. Adesso si decide al pulsante.', 'Pariglia! Il campione scende dal trono. Dieci secondi, un pulsante, una domanda.'],
  parWin: ['Ha vinto la pariglia! {name}, la sedia è sua.'],
  parLose: ['Il campione difende la sedia! {name}, mi spiace: avanti un altro.'],
  fairy: ['La bona sorte! Arriva la fata. {name}, una risposta giusta e sono trecentomila euro e la sedia.', 'Che fortuna! La fata della bona sorte. Mi raccomando, niente desideri strani.'],
  fairyNo: ['Peccato! La fata se ne va, ma lei resta in gioco, {name}.'],
  bonus: ['Signore e signori, il Bonus! {name}, se vince il round e pesca soldi, si raddoppia.', 'Arriva il Bonus! {name}, stavolta i soldi valgono doppio. Le domande no.'],
  double: ['Con il Bonus raddoppia: {value}!'],
  salotto: ['Si apre il salottino! {name}, ospite speciale: {value}. Una domanda, e se sbaglia esce.', 'Ecco a voi {value}! {name}, domanda speciale: la sbagli e la porta è quella.'],
  jolly: ['Giusto! {name}, adesso ha il jolly: potrà rifiutare il primo rotolo.'],
  champ: ['Abbiamo un nuovo campione! {name}, si accomodi lassù con {value}. E non si abitui.', '{name} è il campione, con {value}! Se la goda, dura poco.'],
  dethroned: ['{name}, mi dispiace: la sedia ora è di un altro. Avanti un altro!', 'Campione spodestato! {name}, grazie e arrivederci.'],
  siren: ['Sirena! Ultimo round: chi lo completa e supera il campione si prende tutto.', 'Suona la sirena, signori! {name}, un solo round per superare il campione.'],
  sirenNo: ['La sirena ha parlato: il campione resta in sella!'],
  final: ['{name}, gioco finale! Ventuno domande, e lei deve scegliere la risposta sbagliata. Finalmente una cosa che le viene naturale.', 'Il gioco finale, {name}: centocinquanta secondi, ventuno domande, e si sceglie sempre la risposta sbagliata.'],
  restart: ['Giusta! E qui la risposta giusta è sbagliata. Si ricomincia!', 'No no, quella era vera! Da capo!', 'Ahi, l’ha presa giusta. Tutto da rifare!'],
  jackpot: ['Tempo scaduto! Il punteggio se ne va, ma c’è il jackpot: centomila euro che scendono di mille al secondo. Mano nel raggio quando vuole!'],
  freeze: ['Mano nel raggio! Jackpot congelato. Ultimo giro: dieci secondi a risposta, un errore e si perde tutto.'],
  freezeAuto: ['Cinquantamila: il raggio congela da solo! Ultimo giro, dieci secondi a risposta.'],
  win: ['Ce l’ha fatta! {name} porta a casa {value}! Devo rivedere le domande.', 'Vittoria! {value} a {name}. Stasera offre lei.'],
  lose: ['Niente da fare, {name}. Ma che bel viaggio, eh? Avanti un altro… domani.'],
  nochamp: ['Stasera la sedia resta vuota. Mai successo! Va beh, succede sempre.'],
  suspense: ['Ci pensi, ci pensi. Io intanto invecchio.'], outro: ['È tutto! Avanti un altro… domani.']
};
const MOOD = {out: 'sad', wrong: 'sad', lose: 'sad', parLose: 'sad', dethroned: 'sad', fairyNo: 'sad', sirenNo: 'sad', iett: 'surprised', siren: 'surprised', jackpot: 'surprised', cash: 'happy', champ: 'happy', win: 'happy', right: 'happy', won: 'happy', fairy: 'happy', bonus: 'happy', intro: 'happy', parWin: 'happy', jolly: 'happy'};
const GEST = {intro: 'wave', next: 'point', out: 'point', avanti: 'point', champ: 'celebrate', win: 'celebrate', cash: 'clap', won: 'clap', siren: 'shrug', dethroned: 'shrug', lose: 'shrug', fairy: 'wave'};

export default {
  id: 'avanti', name: 'Avanti un altro!', tag: 'La sedia del campione', desc: 'Fai la fila, pesca il rotolo giusto, conquista la sedia', c1: '#ff7a1a', c2: '#ffe14a',
  players: {min: 1, max: 6, def: 5}, questions: true,
  guide: `
    <h4 style="margin:4px 0 6px;color:var(--gold);font-size:0.95rem">👥 La Fila &amp; I Round di Domande</h4>
    <p>I concorrenti fanno la fila e salgono sullo sgabello centrale uno alla volta. Ciascun turno ("stint") affronta una serie di <b>4 domande</b> su una categoria a tema con due opzioni ciascuna: servono <b>3 risposte giuste</b> per superare il round. Con <b>2 errori</b> scatta l'eliminazione ("Avanti un altro!").</p>

    <h4 style="margin:10px 0 6px;color:var(--gold);font-size:0.95rem">📜 Il Pidigozzaro &amp; La Sedia</h4>
    <p>Superate le domande, il concorrente pesca un rotolo cilindrico dal Pidigozzaro rotante:</p>
    <ul style="margin:4px 0 8px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li><b>Rotoli in Denaro:</b> da 1.000 € a 200.000 € che si sommano al montepremi personale.</li>
      <li><b>La Pariglia:</b> duello al pulsante col campione in carica per pareggiare il punteggio.</li>
      <li><b>Lo Iettatore:</b> azzera il bottino e costringe a una domanda funebre a rischio eliminazione.</li>
      <li><b>Avanti un altro!:</b> eliminazione diretta senza appello.</li>
      <li><b>La Bona Sorte:</b> domanda della Fata che vale 300.000 € e la conquista immediata della Sedia!</li>
      <li><b>Personaggi del Salottino:</b> domande bizzarre che regalano un <b>Jolly</b> (per rifiutare un rotolo) o il <b>Bonus</b> (raddoppia il valore del rotolo).</li>
    </ul>
    <p>Chi supera il montepremi del campione si siede sulla <b>Sedia del Campione</b>, spodestando il predecessore. All'ultimo della fila suona la <b>Sirena</b>: un solo round a disposizione per scavalcarlo.</p>

    <h4 style="margin:10px 0 6px;color:var(--gold);font-size:0.95rem">⏱️ Il Gioco Finale dei 21 &amp; Il Raggio</h4>
    <ul style="margin:4px 0 8px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li><b>I 21 al contrario:</b> 21 domande in 150 secondi dando <b>SEMPRE la risposta SBAGLIATA</b>! Se premi quella corretta, suona l'errore e riparti dalla domanda 1. Completando la lista vinci il tuo montepremi + 100.000 € extra!</li>
      <li><b>Fase Jackpot &amp; Mano nel Raggio:</b> scaduti i 150 secondi perdi il bottino base e giochi per un jackpot di 100.000 € che scende di 1.000 € al secondo. Tenendo premuto <b>Mano nel Raggio</b> (o barra Spazio) congeli il montepremi (scatta automatico a 50.000 €). Segue l'ultimo giro con 10 secondi a risposta: un errore e perdi tutto.</li>
    </ul>

    <h4 style="margin:10px 0 6px;color:var(--gold);font-size:0.95rem">🎮 Comandi e Suggerimenti</h4>
    <ul style="margin:4px 0 4px;padding-left:18px;display:flex;flex-direction:column;gap:3px">
      <li>Usa i tasti <b>A</b> e <b>B</b> della tastiera o clicca a schermo per selezionare le risposte con 2 opzioni.</li>
      <li>Nel finale inverso, concentrati sulla risposta sbagliata ed evita il riflesso condizionato di dare quella vera!</li>
      <li>Tieni premuto <b>Spazio</b> o il pulsante 'Mano nel raggio' per congelare il jackpot prima che cali a 50.000 €.</li>
    </ul>
  `,
  rules: [
    'I concorrenti fanno la fila e salgono uno alla volta; con meno di 5 giocatori la fila si ripete in più puntate (in tutto circa 5 turni), e chi è uscito rientra in fila. Ogni round: 4 domande della stessa categoria, 2 risposte ciascuna. Servono 3 giuste; con 2 errori sei fuori.',
    'Superato il round peschi un rotolo dal pidigozzaro: soldi (da 1.000 a 200.000 €) che si sommano, oppure La pariglia (duello al pulsante col campione), Lo iettatore (punteggio azzerato e domanda funebre), Avanti un altro! (fuori subito), La bona sorte (domanda della fata: 300.000 € e la sedia).',
    'Il punteggio si accumula round dopo round finché superi il campione: allora prendi la sua sedia e lui esce. In parità resta il campione. Personaggi in costume portano domande speciali (errore = fuori, risposta giusta = puoi rifiutare il primo rotolo); con il Bonus i soldi del rotolo raddoppiano.',
    'Quando sale l’ultimo della fila (con un campione già seduto) suona la sirena: ha un solo round per superarlo.',
    'Gioco finale per il campione: 21 domande in 150 secondi in cui scegli la risposta SBAGLIATA; se scegli quella giusta riparti da capo. Vinci punteggio + 100.000 €.',
    'Se il tempo scade perdi il punteggio e giochi il jackpot: 100.000 € che scendono di 1.000 € al secondo (continui la lista, ripartenze ammesse). Tieni premuto “mano nel raggio” per congelarlo (a 50.000 € scatta da solo): poi un ultimo giro unico, 10 secondi a risposta, un errore e perdi tutto.'
  ],
  async start(ctx) {
    const S = ctx.stage = newStage({c1: this.c1, c2: this.c2, bg: '#0b0604', cam: [0, 4.6, 15], look: [0, 2, 0]});
    const T = (o, to, d, e) => ctx.w(tween(o, to, d, e));
    const cam = k => S.go(...CAM[k]);
    const A1 = '#' + S.c1.getHexString(), A2 = '#' + S.c2.getHexString();
    const gold = mat(PAL.gold, {metalness: .9, roughness: .3}), metal = mat('#8d929c', {metalness: .9, roughness: .35}), dark = mat('#14110f', {metalness: .5, roughness: .4});
    const wp = new THREE.Vector3();
    let champ = null, cur = null, roundNo = 0, salotti = 0, sirenOn = false, bonusFlip = false;

    // ---------- set: marquee arch + title ----------
    const arch = new THREE.Mesh(new THREE.TorusGeometry(4.3, .14, 10, 64, Math.PI), mat('#5a2414', {metalness: .5, roughness: .35}));
    arch.position.set(0, 0, -3.6); S.add(arch);
    const bOn = glow('#ffd89a'), bOff = mat('#3a2a18', {metalness: .4}), bulbG = new THREE.SphereGeometry(.07, 10, 8), bulbs = [];
    for (let i = 0; i <= 34; i++) { const a = i / 34 * Math.PI, m = new THREE.Mesh(bulbG, bOff); m.position.set(Math.cos(a) * 4.3, Math.sin(a) * 4.3, -3.42); S.add(m); bulbs.push(m); }
    let chase = -1;
    S.on((dt, t) => { const k = Math.floor(t * (sirenOn ? 14 : 7)); if (k === chase) return; chase = k; bulbs.forEach((b, i) => { b.material = (sirenOn ? (i + k) % 2 : (i + k) % 3) === 0 ? bOn : bOff; }); });
    const sign = label3d([{t: 'AVANTI UN ALTRO!', fs: .8}], {w: 6.4, h: 1.1, px: 140, bg: null, border: null, color: PAL.goldHi});
    sign.position.set(0, 5.1, -3.5); S.add(sign);

    // ---------- queue riser + chairs ----------
    const queue = shuffle(ctx.players), NQ = queue.length, rw = NQ * 1.3 + .8, rcx = (qx(0) + qx(NQ - 1)) / 2;
    const riser = new THREE.Mesh(new THREE.BoxGeometry(rw, .26, 1.7), mat(A1, {roughness: .5, metalness: .2})); riser.position.set(rcx, .13, QZ); S.add(riser);
    const rStrip = new THREE.Mesh(new THREE.BoxGeometry(rw, .03, .02), glow(A2)); rStrip.position.set(rcx, .2, QZ + .86); S.add(rStrip);
    queue.forEach((p, i) => {
      const female = Math.random() < .5;
      const o = person({suit: SUITS[i % SUITS.length], skin: pick(SKINS), hair: pick(HAIRS), female, hairStyle: pick(female ? ['long', 'bob', 'bun'] : ['short', 'slick', 'curly', 'bald'])});
      const ch = chair('#6b2a1c'); ch.position.set(qx(i), .26, QZ); ch.rotation.y = .25; S.add(ch);
      o.position.set(qx(i), .26, QZ); o.rotation.y = .25; o.sit(true); S.add(o);
      const tag = label3d([{t: p.name, fs: .62}], {w: 1.15, h: .3, px: 200}); tag.position.set(qx(i), 1.8, QZ + .1); S.add(tag);
      Object.assign(p.data, {obj: o, tag, played: false});
    });

    // ---------- pidigozzaro: rotating scroll table ----------
    const table = new THREE.Group(); table.position.set(3.5, 0, 1.4); S.add(table);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(.42, .62, .86, 32), mat('#3a1810', {roughness: .3, metalness: .4})); ped.position.y = .43; table.add(ped);
    const ttop = new THREE.Group(); ttop.position.y = .9; table.add(ttop);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.3, .1, 48), mat('#7a2416', {roughness: .25, metalness: .3})); ttop.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.35, .035, 8, 64), gold); rim.rotation.x = Math.PI / 2; ttop.add(rim);
    const finial = new THREE.Mesh(new THREE.ConeGeometry(.22, .6, 24), gold); finial.position.y = .35; ttop.add(finial);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.08, 16, 10), gold); ball.position.y = .7; ttop.add(ball);
    const paperM = mat('#efe3c4', {roughness: .8, metalness: 0}), ribM = mat('#a8322a', {roughness: .5}), paperG = new THREE.CylinderGeometry(.06, .06, .44, 14), ribG = new THREE.TorusGeometry(.064, .014, 6, 18), holdG = new THREE.TorusGeometry(.075, .015, 6, 18);
    const scrolls = [];
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, g = new THREE.Group(); g.position.set(Math.sin(a) * 1.08, .05, Math.cos(a) * 1.08);
      const pp = new THREE.Mesh(paperG, paperM); pp.position.y = .22;
      const rb = new THREE.Mesh(ribG, ribM); rb.rotation.x = Math.PI / 2; rb.position.y = .22;
      const hd = new THREE.Mesh(holdG, gold); hd.rotation.x = Math.PI / 2; hd.position.y = .02;
      g.add(pp, rb, hd); g.rotation.z = (Math.random() - .5) * .12; ttop.add(g); scrolls.push(g);
    }
    const spin = {v: .55};
    S.on(dt => { ttop.rotation.y += spin.v * dt; });

    // big scroll (unrolling reveal)
    const big = new THREE.Group(); big.position.set(3.0, 2.95, 3.7); big.rotation.y = -.15; big.visible = false; S.add(big);
    const rodG = new THREE.CylinderGeometry(.06, .06, 1.95, 16); rodG.rotateZ(Math.PI / 2);
    const rodM = mat('#8a5a2b', {roughness: .5}), capG = new THREE.SphereGeometry(.085, 12, 8);
    const rod = () => { const r = new THREE.Mesh(rodG, rodM); [-1, 1].forEach(s => { const c = new THREE.Mesh(capG, gold); c.position.x = s * 1.0; r.add(c); }); return r; };
    const rodTop = rod(), rodBot = rod(), sheet = new THREE.Group();
    const paper = label3d('', {w: 1.75, h: 1.2, px: 220, bg: '#efe3c4', border: '#b08a3e', color: '#2a1a08', radius: .02}); paper.position.y = -.61; sheet.add(paper);
    big.add(rodTop, sheet, rodBot);

    // ---------- champion platform ----------
    const plat = new THREE.Group(); plat.position.set(SEAT[0], 0, SEAT[2]); S.add(plat);
    const pb = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, .45, 40), mat('#2a1410', {roughness: .35, metalness: .4})); pb.position.y = .225;
    const pt = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.05, .4, 40), mat(A1, {roughness: .4, metalness: .3})); pt.position.y = .65;
    const pr1 = new THREE.Mesh(new THREE.TorusGeometry(1.3, .025, 6, 64), gold); pr1.rotation.x = Math.PI / 2; pr1.position.y = .45;
    const pr2 = new THREE.Mesh(new THREE.TorusGeometry(1.02, .025, 6, 64), gold); pr2.rotation.x = Math.PI / 2; pr2.position.y = .85;
    const step = new THREE.Mesh(new THREE.BoxGeometry(.9, .22, .45), mat('#2a1410')); step.position.set(0, .11, 1.45);
    plat.add(pb, pt, pr1, pr2, step);
    const cc = chair(PAL.gold); cc.position.set(0, .85, 0); cc.rotation.y = -.5; plat.add(cc);
    const champLbl = label3d([{t: 'SEDIA DEL CAMPIONE', fs: .3}, {t: 'libera', fs: .32, color: PAL.mut, font: 'Outfit'}], {w: 2.4, h: .95, px: 180, accent: A1});
    champLbl.position.set(SEAT[0], 3.3, SEAT[2]); champLbl.rotation.y = -.3; S.add(champLbl);
    const setLbl = () => champLbl.set(champ ? [{t: 'CAMPIONE', fs: .3, color: PAL.goldHi}, {t: champ.name, fs: .3}, {t: eur(champ.score), fs: .26, font: 'Outfit'}] : [{t: 'SEDIA DEL CAMPIONE', fs: .3}, {t: 'libera', fs: .32, color: PAL.mut, font: 'Outfit'}]);
    // sparkles
    const NSP = quality.low ? 24 : 60, spP = new Float32Array(NSP * 3);
    for (let i = 0; i < NSP; i++) { const a = Math.random() * 7, r = .5 + Math.random() * .8; spP[i * 3] = Math.sin(a) * r; spP[i * 3 + 1] = Math.random() * 3; spP[i * 3 + 2] = Math.cos(a) * r; }
    const spG = new THREE.BufferGeometry(); spG.setAttribute('position', new THREE.BufferAttribute(spP, 3));
    const spM = new THREE.PointsMaterial({color: PAL.goldHi, size: .07, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false});
    const spk = new THREE.Points(spG, spM); spk.position.set(SEAT[0], .85, SEAT[2]); S.add(spk);
    S.on(dt => {
      spM.opacity += ((champ ? .75 : 0) - spM.opacity) * Math.min(1, dt * 3);
      for (let i = 0; i < NSP; i++) { spP[i * 3 + 1] += dt * (.35 + (i % 5) * .08); if (spP[i * 3 + 1] > 3) spP[i * 3 + 1] = 0; }
      spG.attributes.position.needsUpdate = true;
    });

    // ---------- siren beacon ----------
    const sir = new THREE.Group(); sir.position.set(7.9, 0, -3.2); S.add(sir);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, 4.6, 12), metal); pole.position.y = 2.3;
    const hous = new THREE.Mesh(new THREE.CylinderGeometry(.24, .26, .14, 20), dark); hous.position.y = 4.67;
    const domeM = mat('#7a1e18', {transparent: true, opacity: .9, roughness: .2});
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.22, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), domeM); dome.position.y = 4.74;
    sir.add(pole, hous, dome);
    const sirL = new THREE.SpotLight('#ff4a2a', 0, 22, .45, .5, 1.3), sirT = new THREE.Object3D(); sirL.position.set(7.9, 4.8, -3.2); sirL.target = sirT; S.add(sirL, sirT);
    S.on((dt, t) => { if (sirenOn) sirT.position.set(7.9 + Math.cos(t * 5) * 6, 1.2, -3.2 + Math.sin(t * 5) * 6); });
    const setSiren = on => { sirenOn = on; sirL.intensity = on ? 150 : 0; domeM.emissive.set(on ? '#ff3a20' : '#000000'); domeM.emissiveIntensity = on ? .9 : 0; };

    // ---------- freeze ray ----------
    const ray = new THREE.Group(); ray.position.set(1.3, 0, 3.55); ray.scale.setScalar(.001); ray.visible = false; S.add(ray);
    const rBase = new THREE.Mesh(new THREE.CylinderGeometry(.3, .34, .05, 28), dark); rBase.position.y = .025;
    const rPost = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 2.6, 10), metal); rPost.position.set(.42, 1.3, 0);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(.45, .05, .05), metal); rArm.position.set(.21, 2.57, 0);
    const rEm = new THREE.Mesh(new THREE.CylinderGeometry(.17, .14, .14, 20), dark); rEm.position.y = 2.5;
    const rRing = new THREE.Mesh(new THREE.TorusGeometry(.14, .02, 6, 24), mat('#9fd4ea', {emissive: '#3a6a80', emissiveIntensity: .6})); rRing.rotation.x = Math.PI / 2; rRing.position.y = 2.42;
    const beamM = new THREE.MeshBasicMaterial({color: new THREE.Color('#7fc8e8').multiplyScalar(.6), transparent: true, opacity: .15, blending: THREE.AdditiveBlending, depthWrite: false});
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 2.35, 20, 1, true), beamM); beam.position.y = 1.25; beam.userData.noShadow = true;
    ray.add(rBase, rPost, rArm, rEm, rRing, beam);

    // ---------- costumed performers ----------
    const PERF = {};
    const addTo = (par, g, m, x, y, z) => { const k = new THREE.Mesh(g, m); k.position.set(x, y, z); par.add(k); return k; };
    {
      const f = person({female: true, suit: '#9fc9e6', shirt: '#f4efe3', skin: '#f0d2b8', hair: '#e8d08a', hairStyle: 'long', eyes: '#3a5a7a'});
      const wingM = mat('#e8f4ff', {transparent: true, opacity: .45, side: THREE.DoubleSide, roughness: .2, metalness: .1});
      const wg = new THREE.CircleGeometry(.3, 24); wg.scale(1, 1.6, 1); wg.translate(.3, .12, 0);
      const wl = new THREE.Mesh(wg, wingM), wr = new THREE.Mesh(wg, wingM); wr.scale.x = -1;
      [wl, wr].forEach(w => { w.position.set(0, .45, -.13); f.joints.spine.add(w); });
      anim.on((dt, t) => { const k = Math.sin(t * 6) * .35; wl.rotation.y = -.5 - k; wr.rotation.y = .5 + k; });
      const wand = addTo(f.joints.RA.el, new THREE.CylinderGeometry(.012, .012, .4, 8), gold, 0, -.45, 0);
      addTo(wand, new THREE.OctahedronGeometry(.05), glow(PAL.goldHi), 0, -.22, 0);
      const tiara = addTo(f.joints.head, new THREE.TorusGeometry(.1, .012, 6, 20), gold, 0, .23, 0); tiara.rotation.x = Math.PI / 2 - .3;
      f.userData.title = 'la Fata della bona sorte'; PERF.fairy = f;
    }
    {
      const u = person({suit: '#121214', shirt: '#d9d6cf', tie: '#121214', skin: '#d8cfc4', hair: '#1a1a1a', hairStyle: 'slick'});
      const hatM = mat('#0d0d10', {roughness: .6});
      addTo(u.joints.head, new THREE.CylinderGeometry(.17, .17, .015, 24), hatM, 0, .25, -.01);
      addTo(u.joints.head, new THREE.CylinderGeometry(.11, .11, .22, 24), hatM, 0, .36, -.01);
      u.userData.title = 'lo Iettatore'; PERF.undertaker = u;
    }
    const bonusModel = female => {
      const b = person({female, suit: '#c9a24e', shirt: '#1a1405', tie: '#7a2433', hairStyle: female ? 'bob' : 'slick', hair: female ? '#1c1416' : '#2a1d14'});
      const sash = label3d([{t: 'BONUS', fs: .8}], {w: .34, h: .12, px: 300, color: '#1a1405', bg: PAL.goldHi, border: null, radius: .2}); sash.position.set(0, .42, .135); b.joints.spine.add(sash);
      b.userData.title = female ? 'Miss Bonus' : 'Mister Bonus'; return b;
    };
    PERF.mrBonus = bonusModel(false); PERF.msBonus = bonusModel(true);
    {
      const c = person({female: true, suit: '#5a2a6a', shirt: '#f4e6e0', skin: '#efcaa9', hair: '#d8d0c8', hairStyle: 'bun'});
      const ti = addTo(c.joints.head, new THREE.TorusGeometry(.1, .014, 6, 20), gold, 0, .23, 0); ti.rotation.x = Math.PI / 2 - .3;
      c.userData.title = 'la Contessa'; PERF.contessa = c;
      const g = person({suit: '#7a2a22', shirt: '#c9a24e', skin: '#c99272', hairStyle: 'bald'});
      const bronze = mat('#a07a3a', {metalness: .8, roughness: .35});
      addTo(g.joints.head, new THREE.SphereGeometry(.135, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), bronze, 0, .14, 0);
      addTo(g.joints.head, new THREE.BoxGeometry(.03, .12, .26), mat('#a8322a'), 0, .3, 0);
      g.userData.title = 'il Gladiatore'; PERF.gladiatore = g;
    }
    Object.values(PERF).forEach(f => { f.visible = false; f.position.set(10.5, 0, 4.2); S.add(f); });

    // ---------- motion helpers ----------
    const face = (o, x, z) => T(o.rotation, {y: o.rotation.y + angDiff(Math.atan2(x - o.position.x, z - o.position.z), o.rotation.y)}, .45, 'out');
    const turnY = (o, y) => T(o.rotation, {y: o.rotation.y + angDiff(y, o.rotation.y)}, .45, 'out');
    async function walk(o, pts, speed = 1.8) {
      for (const [x, z] of pts) {
        const dx = x - o.position.x, dz = z - o.position.z, d = Math.hypot(dx, dz); if (d < .02) continue;
        tween(o.rotation, {y: o.rotation.y + angDiff(Math.atan2(dx, dz), o.rotation.y)}, .35, 'out');
        const y0 = o.position.y, stop = anim.on((dt, t) => { o.position.y = y0 + Math.abs(Math.sin(t * 8.5)) * .045; o.rotation.z = Math.sin(t * 8.5) * .035; });
        await T(o.position, {x, z}, Math.max(.45, d / speed), 'inout');
        stop(); o.position.y = y0; o.rotation.z = 0;
      }
    }
    const enter = async (f, spot, speed = 2.6) => { f.visible = true; f.position.set(10.5, 0, 4.2); f.rotation.y = -Math.PI / 2; sfx.whoosh(); await walk(f, [spot], speed); await face(f, C[0], C[1]); f.wave(); };
    const leave = async f => { await walk(f, [[10.5, 4.6]], 2.6); f.visible = false; };
    const stepDown = async o => { o.sit(false); await ctx.sleep(300); await T(o.position, {y: 0, z: SEAT[2] + 1.45}, .5, 'out'); };
    const seatChamp = async o => { await T(o.position, {x: SEAT[0], y: SEAT[1], z: SEAT[2]}, .55, 'back'); await turnY(o, -.5); o.sit(true); };

    // ---------- host + UI helpers ----------
    const host = createHost(ctx, {...HOSTS.avanti, position: [-1.0, 0, 3.3], lookAt: [C[0], 1.5, C[1]], lines: L});
    const talk = (k, p, v, o = {}) => {
      const s = pick(L[k]).replace(/\{name\}/g, p?.name ?? '').replace(/\{value\}/g, v ?? '');
      return host.say(s, {mood: MOOD[k] || 'neutral', gesture: GEST[k], ...(p ? {to: p} : {}), ...o});
    };
    const waiting = () => queue.filter(p => p.alive && !p.data.played).length;
    const hud = () => ctx.hud(`<span class="pill">Campione <b>${champ ? esc(champ.name) + ' · ' + eur(champ.score) : '—'}</b></span><span class="pill">In fila <b>${waiting()}</b></span>${sirenOn ? '<span class="pill">🚨 <b>Ultimo round</b></span>' : ''}${cur && cur !== champ ? `<span class="pill">${esc(cur.name)} <b>${eur(cur.score)}</b></span>` : ''}`);
    const msg = (t, sub = '', ...nodes) => {
      const c = h('div', 'card msg', `<div class="big disp" style="color:var(--gold-hi);font-size:clamp(1.6rem,4vw,2.5rem)">${t}</div><div>${sub}</div>`);
      if (nodes.length) { const r = h('div', 'row'); r.style.marginTop = '12px'; r.append(...nodes); c.append(r); }
      ctx.dock(c); return c;
    };
    const choose = (t, sub, opts) => ctx.w(new Promise(res => {
      const bs = opts.map(([l, cls], i) => { const b = h('button', 'btn ' + (cls || ''), l); b.onclick = () => { sfx.click(); res(i); }; return b; });
      msg(t, sub, ...bs); bs[0].focus();
    }));
    const bp = p => p.bot ? {...p, skill: .5 + (p.skill ?? .6) * .45} : p;
    const askQ = (p, q, o = {}) => { host.ask(q.q); return ctx.ask({...q, time: 10, player: bp(p), onReveal: ok => S.flashWith(ok ? PAL.ok : PAL.bad), ...o}); };
    const usedQ = new Set();
    const drawFrom = pool => { let l = pool.filter(it => !usedQ.has(it)); if (!l.length) l = pool; const it = pick(l); usedQ.add(it); return it; };
    const anyQ = () => drawFrom(ctx.pool(Object.values(CATS).flat()));
    function drawCat() {
      let cats = Object.keys(CATS).filter(c => CATS[c].filter(it => !usedQ.has(it)).length >= 4);
      if (!cats.length) { usedQ.clear(); cats = Object.keys(CATS); }
      const c = pick(cats); return {c, items: shuffle(CATS[c].filter(it => !usedQ.has(it))).sort((a, b) => Math.abs(a.d - ctx.qDiff) - Math.abs(b.d - ctx.qDiff))}; // livello più vicino a qDiff per primo
    }

    // ---------- eliminations / champion ----------
    async function eliminate(p, why) {
      p.alive = false; ctx.scoreboard(); hud();
      const o = p.data.obj; o.setMood('sad'); S.flashWith(PAL.bad); sfx.bad();
      msg(`${esc(p.name)} è fuori!`, why);
      await talk('out', p);
      await walk(o, [[0.4, 5.0], [-10, 5.6]], 2.2); o.visible = false;
    }
    async function dethrone(old) {
      old.alive = false; ctx.scoreboard();
      const o = old.data.obj; o.setMood('sad');
      msg(`${esc(old.name)} perde la sedia`, 'Il campione spodestato è eliminato.');
      if (o.position.y > .1) await stepDown(o);
      talk('dethroned', old);
      await walk(o, [[11, 0.6]], 2.2); o.visible = false;
    }
    async function crown(p) {
      const old = champ; champ = p; setLbl(); hud();
      if (old) { cam('champ'); await dethrone(old); }
      const o = p.data.obj; o.setMood('happy');
      sfx.win(); S.burst(PAL.goldHi, 140, 5); S.flashWith(A2);
      msg(`${esc(p.name)} è il nuovo campione!`, `Punteggio da battere: <b>${eur(p.score)}</b>`);
      talk('champ', p, eur(p.score));
      cam('champ');
      await walk(o, [[1.5, -.3], [SEAT[0], SEAT[2] + 1.45]]);
      await seatChamp(o); o.celebrate();
      await ctx.sleep(900); cam('wide');
    }

    // ---------- scrolls ----------
    const content = () => {
      const r = Math.random();
      if (r < .08) return {type: 'avanti'};
      if (r < .15) return {type: 'iettatore'};
      if (r < .22) return champ ? {type: 'pariglia'} : {type: 'cash', v: pick(CASH)};
      if (r < .28) return {type: 'bona'};
      return {type: 'cash', v: pick(CASH)};
    };
    const TXT = {avanti: ['AVANTI UN ALTRO!', 'Fuori dal gioco'], iettatore: ['LO IETTATORE', 'Punteggio azzerato'], pariglia: ['LA PARIGLIA', 'Duello con il campione'], bona: ['LA BONA SORTE', 'Arriva la fata']};
    async function drawScroll(p, bonus) {
      cam('scroll');
      if (p.bot) { msg('Il pidigozzaro gira…', `${esc(p.name)} sceglie un rotolo`); await ctx.botThink(900, 1800); }
      else await choose('Il pidigozzaro gira…', `${esc(p.name)}, prendi un rotolo!`, [['Prendi un rotolo', 'pri']]);
      await T(spin, {v: 0}, .7, 'out');
      const tgt = new THREE.Vector3(C[0], 1, C[1]); let best = scrolls[0], bd = 1e9;
      for (const s of scrolls) { const d = s.getWorldPosition(wp).distanceTo(tgt); if (d < bd) { bd = d; best = s; } }
      sfx.open(); await T(best.position, {y: .75}, .45, 'back');
      best.visible = false; best.position.y = .05;
      const c = content();
      const [t1, t2] = c.type === 'cash' ? [eur(c.v), bonus ? 'Soldi · raddoppiati dal Bonus!' : 'Rotolo di soldi'] : TXT[c.type];
      const dark2 = '#2a1a08';
      paper.set([{t: t1, fs: .36, color: c.type === 'cash' ? dark2 : '#7a1e18'}, {t: t2, fs: .14, font: 'Outfit', color: '#5a4630'}]);
      big.visible = true; big.scale.setScalar(.2); sheet.scale.y = .01; rodBot.position.y = 0;
      await T(big.scale, {x: 1, y: 1, z: 1}, .45, 'back');
      sfx.whoosh(); tween(rodBot.position, {y: -1.22}, .9, 'out'); await T(sheet.scale, {y: 1}, .9, 'out');
      S.flashWith(c.type === 'cash' ? PAL.goldHi : c.type === 'avanti' || c.type === 'iettatore' ? PAL.bad : A2);
      (c.type === 'cash' ? sfx.ok : sfx.drum)();
      msg(esc(t1), esc(t2));
      best.visible = true; tween(spin, {v: .55}, 1.2, 'inout');
      await ctx.sleep(1200);
      return c;
    }
    const hideScroll = async () => { if (!big.visible) return; await T(big.scale, {x: .01, y: .01, z: .01}, .35, 'in'); big.visible = false; };

    async function buzz(a, c, q) {
      return ctx.w(new Promise(res => {
        const card = h('div', 'card');
        card.innerHTML = `<div class="meta"><span>La pariglia · pulsante</span><span>10 secondi</span></div><h2>${q.q}</h2><div class="timer"><i></i></div><div class="opts">${q.opts.map((o, i) => `<button class="opt" disabled><b>${'AB'[i]}</b><span>${o}</span></button>`).join('')}</div>`;
        const row = h('div', 'row'); row.style.marginTop = '12px';
        const timers = []; let done = false;
        const fin = who => { if (done) return; done = true; cd.stop(); timers.forEach(clearTimeout); if (who) { sfx.drum(); S.flashWith(A2); } res(who); };
        for (const pl of [a, c]) if (!pl.bot) { const b = h('button', 'btn pri', `🔔 ${esc(pl.name)}`); b.onclick = () => fin(pl); row.append(b); }
        for (const pl of [a, c]) if (pl.bot && ctx.botChance(.55 + (pl.skill ?? .6) * .4)) timers.push(setTimeout(() => fin(pl), (1500 + Math.random() * 6500) * (1.3 - (pl.skill ?? .6))));
        const cd = countdown(ctx, 10, {bar: card.querySelector('.timer i'), onEnd: () => fin(null)});
        ctx.onExit(() => timers.forEach(clearTimeout));
        card.append(row); ctx.dock(card);
        host.ask(q.q);
      }));
    }
    async function pariglia(p) {
      const ch = champ, co = ch.data.obj;
      ctx.setScore(p, ch.score); hud();
      msg('La pariglia!', `${esc(p.name)} sale a ${eur(ch.score)}, come il campione. Duello al pulsante: chi sbaglia è fuori; se nessuno suona in 10 s vince il campione.`);
      await talk('pariglia', p, eur(ch.score));
      cam('duel');
      await stepDown(co); await walk(co, [[5.4, 3.4], DUEL]);
      face(co, C[0], C[1]); await face(p.data.obj, DUEL[0], DUEL[1]);
      const q = mk(anyQ()), who = await buzz(p, ch, q);
      let loser;
      if (!who) { loser = p; msg('Nessuno ha suonato', 'Dieci secondi senza pulsante: vince il campione.'); sfx.bad(); await ctx.sleep(1500); }
      else { const r = await askQ(who, q, {cat: 'La pariglia', n: `Risponde ${esc(who.name)}`, time: 8}); loser = r.ok ? (who === p ? ch : p) : who; }
      if (loser === ch) { await talk('parWin', p); await crown(p); return 'champ'; }
      await talk('parLose', p);
      await eliminate(p, 'Ha perso la pariglia.');
      cam('champ'); await walk(co, [[5.4, 3.4], [SEAT[0], SEAT[2] + 1.45]]); await seatChamp(co);
      return 'out';
    }

    async function scrollPhase(p, bonus, jolly) {
      let c = await drawScroll(p, bonus);
      if (jolly && c.type !== 'avanti' && c.type !== 'iettatore') {
        let reject;
        if (p.bot) { await ctx.botThink(700, 1400); reject = c.type === 'pariglia' || (c.type === 'cash' && c.v < 30000); msg(reject ? 'Rifiuta il rotolo!' : 'Tiene il rotolo', `${esc(p.name)} usa il jolly del salottino`); await ctx.sleep(1000); }
        else reject = await choose('Il jolly del salottino', 'Tieni questo rotolo o lo rifiuti e ne peschi un altro? Il secondo è definitivo.', [['Lo tengo', 'pri'], ['Rifiuto e riscelgo', '']]) === 1;
        if (reject) { sfx.whoosh(); await hideScroll(); c = await drawScroll(p, bonus); }
      }
      await hideScroll(); cam('cont');
      if (c.type === 'cash') {
        const v = c.v * (bonus ? 2 : 1);
        ctx.setScore(p, p.score + v); hud();
        if (bonus) talk('double', p, eur(v)); else talk('cash', p, eur(v));
        p.data.obj.clap();
        if (!champ || p.score > champ.score) { await ctx.sleep(900); await crown(p); return 'champ'; }
        msg(`${esc(p.name)}: ${eur(p.score)}`, p.score === champ.score ? 'Parità: in parità resta il campione. Si continua!' : `Al campione mancano ancora ${eur(champ.score - p.score)}.`);
        await (p.score === champ.score ? talk('tie', p) : talk('short', p, eur(champ.score - p.score)));
        return 'cont';
      }
      if (c.type === 'avanti') { await talk('avanti', p); await eliminate(p, 'Ha pescato “Avanti un altro!”.'); return 'out'; }
      if (c.type === 'iettatore') {
        ctx.setScore(p, 0); hud(); S.flashWith('#3a3550');
        msg('Lo iettatore', `${esc(p.name)} torna a 0 €. Domanda funebre: se sbagli sei fuori.`);
        cam('perf'); const u = PERF.undertaker; await enter(u, PSPOT, 1.4);
        await talk('iett', p);
        const r = await askQ(p, mk(drawFrom(FUNERAL)), {cat: 'Lo iettatore', n: 'Domanda funebre · errore = fuori'});
        leave(u); cam('cont');
        if (!r.ok) { await eliminate(p, 'Errore sulla domanda dello iettatore.'); return 'out'; }
        await talk('iettOk', p); return 'cont';
      }
      if (c.type === 'pariglia') return pariglia(p);
      // bona sorte
      msg('La bona sorte', 'Risposta giusta: 300.000 € e la sedia del campione. Sbagliata: non cambia nulla.');
      cam('perf'); const f = PERF.fairy; await enter(f, PSPOT);
      await talk('fairy', p);
      const r = await askQ(p, mk(drawFrom(FAIRY)), {cat: 'La bona sorte', n: 'Giusta = 300.000 € e sedia'});
      leave(f); cam('cont');
      if (r.ok) { ctx.setScore(p, 300000); S.burst('#cfe8f5', 120, 5); await crown(p); return 'champ'; }
      await talk('fairyNo', p); return 'cont';
    }

    // ---------- one round ----------
    const bonusAt = new Set(shuffle([2, 3, 4, 5, 6]).slice(0, 1 + (Math.random() < .5 ? 1 : 0)));
    async function round(p) {
      cam('cont');
      let jolly = false, bm = null;
      if (salotti < 3 && roundNo > 1 && Math.random() < .25) {
        salotti++; const pf = pick([PERF.contessa, PERF.gladiatore]);
        cam('perf');
        msg('Il salottino', `Domanda speciale da ${pf.userData.title}: se sbagli sei fuori, se rispondi bene potrai rifiutare il primo rotolo.`);
        await enter(pf, PSPOT);
        await talk('salotto', p, pf.userData.title);
        const r = await askQ(p, mk(anyQ()), {cat: `Il salottino · ${pf.userData.title}`, n: 'Domanda speciale · errore = fuori'});
        const gone = leave(pf); if (bonusAt.has(roundNo)) await gone; cam('cont');
        if (!r.ok) { await eliminate(p, 'Errore sulla domanda speciale.'); return 'out'; }
        jolly = true; talk('jolly', p);
      }
      const bonus = bonusAt.has(roundNo);
      if (bonus) {
        bm = (bonusFlip = !bonusFlip) ? PERF.msBonus : PERF.mrBonus;
        msg(`Arriva ${bm.userData.title}!`, 'Se vinci questo round e peschi un rotolo di soldi, l’importo raddoppia.');
        await enter(bm, BSPOT);
        await talk('bonus', p);
      }
      const {c, items} = drawCat();
      msg(c, `${esc(p.name)}: 4 domande, servono 3 risposte giuste. 2 errori e sei fuori.`);
      await talk('cat', p, c);
      let ok = 0, ko = 0, k = 0;
      while (ok < 3 && ko < 2) {
        const it = items[k++]; usedQ.add(it);
        const r = await askQ(p, mk(it), {cat: c, n: `Domanda ${k}/4 · ✓ ${ok} · ✗ ${ko}`});
        r.ok ? ok++ : ko++;
        if (ok < 3 && ko < 2) talk(r.ok ? 'right' : 'wrong', p);
      }
      let res;
      if (ok < 3) res = (await eliminate(p, 'Due risposte sbagliate.'), 'out');
      else { p.data.obj.celebrate(); await talk('won', p); res = await scrollPhase(p, bonus, jolly); }
      if (bm) leave(bm);
      return res;
    }

    async function sirenGo(p) {
      setSiren(true); hud(); S.shakeIt(.4);
      for (let i = 0; i < 6; i++) { tone(560, .42, 'sawtooth', .045, i * .45, 360); }
      const iv = setInterval(() => S.flashWith(PAL.bad), 450); ctx.onExit(() => clearInterval(iv));
      setTimeout(() => clearInterval(iv), 2800);
      msg('SIRENA!', `Ultimo round per ${esc(p.name)}: deve completarlo e superare il campione (${eur(champ.score)}), altrimenti vince il campione.`);
      await Promise.all([talk('siren', p), ctx.sleep(2000)]);
    }

    async function stint(p, isLast) {
      cur = p; p.data.played = true; hud();
      await ctx.passDevice(p); ctx.setActive(p);
      const o = p.data.obj;
      cam('queue');
      talk('next', p);
      o.sit(false); await ctx.sleep(350); p.data.tag.visible = false;
      await T(o.position, {y: 0, z: QZ + 1.05}, .45, 'out');
      cam('wide');
      await walk(o, [C]); await face(o, 0.3, 10);
      let siren = false;
      for (;;) {
        if (isLast && champ && !siren) { siren = true; await sirenGo(p); }
        roundNo++;
        const res = await round(p);
        if (res !== 'cont') break;
        if (siren) { await talk('sirenNo', p); await eliminate(p, 'La sirena ha suonato: il campione resta in sella.'); break; }
      }
      cur = null; hud();
    }

    // ---------- final game ----------
    async function finalGame(p) {
      const o = p.data.obj; cur = p; ctx.setActive(p); setSiren(false); hud();
      const base = p.score;
      cam('fin');
      await stepDown(o); await walk(o, [[5.4, 3.4], FIN]); await turnY(o, 0);
      ray.visible = true; sfx.open(); await T(ray.scale, {x: 1, y: 1, z: 1}, .7, 'back');
      await ctx.passDevice(p);
      const how = `21 domande in 150 secondi: scegli sempre la risposta <b>SBAGLIATA</b>. Se scegli quella giusta riparti dalla prima. Vinci ${eur(base)} + 100.000 € = <b>${eur(base + 100000)}</b>.`;
      if (p.bot) { msg('Gioco finale', how); await talk('final', p); await ctx.sleep(800); }
      else { talk('final', p); await choose('Gioco finale', how, [['Via!', 'pri']]); host.stop(); }
      const out = await ctx.w(new Promise(resolve => {
        const list = shuffle(WRONG).slice(0, 21).map(([q, r, w]) => { const f = Math.random() < .5; return {q, opts: f ? [w, r] : [r, w], good: f ? 0 : 1}; });
        let idx = 0, phase = 'clock', jack = 100000, done = false, busy = false, holding = false, holdStart = 0, holdIv = 0, drain = 0, clock = null, qcd = null;
        const seen = new Set(), timers = [];
        const card = h('div', 'card');
        card.innerHTML = `<div class="meta"><span>Gioco finale · scegli la risposta SBAGLIATA</span><span class="who" style="--pc:${p.color}">${esc(p.name)}${p.bot ? ' · CPU' : ''}</span><span class="fn"></span></div><div class="fpips"></div><div class="timer"><i></i></div><div class="big disp fbig"><span class="sec">150</span> s</div><h2 class="fq"></h2><div class="opts"></div>`;
        const $ = s => card.querySelector(s), bar = $('.timer i'), bigEl = $('.fbig'), qEl = $('.fq'), nEl = $('.fn'), box = $('.opts'), pipsEl = $('.fpips');
        bigEl.style.cssText = 'font-size:clamp(1.5rem,4.5vw,2.4rem);margin-bottom:6px;color:var(--gold-hi)';
        pipsEl.style.cssText = 'display:flex;gap:4px;justify-content:center;margin:2px 0 10px;flex-wrap:wrap';
        const pips = list.map(() => { const s = h('span'); s.style.cssText = 'width:10px;height:10px;border-radius:50%;background:rgba(244,239,227,.15);transition:background .2s'; pipsEl.append(s); return s; });
        const btns = [0, 1].map(i => { const b = h('button', 'opt'); b.onclick = () => { if (!p.bot) answer(i); }; box.append(b); return b; });
        const hold = h('button', 'btn pri', '✋ Tieni premuto: mano nel raggio');
        hold.hidden = true; hold.style.cssText += ';width:100%;margin-top:12px;min-height:64px;font-size:1.05rem;touch-action:none;user-select:none;-webkit-user-select:none';
        card.append(hold); ctx.dock(card);
        const render = () => {
          const it = list[idx]; qEl.textContent = it.q; nEl.textContent = `${idx + 1}/21`;
          btns.forEach((b, i) => { b.className = 'opt'; b.disabled = p.bot; b.innerHTML = `<b>${'AB'[i]}</b><span>${it.opts[i]}</span>`; });
          pips.forEach((s, i) => { s.style.background = i < idx ? 'var(--ok)' : i === idx ? 'var(--gold-hi)' : 'rgba(244,239,227,.15)'; });
          if (phase === 'frozen') { qcd?.stop(); qcd = countdown(ctx, 10, {bar, onEnd: () => { sfx.bad(); end('fail'); }}); }
        };
        const cleanup = () => { done = true; clock?.stop(); qcd?.stop(); clearInterval(drain); clearInterval(holdIv); timers.forEach(clearTimeout); removeEventListener('keydown', key); };
        const end = r => { if (done) return; cleanup(); btns.forEach(b => { b.disabled = true; }); hold.hidden = true; resolve({r, phase, jack}); };
        function answer(i) {
          if (done || busy) return;
          const it = list[idx]; seen.add(idx);
          if (i === it.good) {
            tone(880, .08, 'triangle', .06); idx++;
            if (idx >= list.length) return end('win');
            render();
          } else {
            busy = true; btns[i].classList.add('wrong'); btns[it.good].classList.add('right');
            sfx.bad(); S.shakeIt(.35); S.flashWith(PAL.bad);
            if (phase === 'frozen') return end('fail');
            talk('restart', p);
            timers.push(setTimeout(() => { if (done) return; busy = false; idx = 0; render(); }, 700));
          }
        }
        const freeze = auto => {
          if (phase !== 'jackpot' || done) return;
          phase = 'frozen'; clearInterval(drain); endHold(); hold.hidden = true;
          beamM.opacity = .42; sfx.open(); S.flashWith('#9fd4ea');
          bigEl.textContent = `${eur(jack)} · congelato`;
          talk(auto ? 'freezeAuto' : 'freeze', p);
          busy = true; idx = 0; btns.forEach(b => { b.disabled = true; });
          qEl.textContent = 'Ultimo giro: 10 secondi a risposta, un errore e perdi tutto';
          timers.push(setTimeout(() => { if (done) return; busy = false; render(); }, 1800));
        };
        function startHold(e) {
          if (phase !== 'jackpot' || holding || done) return;
          e?.preventDefault?.(); holding = true; holdStart = performance.now();
          try { if (e?.pointerId != null) hold.setPointerCapture(e.pointerId); } catch {}
          o.point(1200); tween(beamM, {opacity: .38}, .3);
          holdIv = setInterval(() => {
            const k = Math.min(1, (performance.now() - holdStart) / 800);
            hold.style.background = `linear-gradient(90deg,#9fd4ea ${k * 100}%,var(--gold) ${k * 100}%)`;
            if (k >= 1) freeze(false);
          }, 30);
        }
        function endHold() {
          if (!holding) return; holding = false; clearInterval(holdIv); hold.style.background = '';
          if (phase === 'jackpot') tween(beamM, {opacity: .15}, .3);
        }
        if (!p.bot) {
          hold.addEventListener('pointerdown', startHold);
          hold.addEventListener('pointerup', endHold); hold.addEventListener('pointercancel', endHold);
          hold.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startHold(); } });
          hold.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') endHold(); });
        }
        hold.addEventListener('contextmenu', e => e.preventDefault());
        const toJackpot = () => {
          if (done) return;
          phase = 'jackpot'; sfx.drop(); S.flashWith(PAL.bad); S.shakeIt(.5);
          talk('jackpot', p);
          hold.hidden = false; hold.disabled = !!p.bot; // CPU: button shown read-only, its hold fills by itself
          drain = setInterval(() => {
            if (done) return;
            if (!holding) jack = Math.max(50000, jack - 100);
            bigEl.textContent = `Jackpot ${eur(jack)}`; bar.style.transform = `scaleX(${(jack - 50000) / 50000})`;
            if (jack <= 50000) freeze(true);
          }, 100);
        };
        function key(e) { if (p.bot || e.target === hold || e.target.tagName === 'INPUT') return; const i = 'ab'.indexOf(e.key.toLowerCase()); if (i >= 0 && e.key.length === 1) answer(i); }
        addEventListener('keydown', key);
        ctx.onExit(cleanup);
        render();
        clock = countdown(ctx, 150, {bar, label: bigEl.querySelector('.sec'), onEnd: toJackpot});
        if (p.bot) {
          const thr = 58000 + Math.random() * 30000, sk = p.skill ?? .6;
          (async () => {
            while (!done) {
              await (phase === 'frozen' ? ctx.botThink(1100, 2600) : ctx.botThink(650, 1550));
              if (done) return;
              if (busy || holding) continue;
              if (phase === 'jackpot' && jack <= thr) { startHold(); continue; }
              const it = list[idx], r = ctx.botAsk({opts: it.opts, right: it.good}, seen.has(idx) ? .93 : .7 + sk * .2);
              btns[r.pick].classList.add('picked'); await ctx.sleep(220);
              if (!done && !busy) answer(r.pick);
            }
          })();
        }
      }));
      // result
      let prize = 0;
      if (out.r === 'win') prize = out.phase === 'clock' ? base + 100000 : out.jack;
      tween(beamM, {opacity: .15}, .4);
      ctx.setScore(p, prize);
      if (prize) { S.burst(PAL.goldHi, 200, 6); o.celebrate(); o.setMood('happy'); msg(`${esc(p.name)} vince ${eur(prize)}!`, out.phase === 'clock' ? 'Ventuno risposte sbagliate nel tempo: punteggio + 100.000 €.' : 'Jackpot conquistato!'); await talk('win', p, eur(prize)); }
      else { o.setMood('sad'); msg(`${esc(p.name)} esce a mani vuote`, out.phase === 'frozen' ? 'Un errore nell’ultimo giro.' : 'Il gioco finale non perdona.'); await talk('lose', p); }
      await ctx.sleep(600);
      const lines = [`Campione con ${eur(base)} nella prima fase.`, prize ? (out.phase === 'clock' ? `Gioco finale superato in tempo: ${eur(base)} + 100.000 €.` : `Tempo scaduto, ma jackpot vinto: ${eur(prize)}.`) : (out.phase === 'clock' ? 'Gioco finale non completato.' : 'Jackpot perso.')];
      ctx.finish({win: !p.bot && prize > 0, title: prize ? `${esc(p.name)} vince ${eur(prize)}!` : `${esc(p.name)} a mani vuote`, lines, score: prize,
        ranking: ctx.players.map(x => ({player: x, score: x === p ? prize : 0}))});
    }

    // ---------- show ----------
    setLbl(); hud(); cam('wide');
    msg('Avanti un altro!', `${NQ} concorrent${NQ === 1 ? 'e' : 'i'} in fila${NQ > 1 && NQ < 5 ? ` · ${Math.ceil(5 / NQ)} puntate` : ''}. Conquista la sedia del campione e gioca il finale.`);
    await talk('intro');
    // poche persone = più puntate: chi è uscito rientra in fila, il campione resta seduto
    const reps = NQ < 2 ? 1 : Math.ceil(5 / NQ);
    for (let m = 0; m < reps; m++) {
      if (m) {
        queue.forEach((p, i) => {
          if (p === champ) return;
          const o = p.data.obj; p.alive = true; p.data.played = false; p.data.tag.visible = true; ctx.setScore(p, 0);
          o.visible = true; o.position.set(qx(i), .26, QZ); o.rotation.y = .25; o.setMood('neutral'); o.sit(true);
        });
        ctx.scoreboard(); hud(); cam('wide');
        msg(`Puntata ${m + 1} di ${reps}`, champ ? `${esc(champ.name)} difende la sedia. Chi è uscito rientra in fila!` : 'Nessun campione: tutti rientrano in fila!');
        await ctx.sleep(1800);
      }
      const line = queue.filter(p => p !== champ);
      if (!line.length) break;
      for (const p of line) await stint(p, p === line[line.length - 1]);
    }
    setSiren(false);
    if (!champ) {
      msg('Nessun campione', 'Nessuno è riuscito a sedersi sulla sedia del campione.');
      await talk('nochamp');
      return ctx.finish({win: false, title: 'Nessun campione stasera', lines: ['Tutti i concorrenti sono stati eliminati prima di conquistare la sedia.'], score: 0,
        ranking: ctx.players.map(x => ({player: x, score: 0}))});
    }
    await finalGame(champ);
  }
};
