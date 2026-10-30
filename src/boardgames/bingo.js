// Gran Bingo VIP — Vera esperienza 3D Three.js: Sala Casinò VIP di lusso,
// Urna pneumatica 3D in cristallo e oro, 35 palline fluttuanti animate in Three.js,
// Tabellone LED Master 3D retrostante e tutta l'interfaccia di gioco organizzata nel sidePanelLeft.
import { THREE, newStage, tween, label3d, mat, glow, person, anim, PAL, ease } from '../engine.js';
import { h, sfx, shuffle, getGameSpeed } from '../ui.js';
import { createHost, HOSTS } from '../host.js';
import { generateBingoTicket, evaluateBingoCard } from './bingo-rules.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Bande cromatiche ufficiali delle palline del Bingo (standard 75 o 90)
function getBandInfo(n, total = 90) {
  if (total === 75) {
    if (n <= 15) return { name: 'Banda B (Blu)', color: '#2563eb', bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', range: '1–15' };
    if (n <= 30) return { name: 'Banda I (Rossa)', color: '#dc2626', bg: 'linear-gradient(135deg, #ef4444, #b91c1c)', range: '16–30' };
    if (n <= 45) return { name: 'Banda N (Oro)', color: '#f59e0b', bg: 'linear-gradient(135deg, #fbbf24, #d97706)', range: '31–45' };
    if (n <= 60) return { name: 'Banda G (Verde)', color: '#10b981', bg: 'linear-gradient(135deg, #34d399, #059669)', range: '46–60' };
    return { name: 'Banda O (Viola)', color: '#9333ea', bg: 'linear-gradient(135deg, #c084fc, #7e22ce)', range: '61–75' };
  }
  if (n <= 18) return { name: 'Banda Blu', color: '#2563eb', bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', range: '1–18' };
  if (n <= 36) return { name: 'Banda Rossa', color: '#dc2626', bg: 'linear-gradient(135deg, #ef4444, #b91c1c)', range: '19–36' };
  if (n <= 54) return { name: 'Banda Oro', color: '#f59e0b', bg: 'linear-gradient(135deg, #fbbf24, #d97706)', range: '37–54' };
  if (n <= 72) return { name: 'Banda Verde', color: '#10b981', bg: 'linear-gradient(135deg, #34d399, #059669)', range: '55–72' };
  return { name: 'Banda Viola', color: '#9333ea', bg: 'linear-gradient(135deg, #c084fc, #7e22ce)', range: '73–90' };
}

export default {
  id: 'bingo',
  name: 'Gran Bingo VIP',
  tag: 'Gioco da tavola · Sala Casinò VIP',
  desc: 'La grande sala da gioco in 3D: urna di cristallo pneumatica, 35 palline vorticanti, tabellone LED gigante e caccia al super Jackpot!',
  c1: '#38bdf8',
  c2: '#a855f7',
  players: { min: 1, max: 6, def: 4 },
  rules: [
    'Le 90 palline vorticano nell’urna pneumatica di cristallo illuminata e risalgono nel tubo di estrazione.',
    'Le palline sono divise in 5 bande colore: 1-18 Blu, 19-36 Rossa, 37-54 Oro, 55-72 Verde e 73-90 Viola.',
    'I giocatori hanno cartelle elettroniche VIP da 15 numeri distribuite su 3 righe da 5.',
    'Primo grande traguardo: la Cinquina (5 numeri sulla medesima riga, 2.500 pt).',
    'Traguardo finale: il glorioso BINGO VIP (tutti i 15 numeri coperti, 10.000 pt + Jackpot)!',
    'Tutte le cartelle, lo storico delle palline e il radar delle distanze dal Bingo sono nel pannello laterale.'
  ],
  guide: `
    <h3 style="color:#38bdf8;margin-bottom:8px;font-size:1.15rem;">Il Gran Bingo VIP a 90 Palline</h3>
    <p>Il Bingo europeo d'alta classe si gioca con 90 palline numerate suddivise in 5 bande cromatiche ufficiali per una rapida identificazione visiva:</p>
    <ul style="margin:8px 0 14px 18px;line-height:1.65;font-size:0.92rem;">
      <li><b style="color:#38bdf8;">Banda Blu (1–18):</b> i numeri bassi di inizio partita.</li>
      <li><b style="color:#ef4444;">Banda Rossa (19–36):</b> numeri centrali bassi.</li>
      <li><b style="color:#f59e0b;">Banda Oro (37–54):</b> il cuore centrale del tabellone.</li>
      <li><b style="color:#10b981;">Banda Verde (55–72):</b> la volata verso i numeri alti.</li>
      <li><b style="color:#a855f7;">Banda Viola (73–90):</b> la chiusura conclusiva verso il numero 90.</li>
    </ul>
    <h3 style="color:#38bdf8;margin-bottom:8px;font-size:1.15rem;">I Due Grandi Premi della Sala VIP</h3>
    <p>Nella formula da casinò i premi principali sono due: la <b>Cinquina</b> (prima linea completa da 5 numeri su una stessa riga) e il <b>BINGO VIP</b> (copertura di tutti i 15 numeri della cartella). Nel pannello di sinistra, il radar indica in tempo reale a quanti numeri si trova ciascun giocatore dal colpo grosso (-1, -2 al Bingo).</p>
  `,

  async start(ctx) {
    // Inizializza lo stage 3D Three.js
    const S = ctx.stage = newStage({
      c1: this.c1,
      c2: this.c2,
      bg: '#040714',
      cam: [0.6, 4.0, 9.8],
      look: [0.3, 1.8, 0]
    });

    const P = ctx.players;
    const totalBalls = ctx.cfg?.ballCount === 75 ? 75 : 90;
    const drawnNumbers = [];
    const drawnSet = new Set();
    const urn = shuffle(Array.from({ length: totalBalls }, (_, i) => i + 1));
    let hasCinquinaWon = false;
    let cinquinaWinner = '';
    let isAuto = false;
    let autoTimer = null;
    let isExtracting = false;
    let autoMarkEnabled = true;

    // Assegna a ciascun giocatore la cartella Bingo (15 numeri)
    P.forEach((p, idx) => {
      p.data.ticket = generateBingoTicket(idx + 1, totalBalls);
      p.data.marked = new Set();
      p.data.status = 'In gioco';
    });

    // Host 3D Max Jackpot
    const host = createHost(ctx, {
      ...HOSTS.bingo,
      position: [-4.5, 0, -0.2],
      lookAt: [0, 1.8, 0]
    });

    // ==========================================
    // 1. PIATTAFORMA SALA CASINÒ VIP
    // ==========================================
    const stageGroup = new THREE.Group();
    S.add(stageGroup);

    // Piattaforma circolare rialzata in ottone e lacca blu notte
    const stageBaseMat = mat('#090f24', { roughness: 0.32, metalness: 0.65 });
    const goldMat = mat('#e5c158', { metalness: 0.95, roughness: 0.22 });
    const neonCyan = glow('#38bdf8');

    const platform = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.9, 0.4, 48), stageBaseMat);
    platform.position.set(1.0, 0.2, -0.4);

    const platformTrim = new THREE.Mesh(new THREE.TorusGeometry(8.62, 0.045, 16, 64), goldMat);
    platformTrim.rotation.x = Math.PI / 2;
    platformTrim.position.set(1.0, 0.405, -0.4);

    // Moquette in velluto blu reale con anelli concentrici
    const carpetMat = mat('#0f1b3d', { roughness: 0.8, metalness: 0.08 });
    const carpet = new THREE.Mesh(new THREE.CircleGeometry(8.5, 48), carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(1.0, 0.41, -0.4);

    stageGroup.add(platform, platformTrim, carpet);

    // ==========================================
    // 2. URNA PNEUMATICA 3D IN CRISTALLO E ORO
    // ==========================================
    const urnaGroup = new THREE.Group();
    urnaGroup.position.set(1.8, 0, 0.4);
    S.add(urnaGroup);

    // Piedistallo maestoso in ottone lucido
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 1.15, 1.5, 32), goldMat);
    pedestal.position.y = 0.75;

    const pedCap = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 32), goldMat);
    pedCap.position.y = 1.54;

    const pedBaseRing = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.25, 0.08, 32), goldMat);
    pedBaseRing.position.y = 0.04;

    const pedNeonStrip = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.03, 32, 1, true), neonCyan);
    pedNeonStrip.position.y = 1.48;

    urnaGroup.add(pedestal, pedCap, pedBaseRing, pedNeonStrip);

    // Sfera pneumatica trasparente in cristallo BoxGeometry / SphereGeometry(1.8, 32, 24)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.05,
      metalness: 0.08,
      transmission: 0.92,
      transparent: true,
      opacity: 0.32,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      depthWrite: false
    });

    const sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(1.8, 32, 24), glassMat);
    sphereMesh.position.y = 2.4;
    urnaGroup.add(sphereMesh);

    // Anelli dorati di contenimento equatoriale e meridiani
    const eqRing = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.038, 16, 64), goldMat);
    eqRing.rotation.x = Math.PI / 2; eqRing.position.y = 2.4;

    const merRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.032, 16, 64), goldMat);
    merRing1.position.y = 2.4;

    const merRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.032, 16, 64), goldMat);
    merRing2.rotation.y = Math.PI / 2; merRing2.position.y = 2.4;

    urnaGroup.add(eqRing, merRing1, merRing2);

    // Tubo pneumatico di estrazione verticale in vetro (sulla sommità)
    const tubeGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.3, 20, 1, true);
    const tubeMesh = new THREE.Mesh(tubeGeo, glassMat);
    tubeMesh.position.y = 4.35;

    const tubeCap = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 12, 24), goldMat);
    tubeCap.rotation.x = Math.PI / 2; tubeCap.position.y = 5.0;

    urnaGroup.add(tubeMesh, tubeCap);

    // ==========================================
    // 3. 35 PALLINE 3D FLUTTUANTI NEL VORTICE
    // ==========================================
    const sphereCenter = new THREE.Vector3(1.8, 2.4, 0.4);
    const sphereRadius = 1.45;
    const swirlingBalls = [];
    const ballGeo = new THREE.SphereGeometry(0.18, 16, 12);
    let turbulenceMultiplier = 1.0;

    // Palette per le 35 palline
    const bandColors = ['#2563eb', '#dc2626', '#f59e0b', '#10b981', '#9333ea'];

    for (let i = 0; i < 35; i++) {
      const col = bandColors[i % bandColors.length];
      const m = mat(col, { roughness: 0.18, metalness: 0.2, clearcoat: 0.8 });
      const ballMesh = new THREE.Mesh(ballGeo, m);

      // Posizione casuale interna
      const r = Math.random() * 1.1;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.8;
      const p = new THREE.Vector3(
        sphereCenter.x + Math.cos(theta) * Math.cos(phi) * r,
        sphereCenter.y + Math.sin(phi) * r,
        sphereCenter.z + Math.sin(theta) * Math.cos(phi) * r
      );

      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      );

      ballMesh.position.copy(p);
      S.add(ballMesh);

      swirlingBalls.push({ mesh: ballMesh, pos: p, vel: v, idx: i });
    }

    // Simulazione fluidodinamica vortice d'aria in S.on()
    S.on((dt, t) => {
      const speed = turbulenceMultiplier;
      for (const b of swirlingBalls) {
        const dx = b.pos.x - sphereCenter.x;
        const dz = b.pos.z - sphereCenter.z;

        // Vortice ad asse verticale + sollevamento pneumatico
        b.vel.x += (-dz * 8.5 + (Math.sin(t * 8 + b.idx) * 3)) * dt * speed;
        b.vel.z += (dx * 8.5 + (Math.cos(t * 8 + b.idx) * 3)) * dt * speed;
        b.vel.y += (Math.sin(t * 6 + b.idx * 1.5) * 5 + (Math.random() - 0.5) * 3) * dt * speed;

        b.vel.multiplyScalar(Math.pow(0.92, dt * 60));
        b.pos.addScaledVector(b.vel, dt);

        // Rimbalzo morbido contro il guscio della sfera
        const diff = b.pos.clone().sub(sphereCenter);
        const d = diff.length();
        if (d > sphereRadius) {
          diff.normalize();
          b.pos.copy(sphereCenter).addScaledVector(diff, sphereRadius);
          b.vel.reflect(diff).multiplyScalar(0.72);
        }

        b.mesh.position.copy(b.pos);
      }
    });

    // ==========================================
    // 4. TABELLONE LED MASTER 3D (RETROSTANTE)
    // ==========================================
    const masterBoardGroup = new THREE.Group();
    masterBoardGroup.position.set(1.0, 3.2, -2.8);
    S.add(masterBoardGroup);

    const boardFrameMat = mat('#060b18', { roughness: 0.45, metalness: 0.7 });
    const boardBox = new THREE.Mesh(new THREE.BoxGeometry(9.4, 4.8, 0.22), boardFrameMat);
    masterBoardGroup.add(boardBox);

    // Profilo LED blu intorno al Master Board
    const ledBorderMat = glow('#38bdf8');
    const boardBorderTop = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.04, 0.24), ledBorderMat);
    boardBorderTop.position.y = 2.42;
    const boardBorderBot = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.04, 0.24), ledBorderMat);
    boardBorderBot.position.y = -2.42;
    masterBoardGroup.add(boardBorderTop, boardBorderBot);

    // CanvasTexture per il tabellone LED 90 numeri
    const mbCanvas = document.createElement('canvas');
    mbCanvas.width = 2048;
    mbCanvas.height = 1180;
    const mbCtx = mbCanvas.getContext('2d');

    const mbTex = new THREE.CanvasTexture(mbCanvas);
    mbTex.colorSpace = THREE.SRGBColorSpace;
    mbTex.anisotropy = 4;

    const boardScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(9.2, 4.6),
      new THREE.MeshStandardMaterial({ map: mbTex, roughness: 0.35, metalness: 0.15 })
    );
    boardScreen.position.z = 0.115;
    masterBoardGroup.add(boardScreen);

    function drawMasterBoard() {
      const W = mbCanvas.width, H = mbCanvas.height;
      // Sfondo dark cyber
      mbCtx.fillStyle = '#060a16';
      mbCtx.fillRect(0, 0, W, H);

      // Header tabellone LED
      mbCtx.fillStyle = '#38bdf8';
      mbCtx.font = 'bold 46px "Bebas Neue", Outfit, sans-serif';
      mbCtx.textAlign = 'center';
      mbCtx.textBaseline = 'top';
      mbCtx.fillText(`GRAN BINGO VIP (${totalBalls} PALLINE) · TABELLONE ELETTRONICO MASTER`, W / 2, 30);

      const cols = 10;
      const rows = 9;
      const left = 50;
      const top = 105;
      const cellW = (W - 100) / cols;
      const cellH = (H - 140) / rows;

      for (let num = 1; num <= 90; num++) {
        const r = Math.floor((num - 1) / cols);
        const c = (num - 1) % cols;
        const x = left + c * cellW;
        const y = top + r * cellH;

        if (num > totalBalls) {
          mbCtx.fillStyle = 'rgba(10, 15, 26, 0.3)';
          mbCtx.fillRect(x + 3, y + 3, cellW - 6, cellH - 6);
          continue;
        }

        const isDrawn = drawnSet.has(num);
        const band = getBandInfo(num, totalBalls);

        if (isDrawn) {
          // Casella accesa con colore banda
          mbCtx.fillStyle = band.color;
          mbCtx.fillRect(x + 3, y + 3, cellW - 6, cellH - 6);
          mbCtx.strokeStyle = '#ffffff';
          mbCtx.lineWidth = 3;
          mbCtx.strokeRect(x + 3, y + 3, cellW - 6, cellH - 6);

          mbCtx.fillStyle = '#ffffff';
          mbCtx.font = 'bold 48px "Bebas Neue", Outfit, sans-serif';
        } else {
          // Casella spenta ma leggibile
          mbCtx.fillStyle = 'rgba(15, 23, 42, 0.7)';
          mbCtx.fillRect(x + 3, y + 3, cellW - 6, cellH - 6);
          mbCtx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
          mbCtx.lineWidth = 1;
          mbCtx.strokeRect(x + 3, y + 3, cellW - 6, cellH - 6);

          mbCtx.fillStyle = 'rgba(148, 163, 184, 0.45)';
          mbCtx.font = 'bold 36px "Bebas Neue", Outfit, sans-serif';
        }

        mbCtx.textAlign = 'center';
        mbCtx.textBaseline = 'middle';
        mbCtx.fillText(String(num), x + cellW / 2, y + cellH / 2);
      }

      mbTex.needsUpdate = true;
    }

    drawMasterBoard();

    // ==========================================
    // 5. PALLINA SHOWCASE 3D & BANNER 3D
    // ==========================================
    const showcaseBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 32, 24),
      mat('#38bdf8', { roughness: 0.15, metalness: 0.25, clearcoat: 1 })
    );
    showcaseBall.position.set(1.2, 2.6, 5.0);
    showcaseBall.scale.set(0.001, 0.001, 0.001);
    S.add(showcaseBall);

    const showcaseBanner3d = label3d([
      { t: 'GRAN BINGO VIP', fs: 0.36, color: '#38bdf8' },
      { t: 'ESTRAZIONE PALLINA', fs: 0.26, color: '#ffffff' },
      { t: 'Sfera di cristallo in rotazione...', fs: 0.18, color: '#94a3b8', font: 'Outfit' }
    ], { w: 3.6, h: 1.35, px: 240, bg: 'grad', border: '#38bdf8', radius: 0.08 });

    showcaseBanner3d.position.set(1.2, 3.8, 5.0);
    showcaseBanner3d.scale.set(0.001, 0.001, 0.001);
    S.add(showcaseBanner3d);

    // ==========================================
    // 6. SIDEBAR SINISTRA (.sidePanelLeft)
    // ==========================================
    const leftPanel = h('aside', 'sidePanelLeft');
    ctx.sideAdd(leftPanel);

    // Sezione 1: Jackpot & Premi
    const spJackpotSec = h('div', 'spSection');
    spJackpotSec.style.background = 'linear-gradient(135deg, rgba(30, 58, 138, 0.35), rgba(15, 23, 42, 0.85))';
    spJackpotSec.style.borderColor = 'rgba(56, 189, 248, 0.3)';
    spJackpotSec.innerHTML = `
      <div class="spTitle">
        <span>Jackpot VIP Casinò</span>
        <span style="color:#fbbf24;font-weight:800;">€ 10.000</span>
      </div>
      <div id="bgPrizeBadges" style="display:flex;flex-direction:column;gap:6px;margin-top:4px;"></div>
    `;

    // Sezione 2: Ultime Palline Estratte
    const spHistorySec = h('div', 'spSection');
    spHistorySec.innerHTML = `
      <div class="spTitle">
        <span>Ultime Chiamate</span>
        <span id="bgBallCount" style="color:var(--mut);">0 / 90</span>
      </div>
      <div id="bgRecentBalls" style="display:flex;gap:6px;align-items:center;min-height:38px;overflow-x:auto;padding-bottom:4px;">
        <span style="color:var(--mut);font-size:0.75rem;">Nessuna pallina ancora estratta</span>
      </div>
    `;

    // Sezione 3: Radar Distanza dal Bingo
    const spRadarSec = h('div', 'spSection');
    spRadarSec.innerHTML = `
      <div class="spTitle">
        <span>Radar Traguardi</span>
        <span style="color:#38bdf8;font-size:0.68rem;letter-spacing:0.1em;">Real-Time</span>
      </div>
      <div id="bgPlayerRadar" style="display:flex;flex-direction:column;gap:6px;"></div>
    `;

    // Sezione 4: Cartelle Bingo VIP
    const spTicketsSec = h('div', 'spSection');
    spTicketsSec.style.display = 'flex';
    spTicketsSec.style.flexDirection = 'column';
    spTicketsSec.style.gap = '8px';

    const ticketsHdr = h('div', 'spTitle');
    ticketsHdr.innerHTML = `
      <span>Cartelle Elettroniche</span>
      <button id="bgAutoMarkToggle" class="btn pill" style="font-size:0.68rem;padding:3px 9px;height:auto;">Auto-Marcatura: ON</button>
    `;
    const ticketsListContainer = h('div');
    ticketsListContainer.style.display = 'flex';
    ticketsListContainer.style.flexDirection = 'column';
    ticketsListContainer.style.gap = '10px';

    spTicketsSec.append(ticketsHdr, ticketsListContainer);

    leftPanel.append(spJackpotSec, spHistorySec, spRadarSec, spTicketsSec);

    // Toggle Auto-Marcatura
    const autoMarkToggleBtn = leftPanel.querySelector('#bgAutoMarkToggle');
    autoMarkToggleBtn.onclick = () => {
      autoMarkEnabled = !autoMarkEnabled;
      autoMarkToggleBtn.textContent = `Auto-Marcatura: ${autoMarkEnabled ? 'ON' : 'OFF'}`;
      autoMarkToggleBtn.classList.toggle('pri', autoMarkEnabled);
      sfx.click();
      if (autoMarkEnabled) {
        P.forEach(p => {
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 9; c++) {
              const val = p.data.ticket.grid[r][c];
              if (val > 0 && drawnSet.has(val)) p.data.marked.add(val);
            }
          }
        });
        renderTicketsUI();
        updateRadarUI();
        checkBingoWins();
      }
    };

    function updatePrizesUI() {
      const container = leftPanel.querySelector('#bgPrizeBadges');
      if (!container) return;
      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;border-radius:8px;background:${hasCinquinaWon ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)'};border:1px solid ${hasCinquinaWon ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.06)'};">
          <div><b style="font-size:0.82rem;color:${hasCinquinaWon ? '#10b981' : '#f8fafc'};">Cinquina</b> <small style="color:var(--mut);font-size:0.72rem;">(5 num)</small></div>
          <div>${hasCinquinaWon
            ? `<span style="font-size:0.7rem;font-weight:800;color:#10b981;padding:2px 6px;border-radius:4px;background:rgba(16, 185, 129, 0.2);">VINTA · ${esc(cinquinaWinner)}</span>`
            : `<span style="font-size:0.7rem;font-weight:800;color:#38bdf8;padding:2px 6px;border-radius:4px;background:rgba(56, 189, 248, 0.15);">IN PALIO · 2.500 pt</span>`
          }</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;border-radius:8px;background:rgba(245, 158, 11, 0.08);border:1px solid rgba(245, 158, 11, 0.25);">
          <div><b style="font-size:0.82rem;color:#f59e0b;">BINGO VIP</b> <small style="color:var(--mut);font-size:0.72rem;">(15 num)</small></div>
          <div><span style="font-size:0.7rem;font-weight:800;color:#f59e0b;padding:2px 6px;border-radius:4px;background:rgba(245, 158, 11, 0.2);">SUPER JACKPOT</span></div>
        </div>
      `;
    }

    updatePrizesUI();

    function updateRecentBallsUI() {
      const container = leftPanel.querySelector('#bgRecentBalls');
      const countEl = leftPanel.querySelector('#bgBallCount');
      if (countEl) countEl.textContent = `${drawnNumbers.length} / 90`;
      if (!container) return;

      if (!drawnNumbers.length) {
        container.innerHTML = `<span style="color:var(--mut);font-size:0.75rem;">Nessuna pallina estratta</span>`;
        return;
      }

      const recent = drawnNumbers.slice(-6).reverse();
      container.innerHTML = recent.map(n => {
        const band = getBandInfo(n, totalBalls);
        return `
          <div style="width:34px;height:34px;border-radius:50%;background:${band.bg};color:#fff;font-family:'Bebas Neue',Outfit,sans-serif;font-size:1.25rem;display:grid;place-items:center;flex:none;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:1.5px solid rgba(255,255,255,0.7);">
            ${n}
          </div>
        `;
      }).join('');
    }

    function updateRadarUI() {
      const container = leftPanel.querySelector('#bgPlayerRadar');
      if (!container) return;

      container.innerHTML = P.map(p => {
        const ev = evaluateBingoCard(p.data.ticket, p.data.marked);
        let distBadge = `<span style="color:var(--mut);font-size:0.72rem;">A ${ev.toBingo} numeri</span>`;
        if (ev.hasBingo) {
          distBadge = `<span style="color:#f59e0b;font-weight:800;font-size:0.75rem;">BINGO!</span>`;
        } else if (ev.toBingo === 1) {
          distBadge = `<span style="color:#ef4444;font-weight:800;font-size:0.75rem;animation:pulse 1s infinite;">🔥 -1 AL BINGO!</span>`;
        } else if (ev.toBingo === 2) {
          distBadge = `<span style="color:#f59e0b;font-weight:800;font-size:0.75rem;">⚡ -2 AL BINGO</span>`;
        } else if (!hasCinquinaWon && ev.maxLine === 4) {
          distBadge = `<span style="color:#38bdf8;font-weight:800;font-size:0.75rem;">✨ -1 A CINQUINA</span>`;
        }

        const pct = Math.min(100, Math.round((ev.total / 15) * 100));

        return `
          <div style="display:flex;flex-direction:column;gap:3px;padding:5px 8px;border-radius:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-left:3px solid ${p.color};">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:0.78rem;font-weight:700;color:${p.color};">${esc(p.name)}</span>
              ${distBadge}
            </div>
            <div style="height:4px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${p.color};border-radius:2px;transition:width 0.3s ease;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    updateRadarUI();

    function renderTicketsUI() {
      ticketsListContainer.replaceChildren(...P.map(p => {
        const t = p.data.ticket;
        const isHuman = !p.bot;
        const ev = evaluateBingoCard(t, p.data.marked);
        const cardBox = h('div', 'tombolaCard' + (ev.toBingo <= 2 ? ' winner' : ''));
        cardBox.style.setProperty('--pc', p.color);
        cardBox.style.padding = '8px';

        const cardHdr = h('div', 'tombolaCardHeader');
        cardHdr.innerHTML = `
          <span style="font-size:0.8rem;color:${p.color};font-weight:800;">${esc(p.name)}${p.bot ? ' <small style="color:var(--mut);">CPU</small>' : ' <small style="color:#38bdf8;">TU</small>'}</span>
          <b style="font-size:0.75rem;color:var(--ac);">${ev.total}/15 coperti</b>
        `;

        const table = h('div', 'tombolaCardTable');
        for (let r = 0; r < 3; r++) {
          for (let col = 0; col < 9; col++) {
            const num = t.grid[r][col];
            if (!num) {
              table.append(h('div', 'tCell empty'));
            } else {
              const isMarked = p.data.marked.has(num);
              const cell = h('div', 'tCell' + (isMarked ? ' marked' : ''), String(num));
              cell.style.fontSize = '0.78rem';
              cell.onclick = () => {
                if (isHuman && drawnSet.has(num)) {
                  if (!p.data.marked.has(num)) {
                    p.data.marked.add(num);
                    cell.classList.add('marked');
                    sfx.click();
                    renderTicketsUI();
                    updateRadarUI();
                    checkBingoWins();
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

    renderTicketsUI();

    // ==========================================
    // 7. BOTTOM DOCK (COMPATTO & ELEGANTE)
    // ==========================================
    const camViews = [
      { name: 'Casino Wide', cam: [0.6, 4.0, 9.8], look: [0.3, 1.8, 0] },
      { name: 'Zoom Urna 3D', cam: [1.8, 2.7, 5.2], look: [1.8, 2.4, 0.4] },
      { name: 'Zoom Master Board', cam: [1.0, 3.4, 5.8], look: [1.0, 3.2, -2.6] }
    ];
    let currentCamIndex = 0;

    const dockBar = h('div', 'row');
    dockBar.style.justifyContent = 'center';
    dockBar.style.flexWrap = 'wrap';
    dockBar.style.gap = '8px';
    dockBar.style.padding = '8px 14px';

    const drawBtn = h('button', 'btn pill pri', '🎱 Estrai Pallina 3D');
    drawBtn.style.fontSize = '0.88rem';
    drawBtn.style.padding = '8px 16px';
    drawBtn.onclick = () => {
      stopAuto();
      extractBall3D();
    };

    const autoBtn = h('button', 'btn pill', '⚡ Auto-Play: OFF');
    autoBtn.style.fontSize = '0.88rem';
    autoBtn.style.padding = '8px 16px';
    autoBtn.onclick = () => {
      if (isAuto) stopAuto();
      else startAuto();
    };

    const camBtn = h('button', 'btn pill', '🎥 Visuale: Casino Wide');
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

    await host.say(`Ladies and gentlemen, benvenuti al Gran Bingo VIP! Sfera caricata e tabellone master pronto!`, { mood: 'happy' });

    // ==========================================
    // 8. ESTRAZIONE PALLINA 3D DALL'URNA PNEUMATICA
    // ==========================================
    async function extractBall3D() {
      if (isExtracting) return;
      if (!urn.length) {
        stopAuto();
        await host.say(`Tutte le 90 palline della sala sono state estratte!`, { mood: 'think' });
        return;
      }

      isExtracting = true;
      drawBtn.disabled = true;

      // 1. Aumento vortice e turbolenza pneumatica all'interno della sfera
      turbulenceMultiplier = 4.5;
      sfx.tumble();
      S.shakeIt(0.22);

      const num = urn.pop();
      drawnNumbers.push(num);
      drawnSet.add(num);

      const band = getBandInfo(num, totalBalls);

      // 2. Pallina estratta risale il tubo di vetro verticale fino in cima
      showcaseBall.material.color.set(band.color);
      showcaseBall.position.set(1.8, 2.4, 0.4);
      showcaseBall.scale.set(0.4, 0.4, 0.4);

      sfx.whoosh();
      await tween(showcaseBall.position, { y: 5.0 }, 0.3, ease.out);

      // 3. Zoom verso il punto showcase davanti alla telecamera
      showcaseBanner3d.set([
        { t: `PALLINA #${num}`, fs: 0.42, color: band.color },
        { t: band.name.toUpperCase(), fs: 0.28, color: '#ffffff' },
        { t: `GRAN BINGO VIP · FASCIA ${band.range}`, fs: 0.18, color: '#cbd5e1', font: 'Outfit' }
      ], { border: band.color, accent: band.color });

      await Promise.all([
        tween(showcaseBall.position, { x: 1.2, y: 2.6, z: 5.0 }, 0.48, ease.out),
        tween(showcaseBall.scale, { x: 1, y: 1, z: 1 }, 0.48, ease.overshoot),
        tween(showcaseBall.rotation, { x: 0.2, y: Math.PI * 4, z: 0 }, 0.48, ease.out),
        tween(showcaseBanner3d.scale, { x: 1, y: 1, z: 1 }, 0.45, ease.overshoot)
      ]);

      sfx.tick();
      S.flashWith(band.color);

      // 4. Accensione casella sul Tabellone LED Master 3D
      drawMasterBoard();

      // 5. Aggiornamento Sidebar (.sidePanelLeft)
      updateRecentBallsUI();

      // Marcatura sulle cartelle
      P.forEach(p => {
        if (p.bot || autoMarkEnabled) {
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 9; c++) {
              if (p.data.ticket.grid[r][c] === num) {
                p.data.marked.add(num);
              }
            }
          }
        }
      });

      renderTicketsUI();
      updateRadarUI();

      // Durata showcase
      const speed = getGameSpeed();
      await ctx.sleep(Math.max(500, Math.round(900 / speed)));

      // Ritiro showcase
      tween(showcaseBall.scale, { x: 0.001, y: 0.001, z: 0.001 }, 0.25, ease.in);
      tween(showcaseBanner3d.scale, { x: 0.001, y: 0.001, z: 0.001 }, 0.25, ease.in);
      turbulenceMultiplier = 1.0;

      // Commento saltuario del chiamatore VIP Max Jackpot
      if (Math.random() < 0.28) {
        host.say(`Numero estratto: ${num}! ${band.name}!`, { mood: 'happy' });
      }

      await checkBingoWins();

      isExtracting = false;
      drawBtn.disabled = false;
    }

    // ==========================================
    // 9. CONTROLLO VINCITE (CINQUINA & BINGO)
    // ==========================================
    async function checkBingoWins() {
      for (const p of P) {
        const ev = evaluateBingoCard(p.data.ticket, p.data.marked);

        // Controllo Cinquina
        if (!hasCinquinaWon && ev.hasCinquina) {
          hasCinquinaWon = true;
          cinquinaWinner = p.name;
          ctx.addScore(p, 2500);

          sfx.ok();
          S.flashWith('#38bdf8');
          updatePrizesUI();
          updateRadarUI();
          await host.say(`CINQUINA per ${p.name}! Prima linea dorata conquistata, ora la caccia è al colpo grosso del BINGO!`, { mood: 'happy' });
        }

        // Controllo Bingo
        if (ev.hasBingo) {
          stopAuto();
          sfx.fanfare();
          S.burst('#38bdf8', 260);
          updateRadarUI();
          await host.say(`BIIINGO! BINGO CONFERMATO! ${p.name} sbanca la sala e conquista il Gran Jackpot VIP!`, { mood: 'win' });
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

    // ==========================================
    // 10. GESTIONE AUTO-PLAY
    // ==========================================
    function startAuto() {
      if (isAuto) return;
      isAuto = true;
      autoBtn.textContent = '⏸ Pausa Auto';
      autoBtn.classList.add('pri');
      const speed = getGameSpeed();
      const delay = Math.max(1500, Math.round(3400 / speed));
      autoTimer = setInterval(() => {
        if (!isExtracting) extractBall3D();
      }, delay);
    }

    function stopAuto() {
      isAuto = false;
      clearInterval(autoTimer);
      autoTimer = null;
      autoBtn.textContent = '⚡ Auto-Play: OFF';
      autoBtn.classList.remove('pri');
    }

    // Smontaggio e pulizia
    ctx.onExit(() => {
      stopAuto();
      leftPanel.remove();
      mbTex.dispose();
      ballGeo.dispose();
      swirlingBalls.forEach(b => {
        if (b.mesh.geometry) b.mesh.geometry.dispose();
        if (b.mesh.material) b.mesh.material.dispose();
      });
    });
  }
};
