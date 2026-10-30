import { BOARD, CHANCE, CHEST, GROUPS } from './data.js';
import {
  START_CASH, GO_SALARY, rentDue, canBuild, canSell, build, sellBuilding,
  mortgageValue, unmortgageCost, netWorth, ownedBy, groupFor, transferable, resolveCardMovement
} from './rules.js';
import { h, sfx, shuffle, sleep, getGameSpeed } from '../ui.js';
import { createHost } from '../host.js';
import { newStage } from '../engine.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = n => `${Math.floor(n).toLocaleString('it-IT')} $`;
const color = {
  brown: '#8b4513', lightblue: '#38bdf8', pink: '#ec4899', orange: '#f97316',
  red: '#ef4444', yellow: '#eab308', green: '#22c55e', darkblue: '#2563eb'
};
const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default {
  id: 'monopoly',
  name: 'Monopoly',
  tag: 'Gioco da tavolo · Classic Tabletop',
  desc: 'Compra proprietà, costruisci case e hotel, contratta e manda in bancarotta gli avversari!',
  c1: '#22c55e',
  c2: '#2563eb',
  players: { min: 1, max: 6, def: 4, rival: true },
  difficulty: true,
  rules: [
    'Tavolo da gioco immersivo: lancia i dadi e muovi la tua pedina casella per casella lungo il tabellone.',
    'Ogni passaggio dal VIA! accredita 200 $ di stipendio.',
    'Compra proprietà libere, partecipa ad aste spietate, costruisci case e alberghi per moltiplicare gli affitti.',
    'Carte Imprevisti e Probabilità, Prigione, Tasse e contrattazioni libere tra giocatori.',
    'Vince chi resta l’ultimo magnate solvibile sul tabellone!'
  ],
  async start(ctx) {
    const S = ctx.stage = newStage({
      c1: this.c1,
      c2: this.c2,
      bg: '#070f0b',
      cam: [0, 4.6, 14],
      look: [0, 2.5, 0]
    });

    const host = createHost(ctx, 'monopoly');
    const P = ctx.players;
    const boardState = {
      owners: Array(40).fill(null),
      houses: Array(40).fill(0),
      mortgages: new Set(),
      bank: { houses: 32, hotels: 12 },
      players: P,
      current: 0
    };

    P.forEach((p, i) => Object.assign(p.data, {
      cash: START_CASH,
      pos: 0,
      jail: 0,
      jailCard: 0,
      doubles: 0,
      bankrupt: false,
      seat: i
    }));

    const wrap = h('div', 'monopolyBoardWrap');
    ctx.sideAdd(wrap);

    const board = h('section', 'monopolyBoard');
    board.setAttribute('aria-label', 'Tabellone Monopoly');
    wrap.append(board);

    const cells = BOARD.map((cell, i) => {
      const n = h('div', 'monopolyCell ' + cell.type);
      n.dataset.index = i;
      board.append(n);
      return n;
    });

    const center = h('div', 'monopolyCenter');
    center.style.gridColumn = '2 / 11';
    center.style.gridRow = '2 / 11';
    center.innerHTML = `
      <div class="monoBrand">MONOPOLY</div>
      <div class="monoCenterTitle">EDIZIONE SPECIALE STUDIO</div>
      <div id="monoDiceBox" style="font-size:2.4rem;min-height:48px;display:flex;gap:12px;align-items:center;margin:4px 0;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));">🎲 🎲</div>
      <div class="monoLog" aria-live="polite"></div>
      <div class="monoPlayers"></div>
      <div class="monoSupply"></div>
    `;
    board.append(center);

    const logEl = center.querySelector('.monoLog');
    const playerEl = center.querySelector('.monoPlayers');
    const supplyEl = center.querySelector('.monoSupply');
    const diceBoxEl = center.querySelector('#monoDiceBox');

    let deckChance = shuffle(CHANCE);
    let deckChest = shuffle(CHEST);
    let log = [];
    let finished = false;

    const logMsg = s => {
      log.unshift(s);
      log = log.slice(0, 3);
      if (logEl) logEl.innerHTML = log.map(x => `<div>${x}</div>`).join('');
    };

    const cp = p => `<i class="monoToken" style="--pc:${p.color}" title="${esc(p.name)}">${esc(p.name.slice(0, 1).toUpperCase())}</i>`;

    function paint(highlightIdx = -1) {
      BOARD.forEach((c, i) => {
        const e = cells[i];
        const owner = boardState.owners[i];
        const level = boardState.houses[i] || 0;
        const row = i === 0 ? `${i}` : String(i).padStart(2, '0');
        const vertical = (i >= 11 && i <= 19) || i >= 31;
        const displayName = c.itName || c.name;

        e.className = `monopolyCell ${c.type}${vertical ? ' v' : ''}${i === highlightIdx ? ' active-target' : ''}`;
        e.style.setProperty('--cell-color', color[c.color] || '#38bdf8');
        e.innerHTML = `
          <span class="monoNo">${row}</span>
          ${c.color ? '<b class="monoStripe"></b>' : ''}
          <strong>${esc(displayName)}</strong>
          ${c.price ? `<small>${money(c.price)}</small>` : ''}
          ${owner != null ? `<span class="monoOwner" style="--pc:${P[owner].color}"></span>` : ''}
          ${level ? `<span class="monoBuild">${level === 5 ? 'HOTEL' : '🏠'.repeat(level)}</span>` : ''}
          <span class="monoPawns">${P.filter(p => !p.data.bankrupt && p.data.pos === i).map(cp).join('')}</span>
        `;
        e.dataset.side = vertical ? 'v' : 'h';

        if (i <= 10) { e.style.gridColumn = String(11 - i); e.style.gridRow = '11'; }
        else if (i <= 20) { e.style.gridColumn = '1'; e.style.gridRow = String(21 - i); }
        else if (i <= 30) { e.style.gridColumn = String(i - 19); e.style.gridRow = '1'; }
        else { e.style.gridColumn = '11'; e.style.gridRow = String(i - 29); }
      });

      playerEl.innerHTML = P.map(p => `
        <div class="monoPlayer ${p.data.bankrupt ? 'bankrupt' : ''}" style="--pc:${p.color}">
          <i></i>
          <span>${esc(p.name)}${p.bot ? ' · CPU' : ''}</span>
          <b>${money(p.data.cash)}</b>
        </div>
      `).join('');

      supplyEl.textContent = `Case rimaste: ${boardState.bank.houses}/32 · Hotel: ${boardState.bank.hotels}/12`;
      ctx.hud(`<span class="pill">Turno: <b>${esc(P[boardState.current]?.name || '—')}</b></span>`);
    }

    const active = () => P.filter(p => !p.data.bankrupt);
    const current = () => P[boardState.current];

    const show = (title, body, actions) => {
      const card = h('div', 'card monopolyAction', `<p class="kicker">MONOPOLY · ${title}</p><div class="monoBody">${body}</div>`);
      const row = h('div', 'row');
      for (const [label, fn, cls = 'btn'] of actions) {
        const b = h('button', cls, label);
        b.onclick = fn;
        row.append(b);
      }
      card.append(row);
      ctx.dock(card);
      return card;
    };

    const ask = (title, body, buttons) => new Promise(resolve => {
      let done = false;
      const finish = v => { if (done) return; done = true; resolve(v); };
      show(title, body, buttons.map(([label, val, cls]) => [label, () => finish(val), cls]));
    });

    // Movimento animato casella per casella
    async function animatedMoveTo(p, targetPos, collect = true) {
      const startPos = p.data.pos;
      const steps = (targetPos - startPos + 40) % 40;
      const speed = getGameSpeed();
      let cur = startPos;

      for (let s = 1; s <= steps; s++) {
        cur = (startPos + s) % 40;
        if (collect && cur === 0 && startPos !== 0) {
          p.data.cash += GO_SALARY;
          sfx.ok();
          logMsg(`${esc(p.name)} passa dal VIA e ritira ${money(GO_SALARY)}!`);
        }
        p.data.pos = cur;
        sfx.click();
        paint(cur);
        await sleep(140 / speed);
      }
      p.data.pos = targetPos;
      paint(targetPos);
    }

    // Lancio animato dei dadi
    async function rollDiceAnim() {
      sfx.dice();
      const speed = getGameSpeed();
      for (let i = 0; i < 6; i++) {
        const f1 = DICE_FACES[Math.floor(Math.random() * 6)];
        const f2 = DICE_FACES[Math.floor(Math.random() * 6)];
        if (diceBoxEl) diceBoxEl.textContent = `${f1}  ${f2}`;
        await sleep(60 / speed);
      }
      const d1 = 1 + Math.floor(Math.random() * 6);
      const d2 = 1 + Math.floor(Math.random() * 6);
      if (diceBoxEl) diceBoxEl.textContent = `${DICE_FACES[d1 - 1]}  ${DICE_FACES[d2 - 1]}`;
      return [d1, d2];
    }

    async function chooseManage(p) {
      while (!p.bot) {
        const owned = ownedBy(boardState, p.data.seat);
        const choices = [['🎲 Tira i dadi', 'roll', 'btn pri']];
        if (owned.some(i => canBuild(boardState, i, p.data.seat))) choices.push(['🏠 Costruisci', 'build', 'btn']);
        if (owned.some(i => canSell(boardState, i, p.data.seat))) choices.push(['Vendi case', 'sell', 'btn']);
        if (owned.some(i => !boardState.mortgages.has(i) && !(boardState.houses[i] || 0) && (!groupFor(i) || GROUPS[groupFor(i)].every(j => !(boardState.houses[j] || 0))))) choices.push(['Ipoteca', 'mortgage', 'btn']);
        if (owned.some(i => boardState.mortgages.has(i))) choices.push(['Riscatta ipoteca', 'unmortgage', 'btn']);
        if (active().length > 1) choices.push(['🤝 Scambia', 'trade', 'btn']);
        choices.push(['Termina partita', 'end', 'btn danger']);

        const action = await ask('Gestione proprietà', `<p>Saldo: <b>${money(p.data.cash)}</b> · ${owned.length} proprietà possedute</p>`, choices);
        if (action === 'roll') return true;
        if (action === 'end') { await finishGame('Partita terminata dai giocatori'); return false; }
        if (['build', 'sell', 'mortgage', 'unmortgage'].includes(action)) await manageOne(p, action);
        if (action === 'trade') await trade(p);
      }
      return true;
    }

    async function manageOne(p, action) {
      const ids = ownedBy(boardState, p.data.seat).filter(i =>
        action === 'build' ? canBuild(boardState, i, p.data.seat) :
        action === 'sell' ? canSell(boardState, i, p.data.seat) :
        action === 'mortgage' ? (!boardState.mortgages.has(i) && !(boardState.houses[i] || 0) && (!groupFor(i) || GROUPS[groupFor(i)].every(j => !(boardState.houses[j] || 0)))) :
        boardState.mortgages.has(i)
      );
      if (!ids.length) return;

      const id = await ask('Scegli proprietà', `<p>Saldo: ${money(p.data.cash)}</p>`, [
        ...ids.map(i => [`${BOARD[i].itName || BOARD[i].name} · ${action === 'build' ? money(BOARD[i].house) : ''}`, i]),
        ['Indietro', null]
      ]);
      if (id == null) return;

      if (action === 'build') {
        build(boardState, id, p.data.seat);
        sfx.click();
        logMsg(`${esc(p.name)} costruisce su ${esc(BOARD[id].itName || BOARD[id].name)}.`);
      }
      if (action === 'sell') {
        sellBuilding(boardState, id, p.data.seat);
        logMsg(`${esc(p.name)} vende una casa.`);
      }
      if (action === 'mortgage') {
        boardState.mortgages.add(id);
        p.data.cash += mortgageValue(id);
      }
      if (action === 'unmortgage' && p.data.cash >= unmortgageCost(id)) {
        p.data.cash -= unmortgageCost(id);
        boardState.mortgages.delete(id);
      }
      paint(id);
    }

    async function trade(p) {
      const rivals = active().filter(q => q !== p);
      if (!rivals.length) return;
      const opponent = await ask('Scambio commerciale', 'Con chi vuoi negoziare?', rivals.map(q => [q.name, q.data.seat]));
      if (opponent == null) return;
      const q = P[opponent];
      const mine = ownedBy(boardState, p.data.seat).filter(i => transferable(boardState, i));
      const theirs = ownedBy(boardState, q.data.seat).filter(i => transferable(boardState, i));

      const give = await ask('La tua offerta', 'Scegli una proprietà da offrire.', [
        ['Nessuna proprietà', 'none'],
        ...mine.map(i => [BOARD[i].itName || BOARD[i].name, i]),
        ['Annulla', 'cancel']
      ]);
      if (give === 'cancel') return;

      const get = await ask('La tua richiesta', `Scegli una proprietà di ${esc(q.name)} da ricevere.`, [
        ['Nessuna proprietà', 'none'],
        ...theirs.map(i => [BOARD[i].itName || BOARD[i].name, i]),
        ['Annulla', 'cancel']
      ]);
      if (get === 'cancel') return;

      const giveCash = await ask('Soldi da offrire', 'Quanti soldi aggiungi alla tua offerta?', [
        ['0 $', 0], ...[50, 100, 200, 500].filter(n => n <= p.data.cash).map(n => [money(n), n]), ['Annulla', 'cancel']
      ]);
      if (giveCash === 'cancel') return;

      const getCash = await ask('Soldi da chiedere', `Quanti soldi chiedi a ${esc(q.name)}?`, [
        ['0 $', 0], ...[50, 100, 200, 500].filter(n => n <= q.data.cash).map(n => [money(n), n]), ['Annulla', 'cancel']
      ]);
      if (getCash === 'cancel') return;

      if (give === 'none' && get === 'none' && !giveCash && !getCash) return;

      const offerValue = (give === 'none' ? 0 : BOARD[give].price) + giveCash;
      const requestValue = (get === 'none' ? 0 : BOARD[get].price) + getCash;
      const summary = `<p><b>${esc(p.name)}</b> offre: ${give === 'none' ? 'nessuna proprietà' : esc(BOARD[give].itName || BOARD[give].name)} + ${money(giveCash)}</p><p>Per ricevere da <b>${esc(q.name)}</b>: ${get === 'none' ? 'nessuna proprietà' : esc(BOARD[get].itName || BOARD[get].name)} + ${money(getCash)}</p>`;

      let accepted;
      if (q.bot) {
        await ctx.botThink(500, 900);
        accepted = requestValue <= offerValue * (0.72 + (q.skill || 0.6) * 0.45);
      } else {
        await ctx.passDevice(q);
        accepted = await ask('Proposta di scambio', summary, [['Accetta accordo', true, 'btn pri'], ['Rifiuta', false, 'btn']]);
      }

      if (!accepted) {
        logMsg(`${esc(q.name)} rifiuta lo scambio.`);
        return;
      }
      if (give !== 'none') boardState.owners[give] = q.data.seat;
      if (get !== 'none') boardState.owners[get] = p.data.seat;
      p.data.cash += getCash - giveCash;
      q.data.cash += giveCash - getCash;
      logMsg('Accordo commerciale concluso con successo!');
      paint();
    }

    async function cardDraw(p, kind, diceTotal = 0) {
      const deck = kind === 'chance' ? deckChance : deckChest;
      const card = deck.shift();
      deck.push(card);
      const title = kind === 'chance' ? 'Imprevisti' : 'Probabilità';
      logMsg(`${title}: ${esc(card.text)}.`);
      sfx.whoosh();

      await ask(title, `<p style="font-size:1.15rem;margin:12px 0;">«${esc(card.text)}»</p>`, [['OK', true, 'btn pri']]);

      if (card.jail) {
        p.data.pos = 10;
        p.data.jail = 3;
        sfx.bad();
        await host.say(`Dritto in prigione senza passare dal Via! Che colpo di sfortuna, ${p.name}!`, { mood: 'wrong' });
        paint(10);
        return;
      }
      if (card.jailCard) {
        p.data.jailCard++;
        return;
      }
      const movement = resolveCardMovement(p.data.pos, card);
      if (movement) {
        if (movement.collectGo) p.data.cash += GO_SALARY;
        await animatedMoveTo(p, movement.position, false);
        return land(p, diceTotal, movement.rentMultiplier);
      }
      if (card.cash > 0) {
        p.data.cash += card.cash;
        sfx.ok();
      } else if (card.cash < 0) {
        await pay(p, null, -card.cash);
      }
      if (card.collectEach) {
        for (const q of P) if (q !== p && !q.data.bankrupt) await pay(q, p, card.collectEach);
      }
      if (card.payEach) {
        for (const q of P) if (q !== p && !q.data.bankrupt) await pay(p, q, card.payEach);
      }
      if (card.repair) {
        const cost = ownedBy(boardState, p.data.seat).reduce((a, i) =>
          a + ((boardState.houses[i] || 0) === 5 ? card.repair[1] : (boardState.houses[i] || 0) * card.repair[0]), 0);
        if (cost) await pay(p, null, cost);
      }
      paint();
    }

    async function land(p, dice, mult = 1) {
      const i = p.data.pos;
      const c = BOARD[i];
      const owner = boardState.owners[i];
      const name = c.itName || c.name;
      logMsg(`${esc(p.name)} si ferma su ${esc(name)}.`);

      if (c.type === 'tax') {
        await pay(p, null, c.amount);
        sfx.bad();
        logMsg(`${esc(p.name)} paga ${money(c.amount)} di tasse.`);
        return;
      }
      if (c.type === 'gotojail') {
        p.data.pos = 10;
        p.data.jail = 3;
        sfx.bad();
        logMsg(`${esc(p.name)} va in prigione.`);
        await host.say(`Ma che c***o [BEEP] fai?! In prigione senza passare dal Via!`, { mood: 'wrong' });
        paint(10);
        return;
      }
      if (c.type === 'chance' || c.type === 'chest') {
        return cardDraw(p, c.type, dice);
      }
      if ((c.type === 'property' || c.type === 'railroad' || c.type === 'utility') && owner == null) {
        const cost = c.price;
        const deedHtml = `
          <div style="border-top:5px solid ${color[c.color] || '#38bdf8'};padding-top:8px;">
            <h2 style="margin-bottom:6px;">${esc(name)}</h2>
            <p>Prezzo d’acquisto: <b>${money(cost)}</b></p>
            <p style="font-size:0.85rem;color:var(--mut);">Il tuo saldo attuale: <b>${money(p.data.cash)}</b></p>
          </div>
        `;
        const buy = p.bot ?
          p.data.cash >= cost && Math.random() < (0.45 + (p.skill || 0.6) * 0.45) :
          await ask('Proprietà in vendita', deedHtml, [
            ['Acquista proprietà', true, 'btn pri'],
            ['Metti all’asta', false, 'btn']
          ]);

        if (buy && p.data.cash >= cost) {
          p.data.cash -= cost;
          boardState.owners[i] = p.data.seat;
          sfx.ok();
          logMsg(`${esc(p.name)} acquista ${esc(name)} per ${money(cost)}.`);
          if (c.price >= 300) {
            await host.say(`Che colpo, ${p.name}! Hai acquistato ${name}! Un vero squalo della finanza!`, { mood: 'celebrate' });
          }
          paint(i);
          return;
        }
        if (!buy) await auction(i);
        return;
      }
      if (owner != null && owner !== p.data.seat) {
        const due = rentDue({ ...boardState, current: p.data.seat }, i, dice, mult);
        if (due) {
          await pay(p, P[owner], due);
          sfx.bad();
          logMsg(`${esc(p.name)} paga ${money(due)} di affitto a ${esc(P[owner].name)}.`);
          if (due >= 200) {
            await host.say(`Porca p***a [BEEP]! ${money(due)} di affitto a ${P[owner].name}! Questa fa male al portafogli!`, { mood: 'wrong' });
          }
        }
      }
    }

    async function auction(i) {
      const alive = active().filter(p => p.data.cash >= 10);
      if (!alive.length) return;
      let high = 0, leader = null, bidders = [...alive];
      const propName = BOARD[i].itName || BOARD[i].name;

      logMsg(`Asta per ${esc(propName)}!`);
      while (bidders.length) {
        const p = bidders.shift();
        let bid = 0;
        if (p.bot) {
          const cap = Math.min(p.data.cash - 10, Math.floor(BOARD[i].price * (0.65 + (p.skill || 0.6) * 0.7)));
          bid = cap > high ? Math.min(cap, high + 10) : 0;
          await ctx.botThink(250, 500);
        } else {
          await ctx.passDevice(p);
          const options = [['Rilancia +10 $', Math.min(p.data.cash, high + 10), 'btn pri']];
          if (p.data.cash >= high + 50) options.push(['Rilancia +50 $', high + 50, 'btn']);
          options.push([p === leader ? 'Tengo offerta' : 'Lascio asta', 0, 'btn']);
          bid = await ask('Asta in corso', `<p>Oggetto: <b>${esc(propName)}</b> · Offerta attuale: <b>${money(high)}</b>${leader ? ` (${esc(leader.name)})` : ''}</p>`, options);
        }
        if (bid > high) {
          if (leader && leader !== p) bidders.push(leader);
          high = bid;
          leader = p;
        }
      }
      if (leader) {
        leader.data.cash -= high;
        boardState.owners[i] = leader.data.seat;
        sfx.ok();
        logMsg(`${esc(leader.name)} si aggiudica l’asta per ${money(high)}.`);
        paint(i);
      }
    }

    async function pay(from, to, amount) {
      await raise(from, amount);
      if (from.data.cash >= amount) {
        from.data.cash -= amount;
        if (to) to.data.cash += amount;
      } else {
        await bankrupt(from, to);
      }
    }

    async function raise(p, amount) {
      while (p.data.cash < amount) {
        const buildings = ownedBy(boardState, p.data.seat).filter(i => canSell(boardState, i, p.data.seat));
        const ids = ownedBy(boardState, p.data.seat).filter(i =>
          !boardState.mortgages.has(i) && !(boardState.houses[i] || 0) &&
          (!groupFor(i) || GROUPS[groupFor(i)].every(j => !(boardState.houses[j] || 0))));

        if (!buildings.length && !ids.length) break;

        const options = [
          ...buildings.map(i => [`Vendi casa su ${BOARD[i].itName || BOARD[i].name} (+${money(BOARD[i].house / 2)})`, 'sell:' + i]),
          ...ids.map(i => [`Ipoteca ${BOARD[i].itName || BOARD[i].name} (+${money(mortgageValue(i))})`, 'mort:' + i]),
          ['Dichiara bancarotta', null, 'btn danger']
        ];
        let action;
        if (p.bot) {
          action = buildings.length ? 'sell:' + buildings[0] : 'mort:' + ids.sort((a, b) => mortgageValue(b) - mortgageValue(a))[0];
        } else {
          action = await ask('Fondi insufficienti', `<p>Mancano ${money(amount - p.data.cash)}. Ipoteca o vendi edifici.</p>`, options);
        }
        if (action == null) break;
        const [kind, n] = action.split(':');
        const id = Number(n);
        if (kind === 'sell') sellBuilding(boardState, id, p.data.seat);
        else {
          boardState.mortgages.add(id);
          p.data.cash += mortgageValue(id);
        }
        paint(id);
      }
    }

    async function bankrupt(p, creditor) {
      p.data.bankrupt = true;
      sfx.bad();
      logMsg(`${esc(p.name)} ha dichiarato bancarotta.`);
      await host.say(`Bancarotta totale per ${p.name}! Fuori dai giochi con le tasche vuote!`, { mood: 'wrong' });

      const assets = ownedBy(boardState, p.data.seat);
      for (const i of assets) {
        if (creditor) {
          boardState.owners[i] = creditor.data.seat;
          if (boardState.mortgages.has(i)) creditor.data.cash -= Math.ceil(mortgageValue(i) * 0.1);
        } else {
          boardState.owners[i] = null;
          boardState.mortgages.delete(i);
          const level = boardState.houses[i] || 0;
          if (level === 5) boardState.bank.hotels++;
          else boardState.bank.houses += level;
          boardState.houses[i] = 0;
        }
      }
      if (creditor) creditor.data.cash += p.data.cash;
      p.data.cash = 0;
      paint();

      if (!creditor) {
        for (const i of assets) await auction(i);
      }
      if (active().length <= 1) await finishGame('Resta un solo magnate sul tabellone!');
    }

    async function turn(p) {
      if (p.data.bankrupt) return;
      await ctx.passDevice(p);
      ctx.setActive(p);
      paint(p.data.pos);

      if (!p.bot && !await chooseManage(p)) return;

      let extra = true, rolls = 0;
      while (extra && !p.data.bankrupt) {
        extra = false;
        const [d1, d2] = await rollDiceAnim();
        const sum = d1 + d2;
        const dbl = d1 === d2;
        rolls++;
        logMsg(`${esc(p.name)} lancia ${d1} e ${d2} (totale ${sum}).`);

        if (dbl && ++p.data.doubles >= 3) {
          p.data.pos = 10;
          p.data.jail = 3;
          p.data.doubles = 0;
          sfx.bad();
          logMsg(`${esc(p.name)} fa 3 doppi consecutivi e va in prigione!`);
          await host.say(`Tre doppi di fila?! E allora sei recidivo, dritto al gabbio, ${p.name}!`, { mood: 'wrong' });
          paint(10);
          break;
        }

        const targetPos = (p.data.pos + sum) % 40;
        await animatedMoveTo(p, targetPos, true);
        await land(p, sum);

        extra = dbl && !p.data.jail && rolls < 3 && !p.data.bankrupt;
        if (!dbl) p.data.doubles = 0;
        if (extra) {
          logMsg(`${esc(p.name)} ha fatto doppio: diritto a un altro tiro!`);
          if (p.bot) await ctx.botThink(300, 600);
          else await ask('DOPPIO!', 'Hai fatto doppio: tira di nuovo i dadi.', [['Lancia ancora', true, 'btn pri']]);
        }
      }

      if (p.data.bankrupt) return;

      // Bot building AI
      if (p.bot) {
        const ids = ownedBy(boardState, p.data.seat).filter(i => canBuild(boardState, i, p.data.seat));
        for (const i of ids) {
          if (p.data.cash > BOARD[i].house * 2 && Math.random() < 0.25) {
            build(boardState, i, p.data.seat);
          }
        }
      }
      paint();
    }

    async function finishGame(reason) {
      if (finished) return;
      finished = true;
      const ranking = P.map(p => ({ player: p, score: p.data.bankrupt ? 0 : netWorth(boardState, p.data.seat) }));
      const champ = [...ranking].sort((a, b) => b.score - a.score)[0];
      await host.say(`Signore e signori, abbiamo il re del Monopoly: ${champ?.player.name}! Vittoria schiacciante!`, { mood: 'win' });
      ctx.finish({ title: `${champ?.player.name || 'Partita'} vince!`, lines: [reason], ranking });
    }

    await host.say(`Benvenuti al tavolo di Monopoly! I dadi sono pronti, che la scalata immobiliare abbia inizio!`, { mood: 'happy' });

    paint();
    logMsg('La sfida ha inizio.');

    for (let turns = 0; active().length > 1 && !finished; turns++) {
      const p = current();
      await turn(p);
      if (ctx.dead || finished) return;
      if (active().length <= 1) {
        await finishGame('Resta un solo giocatore solvibile!');
        return;
      }
      boardState.current = (boardState.current + 1) % P.length;
      while (P[boardState.current].data.bankrupt) {
        boardState.current = (boardState.current + 1) % P.length;
      }
    }

    ctx.onExit(() => {
      wrap.remove();
    });
  }
};
