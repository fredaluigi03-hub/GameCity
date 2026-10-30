// Tavola Ouija — Esperienza Paranormale immersiva per Halloween e serate di mistero
import { newStage } from '../engine.js';
import { h, sfx, sleep, getGameSpeed } from '../ui.js';
import { createHost } from '../host.js';
import { SPIRITS, SÉANCE_QUESTIONS } from './ouija-data.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export default {
  id: 'ouija',
  name: 'Tavola Ouija',
  tag: 'Gioco da tavola · Halloween & Mistero',
  desc: 'Accendi le candele, posa le dita sulla planchette e comunica con gli spiriti dell’Oltretomba!',
  c1: '#a855f7',
  c2: '#3b0764',
  players: { min: 1, max: 6, def: 4 },
  rules: [
    'Radunatevi attorno all’antica tavola in legno massiccio illuminata da fioche candele.',
    'Scegliete quale spirito evocare dal regno delle ombre.',
    'Ponetegli domande cruciali: la planchette scivolerà sulla tavola componendo risposte misteriose.',
    'Risolvete gli enigmi spettrali per liberare l’entità e conquistare punti coraggio!',
    'Regola d’oro: prima di alzarvi dalla sedia bisogna sempre dire ARRIVEDERCI!'
  ],
  async start(ctx) {
    const S = ctx.stage = newStage({
      c1: this.c1,
      c2: this.c2,
      bg: '#040206',
      cam: [0, 4.5, 14],
      look: [0, 2.5, 0]
    });

    const host = createHost(ctx, 'ouija');
    const P = ctx.players;
    const spirit = SPIRITS[Math.floor(Math.random() * SPIRITS.length)];
    let currentLog = '';

    // Creazione del container Ouija
    const container = h('div', 'ouijaContainer');
    ctx.sideAdd(container);

    const board = h('div', 'ouijaBoard');
    board.innerHTML = `
      <div class="ouijaHeader">
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="ouijaSunMoon">☀️</span>
          <span id="targetYes" style="cursor:pointer;">SÌ</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="candleFlame"></div>
          <span style="font-size:1.4rem;letter-spacing:0.2em;color:#e9d5ff;">OUIJA</span>
          <div class="candleFlame"></div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <span id="targetNo" style="cursor:pointer;">NO</span>
          <span class="ouijaSunMoon">🌙</span>
        </div>
      </div>

      <div class="ouijaArc" id="arc1"></div>
      <div class="ouijaArc" id="arc2"></div>
      <div class="ouijaNumbers" id="arcNum"></div>

      <div class="ouijaFooter">
        <span id="targetGoodbye" style="cursor:pointer;">ARRIVEDERCI</span>
      </div>

      <div class="ouijaPlanchette" id="planchette">
        <div class="ouijaLens"></div>
      </div>

      <div class="ouijaMsgLog" id="ouijaLog">Le candele sono accese...</div>
    `;

    container.append(board);

    // Popola le lettere e i numeri
    const letters1 = 'ABCDEFGHIJKLM'.split('');
    const letters2 = 'NOPQRSTUVWXYZ'.split('');
    const numbers = '1234567890'.split('');

    const letterEls = {};

    const arc1 = board.querySelector('#arc1');
    const arc2 = board.querySelector('#arc2');
    const arcNum = board.querySelector('#arcNum');

    letters1.forEach(l => {
      const el = h('span', 'ouijaLetter', l);
      el.id = 'ouija_' + l;
      arc1.append(el);
      letterEls[l] = el;
    });

    letters2.forEach(l => {
      const el = h('span', 'ouijaLetter', l);
      el.id = 'ouija_' + l;
      arc2.append(el);
      letterEls[l] = el;
    });

    numbers.forEach(n => {
      const el = h('span', 'ouijaLetter', n);
      el.id = 'ouija_' + n;
      arcNum.append(el);
      letterEls[n] = el;
    });

    letterEls['YES'] = board.querySelector('#targetYes');
    letterEls['NO'] = board.querySelector('#targetNo');
    letterEls['GOODBYE'] = board.querySelector('#targetGoodbye');

    const planchette = board.querySelector('#planchette');
    const logEl = board.querySelector('#ouijaLog');

    // Movimento fluido della planchette su un target
    async function movePlanchetteTo(targetKey) {
      const targetEl = letterEls[targetKey];
      if (!targetEl || !planchette) return;

      const boardRect = board.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      const targetX = (targetRect.left + targetRect.width / 2) - boardRect.left - (planchette.offsetWidth / 2);
      const targetY = (targetRect.top + targetRect.height / 2) - boardRect.top - (planchette.offsetHeight / 2);

      planchette.style.left = `${Math.round(targetX)}px`;
      planchette.style.top = `${Math.round(targetY)}px`;

      sfx.spooky();
      const speed = getGameSpeed();
      await sleep(550 / speed);

      targetEl.classList.add('lit');
      sfx.tick();
      await sleep(350 / speed);
      targetEl.classList.remove('lit');
    }

    // Sillabazione di una parola con la planchette
    async function spellWord(word) {
      currentLog = '';
      const clean = word.toUpperCase().replace(/[^A-Z0-9]/g, '');
      for (const char of clean) {
        currentLog += char;
        if (logEl) logEl.textContent = `Lo spirito compone: "${currentLog}"`;
        await movePlanchetteTo(char);
      }
      const speed = getGameSpeed();
      await sleep(600 / speed);
    }

    // Inizializza posizione planchette al centro
    planchette.style.left = 'calc(50% - 45px)';
    planchette.style.top = 'calc(50% - 55px)';

    await host.say(`Shhh... silenzio in studio. Abbiamo evocato ${spirit.name}: ${spirit.title}!`, { mood: 'think' });
    await host.say(spirit.intro, { mood: 'surprised' });

    // Loop della seduta spiritica: 4 turni
    for (let turn = 0; turn < SÉANCE_QUESTIONS.length; turn++) {
      const qObj = SÉANCE_QUESTIONS[turn];
      const activePlayer = P[turn % P.length];
      ctx.setActive(activePlayer);

      if (logEl) logEl.textContent = `Turno di ${activePlayer.name}: fai una domanda allo spirito...`;

      if (!activePlayer.bot) {
        await ctx.passDevice(activePlayer);
      }

      await host.say(`${activePlayer.name}, tocca a te. Domanda numero ${turn + 1}: ${qObj.q}`, { mood: 'think', to: activePlayer });

      // Risposta dello spirito in base al tipo di domanda
      if (qObj.type === 'yesno') {
        const answer = spirit.answers.yesno ? 'YES' : 'NO';
        await movePlanchetteTo(answer);
        if (logEl) logEl.textContent = `La risposta è: ${spirit.answers.yesno ? 'SÌ' : 'NO'}!`;
        ctx.addScore(activePlayer, 500);
        await host.say(`La planchette ha risposto ${spirit.answers.yesno ? 'SÌ' : 'NO'}! Sentite che brivido?!`, { mood: 'surprised' });
      } else if (qObj.type === 'name') {
        await spellWord(spirit.answers.who);
        ctx.addScore(activePlayer, 800);
        await host.say(`Ha sillabato: ${spirit.answers.who}! È proprio la sua firma!`, { mood: 'happy' });
      } else if (qObj.type === 'where') {
        await spellWord(spirit.answers.where);
        ctx.addScore(activePlayer, 800);
        await host.say(`Mamma mia... dice "${spirit.answers.where}"! Non voltatevi per nessun motivo!`, { mood: 'wrong' });
      } else if (qObj.type === 'riddle') {
        // Enigma finale
        if (logEl) logEl.textContent = `Enigma dello Spirito: "${spirit.riddle}"`;
        await host.say(`Ascoltate bene l’enigma: "${spirit.riddle}"`, { mood: 'think' });

        const options = [
          spirit.secretWord,
          'TEMPO',
          'OMBRELLO',
          'SILENZIO'
        ].sort(() => Math.random() - 0.5);

        const rightIdx = options.indexOf(spirit.secretWord);

        const res = await ctx.ask({
          q: `Enigma di ${spirit.name}: "${spirit.riddle}"`,
          opts: options,
          right: rightIdx,
          time: 20,
          cat: 'ENIGMA DELL’OLTRETOMBA',
          player: activePlayer
        });

        if (res.ok) {
          ctx.addScore(activePlayer, 2500);
          sfx.ok();
          S.flashWith('#a855f7');
          await spellWord(spirit.secretWord);
          await host.say(`ESATTO! ${spirit.secretWord}! L’anima di ${spirit.name} è finalmente libera! Che colpo da maestri!`, { mood: 'celebrate' });
        } else {
          sfx.bad();
          await host.say(`Sbagliato! La risposta era ${spirit.secretWord}! Uno scricchiolio sinistro rimbomba nella stanza!`, { mood: 'wrong' });
        }
      }

      await ctx.sleep(1000);
    }

    // Chiusura rituale della tavola: ARRIVEDERCI
    if (logEl) logEl.textContent = 'Diciamo tutti insieme: ARRIVEDERCI!';
    await movePlanchetteTo('GOODBYE');
    sfx.bell();
    await host.say(`ARRIVEDERCI! La seduta è terminata, il cerchio è sigillato! Chiudete la porta e non guardate indietro!`, { mood: 'outro' });

    ctx.finish({
      win: true,
      title: 'Seduta Spiritica Conclusa!',
      lines: [`Avete affrontato l’Oltretomba con coraggio e decifrato i messaggi di ${spirit.name}!`]
    });

    ctx.onExit(() => {
      container.remove();
    });
  }
};
