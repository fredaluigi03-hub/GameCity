import {h} from '../ui.js';
import {ROWS, COLS, emptyBoard, validColumns, dropDisc, hasFour, winningMove} from './forza4-rules.js';

const other = player => player === 1 ? 2 : 1;

function chooseBotColumn(board, player, skill = .6) {
  const options = validColumns(board);
  if (options.length === 0) return -1;
  const win = options.find(col => winningMove(board, col, player));
  if (win != null) return win;
  const block = options.find(col => winningMove(board, col, other(player)));
  if (block != null && Math.random() < skill) return block;
  if (Math.random() > skill) return options[Math.floor(Math.random() * options.length)];
  const center = options.filter(col => Math.abs(col - 3) <= 1);
  const preferred = center.length ? center : options;
  return preferred[Math.floor(Math.random() * preferred.length)];
}

export default {
  id: 'forza4', name: 'Forza 4', tag: 'Gioco da tavolo',
  desc: 'Allinea quattro pedine prima del tuo avversario.',
  c1: '#e8b94c', c2: '#e15352',
  players: {min: 1, max: 2, def: 2, rival: true}, difficulty: true,
  rules: [
    'A turno, scegli una colonna e lascia cadere una pedina.',
    'Vince chi collega quattro pedine in orizzontale, verticale o diagonale.',
    'Con un solo giocatore la CPU prende il secondo colore. Il tabellone pieno senza un allineamento è patta.'
  ],
  async start(ctx) {
    const [first, second] = ctx.players;
    const players = [first, second];
    const board = emptyBoard();
    const colors = [first.color, second.color];
    let turn = 0, pending = null, finished = false;
    const wrap = h('section', 'connect4');
    const status = h('p', 'connect4Status');
    const controls = h('div', 'connect4Columns');
    const grid = h('div', 'connect4Grid');
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', 'Tabellone Forza 4');
    const legend = h('div', 'connect4Legend');
    wrap.append(status, controls, grid, legend);
    ctx.dock(wrap);

    function render() {
      const player = players[turn];
      status.textContent = `${player.name}${player.bot ? ' (CPU)' : ''}: scegli una colonna`;
      controls.replaceChildren(...Array.from({length: COLS}, (_, col) => {
        const button = h('button', 'connect4Drop', '↓');
        button.type = 'button';
        button.setAttribute('aria-label', `Lascia cadere nella colonna ${col + 1}`);
        button.disabled = finished || player.bot || board[0][col] !== 0;
        button.onclick = () => { if (!finished && pending && !player.bot) pending(col); };
        return button;
      }));
      grid.replaceChildren(...board.flatMap((row, r) => row.map((value, col) => {
        const cell = h('div', `connect4Cell${value ? ' filled' : ''}`);
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `Riga ${r + 1}, colonna ${col + 1}${value ? `, pedina di ${players[value - 1].name}` : ', vuota'}`);
        cell.style.setProperty('--disc', colors[value - 1] || 'transparent');
        return cell;
      })));
      legend.replaceChildren(...players.map((p, i) => {
        const item = h('span', 'connect4Player');
        const dot = document.createElement('i'), label = document.createElement('span');
        label.textContent = `${p.name}${p.bot ? ' · CPU' : ''}`;
        item.append(dot, label);
        item.style.setProperty('--disc', colors[i]);
        return item;
      }));
    }

    async function getHumanMove(player) {
      await ctx.passDevice(player);
      return new Promise(resolve => {
        pending = col => { pending = null; resolve(col); };
        render();
      });
    }

    ctx.onExit(() => { finished = true; pending = null; });
    render();
    while (!finished) {
      const player = players[turn], mark = turn + 1;
      ctx.setActive(player);
      let col;
      if (player.bot) {
        await ctx.botThink(450, 900);
        col = chooseBotColumn(board, mark, player.skill || .6);
      } else col = await getHumanMove(player);
      if (ctx.dead || finished) return;
      const row = dropDisc(board, col, mark);
      if (row < 0) continue;
      render();
      if (hasFour(board, row, col, mark)) {
        finished = true;
        ctx.setScore(player, 1);
        ctx.finish({win: !player.bot, title: `${player.name} fa Forza 4!`, lines: ['Quattro pedine in fila.'], ranking: players.map(p => ({player: p, score: p === player ? 1 : 0}))});
        return;
      }
      if (validColumns(board).length === 0) {
        finished = true;
        ctx.finish({win: false, title: 'Pareggio!', lines: ['Il tabellone è pieno.'], ranking: players.map(p => ({player: p, score: 0}))});
        return;
      }
      turn = 1 - turn;
    }
  }
};
