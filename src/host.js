/* Conduttori (personaggi di fantasia) — 3D host + subtitles + speechSynthesis.
 *
 *   import {createHost, HOSTS} from '../host.js';
 *   const host = createHost(ctx, 'eredita');            // or createHost(ctx, {...HOSTS.eredita, position:[-3,0,1]})
 *   await host.say('Benvenuti!', {mood:'happy', gesture:'wave', to: player});   // resolves at end or on skip (click bubble / Space)
 *   await host.react('right', player, {value: '5.000 €'});   // random line from def.lines.right, {name} {value} filled
 *   host.ask('Qual è la capitale della Francia?');           // short read-aloud, no bubble, never blocks input
 *   host.turnTo(player | Vector3 | [x,y,z] | Object3D | null=camera);
 *   host.p        // the engine person() (setMood/speak/wave/point/celebrate/shrug/clap/lookAt)
 *   host.stop()   // cut current line
 * mood: happy|sad|neutral|think|surprised · gesture: wave|point|celebrate|shrug|clap
 * reaction keys: right|wrong|win|lose|suspense|intro|outro
 * Players may carry a 3D anchor for turnTo: player.data.pos ([x,y,z] or Vector3) or player.data.obj (Object3D).
 * Mute (sfx.toggle) silences speech; the HUD toggle "Conduttore" turns the host off (say() resolves at once).
 * Host lines are flavour: never put information the player needs only in say().
 */
import {THREE, person, tween, PAL} from './engine.js';
import {h, sfx} from './ui.js';

const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
let voices = [];
const loadVoices = () => { voices = synth?.getVoices() || []; };
if (synth) { loadVoices(); synth.addEventListener?.('voiceschanged', loadVoices); }
  let hostOn = (() => { try { return localStorage.getItem('host_on') !== '0'; } catch { return true; } })();

