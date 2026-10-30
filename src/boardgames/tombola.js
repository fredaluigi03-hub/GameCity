// Tombola Napoletana — Vera esperienza 3D Three.js: Tavolo in legno, Tabellone 3D inclinato (90 numeri completi),
// O' Panariello in vimini con estrazione fisica, bussolotti 3D numerati, Smorfia Napoletana,
// Wizard di configurazione iniziale (Premi personalizzati, Mazziere, Cartelle soggettive uniche),
// Annuncio vocale per ogni numero estratto e modalità Auto con ritmo calibrato.
import { THREE, newStage, tween, label3d, mat, glow, person, anim, PAL, ease } from '../engine.js';
import { h, sfx, shuffle, getGameSpeed } from '../ui.js';
import { createHost, HOSTS } from '../host.js';
import { SMORFIA } from './tombola-data.js';
import {
  generateCartella,
  generateUniqueCartella,
  evaluateCard,
  checkNextPrize,
  checkNextPrizeForCartelle,
  PRIZE_TIERS,
  createPrizeTiers,
  CARTELLA_THEMES
} from './tombola-rules.js';

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
    'I giocatori hanno cartelle con 3 righe da 5 numeri ciascuna (15 numeri totali) rigorosamente uniche.',
    'I premi in palio sono progressivi: Ambo (2), Terno (3), Quaterna (4), Cinquina (5) e TOMBOLA (15 numeri)!',
    'Configura premi, mazziere e cartelle prima del via con il nuovo setup wizard interattivo.'
  ],
  guide: `
    <h3 style="color:#f59e0b;margin-bottom:8px;font-size:1.15rem;">I Traguardi della Tombola Napoletana</h3>
    <p>La Tombola tradizionale napoletana assegna le vincite in ordine rigorosamente progressivo su ciascuna cartella (3 righe x 5 numeri):</p>
    <ul style="margin:8px 0 14px 18px;line-height:1.65;font-size:0.92rem;">
      <li><b style="color:#f59e0b;">Ambo:</b> due numeri estratti sulla medesima riga.</li>
      <li><b style="color:#f59e0b;">Terno:</b> tre numeri estratti sulla medesima riga.</li>
      <li><b style="color:#f59e0b;">Quaterna:</b> quattro numeri estratti sulla medesima riga.</li>
      <li><b style="color:#f59e0b;">Cinquina:</b> tutti e 5 i numeri completati sulla stessa riga.</li>
      <li><b style="color:#f59e0b;">TOMBOLA:</b> tutti i 15 numeri della cartella coperti!</li>
    </ul>
    <h3 style="color:#f59e0b;margin-bottom:8px;font-size:1.15rem;">O’ Panariello e la Smorfia Napoletana</h3>
    <p>Il rito secolare prevede che i novanta bussolotti in legno vengano agitati dentro <i>O’ Panariello</i>, il tradizionale canestro di vimini. Il tabellone visualizza tutti i 90 numeri e il conduttore o il mazziere annuncia ogni estratto con il significato della Smorfia!</p>
  `,

  async start(ctx) {
    const P = ctx.players;

    // ========================================================
    // FASE 0: WIZARD DI CONFIGURAZIONE INTERATTIVO ALL'INGRESSO
    // ========================================================
    const setupConfig = await showTombolaSetupWizard(ctx, P);

    // Inizializza lo stage 3D Three.js con visuale ottimizzata per i 90 numeri
    const S = ctx.stage = newStage({
      c1: this.c1,
      c2: this.c2,
      bg: '#0a0604',
      cam: [0.0, 4.4, 9.6],
      look: [-0.2, 2.1, -0.4]
    });

    const activePrizeTiers = setupConfig.prizeTiers;
    const mazziereInfo = setupConfig.mazziere; // { isHost: bool, playerIndex: number, name: string }

    const drawnNumbers = [];
    const drawnSet = new Set();
    const urn = shuffle(Array.from({ length: 90 }, (_, i) => i + 1));
    const claimedPrizes = new Set();
    const prizeWinners = {}; // { ambo: 'Player 1', ... }
    let isAutoExtract = false;
    let isExtracting = false;
    let autoMarkEnabled = true;
    let autoSpeedDelay = 3200; // millisecondi di pausa tra le estrazioni in auto
    let activePlayerViewIndex = 0; // 0 per visualizzare giocatore 1, ecc. oppure -1 per tutti

    // Assegnazione cartelle uniche e soggettive a ciascun giocatore
    const existingFingerprints = new Set();
    P.forEach((p, idx) => {
      const cfg = setupConfig.playerConfigs[idx] || { count: 1, theme: CARTELLA_THEMES[idx % CARTELLA_THEMES.length] };
      p.data.cartelle = [];
      p.data.theme = cfg.theme;
      p.data.color = cfg.theme.color;
      p.data.cardCount = cfg.count;
      p.data.marked = new Set();
      p.data.prizes = [];
      p.data.isMazziere = !mazziereInfo.isHost && mazziereInfo.playerIndex === idx;

      for (let k = 0; k < cfg.count; k++) {
        const card = generateUniqueCartella(k + 1, existingFingerprints, cfg.theme.color);
        card.playerOwner = p.name;
        card.cardNum = k + 1;
        p.data.cartelle.push(card);
      }
    });

    // Host 3D Don Pasquale
    const host = createHost(ctx, {
      ...HOSTS.tombola,
      position: [-4.8, 0, -0.2],
      lookAt: [0, 1.8, 0]
    });

    // ==========================================
    // 1. TAVOLO IN LEGNO MASSELLO TRADIZIONALE
    // ==========================================
    const tableGroup = new THREE.Group();
    S.add(tableGroup);

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

    // ========================================================
    // 2. TABELLONE 3D DEI 90 NUMERI (RIALZATO E COMPLETAMENTE VISIBILE)
    // ========================================================
    // Posizionato a y = 2.65, z = -0.7 con inclinazione morbida (-0.12 rad)
    // così che le righe 8 e 9 (numeri 71-90) non siano MAI coperte dal tavolo!
    const tabelloneGroup = new THREE.Group();
    tabelloneGroup.position.set(-0.7, 2.65, -0.7);
    tabelloneGroup.rotation.x = -0.12;
    S.add(tabelloneGroup);

    // Supporti in legno che poggiano sul tavolo
    const boardWoodMat = mat('#2c160b', { roughness: 0.35, metalness: 0.15 });
    const standLegLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 0.22), boardWoodMat);
    standLegLeft.position.set(-3.2, -2.1, -0.15);
    const standLegRight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 0.22), boardWoodMat);
    standLegRight.position.set(3.2, -2.1, -0.15);
    tabelloneGroup.add(standLegLeft, standLegRight);

    // Cornice in legno massello scuro pregiato
    const boardBack = new THREE.Mesh(new THREE.BoxGeometry(8.4, 5.4, 0.25), boardWoodMat);
    tabelloneGroup.add(boardBack);

    // Bordatura dorata attorno al tabellone
    const boardTrimMat = mat('#c9a24e', { metalness: 0.85, roughness: 0.28 });
    const trimTop = new THREE.Mesh(new THREE.BoxGeometry(8.52, 0.1, 0.28), boardTrimMat); trimTop.position.y = 2.72;
    const trimBot = new THREE.Mesh(new THREE.BoxGeometry(8.52, 0.1, 0.28), boardTrimMat); trimBot.position.y = -2.72;
    const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 5.54, 0.28), boardTrimMat); trimLeft.position.x = -4.23;
    const trimRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 5.54, 0.28), boardTrimMat); trimRight.position.x = 4.23;
    tabelloneGroup.add(trimTop, trimBot, trimLeft, trimRight);

    // Texture Canvas ad altissima risoluzione (2048 x 1400) per TUTTI I 90 NUMERI
    const tbCanvas = document.createElement('canvas');
    tbCanvas.width = 2048;
    tbCanvas.height = 1400;
    const tbCtx = tbCanvas.getContext('2d');

    const tbTex = new THREE.CanvasTexture(tbCanvas);
    tbTex.colorSpace = THREE.SRGBColorSpace;
    tbTex.anisotropy = 4;

    const boardFace = new THREE.Mesh(
      new THREE.PlaneGeometry(8.2, 5.2),
      new THREE.MeshBasicMaterial({ map: tbTex, color: new THREE.Color(0.88, 0.88, 0.88), toneMapped: false })
    );
    boardFace.userData.noShadow = true;
    boardFace.position.z = 0.126;
    tabelloneGroup.add(boardFace);

    // Coordinate esatte per ogni slot 1..90 sul tabellone (griglia 9 righe x 10 colonne)
    const boardSlots = {};
    const gridCols = 10;
    const gridRows = 9;
    const gridW = 7.8;
    const gridH = 4.5;
    const startX = -gridW / 2;
    const startY = 2.05;
    const cellW = gridW / gridCols; // 0.78
    const cellH = gridH / gridRows; // 0.50

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
      // Sfondo pergamenato caldo vintage anti-riflesso
      const bgGrad = tbCtx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#f2e8d5');
      bgGrad.addColorStop(1, '#dfceb0');
      tbCtx.fillStyle = bgGrad;
      tbCtx.fillRect(0, 0, W, H);

      // Cornice interna dorata e bordeaux
      tbCtx.lineWidth = 10;
      tbCtx.strokeStyle = '#c9a24e';
      tbCtx.strokeRect(18, 18, W - 36, H - 36);
      tbCtx.lineWidth = 3;
      tbCtx.strokeStyle = '#7f1d1d';
      tbCtx.strokeRect(28, 28, W - 56, H - 56);

      // Intestazione nobile napoletana
      tbCtx.fillStyle = '#7f1d1d';
      tbCtx.font = 'bold 46px "Bebas Neue", Outfit, sans-serif';
      tbCtx.textAlign = 'center';
      tbCtx.textBaseline = 'top';
      tbCtx.fillText('TOMBOLA NAPOLETANA · IL TABELLONE DEI 90 NUMERI', W / 2, 36);

      // Sottotitolo decorativo con indicazione Mazziere
      tbCtx.fillStyle = '#92400e';
      tbCtx.font = '600 20px Outfit, sans-serif';
      const mazziereStr = mazziereInfo.isHost ? 'Conduttore: Don Pasquale' : `Mazziere al Tavolo: ${mazziereInfo.name}`;
      tbCtx.fillText(`TRADIZIONE DELLA SMORFIA · ESTRATTI DAL PANARIELLO (${mazziereStr})`, W / 2, 90);

      // Griglia delle 90 caselle (10 cols x 9 rows)
      const gridLeft = 40;
      const gridTop = 130;
      const cW = (W - 80) / gridCols;
      const cH = (H - 165) / gridRows;

      for (let num = 1; num <= 90; num++) {
        const r = Math.floor((num - 1) / gridCols);
        const c = (num - 1) % gridCols;
        const x = gridLeft + c * cW;
        const y = gridTop + r * cH;

        const isDrawn = drawnSet.has(num);

        // Sfondo casella
        tbCtx.fillStyle = isDrawn ? 'rgba(245, 158, 11, 0.32)' : 'rgba(255, 255, 255, 0.72)';
        tbCtx.fillRect(x + 2, y + 2, cW - 4, cH - 4);

        // Bordo casella
        tbCtx.lineWidth = isDrawn ? 3 : 1.5;
        tbCtx.strokeStyle = isDrawn ? '#d97706' : '#d2bc96';
        tbCtx.strokeRect(x + 2, y + 2, cW - 4, cH - 4);

        // Numero grande con alto contrasto
        tbCtx.fillStyle = isDrawn ? '#b91c1c' : '#1c130d';
        tbCtx.font = 'bold 52px "Bebas Neue", Outfit, sans-serif';
        tbCtx.textAlign = 'center';
        tbCtx.textBaseline = 'middle';
        tbCtx.fillText(String(num), x + cW / 2, y + cH * 0.40);

        // Nome della Smorfia Napoletana in basso
        const smorf = SMORFIA[num]?.nap || '';
        tbCtx.fillStyle = isDrawn ? '#9a3412' : '#6b5c4f';
        tbCtx.font = 'bold 15px Outfit, sans-serif';
        const displaySmorf = smorf.length > 18 ? smorf.slice(0, 16) + '…' : smorf;
        tbCtx.fillText(displaySmorf, x + cW / 2, y + cH * 0.82);
      }

      tbTex.needsUpdate = true;
    }

    drawTabelloneTexture();

    // Registry delle pedine in legno 3D posizionate sul Tabellone
    const placedTokens = {};
    const tokenGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.14, 24);
    tokenGeo.rotateX(Math.PI / 2);

    const tokenSideMat = mat('#d19d65', { roughness: 0.35, metalness: 0.08 });

    function createTokenMesh(num) {
      const capCanvas = document.createElement('canvas');
      capCanvas.width = 128;
      capCanvas.height = 128;
      const cx = capCanvas.getContext('2d');

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
      const tokenCapMat = new THREE.MeshBasicMaterial({ map: capTex, color: new THREE.Color(0.86, 0.86, 0.86), toneMapped: false });

      return new THREE.Mesh(tokenGeo, [tokenSideMat, tokenCapMat, tokenCapMat]);
    }

    // ==========================================
    // 3. O' PANARIELLO IN VIMINI (BASKET 3D)
    // ==========================================
    const panarielloGroup = new THREE.Group();
    panarielloGroup.position.set(4.5, 1.45, 0.2);
    S.add(panarielloGroup);

    const wickerMat = mat('#ab723b', { roughness: 0.85, metalness: 0.08 });
    const wickerDarkMat = mat('#78451c', { roughness: 0.9, metalness: 0.1 });
    const rimMat = mat('#522c0e', { roughness: 0.75, metalness: 0.15 });

    const coaster = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.08, 24), boardWoodMat);
    coaster.position.y = -0.72;
    panarielloGroup.add(coaster);

    const basketBody = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.65, 1.35, 24, 4), wickerMat);
    panarielloGroup.add(basketBody);

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.05, 12, 32), wickerDarkMat);
    ring1.rotation.x = Math.PI / 2; ring1.position.y = -0.45;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 12, 32), wickerDarkMat);
    ring2.rotation.x = Math.PI / 2; ring2.position.y = 0;
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.055, 12, 32), wickerDarkMat);
    ring3.rotation.x = Math.PI / 2; ring3.position.y = 0.55;

    const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.87, 0.07, 12, 32), rimMat);
    basketRim.rotation.x = Math.PI / 2; basketRim.position.y = 0.68;

    panarielloGroup.add(ring1, ring2, ring3, basketRim);

    [-1, 1].forEach(side => {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.038, 8, 24, Math.PI), rimMat);
      handle.position.set(side * 0.86, 0.42, 0);
      handle.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      panarielloGroup.add(handle);
    });

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

    // Banner Mazziere
    const spMazziereSec = h('div', 'spSection');
    spMazziereSec.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(30, 41, 59, 0.8))';
    spMazziereSec.style.border = '1px solid rgba(245, 158, 11, 0.3)';
    spMazziereSec.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:1.3rem;">🏺</span>
          <div>
            <div style="font-size:0.68rem;text-transform:uppercase;color:var(--goldHi);font-weight:800;letter-spacing:0.08em;">Mazziere & Panariello</div>
            <b style="font-size:0.92rem;color:#f8fafc;">${esc(mazziereInfo.name)}</b>
          </div>
        </div>
        <button id="tbOpenMasterModalBtn" class="btn pill" style="font-size:0.7rem;padding:4px 8px;background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid rgba(245,158,11,0.4);">📋 90 Numeri</button>
      </div>
    `;

    // Sezione 1: Ultimo Numero Estratto & Smorfia
    const spExtractedSec = h('div', 'spSection');
    spExtractedSec.style.background = 'linear-gradient(135deg, rgba(220, 38, 38, 0.14), rgba(15, 23, 42, 0.88))';
    spExtractedSec.style.borderColor = 'rgba(220, 38, 38, 0.35)';
    spExtractedSec.innerHTML = `
      <div class="spTitle">
        <span>Ultimo Estratto</span>
        <span id="tbEstrattiCount" style="color:var(--goldHi);font-weight:800;">0 / 90</span>
      </div>
      <div style="display:flex;align-items:center;gap:14px;margin-top:4px;">
        <div id="tbBallBadge" class="panarielloBall" style="width:58px;height:58px;font-size:2rem;flex:none;">—</div>
        <div style="min-width:0;display:flex;flex-direction:column;gap:3px;">
          <b id="tbSmorfiaNap" style="font-size:1.15rem;color:#ffffff;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Pronti a giocare!</b>
          <span id="tbSmorfiaIt" style="font-size:0.82rem;color:var(--mut);text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Gira il Panariello...</span>
        </div>
      </div>
    `;

    // Sezione 2: Premi Progressivi della Tombola (Personalizzati)
    const spPrizesSec = h('div', 'spSection');
    spPrizesSec.innerHTML = `
      <div class="spTitle">
        <span>Premi in Palio</span>
        <span style="color:#f59e0b;font-size:0.68rem;letter-spacing:0.1em;">Ordine Progressivo</span>
      </div>
      <div id="tbPrizesContainer" style="display:flex;flex-direction:column;gap:5px;"></div>
    `;

    // Sezione 3: Cartelle Giocatori
    const spCardsSec = h('div', 'spSection');
    spCardsSec.style.display = 'flex';
    spCardsSec.style.flexDirection = 'column';
    spCardsSec.style.gap = '8px';

    const cardsHeader = h('div', 'spTitle');
    cardsHeader.innerHTML = `
      <span>Cartelle di Gioco</span>
      <div style="display:flex;gap:6px;align-items:center;">
        <button id="tbAllCardsViewBtn" class="btn pill" style="font-size:0.68rem;padding:3px 8px;">👀 Vista Sala</button>
        <button id="tbAutoMarkToggle" class="btn pill" style="font-size:0.68rem;padding:3px 8px;">Marcatura: AUTO</button>
      </div>
    `;

    // Player switcher tabs
    const playerTabsBar = h('div');
    playerTabsBar.style.display = 'flex';
    playerTabsBar.style.gap = '4px';
    playerTabsBar.style.overflowX = 'auto';
    playerTabsBar.style.paddingBottom = '4px';

    const cardsListContainer = h('div');
    cardsListContainer.style.display = 'flex';
    cardsListContainer.style.flexDirection = 'column';
    cardsListContainer.style.gap = '10px';

    spCardsSec.append(cardsHeader, playerTabsBar, cardsListContainer);

    leftPanel.append(spMazziereSec, spExtractedSec, spPrizesSec, spCardsSec);

    // Toggle Auto-Marcatura
    const autoMarkBtn = leftPanel.querySelector('#tbAutoMarkToggle');
    autoMarkBtn.onclick = () => {
      autoMarkEnabled = !autoMarkEnabled;
      autoMarkBtn.textContent = `Marcatura: ${autoMarkEnabled ? 'AUTO' : 'MANUALE'}`;
      autoMarkBtn.classList.toggle('pri', autoMarkEnabled);
      sfx.click();
      if (autoMarkEnabled) {
        P.forEach(p => {
          for (const card of p.data.cartelle) {
            for (let r = 0; r < 3; r++) {
              for (let c = 0; c < 9; c++) {
                const val = card.grid[r][c];
                if (val > 0 && drawnSet.has(val)) p.data.marked.add(val);
              }
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
      container.innerHTML = activePrizeTiers.map(tier => {
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
                : `<span style="font-size:0.72rem;font-weight:800;color:#f59e0b;padding:2px 6px;border-radius:4px;background:rgba(245, 158, 11, 0.15);">${esc(tier.label || tier.points + ' pt')}</span>`
              }
            </div>
          </div>
        `;
      }).join('');
    }

    renderPrizesUI();

    // Render dei Tabs Giocatori
    function renderPlayerTabs() {
      playerTabsBar.innerHTML = '';
      const allBtn = h('button', 'btn pill' + (activePlayerViewIndex === -1 ? ' pri' : ''), 'Tutti');
      allBtn.style.fontSize = '0.7rem';
      allBtn.style.padding = '3px 8px';
      allBtn.onclick = () => {
        activePlayerViewIndex = -1;
        renderPlayerTabs();
        renderCartelleUI();
      };
      playerTabsBar.appendChild(allBtn);

      P.forEach((p, idx) => {
        const btn = h('button', 'btn pill' + (activePlayerViewIndex === idx ? ' pri' : ''));
        btn.style.fontSize = '0.7rem';
        btn.style.padding = '3px 8px';
        btn.style.borderColor = p.data.theme?.border || p.color;
        btn.innerHTML = `<span style="color:${p.data.theme?.color || p.color};">●</span> ${esc(p.name)} (${p.data.cartelle.length})`;
        btn.onclick = () => {
          activePlayerViewIndex = idx;
          renderPlayerTabs();
          renderCartelleUI();
        };
        playerTabsBar.appendChild(btn);
      });
    }

    renderPlayerTabs();

    // Render delle Cartelle 3x9 per ciascun giocatore
    function renderCartelleUI() {
      const playersToShow = activePlayerViewIndex === -1 ? P : [P[activePlayerViewIndex]];
      cardsListContainer.replaceChildren(...playersToShow.flatMap(p => {
        const isHuman = !p.bot;
        return p.data.cartelle.map(c => {
          const evalCard = evaluateCard(c, p.data.marked);
          const cardBox = h('div', 'tombolaCard' + (evalCard.hasTombola ? ' winner' : ''));
          cardBox.style.setProperty('--pc', p.data.color || p.color);
          cardBox.style.padding = '8px';
          cardBox.style.border = `1.5px solid ${p.data.theme?.border || 'rgba(245,158,11,0.4)'}`;

          const cardHdr = h('div', 'tombolaCardHeader');
          cardHdr.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:0.82rem;color:${p.data.color || p.color};font-weight:800;">
                ${esc(p.name)} ${p.bot ? '<small style="color:var(--mut);">CPU</small>' : '<small style="color:#10b981;font-weight:800;">TU</small>'}
              </span>
              <small style="color:var(--mut);font-size:0.72rem;">#${c.cardNum || 1}</small>
            </div>
            <b style="font-size:0.75rem;color:${evalCard.totalMarks >= 12 ? '#f59e0b' : 'var(--mut)'};">${evalCard.totalMarks}/15 estratti</b>
          `;

          const table = h('div', 'tombolaCardTable');
          for (let r = 0; r < 3; r++) {
            const rowCount = c.grid[r].filter(n => n > 0 && p.data.marked.has(n)).length;
            const isNearWinRow = rowCount >= 4;

            for (let col = 0; col < 9; col++) {
              const num = c.grid[r][col];
              if (!num) {
                const emptyCell = h('div', 'tCell empty');
                table.append(emptyCell);
              } else {
                const isMarked = p.data.marked.has(num);
                const cell = h('div', 'tCell' + (isMarked ? ' marked' : '') + (isNearWinRow ? ' nearWin' : ''));
                cell.style.fontSize = '0.86rem';
                cell.style.fontWeight = '800';

                if (isMarked) {
                  cell.innerHTML = `<span class="fagioloBean">${num}</span>`;
                } else {
                  cell.textContent = String(num);
                }

                cell.onclick = () => {
                  if (isHuman && drawnSet.has(num)) {
                    if (!p.data.marked.has(num)) {
                      p.data.marked.add(num);
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
        });
      }));
    }

    renderCartelleUI();

    // ==========================================
    // 6. MODALE MASTER TABELLONE 90 NUMERI (HD)
    // ==========================================
    function openMasterTabelloneModal() {
      sfx.click();
      const modal = h('div', 'masterTabelloneModal');
      modal.innerHTML = `
        <div class="masterTabelloneCard">
          <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid rgba(245,158,11,0.3);">
            <div>
              <div style="font-size:0.8rem;text-transform:uppercase;color:var(--goldHi);font-weight:800;letter-spacing:0.1em;">Tabellone Ufficiale dei 90 Numeri</div>
              <h2 style="margin:2px 0 0;font-size:1.4rem;color:#f8fafc;font-family:'Bebas Neue', Outfit, sans-serif;letter-spacing:0.04em;">La Smorfia Napoletana in HD</h2>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-weight:800;font-size:1.1rem;color:#f59e0b;">${drawnNumbers.length} / 90 estratti</span>
              <button id="closeTbMasterModal" class="btn pill" style="font-size:0.85rem;padding:6px 14px;">✕ Chiudi</button>
            </div>
          </div>
          <div id="masterGridSlots" style="display:grid;grid-template-columns:repeat(10, 1fr);gap:6px;margin-top:14px;"></div>
        </div>
      `;

      const gridEl = modal.querySelector('#masterGridSlots');
      for (let n = 1; n <= 90; n++) {
        const isDrawn = drawnSet.has(n);
        const smorf = SMORFIA[n]?.nap || '';
        const item = h('div');
        item.style.padding = '8px 4px';
        item.style.textAlign = 'center';
        item.style.borderRadius = '8px';
        item.style.border = isDrawn ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)';
        item.style.background = isDrawn ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(220, 38, 38, 0.25))' : 'rgba(255,255,255,0.03)';
        item.style.boxShadow = isDrawn ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'none';
        item.innerHTML = `
          <div style="font-size:1.25rem;font-weight:900;font-family:'Bebas Neue',Outfit,sans-serif;color:${isDrawn ? '#fef08a' : '#94a3b8'};">${n}</div>
          <div style="font-size:0.65rem;color:${isDrawn ? '#ffffff' : '#64748b'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;">${esc(smorf)}</div>
        `;
        gridEl.appendChild(item);
      }

      modal.querySelector('#closeTbMasterModal').onclick = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
      document.body.appendChild(modal);
    }

    leftPanel.querySelector('#tbOpenMasterModalBtn').onclick = openMasterTabelloneModal;

    // Modale Vista Sala: tutte le cartelle a mosaico
    function openAllCardsModal() {
      sfx.click();
      const modal = h('div', 'masterTabelloneModal');
      modal.innerHTML = `
        <div class="masterTabelloneCard" style="max-width:1150px;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid rgba(245,158,11,0.3);">
            <div>
              <div style="font-size:0.8rem;text-transform:uppercase;color:var(--goldHi);font-weight:800;letter-spacing:0.1em;">Vista Sala Completa</div>
              <h2 style="margin:2px 0 0;font-size:1.35rem;color:#f8fafc;">Tutte le Cartelle dei Giocatori al Tavolo</h2>
            </div>
            <button id="closeAllCardsModal" class="btn pill" style="font-size:0.85rem;padding:6px 14px;">✕ Chiudi</button>
          </div>
          <div id="allCardsMosaic" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:14px;margin-top:14px;"></div>
        </div>
      `;

      const mosaicEl = modal.querySelector('#allCardsMosaic');
      P.forEach(p => {
        p.data.cartelle.forEach(c => {
          const evalCard = evaluateCard(c, p.data.marked);
          const cardDiv = h('div', 'tombolaCard' + (evalCard.hasTombola ? ' winner' : ''));
          cardDiv.style.setProperty('--pc', p.data.color || p.color);
          cardDiv.style.border = `1.5px solid ${p.data.theme?.border || 'rgba(245,158,11,0.4)'}`;
          cardDiv.style.padding = '8px';

          const hdr = h('div', 'tombolaCardHeader');
          hdr.innerHTML = `
            <span style="font-size:0.82rem;color:${p.data.color || p.color};font-weight:800;">${esc(p.name)} - Cartella #${c.cardNum || 1}</span>
            <b style="font-size:0.75rem;color:${evalCard.totalMarks >= 12 ? '#f59e0b' : 'var(--mut)'};">${evalCard.totalMarks}/15 coperti</b>
          `;
          const tbl = h('div', 'tombolaCardTable');
          for (let r = 0; r < 3; r++) {
            for (let col = 0; col < 9; col++) {
              const num = c.grid[r][col];
              if (!num) tbl.append(h('div', 'tCell empty'));
              else {
                const isMarked = p.data.marked.has(num);
                const cell = h('div', 'tCell' + (isMarked ? ' marked' : ''));
                cell.style.fontSize = '0.84rem';
                cell.textContent = String(num);
                tbl.append(cell);
              }
            }
          }
          cardDiv.append(hdr, tbl);
          mosaicEl.appendChild(cardDiv);
        });
      });

      modal.querySelector('#closeAllCardsModal').onclick = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
      document.body.appendChild(modal);
    }

    leftPanel.querySelector('#tbAllCardsViewBtn').onclick = openAllCardsModal;

    // ==========================================
    // 7. BOTTOM DOCK (COMPATTO & COMPLETO)
    // ==========================================
    const camViews = [
      { name: 'Panoramica', cam: [0.0, 4.4, 9.6], look: [-0.2, 2.1, -0.4] },
      { name: 'Tabellone 90 HD', cam: [-0.7, 2.65, 5.2], look: [-0.7, 2.65, -0.7] },
      { name: 'O’ Panariello', cam: [4.0, 2.6, 4.4], look: [4.5, 1.5, 0.2] }
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

    const speedBtn = h('button', 'btn pill', '⏱️ 3.2s');
    speedBtn.title = 'Regola la velocità dell’estrazione automatica';
    speedBtn.style.fontSize = '0.82rem';
    speedBtn.style.padding = '8px 12px';
    speedBtn.onclick = () => {
      if (autoSpeedDelay === 3200) {
        autoSpeedDelay = 4500;
        speedBtn.textContent = '⏱️ 4.5s (Lenta)';
      } else if (autoSpeedDelay === 4500) {
        autoSpeedDelay = 2200;
        speedBtn.textContent = '⏱️ 2.2s (Veloce)';
      } else {
        autoSpeedDelay = 3200;
        speedBtn.textContent = '⏱️ 3.2s (Media)';
      }
      sfx.click();
    };

    const masterBoardBtn = h('button', 'btn pill', '📋 Tabellone (90)');
    masterBoardBtn.style.fontSize = '0.85rem';
    masterBoardBtn.style.padding = '8px 14px';
    masterBoardBtn.onclick = openMasterTabelloneModal;

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

    dockBar.append(drawBtn, autoBtn, speedBtn, masterBoardBtn, camBtn, rulesBtn);
    ctx.dock(dockBar);

    // Saluto inaugurale di Don Pasquale che cita il mazziere scelto
    if (mazziereInfo.isHost) {
      await host.say(`Ué! Benvenuti alla grande Tombola Napoletana! Ci penso io, Don Pasquale, a girare 'o Panariello e a gridare i 90 numeri della Smorfia!`, { mood: 'happy' });
    } else {
      await host.say(`Ué! Benvenuti alla Tombola Napoletana! Stasera al timone del Panariello c'è ${mazziereInfo.name}! Occhi sulle cartelle e orecchie tese!`, { mood: 'happy' });
    }

    // ==========================================
    // 8. ESTRAZIONE ANIMATA DAL PANARIELLO 3D CON VOCE AD OGNI NUMERO
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
      await ctx.sleep(Math.max(450, Math.round(750 / speed)));

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

      // Ridisegna il Tabellone 3D con la casella illuminata
      drawTabelloneTexture();

      // VOCE DEL CONDUTTORE / MAZZIERE AD OGNI SINGOLO NUMERO ESTRATTO (100% DI FREQUENZA!)
      // Annuncia il numero, il nome tradizionale napoletano e la traduzione italiana
      const annuncioVoce = `${num}! ${smorf.nap}! ${smorf.it}!`;
      await host.say(annuncioVoce, { mood: 'happy' });

      // 5. Marcatura numeri sulle cartelle dei giocatori
      P.forEach(p => {
        if (p.bot || autoMarkEnabled) {
          for (const card of p.data.cartelle) {
            for (let r = 0; r < 3; r++) {
              for (let c = 0; c < 9; c++) {
                if (card.grid[r][c] === num) {
                  p.data.marked.add(num);
                }
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
    // 9. VERIFICA VINCITE PROGRESSIVE
    // ==========================================
    async function checkWins() {
      for (const p of P) {
        // Valuta le cartelle del giocatore rispetto ai premi rimasti
        const winResult = checkNextPrizeForCartelle(claimedPrizes, p.data.cartelle, p.data.marked, activePrizeTiers);
        if (winResult) {
          const { tier } = winResult;
          claimedPrizes.add(tier.id);
          prizeWinners[tier.id] = p.name;
          p.data.prizes.push(tier.name);
          ctx.addScore(p, tier.points);

          sfx.ok();
          S.flashWith('#f59e0b');
          renderPrizesUI();
          renderCartelleUI();

          if (tier.id === 'tombola') {
            stopAuto();
            sfx.fanfare();
            S.burst('#f59e0b', 260);
            await host.say(`TOMBOLA! Tombola verace! ${p.name} ha completato l'intera cartella e fa Tombola! Che festa grandiosa stasera!`, { mood: 'win' });
            await ctx.sleep(2200);
            ctx.finish({
              win: !p.bot,
              title: `TOMBOLA di ${p.name}!`,
              lines: [
                `Vincitore assoluto della Tombola Napoletana con ${p.score.toLocaleString('it-IT')} punti!`,
                `Premi vinti: ${p.data.prizes.join(', ')}`
              ]
            });
            return;
          } else {
            await host.say(`${tier.name.toUpperCase()} per ${p.name}! Il premio è suo e la caccia alla Tombola continua!`, { mood: 'happy' });
          }
        }
      }
    }

    // ==========================================
    // 10. GESTIONE AUTO-ESTRAZIONE CALIBRATA CON CICLO ASINCRONO
    // ==========================================
    async function runAutoLoop() {
      while (isAutoExtract && urn.length > 0) {
        if (isExtracting) {
          await ctx.sleep(150);
          continue;
        }

        await extractNextNumber();

        if (!isAutoExtract || urn.length === 0) break;

        // Attende una pausa calibrata prima di estrarre il prossimo numero,
        // garantendo che la voce del conduttore e l'animazione abbiano finito!
        const totalSteps = Math.max(5, Math.floor(autoSpeedDelay / 100));
        for (let s = 0; s < totalSteps; s++) {
          if (!isAutoExtract) break;
          await ctx.sleep(100);
        }
      }

      if (urn.length === 0 && isAutoExtract) {
        stopAuto();
      }
    }

    function startAuto() {
      if (isAutoExtract) return;
      isAutoExtract = true;
      autoBtn.textContent = '⏸ Pausa Auto';
      autoBtn.classList.add('pri');
      sfx.click();
      runAutoLoop();
    }

    function stopAuto() {
      isAutoExtract = false;
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

// ============================================================================
// WIZARD DI CONFIGURAZIONE INTERATTIVO TOMBOLA NAPOLETANA
// ============================================================================
function showTombolaSetupWizard(ctx, P) {
  return new Promise((resolve) => {
    sfx.fanfare();
    const overlay = h('div', 'tombolaWizardOverlay');

    let currentStep = 1;

    // Configurazione predefinita
    const wizardState = {
      prizes: {
        amboDesc: '200 Punti',
        amboPoints: 200,
        ternoDesc: '500 Punti',
        ternoPoints: 500,
        quaternaDesc: '1.200 Punti',
        quaternaPoints: 1200,
        cinquinaDesc: '3.000 Punti',
        cinquinaPoints: 3000,
        tombolaDesc: '10.000 Punti',
        tombolaPoints: 10000,
        hasTombolino: false,
        tombolinoDesc: '5.000 Punti',
        tombolinoPoints: 5000
      },
      mazziere: {
        isHost: true,
        playerIndex: -1,
        name: 'Don Pasquale (Conduttore)'
      },
      playerConfigs: P.map((p, idx) => ({
        count: idx === 0 ? 2 : 1, // Il primo giocatore ha 2 cartelle di default, gli altri 1
        theme: CARTELLA_THEMES[idx % CARTELLA_THEMES.length],
        color: CARTELLA_THEMES[idx % CARTELLA_THEMES.length].color
      }))
    };

    const card = h('div', 'tombolaWizardCard');

    function renderWizardStep() {
      card.innerHTML = `
        <div class="wizardStepsHeader">
          <div class="wizardStepTab ${currentStep === 1 ? 'active' : ''}">
            <span class="stepNum">1</span>
            <span>Premi in Palio</span>
          </div>
          <div class="wizardStepTab ${currentStep === 2 ? 'active' : ''}">
            <span class="stepNum">2</span>
            <span>Mazziere & Panariello</span>
          </div>
          <div class="wizardStepTab ${currentStep === 3 ? 'active' : ''}">
            <span class="stepNum">3</span>
            <span>Cartelle & Colori</span>
          </div>
        </div>
        <div id="wizardStepBody" style="min-height:280px;display:flex;flex-direction:column;gap:16px;"></div>
        <div id="wizardActions" style="display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:1px solid rgba(255,255,255,0.08);"></div>
      `;

      const bodyEl = card.querySelector('#wizardStepBody');
      const actionsEl = card.querySelector('#wizardActions');

      if (currentStep === 1) {
        // STEP 1: GESTIONE PREMI
        bodyEl.innerHTML = `
          <div>
            <h3 style="margin:0 0 4px;font-size:1.25rem;color:#f59e0b;">1. Personalizzazione Premi in Palio</h3>
            <p style="margin:0;font-size:0.86rem;color:var(--mut);">Scrivi o modifica i premi associati a ciascun traguardo della Tombola Napoletana:</p>
          </div>
          <div class="wizardPrizeGrid">
            <div class="prizeInputRow">
              <span class="prizeLabel">🥈 Ambo (2 num)</span>
              <input type="text" id="pzAmbo" class="prizeInputField" value="${esc(wizardState.prizes.amboDesc)}" placeholder="Es. 200 Punti o 2 €" />
            </div>
            <div class="prizeInputRow">
              <span class="prizeLabel">🥉 Terno (3 num)</span>
              <input type="text" id="pzTerno" class="prizeInputField" value="${esc(wizardState.prizes.ternoDesc)}" placeholder="Es. 500 Punti o 5 €" />
            </div>
            <div class="prizeInputRow">
              <span class="prizeLabel">🏅 Quaterna (4 num)</span>
              <input type="text" id="pzQuaterna" class="prizeInputField" value="${esc(wizardState.prizes.quaternaDesc)}" placeholder="Es. 1.200 Punti o 10 €" />
            </div>
            <div class="prizeInputRow">
              <span class="prizeLabel">🌟 Cinquina (5 num)</span>
              <input type="text" id="pzCinquina" class="prizeInputField" value="${esc(wizardState.prizes.cinquinaDesc)}" placeholder="Es. 3.000 Punti o Cesto Natalizio" />
            </div>
            <div class="prizeInputRow" style="border:1.5px solid rgba(245, 158, 11, 0.5);background:rgba(245, 158, 11, 0.08);">
              <span class="prizeLabel" style="color:#f59e0b;font-weight:900;">🏆 TOMBOLA (15 num)</span>
              <input type="text" id="pzTombola" class="prizeInputField" value="${esc(wizardState.prizes.tombolaDesc)}" placeholder="Es. 10.000 Punti o Super Premio" />
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:4px;">
            <input type="checkbox" id="pzHasTombolino" ${wizardState.prizes.hasTombolino ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;" />
            <label for="pzHasTombolino" style="font-size:0.88rem;color:#f8fafc;cursor:pointer;">
              Aggiungi <b>Tombolino</b> (seconda Tombola dopo la prima - 5.000 pt)
            </label>
          </div>
        `;

        actionsEl.innerHTML = `
          <div></div>
          <button id="btnStep1Next" class="btn pill pri" style="padding:10px 22px;font-size:0.92rem;">Avanti: Scegli Mazziere ➔</button>
        `;

        actionsEl.querySelector('#btnStep1Next').onclick = () => {
          wizardState.prizes.amboDesc = bodyEl.querySelector('#pzAmbo').value.trim() || '200 Punti';
          wizardState.prizes.ternoDesc = bodyEl.querySelector('#pzTerno').value.trim() || '500 Punti';
          wizardState.prizes.quaternaDesc = bodyEl.querySelector('#pzQuaterna').value.trim() || '1.200 Punti';
          wizardState.prizes.cinquinaDesc = bodyEl.querySelector('#pzCinquina').value.trim() || '3.000 Punti';
          wizardState.prizes.tombolaDesc = bodyEl.querySelector('#pzTombola').value.trim() || '10.000 Punti';
          wizardState.prizes.hasTombolino = bodyEl.querySelector('#pzHasTombolino').checked;
          currentStep = 2;
          sfx.click();
          renderWizardStep();
        };

      } else if (currentStep === 2) {
        // STEP 2: SCELTA DEL MAZZIERE
        bodyEl.innerHTML = `
          <div>
            <h3 style="margin:0 0 4px;font-size:1.25rem;color:#f59e0b;">2. Chi fa il Tabellone & O’ Panariello?</h3>
            <p style="margin:0;font-size:0.86rem;color:var(--mut);">Scegli se a gestire le estrazioni dal canestro in vimini sarà il Conduttore o un giocatore al tavolo:</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:14px;margin-top:6px;">
            <div id="dealerOptionHost" class="dealerOptionCard ${wizardState.mazziere.isHost ? 'selected' : ''}">
              <div style="font-size:2.2rem;margin-bottom:6px;">🎭</div>
              <b style="font-size:1.05rem;color:#f8fafc;">Don Pasquale (Conduttore)</b>
              <p style="font-size:0.8rem;color:var(--mut);margin:6px 0 0;line-height:1.4;">
                Il celebre conduttore napoletano Doc estrae i bussolotti, annuncia la Smorfia e intrattiene il tavolo con verace simpatia.
              </p>
            </div>
            <div id="dealerOptionPlayer" class="dealerOptionCard ${!wizardState.mazziere.isHost ? 'selected' : ''}">
              <div style="font-size:2.2rem;margin-bottom:6px;">👤</div>
              <b style="font-size:1.05rem;color:#f8fafc;">Un Giocatore al Tavolo</b>
              <p style="font-size:0.8rem;color:var(--mut);margin:6px 0 8px;line-height:1.4;">
                Uno dei partecipanti fa da Mazziere ufficiale e siede idealmente a capotavola davanti al Panariello.
              </p>
              <select id="dealerPlayerSelector" class="prizeInputField" style="width:100%;font-size:0.88rem;">
                ${P.map((p, idx) => `
                  <option value="${idx}" ${(!wizardState.mazziere.isHost && wizardState.mazziere.playerIndex === idx) ? 'selected' : ''}>
                    ${esc(p.name)} ${p.bot ? '(CPU)' : '(TU)'}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
        `;

        const optHost = bodyEl.querySelector('#dealerOptionHost');
        const optPlayer = bodyEl.querySelector('#dealerOptionPlayer');
        const playerSelect = bodyEl.querySelector('#dealerPlayerSelector');

        optHost.onclick = () => {
          wizardState.mazziere.isHost = true;
          wizardState.mazziere.playerIndex = -1;
          wizardState.mazziere.name = 'Don Pasquale (Conduttore)';
          optHost.classList.add('selected');
          optPlayer.classList.remove('selected');
          sfx.click();
        };

        optPlayer.onclick = (e) => {
          if (e.target !== playerSelect) {
            wizardState.mazziere.isHost = false;
            wizardState.mazziere.playerIndex = Number(playerSelect.value) || 0;
            wizardState.mazziere.name = P[wizardState.mazziere.playerIndex]?.name || 'Giocatore';
            optPlayer.classList.add('selected');
            optHost.classList.remove('selected');
            sfx.click();
          }
        };

        playerSelect.onchange = () => {
          wizardState.mazziere.isHost = false;
          wizardState.mazziere.playerIndex = Number(playerSelect.value) || 0;
          wizardState.mazziere.name = P[wizardState.mazziere.playerIndex]?.name || 'Giocatore';
          optPlayer.classList.add('selected');
          optHost.classList.remove('selected');
        };

        actionsEl.innerHTML = `
          <button id="btnStep2Prev" class="btn pill" style="padding:10px 18px;font-size:0.92rem;">⬅ Indietro</button>
          <button id="btnStep2Next" class="btn pill pri" style="padding:10px 22px;font-size:0.92rem;">Avanti: Scegli Cartelle ➔</button>
        `;

        actionsEl.querySelector('#btnStep2Prev').onclick = () => {
          currentStep = 1;
          sfx.click();
          renderWizardStep();
        };

        actionsEl.querySelector('#btnStep2Next').onclick = () => {
          if (!wizardState.mazziere.isHost) {
            const pIdx = Number(playerSelect.value) || 0;
            wizardState.mazziere.playerIndex = pIdx;
            wizardState.mazziere.name = P[pIdx]?.name || 'Giocatore';
          }
          currentStep = 3;
          sfx.click();
          renderWizardStep();
        };

      } else if (currentStep === 3) {
        // STEP 3: CARTELLE & COLORI SOGGETTIVI PER GIOCATORE
        bodyEl.innerHTML = `
          <div>
            <h3 style="margin:0 0 4px;font-size:1.25rem;color:#f59e0b;">3. Cartelle & Colori per Ciascun Giocatore</h3>
            <p style="margin:0;font-size:0.86rem;color:var(--mut);">
              È soggettivo: ogni giocatore sceglie quante cartelle avere (1, 2, 3 o 6) e il colore del tema.
              <span style="color:#10b981;font-weight:700;">Nessun giocatore avrà mai la stessa cartella di un altro!</span>
            </p>
          </div>
          <div id="playerConfigsList" style="display:flex;flex-direction:column;gap:10px;margin-top:6px;max-height:42vh;overflow-y:auto;padding-right:4px;">
            ${P.map((p, idx) => {
              const cfg = wizardState.playerConfigs[idx];
              return `
                <div class="playerCardConfigRow" data-player="${idx}">
                  <div style="display:flex;align-items:center;gap:10px;min-width:140px;">
                    <span style="width:14px;height:14px;border-radius:50%;background:${cfg.color};box-shadow:0 0 8px ${cfg.color};"></span>
                    <div>
                      <b style="font-size:0.94rem;color:#f8fafc;">${esc(p.name)}</b>
                      <div style="font-size:0.75rem;color:var(--mut);">${p.bot ? 'CPU' : 'TU'}</div>
                    </div>
                  </div>
                  
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:0.78rem;color:var(--mut);">Cartelle:</span>
                    <div class="qtyBtnGroup">
                      ${[1, 2, 3, 6].map(qty => `
                        <button class="qtyBtn ${cfg.count === qty ? 'active' : ''}" data-qty="${qty}">${qty}</button>
                      `).join('')}
                    </div>
                  </div>

                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:0.78rem;color:var(--mut);">Tema:</span>
                    <div style="display:flex;gap:5px;">
                      ${CARTELLA_THEMES.map(theme => `
                        <button class="colorDotBtn ${cfg.theme.id === theme.id ? 'active' : ''}" data-theme="${theme.id}" style="background:${theme.color};" title="${theme.name}"></button>
                      `).join('')}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;

        // Event listeners per cambiare quantità e tema colore
        bodyEl.querySelectorAll('.playerCardConfigRow').forEach(row => {
          const pIdx = Number(row.dataset.player);
          row.querySelectorAll('.qtyBtn').forEach(btn => {
            btn.onclick = () => {
              const qty = Number(btn.dataset.qty);
              wizardState.playerConfigs[pIdx].count = qty;
              row.querySelectorAll('.qtyBtn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              sfx.click();
            };
          });
          row.querySelectorAll('.colorDotBtn').forEach(btn => {
            btn.onclick = () => {
              const themeId = btn.dataset.theme;
              const foundTheme = CARTELLA_THEMES.find(t => t.id === themeId) || CARTELLA_THEMES[0];
              wizardState.playerConfigs[pIdx].theme = foundTheme;
              wizardState.playerConfigs[pIdx].color = foundTheme.color;
              row.querySelectorAll('.colorDotBtn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              sfx.click();
            };
          });
        });

        actionsEl.innerHTML = `
          <button id="btnStep3Prev" class="btn pill" style="padding:10px 18px;font-size:0.92rem;">⬅ Indietro</button>
          <button id="btnStartTombola" class="btn pill pri" style="padding:10px 24px;font-size:1.02rem;font-weight:800;background:linear-gradient(135deg, #f59e0b, #dc2626);box-shadow:0 0 20px rgba(245, 158, 11, 0.45);">
            🎉 Inizia la Tombola Napoletana!
          </button>
        `;

        actionsEl.querySelector('#btnStep3Prev').onclick = () => {
          currentStep = 2;
          sfx.click();
          renderWizardStep();
        };

        actionsEl.querySelector('#btnStartTombola').onclick = () => {
          sfx.fanfare();
          overlay.remove();
          const prizeTiers = createPrizeTiers(wizardState.prizes);
          resolve({
            prizeTiers,
            mazziere: wizardState.mazziere,
            playerConfigs: wizardState.playerConfigs
          });
        };
      }
    }

    renderWizardStep();
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
}
