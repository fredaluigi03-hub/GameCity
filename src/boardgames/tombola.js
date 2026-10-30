// Tombola Napoletana — 90 numeri, Smorfia Napoletana tradizionale, O' Panariello ed estrazione animata
import { newStage, PAL } from '../engine.js';
import { h, sfx, shuffle, getGameSpeed } from '../ui.js';
import { createHost } from '../host.js';
import { SMORFIA } from './tombola-data.js';
import { generateCartella, evaluateCard, checkNextPrize, PRIZE_TIERS } from './tombola-rules.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export default {
  id: 'tombola',
  name: 'Tombola Napoletana',
  tag: 'Gioco da tavola · Tradizione & Smorfia',
  desc: '90 numeri, O’ Panariello, la vera Smorfia Napoletana e vincite dall’Ambo alla Tombola!',
  c1: '#f59e0b',
  c2: '#dc2626',
  players: { min: 1, max: 6, def: 4 },
  rules: [
    'O’ Panariello estrae uno alla volta i 90 numeri tradizionali napoletani.',
    'Ogni numero ha il suo significato verace nella Smorfia Napoletana.',
    'I giocatori hanno la propria cartella (3 righe da 5 numeri ciascuna).',
    'Si vince in ordine progressivo: Ambo (2), Terno (3), Quaterna (4), Cinquina (5) e TOMBOLA (15 numeri)!',
    'Gioca da solo con la CPU o sfida gli amici in multiplayer dal divano.'
  ],
  async start(ctx) {
    const S = ctx.stage = newStage({
      c1: this.c1,
      c2: this.c2,
      bg: '#080c16',
      cam: [0, 4.2, 14],
      look: [0, 2.5, 0]
    });

    const host = createHost(ctx, 'tombola');
    const P = ctx.players;
    const drawnNumbers = [];
    const drawnSet = new Set();
    const urn = shuffle(Array.from({ length: 90 }, (_, i) => i + 1));
    const claimedPrizes = new Set();
    let isAutoExtract = false;
    let autoInterval = null;

    // Assegna una cartella a ciascun giocatore
    P.forEach((p, idx) => {
      p.data.cartella = generateCartella(idx + 1);
      p.data.marked = new Set();
      p.data.prizes = [];
    });

    // Render container
    const wrap = h('div', 'tombolaWrap');
    ctx.sideAdd(wrap);

    // Header Panariello + Ultimo Estratto
    const headerEl = h('div', 'tombolaHeader');
    headerEl.innerHTML = `
      <div class="panarielloBox">
        <div class="panarielloBall" id="tbBall">?</div>
        <div class="smorfiaText" id="tbSmorfia">
          <b>Pronti a giocare!</b>
          <span>Gira il Panariello...</span>
        </div>
      </div>
      <div class="hudR" id="tbControls"></div>
    `;

    // Tabellone 90 numeri
    const tabelloneEl = h('div', 'tombolaTabellone');
    const tbCells = [];
    for (let i = 1; i <= 90; i++) {
      const cell = h('div', 'tbCell', String(i));
      cell.dataset.num = String(i);
      tabelloneEl.append(cell);
      tbCells[i] = cell;
    }

    // Grid delle Cartelle
    const cardsGrid = h('div', 'tombolaCardsGrid');

    wrap.append(headerEl, tabelloneEl, cardsGrid);

    function renderCartelle() {
      cardsGrid.replaceChildren(...P.map(p => {
        const c = p.data.cartella;
        const cardBox = h('div', 'tombolaCard' + (p === ctx.active ? ' active' : ''));
        cardBox.style.setProperty('--pc', p.color);

        const cardHdr = h('div', 'tombolaCardHeader');
        cardHdr.innerHTML = `<span>${esc(p.name)}${p.bot ? ' <small>CPU</small>' : ''}</span><b>${p.data.prizes.join(' · ') || 'In attesa'}</b>`;

        const table = h('div', 'tombolaCardTable');
        for (let r = 0; r < 3; r++) {
          for (let col = 0; col < 9; col++) {
            const num = c.grid[r][col];
            if (!num) {
              table.append(h('div', 'tCell empty'));
            } else {
              const isMarked = p.data.marked.has(num);
              const cell = h('div', 'tCell' + (isMarked ? ' marked' : ''), String(num));
              cell.onclick = () => {
                if (drawnSet.has(num)) {
                  p.data.marked.add(num);
                  cell.classList.add('marked');
                  sfx.click();
                  checkWins();
                }
              };
              table.append(cell);
            }
          }
        }
        cardBox.append(cardHdr, table);
        return cardBox;
      }));
    }

    renderCartelle();

    await host.say(`Ué, benvenuti alla Tombola Napoletana! Prendete le cartelle e sturatevi le orecchie!`, { mood: 'happy' });

    // Funzione estrazione numero
    async function extractNext() {
      if (!urn.length) {
        stopAuto();
        return;
      }
      sfx.tumble();
      const num = urn.pop();
      drawnNumbers.push(num);
      drawnSet.add(num);

      // Aggiorna grafica tabellone
      tbCells[num]?.classList.add('drawn');

      // Aggiorna sfera & smorfia
      const ballEl = document.getElementById('tbBall');
      const smorfiaEl = document.getElementById('tbSmorfia');
      if (ballEl) ballEl.textContent = String(num);

      const info = SMORFIA[num] || { nap: `Numero ${num}`, it: `Numero ${num}` };
      if (smorfiaEl) {
        smorfiaEl.innerHTML = `<b>${num} · ${esc(info.nap)}</b><span>${esc(info.it)}</span>`;
      }

      // Voice call & commenti
      sfx.tick();
      if (Math.random() < 0.28) {
        host.say(`${num}! ${info.nap}! ${info.it}!`, { mood: 'happy' });
      }

      // Marcatura automatica per CPU e giocatori
      P.forEach(p => {
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 9; c++) {
            if (p.data.cartella.grid[r][c] === num) {
              p.data.marked.add(num);
            }
          }
        }
      });

      renderCartelle();
      await checkWins();
    }

    // Controllo vincite
    async function checkWins() {
      for (const p of P) {
        const prize = checkNextPrize(claimedPrizes, p.data.cartella, p.data.marked);
        if (prize) {
          claimedPrizes.add(prize.id);
          p.data.prizes.push(prize.name);
          ctx.addScore(p, prize.points);

          sfx.ok();
          S.flashWith('#f59e0b');

          if (prize.id === 'tombola') {
            stopAuto();
            sfx.fanfare();
            S.burst('#f59e0b', 220);
            await host.say(`TOMBOLA! Tombola verace! ${p.name} ha fatto Tombola! Mamma mia che c***o [BEEP] di serata!`, { mood: 'celebrate' });
            await ctx.sleep(2000);
            ctx.finish({
              win: !p.bot,
              title: `TOMBOLA di ${p.name}!`,
              lines: [`Vincitore della Tombola Napoletana con ${p.score.toLocaleString('it-IT')} punti!`]
            });
            return;
          } else {
            await host.say(`${prize.name.toUpperCase()} per ${p.name}! Bravissimo! Si va avanti!`, { mood: 'happy' });
          }
        }
      }
    }

    function startAuto() {
      if (isAutoExtract) return;
      isAutoExtract = true;
      const speed = getGameSpeed();
      const delay = Math.max(1200, Math.round(2800 / speed));
      autoInterval = setInterval(extractNext, delay);
      updateControls();
    }

    function stopAuto() {
      isAutoExtract = false;
      clearInterval(autoInterval);
      updateControls();
    }

    function updateControls() {
      const controls = document.getElementById('tbControls');
      if (!controls) return;
      controls.replaceChildren();

      const singleBtn = h('button', 'btn pill', '🎲 Estrai');
      singleBtn.onclick = () => { stopAuto(); extractNext(); };

      const autoBtn = h('button', 'btn pill pri', isAutoExtract ? '⏸ Pausa' : '▶ Auto');
      autoBtn.onclick = () => { if (isAutoExtract) stopAuto(); else startAuto(); };

      controls.append(singleBtn, autoBtn);
    }

    updateControls();

    ctx.onExit(() => {
      clearInterval(autoInterval);
      wrap.remove();
    });
  }
};
