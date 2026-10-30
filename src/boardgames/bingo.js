// Gran Bingo VIP — Sala da gioco di lusso, estrazione automatica/manuale, Cinquina e BINGO!
import { newStage } from '../engine.js';
import { h, sfx, shuffle, getGameSpeed } from '../ui.js';
import { createHost } from '../host.js';
import { generateBingoTicket, evaluateBingoCard } from './bingo-rules.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export default {
  id: 'bingo',
  name: 'Gran Bingo VIP',
  tag: 'Gioco da tavola · Sala Casinò VIP',
  desc: 'La grande sala Bingo: sfera rotante, 90 palline, premi per Cinquina e Jackpot BINGO!',
  c1: '#38bdf8',
  c2: '#1d4ed8',
  players: { min: 1, max: 6, def: 4 },
  rules: [
    '90 palline numerate vengono estratte dalla sfera di cristallo illuminata.',
    'I giocatori hanno cartelle elettroniche da 15 numeri.',
    'Primo premio: la Cinquina (5 numeri sulla stessa riga).',
    'Premio finale: il grande BINGO (tutti i 15 numeri della cartella)!',
    'La cartella segnala in tempo reale quanti numeri mancano al colpo grosso.'
  ],
  async start(ctx) {
    const S = ctx.stage = newStage({
      c1: this.c1,
      c2: this.c2,
      bg: '#070b18',
      cam: [0, 4.2, 14],
      look: [0, 2.5, 0]
    });

    const host = createHost(ctx, 'bingo');
    const P = ctx.players;
    const drawnNumbers = [];
    const drawnSet = new Set();
    const urn = shuffle(Array.from({ length: 90 }, (_, i) => i + 1));
    let hasCinquinaWon = false;
    let isAuto = false;
    let autoTimer = null;

    P.forEach((p, idx) => {
      p.data.ticket = generateBingoTicket(idx + 1);
      p.data.marked = new Set();
      p.data.status = 'In gioco';
    });

    const wrap = h('div', 'bingoWrap');
    ctx.sideAdd(wrap);

    // Display estrazione VIP
    const screenEl = h('div', 'bingoScreen');
    screenEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;">
        <div class="bingoBallBig" id="bgBall">?</div>
        <div>
          <span class="bingoBadge">ULTIMA CHIAMATA</span>
          <h2 id="bgText" style="margin:4px 0 0;font-size:1.35rem;color:#ffffff;">In attesa dell’estrazione...</h2>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <div class="bingoHistory" id="bgHistory"></div>
        <div id="bgControls" style="display:flex;gap:8px;"></div>
      </div>
    `;

    // Tabellone 90 numeri
    const tabelloneEl = h('div', 'tombolaTabellone');
    const tbCells = [];
    for (let i = 1; i <= 90; i++) {
      const cell = h('div', 'tbCell', String(i));
      tabelloneEl.append(cell);
      tbCells[i] = cell;
    }

    // Grid delle Cartelle
    const ticketsGrid = h('div', 'tombolaCardsGrid');

    wrap.append(screenEl, tabelloneEl, ticketsGrid);

    function renderTickets() {
      ticketsGrid.replaceChildren(...P.map(p => {
        const t = p.data.ticket;
        const evaluation = evaluateBingoCard(t, p.data.marked);
        const cardBox = h('div', 'tombolaCard' + (evaluation.toBingo <= 2 ? ' winner' : ''));
        cardBox.style.setProperty('--pc', p.color);

        let statusText = 'In gioco';
        if (evaluation.hasBingo) statusText = 'BINGO!';
        else if (evaluation.toBingo === 1) statusText = '🔥 -1 AL BINGO!';
        else if (evaluation.toBingo === 2) statusText = '⚡ -2 AL BINGO';
        else if (!hasCinquinaWon && evaluation.maxLine === 4) statusText = '✨ -1 A CINQUINA';

        const cardHdr = h('div', 'tombolaCardHeader');
        cardHdr.innerHTML = `<span>${esc(p.name)}${p.bot ? ' <small>CPU</small>' : ''}</span><b style="color:var(--ac);">${statusText}</b>`;

        const table = h('div', 'tombolaCardTable');
        for (let r = 0; r < 3; r++) {
          for (let col = 0; col < 9; col++) {
            const num = t.grid[r][col];
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
                  checkBingoWins();
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

    renderTickets();

    await host.say(`Ladies and gentlemen, benvenuti al Gran Bingo VIP! Sfera caricata e tabellone acceso!`, { mood: 'happy' });

    async function extractBall() {
      if (!urn.length) {
        stopAuto();
        return;
      }
      sfx.tumble();
      const num = urn.pop();
      drawnNumbers.push(num);
      drawnSet.add(num);

      tbCells[num]?.classList.add('drawn');

      const ballEl = document.getElementById('bgBall');
      const textEl = document.getElementById('bgText');
      const histEl = document.getElementById('bgHistory');

      if (ballEl) ballEl.textContent = String(num);
      if (textEl) textEl.textContent = `Numero estratto: ${num}!`;

      if (histEl) {
        const last5 = drawnNumbers.slice(-5).reverse();
        histEl.innerHTML = last5.map(n => `<div class="bingoHistoryBall">${n}</div>`).join('');
      }

      // Marcatura automatica
      P.forEach(p => {
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 9; c++) {
            if (p.data.ticket.grid[r][c] === num) {
              p.data.marked.add(num);
            }
          }
        }
      });

      renderTickets();
      await checkBingoWins();
    }

    async function checkBingoWins() {
      for (const p of P) {
        const ev = evaluateBingoCard(p.data.ticket, p.data.marked);

        // Controllo Cinquina
        if (!hasCinquinaWon && ev.hasCinquina) {
          hasCinquinaWon = true;
          ctx.addScore(p, 2500);
          sfx.ok();
          S.flashWith('#38bdf8');
          await host.say(`CINQUINA per ${p.name}! Primo traguardo raggiunto, ma la vera caccia è al BINGO!`, { mood: 'happy' });
        }

        // Controllo Bingo
        if (ev.hasBingo) {
          stopAuto();
          sfx.fanfare();
          S.burst('#38bdf8', 260);
          await host.say(`BIIINGO! BINGO CONFERMATO! ${p.name} ha sbancato la sala! Un applauso gigantesco!`, { mood: 'win' });
          await ctx.sleep(2200);
          ctx.finish({
            win: !p.bot,
            title: `BINGO di ${p.name}!`,
            lines: [`Jackpot VIP vinto con ${p.score.toLocaleString('it-IT')} punti!`]
          });
          return;
        }
      }
    }

    function startAuto() {
      if (isAuto) return;
      isAuto = true;
      const speed = getGameSpeed();
      const delay = Math.max(1100, Math.round(2600 / speed));
      autoTimer = setInterval(extractBall, delay);
      updateControls();
    }

    function stopAuto() {
      isAuto = false;
      clearInterval(autoTimer);
      updateControls();
    }

    function updateControls() {
      const controls = document.getElementById('bgControls');
      if (!controls) return;
      controls.replaceChildren();

      const singleBtn = h('button', 'btn pill', '🎱 Estrai');
      singleBtn.onclick = () => { stopAuto(); extractBall(); };

      const autoBtn = h('button', 'btn pill pri', isAuto ? '⏸ Pausa' : '▶ Auto');
      autoBtn.onclick = () => { if (isAuto) stopAuto(); else startAuto(); };

      controls.append(singleBtn, autoBtn);
    }

    updateControls();

    ctx.onExit(() => {
      clearInterval(autoTimer);
      wrap.remove();
    });
  }
};