const FEMALE = /elsa|isabella|alice|federica|paola|emma|bianca|carla|female|donna|it-it-x-kda|it-it-x-itb/i;
const MALE = /diego|cosimo|giuseppe|luca|benigno|roberto|male|uomo|it-it-x-itc|it-it-x-itd/i;
function pickVoice(v) {
  const it = voices.filter(x => /^it/i.test(x.lang));
  if (!it.length) {
    // Fall back to default voice or first available system voice if no Italian voice installed
    return voices.find(x => x.default) || voices[0] || null;
  }
  const pref = (v.prefer || []).map(s => s.toLowerCase());
  for (const p of pref) { const f = it.find(x => x.name.toLowerCase().includes(p)); if (f) return f; }
  const g = v.gender === 'f' ? FEMALE : MALE;
  return it.find(x => g.test(x.name) && !(v.gender !== 'f' && FEMALE.test(x.name))) || it[0];
}
const plain = s => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const chunks = s => s.match(/[^.!?…]+[.!?…]*["»”]?\s*/g) || [s];

const MOOD = {right: 'happy', wrong: 'sad', win: 'happy', lose: 'sad', suspense: 'think', intro: 'happy', outro: 'happy'};
const GEST = {right: ['clap', 'point', null], wrong: ['shrug', null], win: ['celebrate'], lose: ['shrug'], suspense: [null], intro: ['wave'], outro: ['wave']};
const pickOne = a => a[Math.floor(Math.random() * a.length)];

export function createHost(ctx, def) {
  def = typeof def === 'string' ? HOSTS[def] : def;
  const D = {role: 'Conduttore', position: [-3.4, 0, 1.2], lookAt: null, lines: {}, ...def};
  const V = {pitch: 1, rate: 1, lang: 'it-IT', ...D.voice};
  const S = ctx.stage, p = person({...D.look, accent: D.look?.tie});
  p.position.set(...D.position);
  S?.add(p);
  const camPos = () => S?.camera.position;
  const anchor = t => {
    if (!t) return camPos()?.clone();
    if (t.isVector3) return t.clone();
    if (Array.isArray(t)) return new THREE.Vector3(...t);
    if (t.isObject3D) return t.getWorldPosition(new THREE.Vector3());
    const d = t.data || {}, a = d.obj || d.pos || t.pos || t.obj;
    return a && a !== t ? anchor(a) : camPos()?.clone();
  };
  const turnTo = t => {
    const v = anchor(t); if (!v) return;
    let yaw = Math.atan2(v.x - p.position.x, v.z - p.position.z), d = yaw - p.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    tween(p.rotation, {y: p.rotation.y + d * .8}, .7, 'inOutBack');
    p.lookAt(v.setY(Math.max(v.y, 1.2)));
  };
  turnTo(D.lookAt);

  // subtitle bubble
  const box = h('div', 'hostSub'); box.hidden = true;
  box.style.setProperty('--hc', D.look?.accent || PAL.gold);
  box.innerHTML = `<div class="hsTag"><b>${D.name}</b><span>${D.role}</span></div><p class="hsTx"></p><span class="hsSkip" aria-hidden="true">Spazio ▸</span>`;
  box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
  const tx = box.querySelector('.hsTx');
  (ctx.subSlot || ctx.ui).append(box);

  let cur = null, typer = null, hideT = null, last = {};
  const endCur = () => { if (cur) { const c = cur; cur = null; c(); } };
  const stop = () => { synth?.cancel(); endCur(); };
  box.onclick = stop;
  const key = e => { if (e.code === 'Space' && cur && !/INPUT|TEXTAREA|BUTTON|SELECT/.test(e.target.tagName)) { e.preventDefault(); stop(); } };
  addEventListener('keydown', key);
  const offMute = sfx.onMute(m => { if (m) synth?.cancel(); });

  // HUD toggle
  const tg = h('button', 'pill btn hostToggle'); tg.setAttribute('aria-label', 'Conduttore attivo o spento');
  const paint = () => { tg.innerHTML = `🎙 <span>Conduttore: ${hostOn ? 'attivo' : 'off'}</span>`; tg.setAttribute('aria-pressed', String(hostOn)); };
  tg.onclick = () => { hostOn = !hostOn; try { localStorage.setItem('host_on', hostOn ? '1' : '0'); } catch {} paint(); if (!hostOn) { stop(); box.hidden = true; } };
  paint(); ctx.hudTools?.prepend(tg);

  const BEEP_RE = /\[BEEP\]|c\*\*\*o|p\*\*\*a|m\*\*\*a|str\*\*\*o|cazzo|puttana|merda|stronzo|f\*\*\*uto/gi;
  const renderBeepHtml = s => s
    .replace(/\[BEEP\]/gi, '<span class="censorBadge">BEEP!</span>')
    .replace(/c\*\*\*o|cazzo/gi, '<span class="censorBadge">C***O</span>')
    .replace(/p\*\*\*a|puttana/gi, '<span class="censorBadge">P***A</span>')
    .replace(/m\*\*\*a|merda/gi, '<span class="censorBadge">M***A</span>')
    .replace(/str\*\*\*o|stronzo/gi, '<span class="censorBadge">STR***O</span>')
    .replace(/f\*\*\*uto/gi, '<span class="censorBadge">F***UTO</span>');

  // speak text; resolves on end. withBox=false: voice only (host.ask)
  function speak(text, withBox) {
    return new Promise(res => {
      endCur(); synth?.cancel(); clearInterval(typer); if (withBox) clearTimeout(hideT);
      let done = false, safety;
      const fin = () => { if (done) return; done = true; clearTimeout(safety); clearInterval(typer); p.speak(false); if (withBox) { tx.innerHTML = renderBeepHtml(text); hideT = setTimeout(() => { box.hidden = true; }, 1700); } setTimeout(res, withBox ? 220 : 0); };
      cur = fin;
      p.speak(true);
      if (BEEP_RE.test(text)) setTimeout(() => sfx.censorBeep(0.36), 320);
      if (withBox) {
        box.hidden = false; box.classList.remove('in'); void box.offsetWidth; box.classList.add('in');
        let i = 0; tx.innerHTML = '';
        typer = setInterval(() => {
          i += 2;
          tx.innerHTML = renderBeepHtml(text.slice(0, i));
          if (i >= text.length) {
            clearInterval(typer);
            tx.innerHTML = renderBeepHtml(text);
          }
        }, 28);
      }
      const canVoice = !sfx.muted && synth;
      if (canVoice) {
        try { synth.resume?.(); } catch {}
        const voice = voices.length ? pickVoice(V) : null;
        const spokenClean = text.replace(BEEP_RE, ' ... ');
        const parts = chunks(spokenClean).filter(c => c && c.trim().length > 0);
        if (!parts.length) { fin(); return; }
        parts.forEach((c, k) => {
          const u = new SpeechSynthesisUtterance(c.trim());
          u.lang = V.lang || 'it-IT';
          if (voice) u.voice = voice;
          u.pitch = V.pitch || 1;
          u.rate = V.rate || 1;
          if (k === parts.length - 1) { u.onend = fin; u.onerror = fin; }
          synth.speak(u);
        });
        safety = setTimeout(fin, Math.min(14000, text.length * 95 / (V.rate || 1) + 3000));
      } else if (withBox) safety = setTimeout(fin, Math.min(10000, Math.max(1400, text.length * 55) + 300));
      else fin();
    });
  }

  const host = {
    p, def: D, turnTo, stop,
    get on() { return hostOn; },
    say(text, {mood, gesture, to} = {}) {
      if (!hostOn || ctx.dead || !text) return Promise.resolve();
      if (mood) p.setMood(mood);
      if (to !== undefined) turnTo(to);
      if (gesture && p[gesture]) p[gesture]();
      return ctx.w(speak(plain(text), true));
    },
    react(kind, player, vars = {}) {
      if (typeof vars !== 'object') vars = {value: vars};
      let pool = D.lines[kind] || [];
      if (vars.value === undefined) pool = pool.filter(l => !l.includes('{value}'));
      if (!player) pool = pool.filter(l => !l.includes('{name}')).length ? pool.filter(l => !l.includes('{name}')) : pool;
      pool = pool.filter(l => l !== last[kind]).length ? pool.filter(l => l !== last[kind]) : pool;
      if (!pool.length) return Promise.resolve();
      const line = last[kind] = pickOne(pool);
      const text = line.replace(/\{name\}/g, player?.name ?? '').replace(/\{value\}/g, vars.value ?? '').replace(/\s+([!?.,])/g, '$1').replace(/,\s*([!?.])/g, '$1').replace(/^[,\s]+/, '');
      return host.say(text, {mood: MOOD[kind], gesture: pickOne(GEST[kind] || [null]), to: player});
    },
    ask(q) {
      if (!hostOn || ctx.dead || sfx.muted || !synth || !voices.length) return Promise.resolve();
      p.setMood('neutral');
      return speak(plain(q).slice(0, 220), false);
    }
  };
  ctx.onExit(() => { synth?.cancel(); clearInterval(typer); clearTimeout(hideT); removeEventListener('keydown', key); offMute(); box.remove(); tg.remove(); endCur(); });
  return host;
}

// ---------- registry: fictional hosts, one per show (keys = game ids) ----------
const M = ['diego', 'giuseppe', 'cosimo', 'luca', 'benigno', 'itd', 'itc'];
const F = ['isabella', 'elsa', 'alice', 'federica', 'paola', 'kda', 'itb'];
const rot = (a, n) => [...a.slice(n), ...a.slice(0, n)];

export const HOSTS = {
  eredita: {
    name: 'Marco Valenti', role: 'Conduttore · L’Eredità',
    look: {skin: '#e6bf9c', hair: '#b9b6b0', hairStyle: 'slick', suit: '#1a2440', shirt: '#f3efe6', tie: '#7a2433', accent: '#d8b45a'},
    voice: {pitch: .88, rate: .94, gender: 'm', prefer: rot(M, 0)},
    lines: {
      intro: ['Buonasera e benvenuti. Stasera, come sempre, in palio c’è il sapere.', 'Benvenuti a L’Eredità. Sei domande, tre vite, e poi lei: la Ghigliottina.', 'Buonasera, {name}. Si accomodi: questa sera la cultura ha un prezzo, e un premio.', 'Signore e signori, buonasera. Cominciamo con calma, ma senza fretta di sbagliare.', 'Eccoci di nuovo insieme. Che la memoria vi assista, stasera più che mai.', 'Benvenuti. Qui ogni parola pesa, e ogni risposta lascia un’eredità.', 'Buonasera, {name}. Lei sa cosa l’aspetta: la conoscenza, e una lama.', 'Bentornati in studio. Respiro profondo: si comincia.'],
      right: ['Esatto. Risposta corretta, e pronunciata con la sicurezza giusta.', 'Molto bene, {name}. È così.', 'Corretto. Il montepremi cresce: {value}.', 'Esattamente. Una risposta da vero erede.', 'Sì. Lo sapeva, si vedeva dagli occhi.', 'Giusto, {name}. Elegante e preciso.', 'Risposta esatta. Andiamo avanti con fiducia.', 'Perfetto. Il pubblico apprezza, e anche io.'],
      wrong: ['Mi dispiace. Non era quella la risposta.', 'Purtroppo no, {name}. La lama scende.', 'Peccato. Era una domanda insidiosa, glielo concedo.', 'No. E la Ghigliottina, si sa, non perdona.', 'Porca p***a [BEEP], questa non me la doveva sbagliare, {name}!', 'Risposta errata. Ma non perda la calma: la partita è lunga.', 'Purtroppo è sbagliata. Una vita in meno.', 'Che peccato, {name}. C’era quasi.', 'Non è corretta. Teniamo duro.'],
      win: ['Straordinario. {name}, lei porta a casa {value}.', 'È la parola giusta! Una vittoria meritata, complimenti.', 'Applausi, prego. Questa è una serata che ricorderemo.', 'Ha vinto, {name}. Con classe, e con la testa.', 'La Ghigliottina si inchina. Complimenti davvero.', 'Che finale! Il sapere, stasera, ha vinto.', 'Splendido. Lei è un f***uto [BEEP] campione della cultura! L’eredità è sua: {value}.', 'Una vittoria da manuale. Grazie, {name}.'],
      lose: ['Mi dispiace, {name}. La lama è calata.', 'Peccato. La parola era lì, a un passo.', 'Stasera la Ghigliottina ha avuto la meglio. Ma lei ha giocato con onore.', 'Non è andata. Ma tornerà più forte, ne sono certo.', 'Un vero peccato. Il pubblico la applaude comunque.', 'La lama non perdona. Grazie per la bella partita.', 'Purtroppo è finita qui. A testa alta, però.', 'Peccato davvero, {name}. Ci rivediamo presto.'],
      suspense: ['Silenzio in studio, per favore.', 'Ci pensi bene. Il tempo c’è, ma non è infinito.', 'È il momento della verità.', 'Una parola sola. Tutto dipende da lì.', 'Respiri. La risposta è già dentro di lei.', 'Cinque indizi, un solo filo che li lega.', 'Vediamo se la memoria la assiste.', 'Il pubblico trattiene il fiato. E anche io.'],
      outro: ['Grazie a tutti, e buona serata.', 'Anche stasera è tutto. Arrivederci a domani.', 'Grazie, {name}. È stato un piacere.', 'Ci vediamo alla prossima puntata. Coltivate la curiosità.', 'Buonanotte, e grazie per averci tenuto compagnia.', 'La cultura continua anche a telecamere spente. Arrivederci.', 'Grazie a voi da casa. A domani.', 'Chiudiamo qui. Con stima e affetto, buonasera.']
    }
  },
  avanti: {
    name: 'Paolo Brandi', role: 'Conduttore · Avanti un altro!',
    look: {skin: '#dcae88', hair: '#4a3020', hairStyle: 'short', suit: '#2a3a2e', shirt: '#f4efe3', tie: '#c46a2b', accent: '#e08a3c'},
    voice: {pitch: 1, rate: 1.08, gender: 'm', prefer: rot(M, 1)},
    lines: {
      intro: ['Buonasera! Sedetevi, tanto qualcuno cade comunque.', 'Benvenuti! Stasera la botola è lucidata e affamata.', 'Eccoci! {name}, si metta comodo… finché dura.', 'Avanti il primo! Anzi no, avanti tutti, che si fa tardi.', 'Buonasera a casa e a chi tra poco sarà sotto il pavimento.', 'Benvenuti nel programma dove rispondere è facile. Più o meno.', 'Signori, si gioca! Chi sbaglia, saluta dal piano di sotto.', '{name}, benvenuto. Le assicuro che la botola è assolutamente innocua. Quasi.'],
      right: ['Giusto! Guarda un po’, stasera ragioniamo.', 'Esatto, {name}! Mi ha sorpreso, lo ammetto.', 'Brava la gente! Risposta corretta.', 'Sì! E io che avevo già preparato la battuta.', 'Giusto. Avanti un altro!', 'Corretto! Il montepremi sale: {value}.', 'Esatto! Ma non si monti la testa.', 'Complimenti {name}, questa la sapeva pure mia nonna, ma complimenti.'],
      wrong: ['Eh no! Questa la sapeva pure il cameraman.', 'Ma che c***o [BEEP] dici, {name}?! Ma dove vivi, su Marte?!', 'Sbagliato! Ma con grande convinzione, bisogna dirlo.', 'No, {name}. Che peccato, ci aveva quasi convinto.', 'Risposta errata! La botola ringrazia.', 'Porca p***a [BEEP], questa la sapeva pure il gatto di mia suocera!', 'Ahia. Facciamo finta di niente?', 'Sbagliato, ma con stile. Lo stile non vale punti, però.', 'No no no. Mi spiace, è no.', '{name}, coraggio: sbagliare è umano, cadere è televisivo.'],
      win: ['Ha vinto! Incredibile, devo rivedere le domande.', 'Complimenti, {name}! Porta a casa {value}.', 'Vittoria! E la botola resta a bocca asciutta.', 'Ce l’ha fatta! Applausi, e controllate che non sia un attore.', 'Ma che c***o [BEEP] di rimonta da leggenda! Ha vinto!', 'Fenomenale! Stasera la fortuna ha cambiato canale.', 'Ha battuto tutti! Anche me, che è più difficile.', 'Vince {name}! Si goda il momento, domani è un altro avanti.', 'Campione! Ma il bonus, quello, è un’altra storia.'],
      lose: ['E giù! Ci saluta dal piano di sotto.', 'Peccato, {name}. La botola ha sempre fame.', 'Fine corsa! Caduta da dieci e lode.', 'Oplà! Arrivederci e grazie.', 'Che figura di m***a [BEEP] in diretta! Ma le vogliamo bene lo stesso!', 'Niente da fare. Le mando un cuscino giù?', 'È andata così. Anzi, è andata giù.', 'Peccato! Ma che volo elegante.', 'Mi dispiace, {name}. Torni quando vuole, la botola la aspetta.'],
      suspense: ['Ci pensi, ci pensi. Io intanto guardo l’orologio.', 'Il pubblico è col fiato sospeso. Io pure, ma per la fame.', 'Pensiamoci bene… ma non troppo.', 'Ehm. Va tutto bene? Sbatta le palpebre se ha bisogno.', 'Il tempo corre e la botola sorride.', 'Suspense! Lo dico perché fa televisione.', 'Allora? La regia sta invecchiando.', 'Momento delicato. Nessuno tossisca.'],
      outro: ['Grazie e alla prossima! Occhio a dove mettete i piedi.', 'È tutto! Avanti un altro… domani.', 'Buonanotte, e non cadete dal divano.', 'Grazie {name}, è stato un piacere. Più per me, ma va bene.', 'Ci vediamo domani, stesso pavimento.', 'Chiudiamo qui, prima che qualcuno si faccia male.', 'Arrivederci! E ricordate: la botola vi pensa.', 'Grazie a tutti! Applausi registrati, prego.']
    }
  },
  caduta: {
    name: 'Andrea Costa', role: 'Conduttore · Caduta Libera',
    look: {skin: '#e9c3a0', hair: '#1f1712', hairStyle: 'curly', suit: '#1d3566', shirt: '#eef1f6', tie: '#2a74b8', accent: '#3d8fd1'},
    voice: {pitch: 1.08, rate: 1.15, gender: 'm', prefer: rot(M, 2)},
    lines: {
      intro: ['Buonasera! Pronti a salire? Dieci gradini, zero paracadute!', 'Si parte! {name}, ogni gradino vale oro, ogni errore vale il vuoto.', 'Benvenuti a Caduta Libera! Adrenalina al massimo!', 'Eccoci! Luci, musica, e una scala verso i centomila!', 'Carichi? Io sì! Si comincia!', 'Buonasera a tutti! Oggi si vola… speriamo verso l’alto.', '{name}, cuore forte e risposte veloci. Via!', 'Benvenuti! Qui sotto c’è il vuoto, qui sopra c’è il montepremi!'],
      right: ['Sì! Gradino conquistato!', 'Esatto, {name}! Si sale!', 'Perfetto! Velocissimo!', 'Bomba! Risposta giusta!', 'Giusto! Il montepremi vola: {value}!', 'Esatto! Non la ferma nessuno!', 'Che riflessi! Avanti così!', 'Sì, sì, sì! Gradino successivo!'],
      wrong: ['Nooo! Attenzione al vuoto!', 'Sbagliato, {name}! Il pavimento trema!', 'Errore! Ma non è ancora finita!', 'Ma che c***o [BEEP] di risposta era?! Mancavano due lettere sole!', 'Ahi! Questa era una trappola!', 'No! Ma ci rialziamo subito!', 'Risposta errata! Porca p***a [BEEP], concentrazione!', 'Peccato! Così vicino!', 'Uh, che brivido! Sbagliato!'],
      win: ['In cima! {name}, sei leggenda!', 'Vittoria! {value} meritatissimi!', 'Ha scalato tutto! Incredibile!', 'Ce l’ha fatta! Coriandoli, prego!', 'Campione assoluto! Che salita!', 'Dieci gradini, dieci colpi! Vince {name}!', 'Fantastico! Lo studio esplode!', 'Vittoria pazzesca! Applausi!'],
      lose: ['E giùùù! Caduta libera!', 'Peccato, {name}! Il vuoto ha vinto stasera!', 'Si è aperta la botola! Che volo!', 'Fine della salita! Ma che coraggio!', 'Giù! Ma lo rivedremo in cima, ne sono sicuro!', 'Che caduta! Applausi comunque!', 'Che precipizio! Ma ha lottato come un leone!', 'Peccato! A un passo dal sogno!'],
      suspense: ['Tre, due, uno…', 'Pensa veloce, il tempo vola!', 'Che tensione in studio!', 'Il pavimento aspetta…', 'Concentrazione massima!', 'Ogni secondo conta!', 'Silenzio! Tutto si decide adesso!', 'Il cuore batte a mille!'],
      outro: ['Grazie a tutti! Alla prossima scalata!', 'È tutto! Tenete i piedi per terra!', 'Ciao {name}, che puntata!', 'Ci vediamo domani, sempre più in alto!', 'Grazie! E occhio ai gradini!', 'Chiudiamo con un applauso gigante!', 'A domani, stessa scala, stessi brividi!', 'Buonanotte e buona caduta… nei sogni!']
    }
  },
  affari: {
    name: 'Stefano Rinaldi', role: 'Conduttore · Affari Tuoi',
    look: {skin: '#e2b893', hair: '#6b6258', hairStyle: 'short', suit: '#24262e', shirt: '#f2eee6', tie: '#9b2d3f', accent: '#c94a5c'},
    voice: {pitch: .96, rate: 1, gender: 'm', prefer: rot(M, 3)},
    lines: {
      intro: ['Buonasera! Venti pacchi, venti regioni, e un solo Dottore.', 'Benvenuti! {name}, oggi il destino ha la forma di un pacco.', 'Eccoci qui. Che emozione, ogni volta come la prima.', 'Buonasera a tutta Italia! Si gioca col cuore.', 'Benvenuto, {name}. Mi raccomando: istinto, ma anche testa.', 'Il telefono è lì. Il Dottore ascolta. Cominciamo.', 'Benvenuti! Stasera qualcuno può cambiare vita.', 'Pronti? Io ho già i brividi.'],
      right: ['Ottimo! Un pacco piccolo, che bella notizia!', 'Che colpo, {name}! Il tabellone sorride.', 'Benissimo! Teniamo vivi i premi grossi.', 'Ottimo! Così si fa!', 'Applausi! Via un premio basso.', 'Sì! Il Dottore adesso è nervoso.', 'Che fortuna! Continuiamo così.', 'Perfetto, {name}. Il sogno resta acceso.'],
      wrong: ['Ahi. Questo fa male.', 'Oh no, {name}! Se ne va un premio importante.', 'Pacco rosso andato... ma porca p***a [BEEP]!', 'Peccato… ma la partita è ancora aperta.', 'Che sfortuna. Il Dottore se la ride sotto i baffi!', 'No! Proprio quello!', 'Coraggio, {name}. Ne restano ancora.', 'Mamma mia. Ma che m***a [BEEP] di tiro, non molliamo.', 'Doloroso. Però il suo pacco può ancora sorprendere.'],
      win: ['Che partita! {name}, porta a casa {value}!', 'Emozionante! Un affare d’oro!', 'Ha battuto il Dottore! Applausi!', 'Incredibile, {name}! Una serata da ricordare.', 'Che finale! Mi tremano le mani.', 'Vittoria! E il pacco aveva ragione.', 'Strepitoso! Cuore e testa, insieme.', 'Una giocata da campione. Complimenti!'],
      lose: ['Peccato, {name}. Stasera il pacco ha deciso così.', 'Mi dispiace tanto. Ma che coraggio.', 'È andata male, ma lo rifarei uguale.', 'Il Dottore vince questa volta.', 'Che peccato! Eppure ci credevamo tutti.', 'Non è la serata fortunata. Grazie comunque.', 'Peccato davvero. Un abbraccio, {name}.', 'Il gioco è crudele, a volte. A testa alta.'],
      suspense: ['Squilla il telefono…', 'Il Dottore sta facendo i conti.', 'Respiriamo. Che pacco apriamo?', 'Ci pensi bene. Questo può cambiare tutto.', 'Affare… o non affare?', 'Silenzio in studio.', 'Il cuore dice una cosa, la testa un’altra.', 'Momento delicatissimo.'],
      outro: ['Grazie e buonanotte, Italia!', 'È tutto per stasera. Alla prossima telefonata!', 'Grazie {name}, che emozioni!', 'A domani, con venti nuovi pacchi.', 'Buonanotte, e che la fortuna vi accompagni.', 'Ci rivediamo presto. Il Dottore saluta… forse.', 'Grazie a tutti! Un applauso grande.', 'Arrivederci, e attenti alle offerte!']
    }
  },
  catena: {
    name: 'Giulia Serra', role: 'Conduttrice · Reazione a Catena',
    look: {female: true, skin: '#efcaa9', hair: '#7a3b22', hairStyle: 'bob', suit: '#5a1f35', shirt: '#f4e6e0', tie: '#c2577a', accent: '#d0708a', eyes: '#3d5a3a'},
    voice: {pitch: 1.12, rate: 1.05, gender: 'f', prefer: rot(F, 0)},
    lines: {
      intro: ['Ciao a tutti e benvenuti! Pronti a fare catena?', 'Buonasera! {name}, scaldiamo le parole.', 'Eccoci! Stasera ogni parola tira l’altra.', 'Benvenuti! Io adoro questo momento, voi?', 'Ciao {name}! Testa leggera e intuito acceso.', 'Si comincia! Anello dopo anello, fino in fondo.', 'Buonasera! Le parole sono pronte, e anche io.', 'Benvenuti in studio. Giochiamo con le parole, ma sul serio.'],
      right: ['Sìì! Che bravura!', 'Esatto, {name}! Che intuito!', 'Perfetto! L’anello si chiude.', 'Giusto! Ma come ha fatto?', 'Evvai! Parola trovata.', 'Brava la nostra mente! Corretto.', 'Sì! E sono {value} punti.', 'Che bello, {name}! Avanti così.'],
      wrong: ['Uh, no! Ma era vicina.', 'Quasi, {name}! Riproviamo.', 'Mmh, no. Ma che c***o [BEEP] c’entrava quella parola?!', 'Ahi! Non è la parola giusta.', 'No, peccato! Porca p***a [BEEP], respiro e via.', 'Non è questa. Pensi all’anello prima.', 'Ops! Succede anche ai migliori.', 'Peccato! Ma l’idea c’era.'],
      win: ['Catena completa! {name}, sei un fenomeno!', 'Vittoria! {value} meritatissimi!', 'Strepitoso! Hai legato tutto!', 'Che partita! Mi hai emozionata.', 'Ce l’hai fatta! Applausi!', 'Una catena perfetta. Complimenti, {name}!', 'Vince {name}! Che testa!', 'Meraviglioso! Lo studio è in festa.'],
      lose: ['Peccato, {name}! La catena si è spezzata.', 'Oh no! Era proprio lì.', 'Non è andata, ma che bella partita.', 'Peccato! Torna presto, mi raccomando.', 'Stavolta no, ma l’intuito c’è.', 'Che peccato! Un abbraccio.', 'La parola ci è sfuggita. Capita!', 'Finita, ma con un sorriso, vero?'],
      suspense: ['Mmh… quale sarà?', 'Ci pensi bene, l’anello è lì.', 'Che suspense!', 'Pensa alla parola prima… e a quella dopo.', 'Silenzio, stiamo pensando!', 'Dai, dai, dai!', 'Il tempo corre, ma tu di più.', 'Sento che ci siamo…'],
      outro: ['Grazie a tutti! Alla prossima catena!', 'Ciao {name}, che bella serata!', 'È tutto! Un bacio a casa.', 'A domani, con nuove parole!', 'Buonanotte! E giocate con le parole anche voi.', 'Grazie! Mi siete piaciuti tantissimo.', 'Ci vediamo presto, anello dopo anello.', 'Ciao ciao, e grazie!']
    }
  },
  fight: {
    name: 'Luca Ferri', role: 'Annunciatore · Fight List',
    look: {skin: '#c99272', hair: '#151515', hairStyle: 'bald', suit: '#111216', shirt: '#e8e3d8', tie: '#b3262e', accent: '#d64545'},
    voice: {pitch: .84, rate: 1.12, gender: 'm', prefer: rot(M, 4)},
    lines: {
      intro: ['Signore e signoriii! Benvenuti sul ring di Fight List!', 'Nell’angolo blu… {name}! Che cominci la battaglia!', 'Preparatevi! Qui si combatte a colpi di parole!', 'Gong in arrivo! Pronti a elencare fino al KO?', 'Benvenuti! Stasera nessuno esce senza lividi… lessicali!', 'Ladies and gentlemen… anzi, signore e signori! Si combatte!', 'Ecco a voi il campione della serata… {name}!', 'Accendete le luci! Il ring è caldo!'],
      right: ['Colpo pieno! Che diretto!', 'Bum! {name} colpisce duro!', 'Risposta valida! L’avversario barcolla!', 'Gancio perfetto!', 'Che combinazione! Valida!', 'Sì! Altro colpo a segno: {value}!', 'Inarrestabile!', 'Uppercut di parole! Valida!'],
      wrong: ['Colpito! {name} è alle corde!', 'Fuori lista! Che errore!', 'Ahia! Guardia abbassata!', 'No! Colpo a vuoto!', 'Già detto! Squalifica del round!', 'Tempo scaduto! L’arbitro fischia!', 'Che incassata!', 'Barcolla! Ma non è ancora finita!'],
      win: ['KO! {name} vince per atterramento!', 'È finita! Il nuovo campione è {name}!', 'Vittoria per KO! Il pubblico impazzisce!', 'Cintura assegnata! Che match!', 'Trionfo! {value} punti di pura potenza!', 'Il ring ha un nuovo re!', 'Incredibile! Che vittoria!', 'Alzate quel braccio! Vince {name}!'],
      lose: ['KO! {name} va al tappeto!', 'È finita! Lo sfidante vince!', 'Al tappeto! Che match però!', 'Sconfitta, ma con onore!', 'L’arbitro conta… dieci! Finita!', 'Peccato! Rivincita alla prossima!', 'Giù! Ma tornerà più forte!', 'Fine dell’incontro! Applausi a entrambi!'],
      suspense: ['Ultimo round!', 'Chi colpirà per primo?', 'Tensione sul ring!', 'Silenzio… si combatte!', 'Occhi negli occhi!', 'Il gong sta per suonare!', 'Respirate! Arriva il colpo decisivo!', 'Chi cede adesso perde tutto!'],
      outro: ['Fine dell’evento! Grazie a tutti!', 'Il ring si spegne! Alla prossima sfida!', 'Grazie {name}, che battaglia!', 'Ci vediamo al prossimo incontro!', 'Asciugate il sudore, si torna presto!', 'Che serata di combattimenti! Buonanotte!', 'Il gong ha suonato! A presto!', 'Applausi per i lottatori!']
    }
  },
  hit: {
    name: 'Elena Marini', role: 'DJ · Hit',
    look: {female: true, skin: '#d9a77f', hair: '#1c1416', hairStyle: 'long', suit: '#3b2156', shirt: '#efe4f2', tie: '#8e5bb5', accent: '#9a6cc8', eyes: '#3a2416'},
    voice: {pitch: 1.05, rate: 1.1, gender: 'f', prefer: rot(F, 1)},
    lines: {
      intro: ['Ciao ragazzi! Alzate il volume, si parte con Hit!', 'Buonasera, qui è Elena in diretta! {name}, sei sintonizzato?', 'Musica, luci, e tanti titoli da indovinare!', 'Benvenuti in onda! Le hit sono pronte.', 'Si accende la console! Pronti?', 'Ciao {name}! Orecchie aperte, si gioca!', 'In diretta dallo studio, ecco Hit!', 'Ciao a tutti! Stasera la playlist la fate voi.'],
      right: ['Sìì! È proprio lei!', 'Grande {name}! Hai l’orecchio fino!', 'Esatto! Tormentone riconosciuto!', 'Grande! Questa è una hit!', 'Perfetto! Su il volume!', 'Giusto! E sono {value} punti.', 'Che orecchio! Pazzesco!', 'Sì! Ballo io per te!'],
      wrong: ['Nooo! Non era quella.', 'Quasi, {name}! Era un’altra hit.', 'Peccato! Ma stessa vibrazione.', 'Mmh, no! Cambiamo traccia.', 'Non è lei! Ma ci sta.', 'Fuori tempo! Riprova.', 'No! Questa la ballavano tutti però.', 'Peccato! La prossima la prendi.'],
      win: ['Disco d’oro per {name}!', 'Vittoria! {value} punti a tutto volume!', 'Primo in classifica!', 'Che playlist! Hai vinto!', 'Sei la hit della serata!', 'Applausi! Numero uno!', 'Vince {name}! Si balla!', 'Che orecchio! Campione!'],
      lose: ['Peccato, {name}! Stasera la musica non ti ha aiutato.', 'Fine della playlist! Ma ci riprovi, vero?', 'Non è andata, ma che bel ritmo!', 'Peccato! La rivincita è già in scaletta.', 'Stavolta niente disco d’oro.', 'Ci sta! Anche le hit sbagliano a volte.', 'Un applauso comunque!', 'La musica gira, e tu tornerai.'],
      suspense: ['Ascolta bene…', 'Qual è il titolo?', 'Ritmo… ci sei?', 'Un indizio in più…', 'Silenzio, la traccia parte!', 'Ce l’hai sulla punta della lingua?', 'Tic tac, a tempo di musica!', 'Che suspense, sembra un remix!'],
      outro: ['Grazie a tutti! Restate sintonizzati!', 'Ciao {name}! Alla prossima hit!', 'Si spegne la console! Buonanotte!', 'È tutto, ragazzi! Volume giù, sorriso su.', 'Ci risentiamo domani in diretta!', 'Grazie! E cantate sotto la doccia.', 'Fine della puntata! Un bacio!', 'Alla prossima playlist!']
    }
  },
  math: {
    name: 'Prof. Enrico Bassi', role: 'Conduttore · Calcolo Lampo',
    look: {skin: '#ead0b6', hair: '#cfcac2', hairStyle: 'slick', suit: '#4a3a2a', shirt: '#f1ede4', tie: '#2f5a3a', accent: '#4f9a7a', eyes: '#2a4a5a'},
    voice: {pitch: .92, rate: .98, gender: 'm', prefer: rot(M, 5)},
    lines: {
      intro: ['Buonasera. Prendete carta e penna. Anzi no, qui si calcola a mente.', 'Benvenuti a Calcolo Lampo. Nessuna calcolatrice è stata maltrattata.', '{name}, si sieda. Oggi la matematica è dalla sua parte. Forse.', 'Buonasera. I numeri non mentono, ma a volte si nascondono.', 'Bentornati. Lezione di oggi: velocità.', 'Benvenuti. Ricordate: due più due fa ancora quattro.', 'Si comincia. Prometto di non dare compiti.', 'Buonasera, {name}. Spero abbia fatto colazione: servono zuccheri.'],
      right: ['Corretto. Otto più.', 'Esatto, {name}. Pitagora annuisce.', 'Giusto. Rapido e preciso.', 'Esatto. Chi l’avrebbe detto.', 'Corretto. Il registro prende nota: {value}.', 'Bene. Molto bene. Non lo dica troppo in giro.', 'Giusto. La calcolatrice si sente minacciata.', 'Esatto. Si vede chi ha studiato.'],
      wrong: ['No. Ma l’impegno lo apprezzo.', 'Sbagliato, {name}. Il risultato era un altro.', 'Errore. Capita anche ai professori. Raramente.', 'Non torna. Ricontrolliamo il riporto?', 'Mmh. Creativo, ma sbagliato.', 'No. La matematica è severa, io meno.', 'Sbagliato. Lo considero un errore di distrazione.', 'Non è corretto. Respiri e ricalcoli.'],
      win: ['Promosso a pieni voti! {name}, {value} punti.', 'Eccellente. Più veloce della calcolatrice.', 'Vittoria. Dieci e lode.', 'Complimenti. La metterei in cattedra.', 'Ha vinto. I numeri hanno parlato.', 'Notevole. Lo scriverò alla lavagna.', 'Vince {name}. Un risultato… calcolato.', 'Straordinario. Persino io sono impressionato.'],
      lose: ['Se ne riparla a settembre, {name}.', 'Peccato. I numeri, stasera, erano più veloci.', 'Non è andata. Ma la media è recuperabile.', 'Insufficiente, ma con margine di miglioramento.', 'Il tempo è scaduto. Come la mia pazienza.', 'Peccato. Si eserciti con lo scontrino del supermercato.', 'Sconfitta. Statisticamente, capita.', 'Non oggi. Ma i numeri aspettano.'],
      suspense: ['Il tempo scorre. Linearmente.', 'Calcoli con calma. Ma in fretta.', 'Silenzio in aula.', 'Moltiplicazione o divisione? Decida.', 'Le cifre la guardano.', 'Vedo fumare i neuroni.', 'Ultima operazione. Concentrazione.', 'Il risultato è vicino. Più o meno.'],
      outro: ['La lezione è finita. Buonasera.', 'Grazie a tutti. Niente compiti, promesso.', 'Arrivederci, {name}. Ripassi le tabelline.', 'Fine della puntata. Il resto è zero.', 'A domani, con nuovi numeri.', 'Buonanotte. Contate le pecore, almeno.', 'Grazie. È stato un piacere… esponenziale.', 'Ci vediamo alla prossima equazione.']
    }
  },
  cultura: {
    name: 'Sara Bianchi', role: 'Conduttrice · Cultura Generale',
    look: {female: true, skin: '#f0d0b4', hair: '#c9a46a', hairStyle: 'bun', suit: '#1d3b44', shirt: '#f4efe3', tie: '#4fb3a9', accent: '#4fb3a9', eyes: '#3a5a6a'},
    voice: {pitch: 1, rate: .98, gender: 'f', prefer: rot(F, 2)},
    lines: {
      intro: ['Buonasera e benvenuti. Stasera viaggiamo tra storia, scienza e curiosità.', 'Che piacere averla qui, {name}. Facciamo girare la ruota del sapere?', 'Che piacere avervi qui. La curiosità è il nostro carburante.', 'Buonasera. Ogni domanda è una porta: apriamole insieme.', 'Benvenuti. Io sono curiosa di vedere fin dove arriviamo.', 'Ecco la ruota. Chissà dove ci porterà stasera.', 'Buonasera, {name}. Si fidi del suo istinto.', 'Benvenuti a Cultura Generale. Mettiamoci comodi, e pensiamo.'],
      right: ['Esatto. Lo sapeva, vero?', 'Bellissimo, {name}. Risposta corretta.', 'Giusto. E sa che c’è una storia curiosa dietro?', 'Perfetto. Che eleganza.', 'Esatto! {value} punti.', 'Corretto. Mi piace come ragiona.', 'Sì. Una risposta da enciclopedia.', 'Brava la sua memoria, {name}.'],
      wrong: ['Purtroppo no. Ma è un errore interessante.', 'Non era quella, {name}. Peccato.', 'Mmh, no. Ma ora non lo dimenticherà più.', 'Sbagliato, ma si impara così.', 'No, mi dispiace. Andiamo avanti.', 'Peccato. Era una domanda sottile.', 'Non è corretta. Ma la curiosità resta.', 'Purtroppo no. La prossima è sua.'],
      win: ['Che serata, {name}! {value} punti.', 'Complimenti. Una cultura davvero generale.', 'Ha vinto. Con grazia e precisione.', 'Splendido. La ruota si inchina.', 'Vince {name}. Che piacere vederla giocare.', 'Applausi, davvero meritati.', 'Una vittoria luminosa.', 'Eccellente. Il sapere ha vinto.'],
      lose: ['Peccato, {name}. Ma che bella partita.', 'Non è andata, ma abbiamo imparato tanto.', 'La ruota stasera è stata capricciosa.', 'Mi dispiace. Torni presto a trovarci.', 'Peccato davvero. Ma la curiosità vince sempre.', 'Finita qui. Con stile, però.', 'Non oggi. Ma domani sarà più forte.', 'Grazie lo stesso. È stata una compagnia preziosa.'],
      suspense: ['Vediamo dove si ferma la ruota…', 'Ci rifletta con calma.', 'Che domanda interessante.', 'Il tempo c’è. Lo usi bene.', 'Mmh, curiosa questa.', 'Silenzio, si pensa.', 'La risposta è più vicina di quanto crede.', 'Una pausa elegante prima della risposta.'],
      outro: ['Grazie a tutti, e buona curiosità.', 'Arrivederci, {name}. È stato un piacere.', 'È tutto per stasera. Continuate a farvi domande.', 'Buonanotte, e leggete qualcosa di bello.', 'A domani, con nuove domande.', 'Grazie. La ruota vi aspetta.', 'Chiudiamo qui. Con un sorriso.', 'Buonasera, e restate curiosi.']
    }
  },
  monopoly: {
    name: 'Gigi Affari', role: 'Conduttore · Monopoly Tavolo VIP',
    look: {skin: '#e2b893', hair: '#151515', hairStyle: 'slick', suit: '#162319', shirt: '#f4efe3', tie: '#d94b34', accent: '#43a56b'},
    voice: {pitch: 1.02, rate: 1.06, gender: 'm', prefer: rot(M, 1)},
    lines: {
      intro: [
        'Benvenuti al tavolo di Monopoly! Qui si fanno affari sporchi o si finisce al verde!',
        'Signori, i dadi sono caldi e il mercato immobiliare è spietato. Chi sarà il re del tabellone?',
        '{name}, metti mano al portafogli: a Parco della Vittoria non fanno sconti a nessuno!',
        'Benvenuti! Ricordatevi: chi piange sul canone non ha capito come gira il f***uto [BEEP] mondo del mattone!'
      ],
      right: [
        'Gran colpo, {name}! Questa proprietà ti farà fare soldi a palate.',
        'Contratto firmato! Altro che mutuo, qui siamo al top!',
        'Ottima mossa! E gli altri rosicano forte!',
        'Bel colpo, {name}! Hai comprato per un pezzo di pane: che c***o [BEEP] di genio!',
        'Incassa il canone e sorridi! Chi ha debiti paga e basta!'
      ],
      wrong: [
        'Ahi ahi ahi! Canone salatissimo! Ti hanno spennato per bene!',
        'Ma che c***o [BEEP] di tiro! Dritto su una casella nemica con tre case!',
        'Questa fa male al portafogli! Qualcuno chiami un’ambulanza per il tuo conto!',
        'Porca p***a [BEEP]! Quell’affitto non lo pagava nemmeno il presidente della banca!',
        'Sbagliato investimento! Il mercato non ti perdona una m***a [BEEP]!'
      ],
      win: [
        'Campione assoluto del Monopoly! Tutti gli altri sono finiti a lavare i piatti!',
        'Bancarotta per tutti! {name} possiede tutta la città: un vero squalo!',
        'Che trionfo da leggenda! {name} porta a casa tutto: vittoria stratosferica!',
        'Dominio totale! Complimenti, hai lasciato gli avversari in mutande!'
      ],
      lose: [
        'Bancarotta! Hai finito anche le monetine del carrello della spesa!',
        'Povertà totale! La banca ti ha pignorato pure le scarpe!',
        'Peccato, {name}. Dal sogno immobiliare al cartone sotto il ponte!',
        'Fine dei giochi! Fuori dal tavolo con onore... e debiti!'
      ],
      suspense: [
        'I dadi rimbalzano sul panno verde...',
        'Se fai sei vai in galera, se fai sette paghi il triplo... tensione pura!',
        'Trattativa sul filo del rasoio: chi cede per primo?',
        'Tutti col fiato sospeso: uscirà la carta che ribalta la partita?'
      ],
      doubles: [
        'Dadi doppi per {name}! Il tavolo è infuocato: lancia ancora!',
        'Doppio colpo! Che c***o [BEEP] di fortuna sfacciata!',
        'Ancora un lancio per {name}! Ma occhio al terzo doppio che finisci dritto in gabbia!'
      ],
      jail: [
        'Sirene spiegate! {name} finisce dietro le sbarre senza passare dal VIA!',
        'Doccia fredda per {name}: dritto in gattabuia! Ma che c***o [BEEP] hai combinato?!',
        'Arrestato in diretta nazionale! Guardie, portatelo via con le arance!'
      ],
      go: [
        'Stipendio ritirato al VIA! Duecento verdoni freschi per {name}!',
        'Passaggio dal VIA! La banca apre la cassa e sorride!'
      ],
      tax: [
        'Stangata fiscale! Le tasse non perdonano nessuno, porca p***a [BEEP]!',
        'Prelievo forzoso dal conto di {name}! Che m***a [BEEP] di sfortuna!'
      ],
      build: [
        'Nuova costruzione! I mattoni costano ma rendono un f***uto [BEEP] patrimonio!',
        'Case verdi sul terreno! Qui chi ci passa lascia pure le mutande!'
      ],
      outro: [
        'Il tavolo chiude per stasera! Contate i soldi e nascondeteli sotto il materasso.',
        'È tutto per oggi! Alla prossima bancarotta spietata!',
        'Grazie a tutti! E ricordate: nel Monopoly non ci sono amici, solo debitori!'
      ]
    }
  },
  tombola: {
    name: 'Don Pasquale', role: 'Banditore · Tombola Napoletana',
    look: {skin: '#dcae88', hair: '#4a3020', hairStyle: 'short', suit: '#1c2237', shirt: '#fbf8f0', tie: '#9c2d3a', accent: '#c98a3c'},
    voice: {pitch: .95, rate: 1.02, gender: 'm', prefer: rot(M, 3)},
    lines: {
      intro: [
        'Ué, buonasera a tutti! Sedetevi, prendete le cartelle e sturatevi le orecchie!',
        'Benvenuti alla vera Tombola Napoletana! Stasera il panariello parla e noi incassiamo!',
        '{name}, prepara i fagioli per coprire i numeri: chi dorme non piglia Tombola!',
        'Mettiti comodo: novanta numeri, novanta storie della Smorfia, e che San Gennaro ci assista!'
      ],
      right: [
        'Ambo fatto! Si comincia a ragionare, guagliù!',
        'Terno secco! E la cartella comincia a farsi pesante!',
        'Quaterna! Mamma mia, sento già profumo di vittoria!',
        'Cinquina! Manca solo un soffio alla Tombola, non vi agitate!',
        'Che c***o [BEEP] di cartella fortunata! Questa la benedico io personalmente!'
      ],
      wrong: [
        'Niente, il numero non esce manco a pagarlo! Ma che jella!',
        'Porca p***a [BEEP], proprio quel numero serviva e invece è uscito l’opposto!',
        'Cartella vuota come la dispensa a fine mese! Forza, cambiamo aria!',
        'Mannaggia la miseria, state dormendo sui fagioli?! Sveglia!'
      ],
      win: [
        'TOMBOLAAA! Tombola verace, signori e signore! {name} ha sbancato il panariello!',
        'Che festa! Tombola completata da maestro! Applausi a tutta Napoli!',
        'Campione della Tombola! Stasera offri babà e sfogliatelle a tutto lo studio!'
      ],
      lose: [
        'E vabbè, stasera ha vinto la concorrenza! Ma ci rifacciamo alla prossima estrazione!',
        'Peccato, {name}! Mancava un solo fagiolo... la sfortuna ci ha messo lo zampino!',
        'Niente da fare, la cartella era buona ma il panariello è stato birbone!'
      ],
      suspense: [
        'Mischiamo il panariello... sentite come cantano i bussolotti?',
        'Silenzio assoluto! Manca un solo numero a qualcuno qui in sala...',
        'Chi ha il novanta alzi la mano! Mano ferma che estraggo...'
      ],
      outro: [
        'E con questo il panariello è vuoto! Buonanotte e sogni d’oro con la Smorfia!',
        'Arrivederci a tutti! Giocatevi i numeri usciti stasera al Lotto che non si sa mai!'
      ]
    }
  },
  bingo: {
    name: 'Max Jackpot', role: 'Chiamatore · Gran Bingo VIP',
    look: {skin: '#e9c3a0', hair: '#1c1416', hairStyle: 'slick', suit: '#1e243b', shirt: '#f4f5f8', tie: '#2a75d3', accent: '#38bdf8'},
    voice: {pitch: 1.05, rate: 1.08, gender: 'm', prefer: rot(M, 0)},
    lines: {
      intro: [
        'Ladies and gentlemen, buonasera e benvenuti nella sala più elettrizzante: Gran Bingo VIP!',
        'Sfera d’oro pronta, 90 palline lucidate a specchio! Cartelle in mano, si comincia!',
        'Benvenuti! Stasera il jackpot luccica e qualcuno uscirà di qui da milionario!',
        '{name}, oggi ti sento carico: mira dritto alla Cinquina e poi al colpo grosso!'
      ],
      right: [
        'Numero timbrato! Bella chiamata!',
        'Linea conquistata! Primo premio assegnato, ma la vera caccia è al Bingo!',
        'Sei a meno due dal Bingo! Tensione altissima!',
        'Meno uno al Bingo! Uno solo, signori! Il cuore batte a trecento al minuto!'
      ],
      wrong: [
        'Palla mancata per un soffio! Ma la serie continua!',
        'Questa pallina non voleva proprio uscire... che sfiga d’oro!',
        'Mannaggia, chi c***o [BEEP] ha caricato la sfera stasera?!'
      ],
      win: [
        'BIIINGO! BINGO CONFERMATO! {name} sbanca la sala e porta a casa il montepremi!',
        'Vittoria stratosferica! Luci psichedeliche e champagne per il nostro campione!',
        'Bingo da sogno! Una prestazione chirurgica, signori: giù il cappello!'
      ],
      lose: [
        'Il Bingo è scappato per una frazione di secondo! Che beffa!',
        'Cartella a meno uno... fa male, ma hai giocato una partita spettacolare!',
        'La fortuna ha virato sul tavolo accanto. Ci rifacciamo subito al prossimo giro!'
      ],
      suspense: [
        'La pallina sale nel tubo di cristallo... attenzione!',
        'Chi urla Bingo stasera? Pochi istanti e si decide il montepremi!',
        'Silenzio in sala... estrazione numero...'
      ],
      outro: [
        'Grazie a tutti i gentili ospiti del nostro VIP Bingo Club! Alla prossima mano fortunata!',
        'La sfera si spegne, le vincite sono registrate. Arrivederci a domani sera!'
      ]
    }
  },
  ouija: {
    name: 'Madame Zelda', role: 'Medium · Tavola Ouija',
    look: {female: true, skin: '#ebd5cb', hair: '#2a1a2e', hairStyle: 'long', suit: '#1c1328', shirt: '#2d1b40', tie: '#8e4bb5', accent: '#a855f7'},
    voice: {pitch: .94, rate: .92, gender: 'f', prefer: rot(F, 0)},
    lines: {
      intro: [
        'Avvicinatevi... accendete le candele e posate le dita sulla planchette.',
        'Benvenuti alla seduta spiritica. Qui il confine tra i vivi e i morti è sottile come un respiro.',
        '{name}, non avere paura... gli spiriti sentono l’odore del terrore. Respira lentamente.',
        'La tavola è sveglia. Non togliete mai le mani prima dell’Arrivederci... se ci tenete all’anima!'
      ],
      right: [
        'La planchette risponde! Sentite la forza magnetica che la guida?',
        'Una lettera dopo l’altra... il messaggio si compone nel buio!',
        'Lo spirito approva! È la risposta che cercavamo!',
        'Incredibile... la presenza è reale! Guardate come scivola veloce sul legno!'
      ],
      wrong: [
        'La planchette trema e si rifiuta di muoversi... la domanda era empia!',
        'Gli spiriti sono infuriati! Non fate domande stupide!',
        'Un colpo nel buio! Chi c***o [BEEP] ha bussato alla porta?! Non c’è nessuno lì!',
        'Messaggio confuso... lo spirito si prende gioco di noi con una supercazzola spettrale!'
      ],
      win: [
        'La seduta è compiuta! Il mistero è svelato e lo spirito trova finalmente pace!',
        'Vittoria contro le forze dell’ignoto! Hai decifrato ogni enigma ultraterreno!',
        'Incredibile coraggio! {name} ha dominato la tavola senza farsi consumare dal terrore!'
      ],
      lose: [
        'La candela si è spenta all’improvviso... la seduta è interrotta d’emergenza!',
        'Gli spiriti hanno preso il sopravvento! Arrivederci prima che sia troppo tardi!',
        'Troppa paura nel gruppo... la tavola si è congelata nel buio più totale!'
      ],
      suspense: [
        'La planchette si sposta lentamente... verso quale lettera sta andando?',
        'Sentite questo soffio gelido sulla nuca? Non voltatevi...',
        'Le ombre si allungano... la risposta sta per comparire...'
      ],
      outro: [
        'Dite tutti insieme: ARRIVEDERCI. La porta si chiude, il cerchio è sigillato. Buonanotte... se riuscite a dormire!',
        'La seduta è terminata. Controllate che sotto il vostro letto non ci sia rimasto nessuno!'
      ]
    }
  }
};
