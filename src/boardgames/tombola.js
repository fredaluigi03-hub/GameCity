// Tombola Napoletana — Vera esperienza 3D Three.js: Tavolo in legno, Tabellone 3D inclinato,
// O' Panariello in vimini con estrazione fisica, bussolotti 3D numerati e Smorfia Napoletana nel sidePanelLeft.
import { THREE, newStage, tween, label3d, mat, glow, person, anim, PAL, ease } from '../engine.js';
import { h, sfx, shuffle, getGameSpeed } from '../ui.js';
import { createHost, HOSTS } from '../host.js';
import { SMORFIA } from './tombola-data.js';
import { generateCartella, evaluateCard, checkNextPrize, PRIZE_TIERS } from './tombola-rules.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export default {
  id: 'tombola',
  name: 'Tombola Napoletana',
  tag: 'Gioco da tavola · Tradizione & Smorfia',
  desc: 'Il grande rito della Tombola in 3D: O’ Panariello in vimini, il Tabellone dei 90 numeri, pedine in legno e la verace Smorfia Napoletana!',
  c1: '#f59e0b',
  c2: '#dc2626',
  players: { min: 1, max: 6, def: 4 },
  rules: [
    'O’ Panariello in vimini estrae fisicamente i 90 numeri tradizionali napoletani sul tavolo 3D.',
    'Ogni numero estratto vola sul Tabellone in legno inclinato posizionando la pedina numerata.',
    'I giocatori hanno cartelle con 3 righe da 5 numeri ciascuna (15 numeri totali).',
    'I 5 premi progressivi in palio sono: Ambo (2), Terno (3), Quaterna (4), Cinquina (5) e TOMBOLA (15 numeri)!',
    'Tutti i dati, le cartelle e la Smorfia Napoletana sono comodamente consultabili nel pannello laterale.'
  ],
  guide: `
    <h3 style="color:#f59e0b;margin-bottom:8px;font-size:1.15rem;">I 5 Traguardi della Tombola Napoletana</h3>
    <p>La Tombola tradizionale napoletana assegna le vincite in ordine rigorosamente progressivo su ciascuna cartella (3 righe x 5 numeri):</p>
    <ul style="margin:8px 0 14px 18px;line-height:1.65;font-size:0.92rem;">
      <li><b style="color:#f59e0b;">Ambo (200 pt):</b> due numeri estratti sulla medesima riga.</li>
      <li><b style="color:#f59e0b;">Terno (500 pt):</b> tre numeri estratti sulla medesima riga.</li>
      <li><b style="color:#f59e0b;">Quaterna (1.200 pt):</b> quattro numeri estratti sulla medesima riga.</li>
      <li><b style="color:#f59e0b;">Cinquina (3.000 pt):</b> tutti e 5 i numeri completati sulla stessa riga.</li>
      <li><b style="color:#f59e0b;">TOMBOLA (10.000 pt):</b> tutti i 15 numeri della cartella coperti!</li>
    </ul>
    <h3 style="color:#f59e0b;margin-bottom:8px;font-size:1.15rem;">O’ Panariello e la Smorfia Napoletana</h3>
    <p>Il rito secolare prevede che i novanta bussolotti in legno vengano agitati dentro <i>O’ Panariello</i>, il tradizionale cestino di vimini a fondo piatto. A Napoli ciascun numero è un archetipo legato ai sogni e alla vita del vicolo: dal numero 1 (<i>L'Italia</i>) al 25 (<i>Natale</i>), dal 48 (<i>O' muorto che parla</i>) al 77 (<i>E diavule</i>), fino al fatidico 90 (<i>A paura</i>).</p>
  `,

  async start(ctx) {
    // Inizializza lo stage 3D Three.js
    const S = ctx.stage = newStage({
      c1: this.c1,
      c2: this.c2,
      bg: '#0a0604',
      cam: [0.6, 4.3, 10.4],
      look: [0.3, 1.7, 0]
    });

    const P = ctx.players;
    const drawnNumbers = [];
    const drawnSet = new Set();
    const urn = shuffle(Array.from({ length: 90 }, (_, i) => i + 1));
    const claimedPrizes = new Set();
    const prizeWinners = {}; // { ambo: 'Player 1', ... }
    let isAutoExtract = false;
    let autoInterval = null;
    let isExtracting = false;
    let autoMarkEnabled = true;

    // Assegna cartella e dati a ciascun giocatore
    P.forEach((p, idx) => {
      p.data.cartella = generateCartella(idx + 1);
      p.data.marked = new Set();
      p.data.prizes = [];
    });

    // Host 3D Don Pasquale
    const host = createHost(ctx, {
      ...HOSTS.tombola,
      position: [-4.6, 0, -0.2],
      lookAt: [0, 1.6, 0]
    });

    // ==========================================
    // 1. TAVOLO IN LEGNO MASSELLO TRADIZIONALE
    // ==========================================
    const tableGroup = new THREE.Group();
    S.add(tableGroup);

    // Piano del tavolo
    const woodMat = mat('#3e2213', { roughness: 0.28, metalness: 0.12 });
    const woodTrimMat = mat('#241208', { roughness: 0.45, metalness: 0.18 });
    const goldLineMat = glow('#d8b45a');

    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.35, 7.6), woodMat);
    tableTop.position.set(0.4, 0.55, -0.4);

    const tableMolding = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.1, 7.8), woodTrimMat);
    tableMolding.position.set(0.4, 0.42, -0.4);

    // Runner centrale in velluto damascato rosso napoletano
    const runnerMat = mat('#52121c', { roughness: 0.82, metalness: 0.04 });
    const runner = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.02, 5.8), runnerMat);
    runner.position.set(0.4, 0.735, -0.4);

    // Filetti dorati decorativi sul runner
    const runnerTrim = new THREE.Mesh(new THREE.BoxGeometry(11.9, 0.025, 0.06), goldLineMat);
    runnerTrim.position.set(0.4, 0.74, 2.45);
    const runnerTrim2 = new THREE.Mesh(new THREE.BoxGeometry(11.9, 0.025, 0.06), goldLineMat);
    runnerTrim2.position.set(0.4, 0.74, -3.25);

    // Gambe del tavolo tornite
    const legGeo = new THREE.CylinderGeometry(0.24, 0.16, 2.2, 16);
    [
      [-5.5, -0.5, 2.8],
      [6.3, -0.5, 2.8],
      [-5.5, -0.5, -3.6],
      [6.3, -0.5, -3.6]
    ].forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, woodTrimMat);
      leg.position.set(lx, ly, lz);
      tableGroup.add(leg);
    });

    tableGroup.add(tableTop, tableMolding, runner, runnerTrim, runnerTrim2);

    // ==========================================
    // 2. TABELLONE 3D INCLINATO (90 NUMERI)
    // ==========================================
    const tabelloneGroup = new THREE.Group();
    tabelloneGroup.position.set(-0.9, 1.85, -0.6);
    tabelloneGroup.rotation.x = -0.35;
    S.add(tabelloneGroup);

    // Cornice in legno scuro pregiato BoxGeometry(8.2, 5.2, 0.25)
    const boardWoodMat = mat('#2c160b', { roughness: 0.35, metalness: 0.15 });
    const boardBack = new THREE.Mesh(new THREE.BoxGeometry(8.2, 5.2, 0.25), boardWoodMat);
    tabelloneGroup.add(boardBack);

    // Bordatura dorata rialzata attorno al tabellone
    const boardTrimGeo = new THREE.BoxGeometry(8.32, 0.08, 0.28);
    const boardTrimMat = mat('#c9a24e', { metalness: 0.85, roughness: 0.28 });
    const trimTop = new THREE.Mesh(boardTrimGeo, boardTrimMat); trimTop.position.y = 2.62;
    const trimBot = new THREE.Mesh(boardTrimGeo, boardTrimMat); trimBot.position.y = -2.62;
    const boardTrimSideGeo = new THREE.BoxGeometry(0.08, 5.32, 0.28);
    const trimLeft = new THREE.Mesh(boardTrimSideGeo, boardTrimMat); trimLeft.position.x = -4.13;
    const trimRight = new THREE.Mesh(boardTrimSideGeo, boardTrimMat); trimRight.position.x = 4.13;
    tabelloneGroup.add(trimTop, trimBot, trimLeft, trimRight);

    // Texture Canvas ad altissima risoluzione per il Tabellone (2048 x 1320)
    const tbCanvas = document.createElement('canvas');
    tbCanvas.width = 2048;
    tbCanvas.height = 1320;
    const tbCtx = tbCanvas.getContext('2d');

    const tbTex = new THREE.CanvasTexture(tbCanvas);
    tbTex.colorSpace = THREE.SRGBColorSpace;
    tbTex.anisotropy = 4;

    const boardFace = new THREE.Mesh(
      new THREE.PlaneGeometry(8.0, 5.0),
      new THREE.MeshStandardMaterial({ map: tbTex, roughness: 0.45, metalness: 0.08 })
    );
    boardFace.position.z = 0.126;
    tabelloneGroup.add(boardFace);

    // Coordinate esatte per ogni slot 1..90 sul tabellone (griglia 9 righe x 10 colonne)
    const boardSlots = {};
    const gridCols = 10;
    const gridRows = 9;
    const gridW = 7.7;
    const gridH = 4.3;
    const startX = -gridW / 2;
    const startY = 2.05;
    const cellW = gridW / gridCols; // 0.77
    const cellH = gridH / gridRows; // 0.4777

    for (let num = 1; num <= 90; num++) {
      const row = Math.floor((num - 1) / gridCols);
      const col = (num - 1) % gridCols;
      boardSlots[num] = {
        x: startX + (col + 0.5) * cellW,
        y: startY - (row + 0.5) * cellH,
        z: 0.20
      };
    }

    // Funzione di rendering del Tabellone 2D su CanvasTexture
    function drawTabelloneTexture() {
      const W = tbCanvas.width, H = tbCanvas.height;
      // Sfondo pergamenato caldo vintage
      const bgGrad = tbCtx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#fbf8f0');
      bgGrad.addColorStop(1, '#eee2cc');
      tbCtx.fillStyle = bgGrad;
      tbCtx.fillRect(0, 0, W, H);

      // Cornice interna dorata e rossa
      tbCtx.lineWidth = 8;
      tbCtx.strokeStyle = '#c9a24e';
      tbCtx.strokeRect(16, 16, W - 32, H - 32);
      tbCtx.lineWidth = 3;
      tbCtx.strokeStyle = '#8a2118';
      tbCtx.strokeRect(26, 26, W - 52, H - 52);

      // Intestazione
      tbCtx.fillStyle = '#8a1c14';
      tbCtx.font = 'bold 50px "Bebas Neue", Outfit, sans-serif';
      tbCtx.textAlign = 'center';
      tbCtx.textBaseline = 'top';
      tbCtx.fillText('TOMBOLA NAPOLETANA · IL TABELLONE DEI 90 NUMERI', W / 2, 38);

      // Sottotitolo decorativo
      tbCtx.fillStyle = '#b48228';
      tbCtx.font = '600 20px Outfit, sans-serif';
      tbCtx.fillText('TRADIZIONE DELLA SMORFIA · ESTRATTI DAL PANARIELLO', W / 2, 96);

      // Griglia delle 90 caselle
      const gridLeft = 45;
      const gridTop = 135;
      const cW = (W - 90) / gridCols;
      const cH = (H - 165) / gridRows;

      for (let num = 1; num <= 90; num++) {
        const r = Math.floor((num - 1) / gridCols);
        const c = (num - 1) % gridCols;
        const x = gridLeft + c * cW;
        const y = gridTop + r * cH;

        const isDrawn = drawnSet.has(num);

        // Sfondo casella
        tbCtx.fillStyle = isDrawn ? 'rgba(245, 158, 11, 0.28)' : 'rgba(255, 255, 255, 0.65)';
        tbCtx.fillRect(x + 2, y + 2, cW - 4, cH - 4);

        // Bordo casella
        tbCtx.lineWidth = isDrawn ? 3 : 1.5;
        tbCtx.strokeStyle = isDrawn ? '#d97706' : '#d2bc96';
        tbCtx.strokeRect(x + 2, y + 2, cW - 4, cH - 4);

        // Numero grande
        tbCtx.fillStyle = isDrawn ? '#b91c1c' : '#2a1a12';
        tbCtx.font = 'bold 44px "Bebas Neue", Outfit, sans-serif';
        tbCtx.textAlign = 'center';
        tbCtx.textBaseline = 'middle';
        tbCtx.fillText(String(num), x + cW / 2, y + cH * 0.42);

        // Nome della Smorfia ridotto in basso
        const smorf = SMORFIA[num]?.nap || '';
        tbCtx.fillStyle = isDrawn ? '#9a3412' : '#786858';
        tbCtx.font = '600 13px Outfit, sans-serif';
        const displaySmorf = smorf.length > 17 ? smorf.slice(0, 15) + '…' : smorf;
        tbCtx.fillText(displaySmorf, x + cW / 2, y + cH * 0.82);
      }

      tbTex.needsUpdate = true;
    }

    drawTabelloneTexture();

    // Registry delle pedine in legno 3D posizionate sul Tabellone
    const placedTokens = {};
    const tokenGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.14, 24);
    tokenGeo.rotateX(Math.PI / 2); // orienta la faccia piatta verso il fronte +z

    // Materiale laterale del legno tornito
    const tokenSideMat = mat('#d19d65', { roughness: 0.35, metalness: 0.08 });

    // Funzione che crea la pedina in legno 3D per il numero 'num'
    function createTokenMesh(num) {
      const capCanvas = document.createElement('canvas');
      capCanvas.width = 128;
      capCanvas.height = 128;
      const cx = capCanvas.getContext('2d');

      // Texture legno chiaro su faccia pedina
      cx.fillStyle = '#f4e5cb';
      cx.fillRect(0, 0, 128, 128);
      cx.beginPath();
      cx.arc(64, 64, 60, 0, Math.PI * 2);
      cx.fillStyle = '#faefe0';
      cx.fill();
      cx.lineWidth = 6;
      cx.strokeStyle = '#b91c1c';
      cx.stroke();

      cx.fillStyle = '#b91c1c';
      cx.font = 'bold 64px "Bebas Neue", Outfit, sans-serif';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(String(num), 64, 65);

      const capTex = new THREE.CanvasTexture(capCanvas);
      capTex.colorSpace = THREE.SRGBColorSpace;
      const tokenCapMat = new THREE.MeshStandardMaterial({ map: capTex, roughness: 0.32, metalness: 0.05 });

      return new THREE.Mesh(tokenGeo, [tokenSideMat, tokenCapMat, tokenCapMat]);
    }

    // ==========================================
    // 3. O' PANARIELLO IN VIMINI (BASKET 3D)
    // ==========================================
    const panarielloGroup = new THREE.Group();
    panarielloGroup.position.set(4.5, 1.45, 0.2);
    S.add(panarielloGroup);

    // Materiale vimini intrecciato caldo
    const wickerMat = mat('#ab723b', { roughness: 0.85, metalness: 0.08 });
    const wickerDarkMat = mat('#78451c', { roughness: 0.9, metalness: 0.1 });
    const rimMat = mat('#522c0e', { roughness: 0.75, metalness: 0.15 });

    // Piatto d'appoggio sottostante
    const coaster = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.08, 24), boardWoodMat);
    coaster.position.y = -0.72;
    panarielloGroup.add(coaster);

    // Corpo a canestro in vimini (leggermente svasato verso l'alto)
    const basketBody = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.65, 1.35, 24, 4), wickerMat);
    panarielloGroup.add(basketBody);

    // Cerchi/anelli intrecciati orizzontali di rinforzo del vimini
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.05, 12, 32), wickerDarkMat);
    ring1.rotation.x = Math.PI / 2; ring1.position.y = -0.45;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 12, 32), wickerDarkMat);
    ring2.rotation.x = Math.PI / 2; ring2.position.y = 0;
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.055, 12, 32), wickerDarkMat);
    ring3.rotation.x = Math.PI / 2; ring3.position.y = 0.55;

    // Bordo superiore rigido del panariello
    const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.87, 0.07, 12, 32), rimMat);
    basketRim.rotation.x = Math.PI / 2; basketRim.position.y = 0.68;

    panarielloGroup.add(ring1, ring2, ring3, basketRim);

    // Manici laterali in corda/vimini
    [-1, 1].forEach(side => {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.038, 8, 24, Math.PI), rimMat);
      handle.position.set(side * 0.86, 0.42, 0);
      handle.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      panarielloGroup.add(handle);
    });

    // Interno del canestro con bussolotti in legno visibili ammucchiati
    const interiorCavity = new THREE.Mesh(new THREE.CircleGeometry(0.82, 24), mat('#2b1408', { roughness: 0.95 }));
    interiorCavity.rotation.x = -Math.PI / 2; interiorCavity.position.y = 0.66;
    panarielloGroup.add(interiorCavity);

    const miniTokensGroup = new THREE.Group();
    panarielloGroup.add(miniTokensGroup);
    const miniGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.14, 12);
    for (let k = 0; k < 12; k++) {
      const mini = new THREE.Mesh(miniGeo, tokenSideMat);
      const ang = (k / 12) * Math.PI * 2;
      const dist = 0.2 + (k % 3) * 0.22;
      mini.position.set(Math.cos(ang) * dist, 0.68 + Math.random() * 0.08, Math.sin(ang) * dist);
      mini.rotation.set(Math.random() * 0.8, Math.random() * 3, Math.random() * 0.8);
      miniTokensGroup.add(mini);
    }

    // ==========================================
    // 4. BUSSOLOTTO 3D SHOWCASE & BANNER 3D
    // ==========================================
    const showcaseBussolotto = new THREE.Group();
    showcaseBussolotto.position.set(1.8, 2.8, 4.8);
    showcaseBussolotto.scale.set(0.001, 0.001, 0.001);
    S.add(showcaseBussolotto);

    const scCylGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.36, 32);
    scCylGeo.rotateX(Math.PI / 2);
    const scCyl = new THREE.Mesh(scCylGeo, tokenSideMat);
    showcaseBussolotto.add(scCyl);

    // Banner 3D della Smorfia (label3d) che fluttua sopra il bussolotto
    const smorfiaBanner3d = label3d([
      { t: 'TOMBOLA NAPOLETANA', fs: 0.35, color: '#f59e0b' },
      { t: 'ESTRAZIONE NUMERO', fs: 0.26, color: '#ffffff' },
      { t: 'Gira o’ Panariello...', fs: 0.18, color: '#94a3b8', font: 'Outfit' }
    ], { w: 3.5, h: 1.35, px: 240, bg: 'grad', border: '#f59e0b', radius: 0.08 });

    smorfiaBanner3d.position.set(1.8, 4.0, 4.8);
    smorfiaBanner3d.scale.set(0.001, 0.001, 0.001);
    S.add(smorfiaBanner3d);

    // ==========================================
    // 5. SIDEBAR SINISTRA (.sidePanelLeft)
    // ==========================================
    const leftPanel = h('aside', 'sidePanelLeft');
    ctx.sideAdd(leftPanel);

    // Sezione 1: Ultimo Numero Estratto & Smorfia
    const spExtractedSec = h('div', 'spSection');
    spExtractedSec.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(15, 23, 42, 0.85))';
    spExtractedSec.style.borderColor = 'rgba(245, 158, 11, 0.35)';
    spExtractedSec.innerHTML = `
      <div class="spTitle">
        <span>Ultimo Estratto</span>
        <span id="tbEstrattiCount" style="color:var(--goldHi);font-weight:800;">0 / 90</span>
      </div>
      <div style="display:flex;align-items:center;gap:14px;margin-top:4px;">
        <div id="tbBallBadge" class="panarielloBall" style="width:58px;height:58px;font-size:2rem;flex:none;">—</div>
        <div style="min-width:0;display:flex;flex-direction:column;gap:3px;">
          <b id="tbSmorfiaNap" style="font-size:1.1rem;color:#ffffff;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Pronti a giocare!</b>
          <span id="tbSmorfiaIt" style="font-size:0.8rem;color:var(--mut);text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Gira il Panariello...</span>
        </div>
      </div>
    `;

    // Sezione 2: Premi Progressivi della Tombola
    const spPrizesSec = h('div', 'spSection');
    spPrizesSec.innerHTML = `
      <div class="spTitle">
        <span>Premi in Palio</span>
        <span style="color:#f59e0b;font-size:0.68rem;letter-spacing:0.1em;">Ordine Ufficiale</span>
      </div>
      <div id="tbPrizesContainer" style="display:flex;flex-direction:column;gap:6px;"></div>
    `;

    // Sezione 3: Cartelle Giocatori
    const spCardsSec = h('div', 'spSection');
    spCardsSec.style.display = 'flex';
    spCardsSec.style.flexDirection = 'column';
    spCardsSec.style.gap = '8px';

    const cardsHeader = h('div', 'spTitle');
    cardsHeader.innerHTML = `
      <span>Cartelle di Gioco</span>
      <button id="tbAutoMarkToggle" class="btn pill" style="font-size:0.68rem;padding:3px 9px;height:auto;">Auto-Marcatura: ON</button>
    `;
    const cardsListContainer = h('div');
    cardsListContainer.style.display = 'flex';
    cardsListContainer.style.flexDirection = 'column';
    cardsListContainer.style.gap = '10px';

    spCardsSec.append(cardsHeader, cardsListContainer);

    leftPanel.append(spExtractedSec, spPrizesSec, spCardsSec);

    // Toggle Auto-Marcatura
    const autoMarkBtn = leftPanel.querySelector('#tbAutoMarkToggle');
    autoMarkBtn.onclick = () => {
      autoMarkEnabled = !autoMarkEnabled;
      autoMarkBtn.textContent = `Auto-Marcatura: ${autoMarkEnabled ? 'ON' : 'OFF'}`;
      autoMarkBtn.classList.toggle('pri', autoMarkEnabled);
      sfx.click();
      if (autoMarkEnabled) {
        // Applica subito le marcature mancanti
        P.forEach(p => {
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 9; c++) {
              const val = p.data.cartella.grid[r][c];
              if (val > 0 && drawnSet.has(val)) p.data.marked.add(val);
            }
          }
        });
        renderCartelleUI();
        checkWins();
      }
    };

    // Render dei Premi
    function renderPrizesUI() {
      const container = leftPanel.querySelector('#tbPrizesContainer');
      if (!container) return;
      container.innerHTML = PRIZE_TIERS.map(tier => {
        const isWon = claimedPrizes.has(tier.id);
        const winner = prizeWinners[tier.id];
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 8px;border-radius:8px;background:${isWon ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)'};border:1px solid ${isWon ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.06)'};">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-weight:700;font-size:0.84rem;color:${isWon ? '#10b981' : '#f8fafc'};">${tier.name}</span>
              <small style="color:var(--mut);font-size:0.72rem;">(${tier.count} num)</small>
            </div>
            <div>
              ${isWon
                ? `<span style="font-size:0.72rem;font-weight:800;color:#10b981;padding:2px 6px;border-radius:4px;background:rgba(16, 185, 129, 0.2);">VINTO · ${esc(winner || '')}</span>`
                : `<span style="font-size:0.72rem;font-weight:800;color:#f59e0b;padding:2px 6px;border-radius:4px;background:rgba(245, 158, 11, 0.15);">IN PALIO · ${tier.points} pt</span>`
              }
            </div>
          </div>
        `;
      }).join('');
    }

    renderPrizesUI();

    // Render delle Cartelle 3x9
    function renderCartelleUI() {
      cardsListContainer.replaceChildren(...P.map(p => {
        const c = p.data.cartella;
        const isHuman = !p.bot;
        const evalCard = evaluateCard(c, p.data.marked);
        const cardBox = h('div', 'tombolaCard' + (evalCard.hasTombola ? ' winner' : ''));
        cardBox.style.setProperty('--pc', p.color);
        cardBox.style.padding = '8px';

        const cardHdr = h('div', 'tombolaCardHeader');
        cardHdr.innerHTML = `
          <span style="font-size:0.8rem;color:${p.color};font-weight:800;">${esc(p.name)}${p.bot ? ' <small style="color:var(--mut);">CPU</small>' : ' <small style="color:#10b981;">TU</small>'}</span>
          <b style="font-size:0.75rem;color:${evalCard.totalMarks >= 12 ? '#f59e0b' : 'var(--mut)'};">${evalCard.totalMarks}/15 estratti</b>
        `;

        const table = h('div', 'tombolaCardTable');
        for (let r = 0; r < 3; r++) {
          for (let col = 0; col < 9; col++) {
            const num = c.grid[r][col];
            if (!num) {
              table.append(h('div', 'tCell empty'));
            } else {
              const isMarked = p.data.marked.has(num);
              const cell = h('div', 'tCell' + (isMarked ? ' marked' : ''), String(num));
              cell.style.fontSize = '0.78rem';
              cell.onclick = () => {
                // Il giocatore umano può cliccare per marcare se il numero è già uscito
                if (isHuman && drawnSet.has(num)) {
                  if (!p.data.marked.has(num)) {
                    p.data.marked.add(num);
                    cell.classList.add('marked');
                    sfx.click();
                    renderCartelleUI();
                    checkWins();
                  }
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

    renderCartelleUI();

    // ==========================================
    // 6. BOTTOM DOCK (COMPATTO & COMPLETO)
    // ==========================================
    const camViews = [
      { name: 'Panoramica', cam: [0.6, 4.3, 10.4], look: [0.3, 1.7, 0] },
      { name: 'Zoom Tabellone', cam: [-0.9, 3.4, 6.2], look: [-0.9, 1.85, -0.6] },
      { name: 'Zoom Panariello', cam: [3.8, 2.8, 4.6], look: [4.5, 1.5, 0.2] }
    ];
    let currentCamIndex = 0;

    const dockBar = h('div', 'row');
    dockBar.style.justifyContent = 'center';
    dockBar.style.flexWrap = 'wrap';
    dockBar.style.gap = '8px';
    dockBar.style.padding = '8px 14px';

    const drawBtn = h('button', 'btn pill pri', '🎲 Estrai Numero dal Panariello');
    drawBtn.style.fontSize = '0.88rem';
    drawBtn.style.padding = '8px 16px';
    drawBtn.onclick = () => {
      stopAuto();
      extractNextNumber();
    };

    const autoBtn = h('button', 'btn pill', '⚡ Auto: OFF');
    autoBtn.style.fontSize = '0.88rem';
    autoBtn.style.padding = '8px 16px';
    autoBtn.onclick = () => {
      if (isAutoExtract) stopAuto();
      else startAuto();
    };

    const camBtn = h('button', 'btn pill', '🎥 Visuale: Panoramica');
    camBtn.style.fontSize = '0.85rem';
    camBtn.style.padding = '8px 14px';
    camBtn.onclick = () => {
      currentCamIndex = (currentCamIndex + 1) % camViews.length;
      const v = camViews[currentCamIndex];
      camBtn.textContent = `🎥 Visuale: ${v.name}`;
      sfx.click();
      S.go(v.cam, v.look);
    };

    const rulesBtn = h('button', 'btn pill', '📖 Regole');
    rulesBtn.style.fontSize = '0.85rem';
    rulesBtn.style.padding = '8px 14px';
    rulesBtn.onclick = () => {
      sfx.click();
      ctx.showRules();
    };

    dockBar.append(drawBtn, autoBtn, camBtn, rulesBtn);
    ctx.dock(dockBar);

    await host.say(`Ué, benvenuti alla Tombola Napoletana! Prendete posto, sturatevi le orecchie e che San Gennaro ci assista!`, { mood: 'happy' });

    // ==========================================
    // 7. ESTRAZIONE ANIMATA DAL PANARIELLO 3D
    // ==========================================
    async function extractNextNumber() {
      if (isExtracting) return;
      if (!urn.length) {
        stopAuto();
        await host.say(`Il panariello è vuoto! Tutti i 90 numeri sono stati estratti!`, { mood: 'think' });
        return;
      }

      isExtracting = true;
      drawBtn.disabled = true;

      // 1. O' Panariello si agita fisicamente
      sfx.tumble();
      S.shakeIt(0.24);

      // Scuotimento fisico 3D del canestro
      await tween(panarielloGroup.rotation, { x: 0.32, z: -0.28, y: panarielloGroup.rotation.y + Math.PI * 1.5 }, 0.38, ease.out);
      await tween(panarielloGroup.rotation, { x: -0.18, z: 0.22, y: panarielloGroup.rotation.y + Math.PI * 1.5 }, 0.32, ease.inout);
      tween(panarielloGroup.rotation, { x: 0, z: 0, y: panarielloGroup.rotation.y + Math.PI }, 0.35, ease.spring);

      // 2. Estrazione del numero
      const num = urn.pop();
      drawnNumbers.push(num);
      drawnSet.add(num);

      const smorf = SMORFIA[num] || { nap: `Numero ${num}`, it: `Numero ${num}` };

      // 3. Bussolotto 3D vola fuori dal Panariello fino al punto showcase
      showcaseBussolotto.position.set(4.5, 2.2, 0.2);
      showcaseBussolotto.scale.set(0.01, 0.01, 0.01);
      showcaseBussolotto.rotation.set(0, 0, 0);

      smorfiaBanner3d.set([
        { t: `NUMERO ${num}`, fs: 0.42, color: '#f59e0b' },
        { t: smorf.nap.toUpperCase(), fs: 0.28, color: '#ffffff' },
        { t: smorf.it, fs: 0.18, color: '#cbd5e1', font: 'Outfit' }
      ], { border: '#f59e0b', accent: '#f59e0b' });

      sfx.whoosh();

      // Animazione del bussolotto che atterra in primo piano
      await Promise.all([
        tween(showcaseBussolotto.position, { x: 1.8, y: 2.8, z: 4.8 }, 0.52, ease.out),
        tween(showcaseBussolotto.scale, { x: 1, y: 1, z: 1 }, 0.52, ease.overshoot),
        tween(showcaseBussolotto.rotation, { x: 0.15, y: Math.PI * 4, z: 0 }, 0.52, ease.out),
        tween(smorfiaBanner3d.scale, { x: 1, y: 1, z: 1 }, 0.48, ease.overshoot)
      ]);

      sfx.tick();
      S.flashWith('#f59e0b');

      // Aggiorna Sidebar: ultimo estratto
      const ballEl = leftPanel.querySelector('#tbBallBadge');
      const smorfNapEl = leftPanel.querySelector('#tbSmorfiaNap');
      const smorfItEl = leftPanel.querySelector('#tbSmorfiaIt');
      const countEl = leftPanel.querySelector('#tbEstrattiCount');

      if (ballEl) ballEl.textContent = String(num);
      if (smorfNapEl) smorfNapEl.textContent = `${num} · ${smorf.nap}`;
      if (smorfItEl) smorfItEl.textContent = smorf.it;
      if (countEl) countEl.textContent = `${drawnNumbers.length} / 90`;

      // 4. Riposizionamento e inserimento della pedina in legno 3D sul Tabellone
      const speed = getGameSpeed();
      await ctx.sleep(Math.max(500, Math.round(900 / speed)));

      // Il bussolotto showcase si ritira
      tween(showcaseBussolotto.scale, { x: 0.001, y: 0.001, z: 0.001 }, 0.3, ease.in);
      tween(smorfiaBanner3d.scale, { x: 0.001, y: 0.001, z: 0.001 }, 0.25, ease.in);

      // Crea la pedina 3D sul Tabellone nello slot esatto
      const slot = boardSlots[num];
      if (slot && !placedTokens[num]) {
        const tokenMesh = createTokenMesh(num);
        tokenMesh.position.set(slot.x, slot.y, 1.8);
        tabelloneGroup.add(tokenMesh);
        placedTokens[num] = tokenMesh;

        sfx.click();
        await tween(tokenMesh.position, { z: slot.z }, 0.38, ease.bounce);
      }

      // Ridisegna il Tabellone con casella illuminata
      drawTabelloneTexture();

      // Commento vocale saltuario del conduttore Don Pasquale
      if (Math.random() < 0.28) {
        host.say(`${num}! ${smorf.nap}! ${smorf.it}!`, { mood: 'happy' });
      }

      // 5. Marcatura numeri sulle cartelle
      P.forEach(p => {
        if (p.bot || autoMarkEnabled) {
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 9; c++) {
              if (p.data.cartella.grid[r][c] === num) {
                p.data.marked.add(num);
              }
            }
          }
        }
      });

      renderCartelleUI();
      await checkWins();

      isExtracting = false;
      drawBtn.disabled = false;
    }

    // ==========================================
    // 8. VERIFICA VINCITE PROGRESSIVE
    // ==========================================
    async function checkWins() {
      for (const p of P) {
        const prize = checkNextPrize(claimedPrizes, p.data.cartella, p.data.marked);
        if (prize) {
          claimedPrizes.add(prize.id);
          prizeWinners[prize.id] = p.name;
          p.data.prizes.push(prize.name);
          ctx.addScore(p, prize.points);

          sfx.ok();
          S.flashWith('#f59e0b');
          renderPrizesUI();
          renderCartelleUI();

          if (prize.id === 'tombola') {
            stopAuto();
            sfx.fanfare();
            S.burst('#f59e0b', 240);
            await host.say(`TOMBOLA! Tombola verace! ${p.name} ha fatto Tombola! Mamma mia che festa stasera!`, { mood: 'win' });
            await ctx.sleep(2200);
            ctx.finish({
              win: !p.bot,
              title: `TOMBOLA di ${p.name}!`,
              lines: [`Vincitore assoluto della Tombola Napoletana con ${p.score.toLocaleString('it-IT')} punti!`]
            });
            return;
          } else {
            await host.say(`${prize.name.toUpperCase()} per ${p.name}! Punti a referto e si continua la caccia alla Tombola!`, { mood: 'happy' });
          }
        }
      }
    }

    // ==========================================
    // 9. GESTIONE AUTO-ESTRAZIONE
    // ==========================================
    function startAuto() {
      if (isAutoExtract) return;
      isAutoExtract = true;
      autoBtn.textContent = '⏸ Pausa Auto';
      autoBtn.classList.add('pri');
      const speed = getGameSpeed();
      const delay = Math.max(1600, Math.round(3600 / speed));
      autoInterval = setInterval(() => {
        if (!isExtracting) extractNextNumber();
      }, delay);
    }

    function stopAuto() {
      isAutoExtract = false;
      clearInterval(autoInterval);
      autoInterval = null;
      autoBtn.textContent = '⚡ Auto: OFF';
      autoBtn.classList.remove('pri');
    }

    // Pulizia e smontaggio alla chiusura della partita
    ctx.onExit(() => {
      stopAuto();
      leftPanel.remove();
      tbTex.dispose();
      tokenGeo.dispose();
      tokenSideMat.dispose();
      Object.values(placedTokens).forEach(t => {
        if (t.geometry) t.geometry.dispose();
        if (Array.isArray(t.material)) t.material.forEach(m => m.dispose());
      });
    });
  }
};
