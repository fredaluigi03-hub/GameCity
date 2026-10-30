// Forza 4 3D — Esperienza immersiva Three.js con telaio verticale e fisica di caduta pedine
import { THREE, newStage, tween, mat, glow, PAL, ease, raycast } from '../engine.js';
import { h, sfx, sleep, getGameSpeed } from '../ui.js';
import { createHost } from '../host.js';
import { ROWS, COLS, emptyBoard, validColumns, dropDisc, hasFour, winningMove, getWinningCells } from './forza4-rules.js';

const other = player => player === 1 ? 2 : 1;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

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
  id: 'forza4',
  name: 'Forza 4 3D',
  tag: 'Gioco da tavolo · Strategia Classica',
  desc: 'Allinea quattro pedine prima del tuo avversario nel telaio verticale 3D.',
  c1: '#e8b94c',
  c2: '#38bdf8',
  players: { min: 1, max: 2, def: 2, rival: true },
  difficulty: true,
  rules: [
    'A turno, scegli una delle 7 colonne e lascia cadere una pedina.',
    'La pedina cade fisicamente nel telaio 3D fino allo spazio libero più basso.',
    'Vince il primo giocatore che collega quattro pedine consecutive in orizzontale, verticale o diagonale.',
    'Se il tabellone viene riempito completamente senza allineamenti, la partita termina in patta.'
  ],
  guide: `
    <div style="display:flex;flex-direction:column;gap:12px;font-size:0.88rem;line-height:1.55;">
      <div style="background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.3);border-radius:10px;padding:12px;">
        <h4 style="color:#bae6fd;margin:0 0 6px 0;font-size:0.95rem;">🔵 Telaio Verticale 3D Dinamico</h4>
        <p style="margin:0;">Il gioco si svolge in una vera griglia verticale 3D traforata (7 colonne x 6 righe) con 42 alloggiamenti circolari aperti. Le pedine scivolano all’interno delle guide con rimbalzo elastico e impatto sonoro.</p>
      </div>
      <div>
        <h4 style="color:#e2d3be;margin:0 0 4px 0;">Controlli di Gioco</h4>
        <ul style="margin:4px 0 0 18px;padding:0;">
          <li><b>Puntatore Mouse 3D:</b> Passa il cursore sopra le colonne del telaio per vedere la pedina d'anteprima fluttuante, e clicca per lasciarla cadere.</li>
          <li><b>Pulsanti Dock:</b> Usa i pulsanti numerati da 1 a 7 nella barra inferiore o i tasti numerici della tastiera.</li>
          <li><b>Pannello Sinistro:</b> Monitora lo stato del turno, l'altezza di riempimento delle 7 colonne e la cronologia mosse.</li>
          <li><b>Visuali Camera:</b> Premi <i>🎥 Visuale Camera</i> per alternare tra Frontale Diretta, Angolata Prospettica e Vista Panoramica dall'Alto.</li>
        </ul>
      </div>
      <div style="background:rgba(234,179,8,0.1);border-left:3px solid #eab308;padding:8px 12px;border-radius:6px;">
        <b>Consiglio Tattico:</b> Il controllo della colonna centrale (Colonna 4) offre le maggiori combinazioni di vittoria. Cerca di creare una "doppia minaccia" (fork) con due allineamenti da tre pedine simultanei!
      </div>
    </div>
  `,

  async start(ctx) {
    // 1. Stage 3D Studio TV
    const S = ctx.stage = newStage({
      c1: this.c1,
      c2: this.c2,
      bg: '#080d1a',
      cam: [0, 3.8, 7.8],
      look: [0, 3.5, 0]
    });

    const host = createHost(ctx, 'forza4');
    const [first, second] = ctx.players;
    const players = [first, second];
    const board = emptyBoard();
    const colors = [first.color || '#ef4444', second.color || '#eab308'];
    const discCounts = [0, 0];
    const moveHistory = [];
    let turn = 0;
    let pending = null;
    let finished = false;
    let hoveredCol = 3;

    // Dimensioni griglia 3D
    const DX = 0.84; // Spaziatura orizzontale tra colonne
    const DY = 0.84; // Spaziatura verticale tra righe
    const BASE_Y = 1.62; // Altezza riga inferiore (riga 5)
    const TOP_DROP_Y = 6.65; // Altezza rilascio pedine e anteprima

    const slotX = col => (col - 3) * DX;
    const slotY = row => BASE_Y + (5 - row) * DY;

    // Matrice dei dischi 3D presenti sulla griglia [row][col]
    const discGrid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    // 2. Tavolo Studio in 3D
    const tableMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 4.8, 1.0, 48),
      mat('#0d1428', { roughness: 0.35, metalness: 0.5, clearcoat: 0.6 })
    );
    tableMesh.position.set(0, 0.5, 0);
    tableMesh.receiveShadow = true;
    S.scene.add(tableMesh);

    // Bordo dorato del tavolo
    const tableTrim = new THREE.Mesh(
      new THREE.CylinderGeometry(5.22, 5.22, 0.04, 48),
      mat('#c9a96e', { roughness: 0.25, metalness: 0.85 })
    );
    tableTrim.position.set(0, 1.0, 0);
    S.scene.add(tableTrim);

    // 3. Telaio Verticale Forza 4 in 3D
    const rackGroup = new THREE.Group();
    const blueFrameMat = mat('#1d4ed8', { roughness: 0.22, metalness: 0.6, clearcoat: 0.8 });
    const darkInteriorMat = mat('#0f172a', { roughness: 0.5, metalness: 0.3 });

    // Piedi di supporto laterali (gambe a staffa)
    const legGeo = new THREE.BoxGeometry(0.26, 1.35, 1.6);
    const leftLeg = new THREE.Mesh(legGeo, blueFrameMat);
    leftLeg.position.set(-2.95, 1.65, 0);
    const rightLeg = new THREE.Mesh(legGeo, blueFrameMat);
    rightLeg.position.set(2.95, 1.65, 0);

    // Vassoio di raccolta inferiore
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(6.3, 0.24, 0.46),
      blueFrameMat
    );
    tray.position.set(0, 1.15, 0);

    // Montanti verticali esterni
    const postGeo = new THREE.BoxGeometry(0.26, 4.8, 0.3);
    const leftPost = new THREE.Mesh(postGeo, blueFrameMat);
    leftPost.position.set(-2.95, 3.72, 0);
    const rightPost = new THREE.Mesh(postGeo, blueFrameMat);
    rightPost.position.set(2.95, 3.72, 0);

    // Barra superiore con logo
    const topBar = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.28, 0.3),
      blueFrameMat
    );
    topBar.position.set(0, 6.22, 0);

    rackGroup.add(leftLeg, rightLeg, tray, leftPost, rightPost, topBar);

    // 42 Alloggiamenti Circolari Traforati (Torus anteriori e posteriori)
    const torusGeo = new THREE.TorusGeometry(0.38, 0.038, 12, 28);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = slotX(c);
        const y = slotY(r);

        // Anello anteriore
        const ringF = new THREE.Mesh(torusGeo, blueFrameMat);
        ringF.position.set(x, y, 0.09);
        // Anello posteriore
        const ringB = new THREE.Mesh(torusGeo, blueFrameMat);
        ringB.position.set(x, y, -0.09);

        rackGroup.add(ringF, ringB);
      }
    }

    // Guide verticali divisorie tra colonne
    for (let c = 0; c <= COLS; c++) {
      const rx = (c - 3.5) * DX;
      if (Math.abs(rx) < 2.8) {
        const dividerF = new THREE.Mesh(new THREE.BoxGeometry(0.04, 4.8, 0.06), blueFrameMat);
        dividerF.position.set(rx, 3.72, 0.1);
        const dividerB = new THREE.Mesh(new THREE.BoxGeometry(0.04, 4.8, 0.06), blueFrameMat);
        dividerB.position.set(rx, 3.72, -0.1);
        rackGroup.add(dividerF, dividerB);
      }
    }

    S.scene.add(rackGroup);

    // 4. Pedina di Anteprima Fluttuante (Preview Disc)
    const discGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.14, 32);
    discGeo.rotateX(Math.PI / 2);

    const previewMat = new THREE.MeshStandardMaterial({
      color: colors[0],
      transparent: true,
      opacity: 0.65,
      roughness: 0.25,
      metalness: 0.3
    });
    const previewDisc = new THREE.Mesh(discGeo, previewMat);
    previewDisc.position.set(slotX(hoveredCol), TOP_DROP_Y, 0);
    previewDisc.visible = false;
    S.scene.add(previewDisc);

    // Animazione oscillazione delicata anteprima
    S.on((dt, t) => {
      if (previewDisc.visible) {
        previewDisc.position.y = TOP_DROP_Y + Math.sin(t * 4.5) * 0.04;
      }
    });

    // 5. Hit-Boxes Invisibili per Raycast Colonne (0..6)
    const hitBoxes = [];
    for (let c = 0; c < COLS; c++) {
      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(DX, 5.2, 0.7),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitBox.position.set(slotX(c), 3.72, 0);
      hitBox.userData.col = c;
      hitBox.userData.id = 'col_' + c;
      S.scene.add(hitBox);
      hitBoxes.push(hitBox);
    }

    // 6. Sidebar Sinistra (.sidePanelLeft)
    const sidePanel = h('aside', 'sidePanelLeft');
    sidePanel.setAttribute('aria-label', 'Pannello Partita Forza 4');
    ctx.sideAdd(sidePanel);

    // Intestazione
    const headerSec = h('div', 'spSection');
    headerSec.innerHTML = `
      <div class="spTitle">
        <span>Forza 4 3D</span>
        <span class="spBadge" style="background:rgba(56,189,248,0.2);color:#7dd3fc;">Studio Match</span>
      </div>
      <div style="font-size:0.75rem;color:var(--mut);">Allinea 4 pedine in orizzontale, verticale o diagonale</div>
    `;

    // Turno Corrente
    const turnSec = h('div', 'spSection');
    const turnBadge = h('div', '');

    // Schede Giocatori
    const playersSec = h('div', 'spSection');
    const playerCard1 = h('div', 'spPlayerCard');
    const playerCard2 = h('div', 'spPlayerCard');
    playersSec.append(playerCard1, playerCard2);

    // Indicatori Riempimento Colonne 1–7
    const colStatusSec = h('div', 'spSection');
    colStatusSec.innerHTML = `
      <div class="spTitle">
        <span>Capacità Colonne (1–7)</span>
        <span style="font-size:0.68rem;color:var(--mut);">Clicca per giocare</span>
      </div>
      <div class="f4ColBarGrid" id="colBarGrid"></div>
    `;
    const colBarGrid = colStatusSec.querySelector('#colBarGrid');

    // Cronologia Mosse
    const historySec = h('div', 'spSection');
    historySec.innerHTML = `
      <div class="spTitle">
        <span>Cronologia Mosse</span>
        <span id="f4MoveCount" style="font-size:0.7rem;color:var(--mut);">0 mosse</span>
      </div>
      <div class="spLogBox" id="f4HistoryBox">
        <div class="spLogItem" style="--accent:#38bdf8;">Inizio partita: tocca a ${esc(first.name)}.</div>
      </div>
    `;
    const historyBox = historySec.querySelector('#f4HistoryBox');
    const moveCountEl = historySec.querySelector('#f4MoveCount');

    sidePanel.append(headerSec, turnSec, playersSec, colStatusSec, historySec);

    // Aggiornamento interfaccia pannello e stato
    function renderSidePanel() {
      const curPlayer = players[turn];
      const curColor = colors[turn];

      // Aggiorna Turno
      turnSec.innerHTML = `
        <div class="spTitle">
          <span>Stato del Turno</span>
          <span style="font-size:1.1rem;">🔴🟡</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;padding:6px 0;">
          <div style="width:16px;height:16px;border-radius:50%;background:${curColor};box-shadow:0 0 10px ${curColor};"></div>
          <div>
            <div style="font-weight:700;font-size:0.92rem;color:#f8fafc;">${esc(curPlayer.name)}${curPlayer.bot ? ' (CPU)' : ''}</div>
            <div style="font-size:0.72rem;color:var(--mut);">${curPlayer.bot ? 'Sta calcolando la mossa migliore...' : 'Tocca a te: clicca una colonna'}</div>
          </div>
        </div>
      `;

      // Schede Giocatori
      [playerCard1, playerCard2].forEach((card, idx) => {
        const p = players[idx];
        const col = colors[idx];
        const isActive = idx === turn;
        card.className = `spPlayerCard${isActive ? ' active' : ''}`;
        card.style.setProperty('--pc', col);
        card.innerHTML = `
          <div class="spRow">
            <span style="font-weight:700;font-size:0.86rem;color:#f8fafc;display:flex;align-items:center;gap:6px;">
              <span style="width:10px;height:10px;border-radius:50%;background:${col};"></span>
              ${esc(p.name)}${p.bot ? ' · CPU' : ''}
            </span>
            <span style="font-size:0.75rem;font-weight:600;color:var(--goldHi);">Pedine: ${discCounts[idx]}</span>
          </div>
          <div style="font-size:0.7rem;color:var(--mut);">Colore: <b style="color:${col};">${idx === 0 ? 'Rosso/Oro' : 'Giallo/Azzurro'}</b></div>
        `;
      });

      // Indicatori Colonne
      colBarGrid.replaceChildren(...Array.from({ length: COLS }, (_, c) => {
        // Conta quante pedine ci sono nella colonna c
        let count = 0;
        for (let r = 0; r < ROWS; r++) {
          if (board[r][c] !== 0) count++;
        }
        const free = ROWS - count;
        const pct = (count / ROWS) * 100;
        const isFull = free === 0;

        const item = h('div', 'f4ColBarItem');
        item.style.cursor = (!finished && !curPlayer.bot && !isFull) ? 'pointer' : 'default';
        item.title = `Colonna ${c + 1}: ${count}/6 pedine`;
        item.onclick = () => {
          if (!finished && pending && !curPlayer.bot && !isFull) {
            pending(c);
          }
        };

        const meter = h('div', 'f4ColMeter');
        const fill = h('div', 'f4ColFill');
        fill.style.height = `${pct}%`;
        fill.style.setProperty('--pc', isFull ? 'var(--bad)' : curColor);
        meter.append(fill);

        const lbl = h('span', '', `${c + 1}`);
        item.append(meter, lbl);
        return item;
      }));
    }

    function addMoveLog(playerName, colIndex, rowIndex, playerColor) {
      const item = h(
        'div',
        'spLogItem',
        `<b>#${moveHistory.length + 1} ${esc(playerName)}:</b> Colonna ${colIndex + 1} (Riga ${rowIndex + 1})`
      );
      item.style.setProperty('--accent', playerColor);
      historyBox.prepend(item);
      moveHistory.push({ col: colIndex, row: rowIndex });
      if (moveCountEl) moveCountEl.textContent = `${moveHistory.length} mosse`;
    }

    // 7. Animazione Caduta Pedina 3D
    async function animateDropDisc(row, col, playerIndex) {
      const playerColor = colors[playerIndex];
      const speed = getGameSpeed();

      // Crea materiale per la pedina
      const discMat = mat(playerColor, {
        roughness: 0.25,
        metalness: 0.35,
        clearcoat: 0.7,
        clearcoatRoughness: 0.15
      });

      const disc = new THREE.Mesh(discGeo, discMat);
      disc.position.set(slotX(col), TOP_DROP_Y, 0);
      disc.castShadow = true;
      disc.receiveShadow = true;
      S.scene.add(disc);

      sfx.drop();

      // Animazione caduta fino allo slot assegnato
      const targetY = slotY(row);
      await tween(disc.position, { y: targetY }, 0.62 / speed, 'bounce');

      sfx.click();
      S.shakeIt(0.06);

      discGrid[row][col] = disc;
      discCounts[playerIndex]++;
    }

    // 8. Evidenziazione Pedine Vincenti
    async function highlightWinningDiscs(winningCells, winColor) {
      sfx.win();
      S.flashWith(winColor);
      S.burst(winColor, 180, 4.5);

      winningCells.forEach(cell => {
        const disc = discGrid[cell.row][cell.col];
        if (disc) {
          disc.material.emissive.set(winColor);
          disc.material.emissiveIntensity = 0.85;
          tween(disc.scale, { x: 1.18, y: 1.18, z: 1.4 }, 0.35, ease.inout);
        }
      });

      await sleep(1200);
    }

    // 9. Interazione Raycast Mouse per Hover e Click
    function updateHover(col) {
      if (finished) {
        previewDisc.visible = false;
        return;
      }
      hoveredCol = Math.max(0, Math.min(COLS - 1, col));
      const curPlayer = players[turn];
      const isColFree = board[0][hoveredCol] === 0;

      if (!curPlayer.bot && isColFree) {
        previewDisc.visible = true;
        previewDisc.position.x = slotX(hoveredCol);
        previewMat.color.set(colors[turn]);
      } else {
        previewDisc.visible = false;
      }
    }

    const onPointerMove = ev => {
      if (finished || !pending || players[turn].bot) {
        previewDisc.visible = false;
        return;
      }
      const hit = raycast(hitBoxes, ev);
      if (hit && hit.userData.col !== undefined) {
        updateHover(hit.userData.col);
      } else {
        previewDisc.visible = false;
      }
    };

    const onPointerDown = ev => {
      if (finished || !pending || players[turn].bot) return;
      const hit = raycast(hitBoxes, ev);
      if (hit && hit.userData.col !== undefined) {
        const c = hit.userData.col;
        if (board[0][c] === 0) {
          pending(c);
        }
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerDown);
    ctx.onExit(() => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
    });

    // Supporto tastiera (Tasti 1–7)
    const onKeyDown = ev => {
      if (finished || !pending || players[turn].bot) return;
      const key = ev.key;
      if (key >= '1' && key <= '7') {
        const c = parseInt(key, 10) - 1;
        if (board[0][c] === 0) {
          pending(c);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    ctx.onExit(() => window.removeEventListener('keydown', onKeyDown));

    // 10. Configurazione Dock Inferiore (ctx.dock)
    let camViewIndex = 0;
    const camPresets = [
      { name: 'Frontale', cam: [0, 3.8, 7.8], look: [0, 3.5, 0] },
      { name: 'Angolata 3D', cam: [3.6, 4.4, 6.8], look: [0, 3.5, 0] },
      { name: 'Dall’Alto', cam: [0, 6.2, 5.8], look: [0, 3.2, 0] }
    ];

    function updateDock() {
      const curPlayer = players[turn];
      const dockWrap = h('div', 'row', '');
      dockWrap.style.gap = '6px';
      dockWrap.style.flexWrap = 'wrap';
      dockWrap.style.alignItems = 'center';

      // 7 Pulsanti per rilascio pedine nelle colonne 1..7
      for (let c = 0; c < COLS; c++) {
        const isFull = board[0][c] !== 0;
        const btn = h('button', 'btn f4DropBtn', `↓ ${c + 1}`);
        btn.disabled = finished || curPlayer.bot || isFull;
        btn.setAttribute('aria-label', `Colonna ${c + 1}${isFull ? ' (piena)' : ''}`);

        btn.onmouseenter = () => updateHover(c);
        btn.onmouseleave = () => { if (previewDisc) previewDisc.visible = false; };
        btn.onclick = () => {
          if (!finished && pending && !curPlayer.bot && !isFull) {
            pending(c);
          }
        };
        dockWrap.append(btn);
      }

      // Separatore
      const sep = h('div', '');
      sep.style.width = '8px';
      dockWrap.append(sep);

      // Tasto Camera
      const btnCam = h('button', 'btn', `🎥 ${camPresets[camViewIndex].name}`);
      btnCam.onclick = () => {
        sfx.click();
        camViewIndex = (camViewIndex + 1) % camPresets.length;
        const p = camPresets[camViewIndex];
        btnCam.textContent = `🎥 ${p.name}`;
        S.go(p.cam, p.look);
      };

      // Tasto Regole
      const btnRules = h('button', 'btn', '📖 Regole');
      btnRules.onclick = () => {
        sfx.click();
        ctx.showRules();
      };

      dockWrap.append(btnCam, btnRules);
      ctx.dock(dockWrap);
    }

    async function getHumanMove(player) {
      await ctx.passDevice(player);
      updateHover(hoveredCol);
      renderSidePanel();
      updateDock();
      return new Promise(resolve => {
        pending = col => {
          pending = null;
          previewDisc.visible = false;
          resolve(col);
        };
      });
    }

    // 11. Loop di Gioco Principale
    renderSidePanel();
    updateDock();

    await host.say(`Benvenuti a Forza 4 3D! Sfida tra ${first.name} e ${second.name}!`, { mood: 'happy' });

    while (!finished) {
      const player = players[turn];
      const mark = turn + 1;
      ctx.setActive(player);
      renderSidePanel();
      updateDock();

      let col;
      if (player.bot) {
        previewDisc.visible = false;
        await ctx.botThink(450, 900);
        col = chooseBotColumn(board, mark, player.skill || .6);
      } else {
        col = await getHumanMove(player);
      }

      if (ctx.dead || finished) return;

      const row = dropDisc(board, col, mark);
      if (row < 0) continue;

      // Animazione 3D della caduta pedina
      await animateDropDisc(row, col, turn);
      addMoveLog(player.name, col, row, colors[turn]);
      renderSidePanel();
      updateDock();

      // Controllo Vittoria (Forza 4)
      if (hasFour(board, row, col, mark)) {
        finished = true;
        const winCells = getWinningCells(board, row, col, mark) || [];
        await highlightWinningDiscs(winCells, colors[turn]);

        ctx.setScore(player, 1);
        await host.say(`FORZA 4! ${player.name} ha connesso quattro pedine e vince la partita!`, { mood: 'celebrate' });

        ctx.finish({
          win: !player.bot,
          title: `${player.name} vince con Forza 4!`,
          lines: ['Quattro pedine collegate con successo nel telaio 3D!'],
          ranking: players.map(p => ({
            player: p,
            score: p === player ? 1 : 0
          }))
        });
        return;
      }

      // Controllo Pareggio (Tabellone Pieno)
      if (validColumns(board).length === 0) {
        finished = true;
        sfx.bad();
        await host.say('Il telaio è completamente pieno! Partita terminata in Pareggio!', { mood: 'surprised' });
        ctx.finish({
          win: false,
          title: 'Pareggio!',
          lines: ['Tutte le 42 caselle sono state riempite senza allineamenti.'],
          ranking: players.map(p => ({ player: p, score: 0 }))
        });
        return;
      }

      // Cambio turno
      turn = 1 - turn;
    }

    ctx.onExit(() => {
      finished = true;
      pending = null;
      sidePanel.remove();
    });
  }
};
