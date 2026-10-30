// Tavola Ouija — Esperienza Paranormale 3D immersiva per Halloween e serate di mistero
import { THREE, newStage, tween, mat, glow, PAL, ease, raycast } from '../engine.js';
import { h, sfx, sleep, getGameSpeed } from '../ui.js';
import { createHost } from '../host.js';
import { SPIRITS, SÉANCE_QUESTIONS } from './ouija-data.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export default {
  id: 'ouija',
  name: 'Tavola Ouija 3D',
  tag: 'Gioco da tavolo · Halloween & Mistero',
  desc: 'Accendi le candele, posa le dita sulla planchette 3D e comunica con gli spiriti dell’Oltretomba!',
  c1: '#a855f7',
  c2: '#3b0764',
  players: { min: 1, max: 6, def: 4 },
  rules: [
    'Radunatevi attorno all’antica tavola Ouija 3D in legno massiccio illuminata da quattro fioche candele.',
    'Scegliete quale spirito evocare dal regno delle ombre o ponetegli domande cruente.',
    'La planchette 3D scivolerà fisicamente sulla tavola illuminando le lettere per comporre le risposte.',
    'Risolvete gli enigmi spettrali per liberare l’entità e conquistare fino a 2.500 punti coraggio!',
    'Regola fondamentale dell’occulto: prima di lasciare la seduta bisogna sempre dire ARRIVEDERCI (ADDIO)!'
  ],
  guide: `
    <div style="display:flex;flex-direction:column;gap:12px;font-size:0.88rem;line-height:1.55;">
      <div style="background:rgba(168,85,247,0.12);border:1px solid rgba(168,85,247,0.3);border-radius:10px;padding:12px;">
        <h4 style="color:#e9d5ff;margin:0 0 6px 0;font-size:0.95rem;">🔮 Come Funziona la Seduta Spiritica 3D</h4>
        <p style="margin:0;">L'esperienza si svolge interamente in Three.js con una tavola Ouija d'epoca intagliata a mano, planchette con lente d'ingrandimento in ottone e 4 candele di cera vive che proiettano ombre tremule in tempo reale.</p>
      </div>
      <div>
        <h4 style="color:#e2d3be;margin:0 0 4px 0;">Controlli & Interazione</h4>
        <ul style="margin:4px 0 0 18px;padding:0;">
          <li><b>Pannello Sinistro:</b> Interroga lo spirito attivo con domande predefinite o poni una domanda a testo libero.</li>
          <li><b>Interazione 3D:</b> Clicca direttamente su qualsiasi lettera della tavola 3D per guidare la planchette o comporre frasi.</li>
          <li><b>Enigma dell'Oltre:</b> Metti alla prova il tuo intelletto con l'indovinello specifico di ogni anima perduta.</li>
          <li><b>Visuali Camera:</b> Premi <i>🎥 Visuale Tavola</i> per alternare tra Vista Angolata Atmosferica, Vista Zenithale dall'Alto e Panoramica della Stanza.</li>
        </ul>
      </div>
      <div style="background:rgba(234,179,8,0.1);border-left:3px solid #eab308;padding:8px 12px;border-radius:6px;">
        <b>Avviso dell'Oltretomba:</b> Non terminare mai la partita senza premere <i>Saluta (ADDIO)</i>, per evitare che entità indesiderate rimangano legate allo studio televisivo!
      </div>
    </div>
  `,

  async start(ctx) {
    // 1. Inizializzazione Stage 3D Dark Gothic Parlor
    const S = ctx.stage = newStage({
      c1: this.c1,
      c2: this.c2,
      bg: '#040208',
      cam: [0, 4.4, 5.2],
      look: [0, 1.25, -0.1]
    });

    const host = createHost(ctx, 'ouija');
    const P = ctx.players;
    let spiritIndex = Math.floor(Math.random() * SPIRITS.length);
    let currentSpirit = SPIRITS[spiritIndex];
    let isSpelling = false;
    let finished = false;

    // Dimensioni tavola 3D
    const BOARD_W = 7.6;
    const BOARD_H = 0.22;
    const BOARD_D = 5.0;
    const BOARD_Y = 1.2;
    const TOP_Y = BOARD_Y + BOARD_H / 2 + 0.002; // 1.312
    const PLANCHETTE_Y = TOP_Y + 0.038;

    // Texture ad alta risoluzione (1024 x 680) e mappa coordinate 3D
    const COORDS = {};
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = 680;
    const x2 = cv.getContext('2d');

    // Funzione pittura texture tavola antica Ouija
    function drawOuijaBoard() {
      // 1. Fondo legno antico massiccio noce scuro
      const bgGrad = x2.createRadialGradient(512, 340, 50, 512, 340, 550);
      bgGrad.addColorStop(0, '#361d10');
      bgGrad.addColorStop(0.55, '#23120a');
      bgGrad.addColorStop(1, '#110703');
      x2.fillStyle = bgGrad;
      x2.fillRect(0, 0, 1024, 680);

      // Venature del legno
      x2.save();
      x2.globalAlpha = 0.12;
      for (let y = 0; y < 680; y += 4) {
        x2.strokeStyle = (y % 8 === 0) ? '#4a2815' : '#080301';
        x2.lineWidth = (y % 12 === 0) ? 2.5 : 1;
        x2.beginPath();
        x2.moveTo(0, y);
        for (let x = 0; x <= 1024; x += 40) {
          const jitter = Math.sin(x * 0.015 + y * 0.05) * 3;
          x2.lineTo(x, y + jitter);
        }
        x2.stroke();
      }
      x2.restore();

      // Vignettatura scura ai bordi
      const vig = x2.createRadialGradient(512, 340, 300, 512, 340, 560);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.65)');
      x2.fillStyle = vig;
      x2.fillRect(0, 0, 1024, 680);

      // Cornice dorata occulta doppia
      x2.save();
      x2.strokeStyle = '#c9a96e';
      x2.lineWidth = 3.5;
      x2.strokeRect(26, 26, 1024 - 52, 680 - 52);
      x2.lineWidth = 1.2;
      x2.strokeStyle = 'rgba(201,169,110,0.6)';
      x2.strokeRect(36, 36, 1024 - 72, 680 - 72);

      // Decorazioni angolari celtiche/mistiche
      const corners = [[36, 36], [1024 - 36, 36], [36, 680 - 36], [1024 - 36, 680 - 36]];
      corners.forEach(([cx, cy]) => {
        x2.beginPath();
        x2.arc(cx, cy, 22, 0, Math.PI * 2);
        x2.stroke();
      });
      x2.restore();

      // Top Header: Sole ☀️ e SÌ (Sinistra)
      x2.save();
      x2.textAlign = 'center';
      x2.textBaseline = 'middle';

      // Sole
      x2.font = '36px serif';
      x2.fillStyle = '#e8b94c';
      x2.shadowColor = 'rgba(232,185,76,0.6)';
      x2.shadowBlur = 10;
      x2.fillText('☀️', 150, 105);

      // SÌ
      x2.font = 'bold 44px "Cinzel", "Times New Roman", Georgia, serif';
      x2.fillStyle = '#f5e2b3';
      x2.fillText('SÌ', 230, 108);

      // Luna 🌙 e NO (Destra)
      x2.font = 'bold 44px "Cinzel", "Times New Roman", Georgia, serif';
      x2.fillText('NO', 794, 108);
      x2.font = '36px serif';
      x2.fillText('🌙', 874, 105);

      // Titolo centrale "OUIJA"
      x2.font = 'bold 46px "Cinzel", "Times New Roman", Georgia, serif';
      x2.fillStyle = '#e8d4a2';
      x2.shadowColor = '#000000';
      x2.shadowBlur = 8;
      x2.fillText('O U I J A', 512, 95);

      // Occhio mistico sotto Ouija
      x2.font = '22px serif';
      x2.fillStyle = '#c9a96e';
      x2.fillText('✧ 👁️ ✧', 512, 132);

      x2.restore();

      // Mappatura coordinate 3D
      const mapCoord = (key, px, py) => {
        COORDS[key] = {
          px, py,
          x: ((px / 1024) - 0.5) * BOARD_W,
          z: ((py / 680) - 0.5) * BOARD_D
        };
      };

      mapCoord('SI', 230, 108);
      mapCoord('YES', 230, 108);
      mapCoord('NO', 794, 108);
      mapCoord('CENTER', 512, 345);

      // Due archi di lettere A–M e N–Z
      const arcCenter = { x: 512, y: 465 };
      const R1 = 285; // Raggio arco superiore (A-M)
      const R2 = 215; // Raggio arco inferiore (N-Z)

      x2.save();
      x2.textAlign = 'center';
      x2.textBaseline = 'middle';
      x2.font = 'bold 36px "Cinzel", "Times New Roman", Georgia, serif';
      x2.fillStyle = '#ebd6a7';
      x2.shadowColor = 'rgba(0,0,0,0.85)';
      x2.shadowBlur = 5;

      const letters1 = 'ABCDEFGHIJKLM'.split('');
      const letters2 = 'NOPQRSTUVWXYZ'.split('');

      // Arco 1: A–M
      letters1.forEach((ch, idx) => {
        const t = idx / (letters1.length - 1);
        const ang = Math.PI * 1.11 + t * (Math.PI * 0.78);
        const lx = arcCenter.x + R1 * Math.cos(ang);
        const ly = arcCenter.y + R1 * Math.sin(ang);
        x2.fillText(ch, lx, ly);
        mapCoord(ch, lx, ly);
      });

      // Arco 2: N–Z
      letters2.forEach((ch, idx) => {
        const t = idx / (letters2.length - 1);
        const ang = Math.PI * 1.13 + t * (Math.PI * 0.74);
        const lx = arcCenter.x + R2 * Math.cos(ang);
        const ly = arcCenter.y + R2 * Math.sin(ang);
        x2.fillText(ch, lx, ly);
        mapCoord(ch, lx, ly);
      });

      // Numeri: 1 2 3 4 5 6 7 8 9 0
      x2.font = 'bold 32px "Cinzel", "Times New Roman", Georgia, serif';
      x2.fillStyle = '#dfbe7d';
      const nums = '1234567890'.split('');
      const numY = 460;
      nums.forEach((n, idx) => {
        const lx = 230 + idx * ((794 - 230) / (nums.length - 1));
        x2.fillText(n, lx, numY);
        mapCoord(n, lx, numY);
      });

      // Bottom: ADDIO / ARRIVEDERCI
      x2.font = 'bold 42px "Cinzel", "Times New Roman", Georgia, serif';
      x2.fillStyle = '#f3ddb0';
      x2.fillText('A D D I O', 512, 570);
      mapCoord('ADDIO', 512, 570);
      mapCoord('ARRIVEDERCI', 512, 570);
      mapCoord('GOODBYE', 512, 570);

      x2.restore();
    }

    drawOuijaBoard();

    const boardTex = new THREE.CanvasTexture(cv);
    boardTex.colorSpace = THREE.SRGBColorSpace;
    boardTex.anisotropy = 4;

    // 2. Tavolo Occulto Rotondo
    const tableGroup = new THREE.Group();
    // Gamba / base tavolo
    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 2.2, 1.1, 32),
      mat('#150a05', { roughness: 0.8, metalness: 0.2 })
    );
    tableBase.position.y = 0.55;

    // Top tavolo in legno scuro noce massiccio
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(5.0, 4.8, 0.16, 48),
      mat('#1a0d07', { roughness: 0.65, metalness: 0.15 })
    );
    tableTop.position.y = BOARD_Y - 0.08;

    // Runner centrale in velluto porpora gotico
    const runner = new THREE.Mesh(
      new THREE.CylinderGeometry(5.05, 5.05, 0.03, 48),
      mat('#19072a', { roughness: 0.9, metalness: 0.1 })
    );
    runner.position.y = BOARD_Y - 0.01;

    tableGroup.add(tableBase, tableTop, runner);
    S.scene.add(tableGroup);

    // 3. Tavola Ouija 3D in legno con finiture
    const boardBox = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD_W, BOARD_H, BOARD_D),
      mat('#1e0e06', { roughness: 0.55, metalness: 0.2 })
    );
    boardBox.position.set(0, BOARD_Y, 0);
    boardBox.receiveShadow = true;

    // Superficie decorata della tavola (Plane con CanvasTexture)
    const boardSurface = new THREE.Mesh(
      new THREE.PlaneGeometry(BOARD_W, BOARD_D),
      new THREE.MeshStandardMaterial({
        map: boardTex,
        roughness: 0.42,
        metalness: 0.15
      })
    );
    boardSurface.rotation.x = -Math.PI / 2;
    boardSurface.position.set(0, TOP_Y, 0);
    boardSurface.receiveShadow = true;
    boardSurface.userData.id = 'ouija_board';

    S.scene.add(boardBox, boardSurface);

    // Indicatore luminoso di lettera (Rune Ring 3D)
    const letterRuneRing = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.36, 32),
      glow('#fde047')
    );
    letterRuneRing.rotation.x = -Math.PI / 2;
    letterRuneRing.position.set(0, TOP_Y + 0.005, 0);
    letterRuneRing.visible = false;
    S.scene.add(letterRuneRing);

    // 4. Quattro Candele di Cera Vive con Fiamma e Flicker Realistico
    const candlePositions = [
      [-3.4, BOARD_Y + 0.04, -2.1],
      [3.4, BOARD_Y + 0.04, -2.1],
      [-3.4, BOARD_Y + 0.04, 2.1],
      [3.4, BOARD_Y + 0.04, 2.1]
    ];
    const candleLights = [];
    const candleFlames = [];

    candlePositions.forEach(([cx, cy, cz], idx) => {
      const cGroup = new THREE.Group();
      cGroup.position.set(cx, cy, cz);

      // Cera colata avorio
      const wax = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.15, 0.65, 16),
        mat('#ede2cb', { roughness: 0.68, metalness: 0.05 })
      );
      wax.position.y = 0.325;

      // Stoppino nero
      const wick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.09, 8),
        mat('#111111', { roughness: 0.9 })
      );
      wick.position.y = 0.67;

      // Fiamma luminosa arancio-oro
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.045, 0.18, 12),
        glow('#ff9922')
      );
      flame.position.y = 0.77;
      flame.rotation.x = Math.PI;

      // Luce punto reale per illuminazione dinamica
      const pl = new THREE.PointLight('#ff7722', 15, 8.5);
      pl.position.set(0, 0.82, 0);
      pl.castShadow = true;

      cGroup.add(wax, wick, flame, pl);
      S.scene.add(cGroup);

      candleLights.push(pl);
      candleFlames.push(flame);
    });

    // Flicker realistico candele
    S.on((dt, t) => {
      candleLights.forEach((light, i) => {
        const noise = Math.sin(t * 14 + i * 2.3) * 1.8 + Math.cos(t * 27 + i) * 1.2;
        light.intensity = Math.max(9, 14 + noise);
        const f = candleFlames[i];
        if (f) {
          f.scale.set(1 + noise * 0.04, 1 + noise * 0.06, 1 + noise * 0.04);
        }
      });
    });

    // 5. La Planchette 3D Scolpita con Lente in Vetro e Luce Sotto
    const planchetteGroup = new THREE.Group();

    // Forma a cuore/goccia
    const pShape = new THREE.Shape();
    pShape.moveTo(0, 0.72);
    pShape.bezierCurveTo(0.24, 0.58, 0.54, 0.12, 0.5, -0.38);
    pShape.bezierCurveTo(0.44, -0.66, 0.14, -0.62, 0, -0.42);
    pShape.bezierCurveTo(-0.14, -0.62, -0.44, -0.66, -0.5, -0.38);
    pShape.bezierCurveTo(-0.54, 0.12, -0.24, 0.58, 0, 0.72);

    // Foro centrale per la lente
    const hole = new THREE.Path();
    hole.absarc(0, -0.05, 0.22, 0, Math.PI * 2, true);
    pShape.holes.push(hole);

    const pGeo = new THREE.ExtrudeGeometry(pShape, {
      depth: 0.07,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02
    });
    pGeo.rotateX(-Math.PI / 2);

    // Legno noce scuro lucido
    const planchetteMesh = new THREE.Mesh(
      pGeo,
      mat('#2e160a', { roughness: 0.32, metalness: 0.22 })
    );

    // Anello d'ottone per la lente
    const brassRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.025, 14, 32),
      mat('#c9a96e', { roughness: 0.25, metalness: 0.88 })
    );
    brassRing.rotation.x = -Math.PI / 2;
    brassRing.position.set(0, 0.04, 0.05);

    // Lente di vetro trasparente
    const glassLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.21, 0.02, 32),
      new THREE.MeshStandardMaterial({
        color: '#e0f2fe',
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.38
      })
    );
    glassLens.position.set(0, 0.04, 0.05);

    // Luce calda sotto la lente della planchette
    const planchetteLight = new THREE.PointLight('#ffdd66', 2.8, 3.2);
    planchetteLight.position.set(0, 0.03, 0.05);

    // Tre piedini di scorrimento in feltro/ottone
    const feet = [
      [0, 0.015, -0.62],
      [-0.42, 0.015, 0.32],
      [0.42, 0.015, 0.32]
    ];
    feet.forEach(([fx, fy, fz]) => {
      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12),
        mat('#854d0e', { roughness: 0.4 })
      );
      foot.position.set(fx, fy, fz);
      planchetteGroup.add(foot);
    });

    planchetteGroup.add(planchetteMesh, brassRing, glassLens, planchetteLight);
    planchetteGroup.position.set(COORDS.CENTER.x, PLANCHETTE_Y, COORDS.CENTER.z);
    S.scene.add(planchetteGroup);

    // 6. Funzione di Sillabazione Parola in 3D
    async function spellOut3D(word, onLetterCb) {
      if (isSpelling) return;
      isSpelling = true;

      // Sposta la camera su un'inquadratura ravvicinata cinematografica
      S.go([0, 3.8, 4.2], [0, 1.28, -0.2]);

      const token = word.toUpperCase().trim();

      // Risposta secca SÌ/NO/ADDIO
      if (token === 'SÌ' || token === 'SI' || token === 'YES') {
        await movePlanchetteTo('SI');
        if (onLetterCb) onLetterCb('SÌ');
        isSpelling = false;
        return;
      }
      if (token === 'NO') {
        await movePlanchetteTo('NO');
        if (onLetterCb) onLetterCb('NO');
        isSpelling = false;
        return;
      }
      if (token === 'ADDIO' || token === 'ARRIVEDERCI' || token === 'GOODBYE') {
        await movePlanchetteTo('ADDIO');
        if (onLetterCb) onLetterCb('ADDIO');
        isSpelling = false;
        return;
      }

      // Sillabazione lettera per lettera
      let accumulated = '';
      const chars = token.split('');
      const speed = getGameSpeed();

      for (const char of chars) {
        if (char === ' ') {
          await sleep(240 / speed);
          continue;
        }
        if (COORDS[char]) {
          await movePlanchetteTo(char);
          accumulated += char;
          if (onLetterCb) onLetterCb(accumulated);
          await sleep(320 / speed);
        }
      }

      await sleep(500 / speed);
      isSpelling = false;
    }

    // Movimento fluido planchette verso un tasto o coordinata
    async function movePlanchetteTo(targetKey) {
      const coord = COORDS[targetKey];
      if (!coord) return;
      const speed = getGameSpeed();

      // Transizione planchette verso la lettera
      await tween(
        planchetteGroup.position,
        [coord.x, PLANCHETTE_Y, coord.z],
        0.52 / speed,
        ease.inout
      );

      sfx.spooky();

      // Effetto luce e rune sulla lettera
      letterRuneRing.position.set(coord.x, TOP_Y + 0.005, coord.z);
      letterRuneRing.visible = true;
      planchetteLight.intensity = 4.8;

      await sleep(280 / speed);

      letterRuneRing.visible = false;
      planchetteLight.intensity = 2.8;
    }

    // 7. Costruzione Sidebar Sinistra (.sidePanelLeft)
    const sidePanel = h('aside', 'sidePanelLeft');
    sidePanel.setAttribute('aria-label', 'Pannello Seduta Spiritica');
    ctx.sideAdd(sidePanel);

    // Titolo e stato seduta
    const headerSec = h('div', 'spSection');
    headerSec.innerHTML = `
      <div class="spTitle">
        <span>Tavola Ouija 3D</span>
        <span class="spBadge" style="background:rgba(168,85,247,0.2);color:#d8b4fe;">👻 In Contatto</span>
      </div>
      <div style="font-size:0.78rem;color:var(--mut);">Seduta spiritica con presenze dell’Oltretomba</div>
    `;

    // Scheda Spirito Evocato
    const spiritSec = h('div', 'spSection');
    function renderSpiritCard() {
      spiritSec.innerHTML = `
        <div class="spTitle">
          <span>Entità Evocata</span>
          <span style="font-size:1.1rem;">🔮</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="font-size:2rem;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:rgba(168,85,247,0.15);border-radius:10px;border:1px solid rgba(168,85,247,0.3);">
            ${currentSpirit.id === 'barone' ? '🏰' : currentSpirit.id === 'dama' ? '🪞' : currentSpirit.id === 'poltergeist' ? '👻' : '⚓'}
          </div>
          <div>
            <div style="font-weight:700;color:#f3e8ff;font-size:0.92rem;">${esc(currentSpirit.name)}</div>
            <div style="font-size:0.72rem;color:var(--mut);">${esc(currentSpirit.title)}</div>
          </div>
        </div>
        <div style="font-size:0.75rem;font-style:italic;color:#e2d3be;background:rgba(255,255,255,0.03);padding:7px 10px;border-radius:8px;border-left:3px solid #a855f7;margin-bottom:8px;">
          "${esc(currentSpirit.intro)}"
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:0.7rem;color:var(--mut);">Umiltà/Tono: <b>${esc(currentSpirit.mood)}</b></span>
          <button type="button" class="spBtn" id="btnChangeSpirit" style="padding:4px 9px;font-size:0.72rem;">Evoca Altro ↻</button>
        </div>
      `;
      const btnChange = spiritSec.querySelector('#btnChangeSpirit');
      if (btnChange) {
        btnChange.onclick = () => {
          if (isSpelling) return;
          sfx.whoosh();
          spiritIndex = (spiritIndex + 1) % SPIRITS.length;
          currentSpirit = SPIRITS[spiritIndex];
          renderSpiritCard();
          addTranscript('Rituale', `È stata evocata una nuova entità: ${currentSpirit.name}`);
          host.say(`Il cerchio vibra... ora parla ${currentSpirit.name}!`, { mood: 'surprised' });
        };
      }
    }
    renderSpiritCard();

    // Box per lettere sillabate in tempo reale
    const spellSec = h('div', 'spSection');
    spellSec.innerHTML = `
      <div class="spTitle">
        <span>Messaggio dello Spirito</span>
        <span style="font-size:0.7rem;color:#fde047;">3D Live</span>
      </div>
      <div class="ouijaSpSpellBox" id="spellBox">_ _ _</div>
      <div style="font-size:0.68rem;color:var(--mut);text-align:center;margin-top:6px;">La planchette si muove fisicamente sulla tavola 3D</div>
    `;
    const spellBoxEl = spellSec.querySelector('#spellBox');

    // Cronaca della Seduta (Transcript)
    const logSec = h('div', 'spSection');
    logSec.innerHTML = `
      <div class="spTitle">
        <span>Cronaca della Seduta</span>
        <span id="logCount" style="font-size:0.7rem;color:var(--mut);">0 eventi</span>
      </div>
      <div class="spLogBox" id="transcriptBox">
        <div class="spLogItem" style="--accent:#a855f7;"><b>Rituale:</b> Il cerchio è aperto. Poni una domanda.</div>
      </div>
    `;
    const transcriptBox = logSec.querySelector('#transcriptBox');
    const logCountEl = logSec.querySelector('#logCount');
    let transcriptItems = 1;

    function addTranscript(who, text, accent = '#a855f7') {
      const item = h('div', 'spLogItem', `<b>${esc(who)}:</b> ${esc(text)}`);
      item.style.setProperty('--accent', accent);
      transcriptBox.prepend(item);
      transcriptItems++;
      if (logCountEl) logCountEl.textContent = `${transcriptItems} eventi`;
    }

    // Sezione Domande & Azioni
    const actSec = h('div', 'spSection');
    actSec.innerHTML = `
      <div class="spTitle">
        <span>Interroga lo Spirito</span>
        <span style="font-size:0.7rem;color:var(--goldHi);">Domande</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
        <button type="button" class="spBtn" id="btnQYesNo">✨ C’è qualcuno con noi stanotte? (SÌ/NO)</button>
        <button type="button" class="spBtn" id="btnQName">👤 Come ti chiami, anima errante?</button>
        <button type="button" class="spBtn" id="btnQWhere">📍 Dove ti nascondi in questa stanza?</button>
        <button type="button" class="spBtn" id="btnQFear">💀 Cosa temi di più nell'ombra?</button>
      </div>
      <div class="spTitle" style="margin-top:8px;">
        <span>Domanda Personalizzata</span>
      </div>
      <div style="display:flex;gap:6px;">
        <input type="text" class="spInput" id="customQInput" placeholder="Fai una domanda allo spirito..." maxlength="60" />
        <button type="button" class="spBtn pri" id="btnCustomQ" style="white-space:nowrap;">Chiedi 🔮</button>
      </div>
    `;

    // Sezione Enigma dell'Oltre
    const riddleSec = h('div', 'spSection');
    riddleSec.innerHTML = `
      <div class="spTitle">
        <span>Enigma dell’Oltre</span>
        <span style="color:#eab308;font-size:0.7rem;">+2500 Punti</span>
      </div>
      <div style="font-size:0.74rem;color:var(--mut);margin-bottom:8px;">Risolvi l’enigma per liberare l’anima errante e guadagnare punti coraggio:</div>
      <button type="button" class="spBtn pri" id="btnStartRiddle" style="width:100%;">🕯️ Affronta l'Enigma dello Spirito</button>
    `;

    sidePanel.append(headerSec, spiritSec, spellSec, actSec, riddleSec, logSec);

    // Gestione Domande Predefinite
    const btnQYesNo = actSec.querySelector('#btnQYesNo');
    const btnQName = actSec.querySelector('#btnQName');
    const btnQWhere = actSec.querySelector('#btnQWhere');
    const btnQFear = actSec.querySelector('#btnQFear');
    const customQInput = actSec.querySelector('#customQInput');
    const btnCustomQ = actSec.querySelector('#btnCustomQ');
    const btnStartRiddle = riddleSec.querySelector('#btnStartRiddle');

    async function handleAskQuestion(qText, ansWord, scorePoints = 500) {
      if (isSpelling || finished) return;
      const activePlayer = ctx.active || P[0];
      addTranscript(activePlayer.name, qText, activePlayer.color);
      if (spellBoxEl) spellBoxEl.textContent = '... ascoltando ...';

      await host.say(`${activePlayer.name} domanda: "${qText}"`, { mood: 'think', to: activePlayer });

      await spellOut3D(ansWord, current => {
        if (spellBoxEl) spellBoxEl.textContent = current;
      });

      addTranscript(currentSpirit.name, ansWord, '#fde047');
      ctx.addScore(activePlayer, scorePoints);
      await host.say(`Lo spirito ha manifestato: "${ansWord}"!`, { mood: 'surprised' });
    }

    if (btnQYesNo) {
      btnQYesNo.onclick = () => {
        const ans = currentSpirit.answers.yesno ? 'SÌ' : 'NO';
        handleAskQuestion('C’è qualcuno con noi stanotte?', ans, 600);
      };
    }

    if (btnQName) {
      btnQName.onclick = () => {
        handleAskQuestion('Qual è il tuo vero nome?', currentSpirit.answers.who, 800);
      };
    }

    if (btnQWhere) {
      btnQWhere.onclick = () => {
        handleAskQuestion('Dove ti nascondi in questa stanza?', currentSpirit.answers.where, 800);
      };
    }

    if (btnQFear) {
      btnQFear.onclick = () => {
        handleAskQuestion('Cosa temi di più nell’ombra?', currentSpirit.answers.fear, 900);
      };
    }

    if (btnCustomQ && customQInput) {
      const askCustom = () => {
        const txt = customQInput.value.trim();
        if (!txt || isSpelling) return;
        customQInput.value = '';
        // Scelta risposta spiritica adatta
        let resp = currentSpirit.answers.who;
        if (/chi|nome/i.test(txt)) resp = currentSpirit.answers.who;
        else if (/dove|posto|luogo/i.test(txt)) resp = currentSpirit.answers.where;
        else if (/paura|temi|terrore/i.test(txt)) resp = currentSpirit.answers.fear;
        else if (/vero|falso|posso|sei/i.test(txt)) resp = currentSpirit.answers.yesno ? 'SÌ' : 'NO';
        else resp = currentSpirit.secretWord;
        handleAskQuestion(txt, resp, 1000);
      };
      btnCustomQ.onclick = askCustom;
      customQInput.onkeydown = e => { if (e.key === 'Enter') askCustom(); };
    }

    // Risoluzione Enigma dell'Oltre
    if (btnStartRiddle) {
      btnStartRiddle.onclick = async () => {
        if (isSpelling || finished) return;
        const activePlayer = ctx.active || P[0];
        addTranscript('Enigma', `L'enigma di ${currentSpirit.name}: "${currentSpirit.riddle}"`, '#eab308');
        await host.say(`Ecco l’enigma ancestrale di ${currentSpirit.name}: "${currentSpirit.riddle}"`, { mood: 'think' });

        const options = [
          currentSpirit.secretWord,
          'TEMPO',
          'SPECCHIO',
          'SILENZIO'
        ].filter((v, i, a) => a.indexOf(v) === i).sort(() => Math.random() - 0.5);

        const rightIdx = options.indexOf(currentSpirit.secretWord);

        const res = await ctx.ask({
          q: `Enigma di ${currentSpirit.name}: "${currentSpirit.riddle}"`,
          opts: options,
          right: rightIdx,
          time: 25,
          cat: 'ENIGMA DELL’OLTRETOMBA',
          player: activePlayer
        });

        if (res.ok) {
          ctx.addScore(activePlayer, 2500);
          sfx.ok();
          S.flashWith('#a855f7');
          S.burst('#fde047', 150, 4.5);
          addTranscript(activePlayer.name, `Ha risolto l’enigma: "${currentSpirit.secretWord}"!`, '#22c55e');

          await spellOut3D(currentSpirit.secretWord, current => {
            if (spellBoxEl) spellBoxEl.textContent = current;
          });

          await host.say(`ESATTO! ${currentSpirit.secretWord}! L’anima di ${currentSpirit.name} è finalmente in pace!`, { mood: 'celebrate' });
        } else {
          sfx.bad();
          addTranscript(activePlayer.name, `Risposta errata all’enigma. La risposta era "${currentSpirit.secretWord}".`, '#ef4444');
          await host.say(`Sbagliato! La risposta corretta era "${currentSpirit.secretWord}". Uno scricchiolio sinistro riecheggia nella stanza!`, { mood: 'wrong' });
        }
      };
    }

    // 8. Interazione Diretta Mouse / Raycast sulla Tavola 3D
    const pointerHandler = async ev => {
      if (isSpelling || finished) return;
      // Interseca la superficie della tavola Ouija
      const hit = raycast([boardSurface], ev);
      if (!hit) return;

      // Trova la lettera o token più vicino al punto cliccato
      const pt = hit.point || hit.position;
      let closestKey = null;
      let minDist = Infinity;

      for (const [key, c] of Object.entries(COORDS)) {
        if (key === 'CENTER' || key === 'YES' || key === 'ARRIVEDERCI' || key === 'GOODBYE') continue;
        const d = Math.hypot(pt.x - c.x, pt.z - c.z);
        if (d < minDist) {
          minDist = d;
          closestKey = key;
        }
      }

      if (closestKey && minDist < 0.6) {
        sfx.click();
        await movePlanchetteTo(closestKey);
        if (spellBoxEl) {
          const prev = spellBoxEl.textContent.replace(/^(_ _ _|\.\.\. ascoltando \.\.\.)$/, '');
          spellBoxEl.textContent = prev + closestKey;
        }
      }
    };

    window.addEventListener('pointerdown', pointerHandler);
    ctx.onExit(() => window.removeEventListener('pointerdown', pointerHandler));

    // 9. Configurazione Barra Inferiore (ctx.dock)
    let camViewIndex = 0;
    const camPresets = [
      { name: 'Angolata 3D', cam: [0, 4.4, 5.2], look: [0, 1.25, -0.1] },
      { name: 'Dall’Alto', cam: [0, 7.0, 0.6], look: [0, 1.25, 0] },
      { name: 'Panoramica Stanza', cam: [0, 5.2, 7.8], look: [0, 1.25, 0] }
    ];

    function updateDock() {
      const dockWrap = h('div', 'row', '');
      dockWrap.style.gap = '8px';
      dockWrap.style.flexWrap = 'wrap';

      const btnSummon = h('button', 'btn', '🔮 Invoca Spirito');
      btnSummon.onclick = () => {
        if (isSpelling) return;
        sfx.whoosh();
        spiritIndex = (spiritIndex + 1) % SPIRITS.length;
        currentSpirit = SPIRITS[spiritIndex];
        renderSpiritCard();
        addTranscript('Rituale', `Nuova entità evocata: ${currentSpirit.name}`);
        host.say(`Il velo si squarcia! È giunto ${currentSpirit.name}!`, { mood: 'surprised' });
      };

      const btnEnigma = h('button', 'btn pri', '🕯️ Enigma dell’Oltre');
      btnEnigma.onclick = () => {
        if (btnStartRiddle) btnStartRiddle.click();
      };

      const btnGoodbye = h('button', 'btn', '👋 Saluta (ADDIO)');
      btnGoodbye.onclick = async () => {
        if (isSpelling || finished) return;
        finished = true;
        addTranscript('Chiusura', 'Seduta terminata ritualmente con: ADDIO', '#f59e0b');
        await spellOut3D('ADDIO', cur => {
          if (spellBoxEl) spellBoxEl.textContent = cur;
        });
        sfx.bell();
        await host.say('ARRIVEDERCI! Il portale è sigillato, la seduta è conclusa in sicurezza!', { mood: 'outro' });

        ctx.finish({
          win: true,
          title: 'Seduta Spiritica Conclusa!',
          lines: [
            `Avete comunicato con ${currentSpirit.name} e rispettato le leggi dell’Oltretomba!`
          ]
        });
      };

      const btnCam = h('button', 'btn', `🎥 ${camPresets[camViewIndex].name}`);
      btnCam.onclick = () => {
        sfx.click();
        camViewIndex = (camViewIndex + 1) % camPresets.length;
        const p = camPresets[camViewIndex];
        btnCam.textContent = `🎥 ${p.name}`;
        S.go(p.cam, p.look);
      };

      const btnRules = h('button', 'btn', '📖 Regole');
      btnRules.onclick = () => {
        sfx.click();
        ctx.showRules();
      };

      dockWrap.append(btnSummon, btnEnigma, btnGoodbye, btnCam, btnRules);
      ctx.dock(dockWrap);
    }

    updateDock();

    // 10. Intro Host
    await host.say(`Shhh... silenzio in studio. Abbiamo aperto il portale: ecco ${currentSpirit.name}!`, { mood: 'think' });
    await host.say(currentSpirit.intro, { mood: 'surprised' });

    // Pulizia al termine
    ctx.onExit(() => {
      finished = true;
      sidePanel.remove();
    });
  }
};
