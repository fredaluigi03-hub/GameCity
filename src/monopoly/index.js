import { BOARD, CHANCE, CHEST, GROUPS } from './data.js';
import {
  START_CASH, GO_SALARY, rentDue, canBuild, canSell, build, sellBuilding,
  mortgageValue, unmortgageCost, netWorth, ownedBy, groupFor, transferable, resolveCardMovement
} from './rules.js';
import { THREE, newStage, tween, label3d, mat, glow, raycast, person, anim, PAL } from '../engine.js';
import { h, sfx, shuffle, sleep } from '../ui.js';
import { createHost, HOSTS } from '../host.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = n => `${Math.floor(n).toLocaleString('it-IT')} $`;

const GROUP_HEX = {
  brown: '#8b4513',
  lightblue: '#38bdf8',
  pink: '#ec4899',
  orange: '#f97316',
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  darkblue: '#2563eb'
};

export const MONOPOLY_TOKENS = [
  { id: 'tophat', icon: '🎩', label: 'Cilindro' },
  { id: 'car', icon: '🏎️', label: 'Auto da Corsa' },
  { id: 'dog', icon: '🐕', label: 'Cane Scotty' },
  { id: 'ship', icon: '🚢', label: 'Corazzata' },
  { id: 'thimble', icon: '🪡', label: 'Ditale' },
  { id: 'boot', icon: '👢', label: 'Stivale' },
  { id: 'wheelbarrow', icon: '🛒', label: 'Carriola' },
  { id: 'iron', icon: '熨', label: 'Ferro da Stiro' }
];

// ---- Board 3D coordinate system (10.4 x 10.4 world units) ----
const BOARD_SIZE = 10.4;
const CORNER_W = 1.6;
const PROP_W = 0.8;
const Y_TABLE = 1.05;
const Y_BOARD = 1.16;

function getSpaceTransform(i) {
  // Returns { x, z, rotY, isCorner, w, d }
  if (i === 0) return { x: 4.4, z: 4.4, rotY: 0, isCorner: true, w: CORNER_W, d: CORNER_W };
  if (i > 0 && i < 10) return { x: 4.0 - i * 0.8, z: 4.4, rotY: 0, isCorner: false, w: 0.8, d: CORNER_W };
  if (i === 10) return { x: -4.4, z: 4.4, rotY: Math.PI / 2, isCorner: true, w: CORNER_W, d: CORNER_W };
  if (i > 10 && i < 20) return { x: -4.4, z: 4.0 - (i - 10) * 0.8, rotY: Math.PI / 2, isCorner: false, w: 0.8, d: CORNER_W };
  if (i === 20) return { x: -4.4, z: -4.4, rotY: Math.PI, isCorner: true, w: CORNER_W, d: CORNER_W };
  if (i > 20 && i < 30) return { x: -4.0 + (i - 20) * 0.8, z: -4.4, rotY: Math.PI, isCorner: false, w: 0.8, d: CORNER_W };
  if (i === 30) return { x: 4.4, z: -4.4, rotY: -Math.PI / 2, isCorner: true, w: CORNER_W, d: CORNER_W };
  return { x: 4.4, z: -4.0 + (i - 30) * 0.8, rotY: -Math.PI / 2, isCorner: false, w: 0.8, d: CORNER_W };
}

// ---- Sculpted 3D Monopoly Tokens ----
function createTokenMesh3D(tokenId, playerColor) {
  const g = new THREE.Group();
  const silver = mat('#e2e8f0', { metalness: 0.92, roughness: 0.16 });
  const chrome = mat('#cbd5e1', { metalness: 0.85, roughness: 0.22 });
  const accentM = mat(playerColor, { metalness: 0.65, roughness: 0.28, emissive: playerColor, emissiveIntensity: 0.18 });
  const darkM = mat('#1e293b', { metalness: 0.5, roughness: 0.4 });

  // Pedestal base ring with player color
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.05, 24), accentM);
  base.position.y = 0.025;
  const innerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.07, 24), silver);
  innerBase.position.y = 0.04;
  g.add(base, innerBase);

  const body = new THREE.Group();
  body.position.y = 0.07;
  g.add(body);

  switch (tokenId) {
    case 'tophat': {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.025, 28), silver);
      brim.position.y = 0.02;
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.04, 24), accentM);
      ribbon.position.y = 0.05;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.115, 0.24, 24), silver);
      crown.position.y = 0.15;
      body.add(brim, ribbon, crown);
      break;
    }
    case 'car': {
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.36), silver);
      chassis.position.y = 0.06;
      const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 16), silver);
      nose.rotation.x = Math.PI / 2;
      nose.position.set(0, 0.06, 0.14);
      const cabin = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), accentM);
      cabin.scale.set(1, 0.7, 1.3);
      cabin.position.set(0, 0.11, -0.03);
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.05), accentM);
      spoiler.position.set(0, 0.12, -0.17);
      body.add(chassis, nose, cabin, spoiler);
      for (const [wx, wz] of [[-0.1, 0.11], [0.1, 0.11], [-0.1, -0.11], [0.1, -0.11]]) {
        const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.035, 16), darkM);
        wh.rotation.z = Math.PI / 2;
        wh.position.set(wx, 0.048, wz);
        body.add(wh);
      }
      break;
    }
    case 'dog': {
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.22), silver);
      torso.position.set(0, 0.11, 0);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.14), silver);
      head.position.set(0, 0.2, 0.1);
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.09), chrome);
      snout.position.set(0, 0.18, 0.18);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.015, 8, 20), accentM);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 0.15, 0.07);
      const earL = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 8), silver);
      earL.position.set(-0.04, 0.28, 0.08);
      const earR = earL.clone();
      earR.position.x = 0.04;
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 8), silver);
      tail.position.set(0, 0.19, -0.12);
      tail.rotation.x = -0.4;
      body.add(torso, head, snout, collar, earL, earR, tail);
      for (const [lx, lz] of [[-0.04, 0.07], [0.04, 0.07], [-0.04, -0.07], [0.04, -0.07]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.09, 10), silver);
        leg.position.set(lx, 0.045, lz);
        body.add(leg);
      }
      break;
    }
    case 'ship': {
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.36, 16), silver);
      hull.rotation.x = Math.PI / 2;
      hull.scale.set(1.1, 1, 0.55);
      hull.position.y = 0.05;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.2), chrome);
      deck.position.set(0, 0.1, -0.01);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.08), accentM);
      bridge.position.set(0, 0.15, 0.03);
      const stack1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.09, 12), silver);
      stack1.position.set(0, 0.16, -0.05);
      body.add(hull, deck, bridge, stack1);
      break;
    }
    case 'thimble': {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.135, 0.24, 24), silver);
      cup.position.y = 0.12;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), silver);
      dome.position.y = 0.24;
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.014, 8, 24), accentM);
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.05;
      body.add(cup, dome, band);
      break;
    }
    case 'boot': {
      const ankle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.22, 18), silver);
      ankle.position.set(0, 0.12, -0.03);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.24), silver);
      foot.position.set(0, 0.05, 0.03);
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.066, 16, 12), silver);
      toe.position.set(0, 0.05, 0.14);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.26), accentM);
      sole.position.set(0, 0.012, 0.03);
      body.add(ankle, foot, toe, sole);
      break;
    }
    case 'wheelbarrow': {
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.22), silver);
      tray.position.set(0, 0.11, 0);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 10, 20), accentM);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(0, 0.06, 0.16);
      const hL = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 8), chrome);
      hL.rotation.x = Math.PI / 2 - 0.15;
      hL.position.set(-0.07, 0.09, -0.06);
      const hR = hL.clone();
      hR.position.x = 0.07;
      body.add(tray, wheel, hL, hR);
      break;
    }
    default: { // iron
      const plate = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.28, 3), silver);
      plate.rotation.x = Math.PI / 2;
      plate.scale.set(1, 1, 0.35);
      plate.position.set(0, 0.04, 0.02);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 10, 20, Math.PI), accentM);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(0, 0.08, 0);
      body.add(plate, arch);
      break;
    }
  }
  return g;
}

// ---- 3D House & Hotel Meshes ----
function createHouseMesh3D() {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.12, 0.14),
    mat('#16a34a', { roughness: 0.35, metalness: 0.15 })
  );
  wall.position.y = 0.06;
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.1, 4),
    mat('#15803d', { roughness: 0.3, metalness: 0.2 })
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 0.17;
  g.add(wall, roof);
  return g;
}

function createHotelMesh3D() {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.2, 0.18),
    mat('#dc2626', { roughness: 0.3, metalness: 0.25 })
  );
  wall.position.y = 0.1;
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.04, 0.2),
    mat('#fbbf24', { roughness: 0.25, metalness: 0.85 })
  );
  roof.position.y = 0.22;
  g.add(wall, roof);
  return g;
}

// ---- 3D Dice with 6 Pip Faces ----
function createDieFaceMaterial(n) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#e2ddd0';
  cx.fillRect(0, 0, 128, 128);
  cx.strokeStyle = '#334155';
  cx.lineWidth = 8;
  cx.strokeRect(4, 4, 120, 120);

  const pips = {
    1: [[64, 64]],
    2: [[34, 34], [94, 94]],
    3: [[32, 32], [64, 64], [96, 96]],
    4: [[34, 34], [94, 34], [34, 94], [94, 94]],
    5: [[32, 32], [96, 32], [64, 64], [32, 96], [96, 96]],
    6: [[34, 28], [94, 28], [34, 64], [94, 64], [34, 100], [94, 100]]
  }[n] || [[64, 64]];

  cx.fillStyle = n === 1 || n === 4 ? '#b91c1c' : '#090d16';
  for (const [px, py] of pips) {
    cx.beginPath();
    cx.arc(px, py, n === 1 ? 18 : 13, 0, Math.PI * 2);
    cx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0.86, 0.86, 0.86), toneMapped: false });
}

// BoxGeometry face order: 0:+X(2), 1:-X(5), 2:+Y(1), 3:-Y(6), 4:+Z(3), 5:-Z(4)
const DIE_TOP_ROT = {
  1: { x: 0, z: 0 },
  6: { x: Math.PI, z: 0 },
  2: { x: 0, z: Math.PI / 2 },
  5: { x: 0, z: -Math.PI / 2 },
  3: { x: -Math.PI / 2, z: 0 },
  4: { x: Math.PI / 2, z: 0 }
};

function createDie3D() {
  const mats = [2, 5, 1, 6, 3, 4].map(createDieFaceMaterial);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), mats);
  mesh.castShadow = true;
  return mesh;
}

// ---- High-Resolution 2048x2048 3D Board CanvasTexture ----
function createMonopolyBoardTexture() {
  const S = 2048;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const cx = cv.getContext('2d');
  const U = S / BOARD_SIZE; // ~196.92 px per unit
  const CW = CORNER_W * U;  // ~315 px
  const PW = 0.8 * U;       // ~157.5 px

  // Classic matte board background (no glare)
  cx.fillStyle = '#c9c2ae';
  cx.fillRect(0, 0, S, S);

  // Inner playing square
  cx.fillStyle = '#091913';
  cx.fillRect(CW, CW, S - 2 * CW, S - 2 * CW);
  cx.strokeStyle = '#b89548';
  cx.lineWidth = 6;
  cx.strokeRect(CW + 8, CW + 8, S - 2 * CW - 16, S - 2 * CW - 16);

  // Center Monopoly diagonal logo
  cx.save();
  cx.translate(S / 2, S / 2);
  cx.rotate(-Math.PI / 4);
  cx.fillStyle = '#dc2626';
  cx.strokeStyle = '#ffffff';
  cx.lineWidth = 10;
  cx.fillRect(-440, -110, 880, 220);
  cx.strokeRect(-440, -110, 880, 220);
  cx.font = '900 148px "Bebas Neue", Outfit, sans-serif';
  cx.fillStyle = '#ffffff';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.shadowColor = 'rgba(0,0,0,0.55)';
  cx.shadowBlur = 12;
  cx.fillText('MONOPOLY', 0, 8);
  cx.shadowBlur = 0;
  cx.font = '700 30px Outfit, sans-serif';
  cx.fillStyle = '#ffd24a';
  cx.fillText('EDIZIONE GRAN STUDIO ITALIA 3D', 0, 155);

  // Card Deck outlines on the board
  cx.strokeStyle = 'rgba(249, 115, 22, 0.7)';
  cx.lineWidth = 5;
  cx.strokeRect(-380, -450, 280, 180);
  cx.font = '700 28px Outfit, sans-serif';
  cx.fillStyle = '#fb923c';
  cx.fillText('IMPREVISTI', -240, -360);

  cx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
  cx.strokeRect(100, 270, 280, 180);
  cx.fillStyle = '#38bdf8';
  cx.fillText('PROBABILITÀ', 240, 360);
  cx.restore();

  // Helper to draw each of the 40 spaces
  function drawTileContent(c, idx, w, h) {
    cx.fillStyle = '#d8d0bc';
    cx.fillRect(-w / 2, -h / 2, w, h);
    cx.strokeStyle = '#0f172a';
    cx.lineWidth = 5;
    cx.strokeRect(-w / 2, -h / 2, w, h);

    const name = c.itName || c.name;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';

    if (idx === 0 || idx === 10 || idx === 20 || idx === 30) {
      cx.fillStyle = '#0f172a';
      cx.font = '900 36px "Bebas Neue", Outfit, sans-serif';
      const icon = idx === 0 ? '⬅️ VIA!' : idx === 10 ? '⛓️ PRIGIONE' : idx === 20 ? '🅿️ PARCHEGGIO' : '🚓 IN PRIGIONE!';
      cx.fillText(icon, 0, -35);
      cx.font = '700 22px Outfit, sans-serif';
      cx.fillStyle = '#dc2626';
      cx.fillText(idx === 0 ? 'RITIRA 200 $' : idx === 10 ? 'O TRANSITO' : idx === 20 ? 'GRATUITO' : 'VAI SUBITO!', 0, 25);
      return;
    }

    // Color header bar at the top of the tile (inner side facing center)
    if (c.color && GROUP_HEX[c.color]) {
      cx.fillStyle = GROUP_HEX[c.color];
      cx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h * 0.26);
      cx.strokeStyle = '#0f172a';
      cx.lineWidth = 3;
      cx.strokeRect(-w / 2 + 2, -h / 2 + 2, w - 4, h * 0.26);
    }

    // Icon for special spaces
    if (c.type === 'railroad') {
      cx.font = '44px sans-serif';
      cx.fillText('🚂', 0, -h * 0.22);
    } else if (c.type === 'utility') {
      cx.font = '44px sans-serif';
      cx.fillText(name.includes('Acqua') ? '🚰' : '💡', 0, -h * 0.22);
    } else if (c.type === 'chance') {
      cx.font = '900 64px "Bebas Neue", sans-serif';
      cx.fillStyle = '#f97316';
      cx.fillText('?', 0, -h * 0.12);
    } else if (c.type === 'chest') {
      cx.font = '44px sans-serif';
      cx.fillText('📦', 0, -h * 0.18);
    } else if (c.type === 'tax') {
      cx.font = '42px sans-serif';
      cx.fillText('💎', 0, -h * 0.18);
    }

    // Wrap space name
    cx.fillStyle = '#0f172a';
    cx.font = '700 20px Outfit, sans-serif';
    const words = name.split(' ');
    let lines = [];
    let cur = '';
    for (const wd of words) {
      const test = cur ? cur + ' ' + wd : wd;
      if (cx.measureText(test).width > w - 16 && cur) {
        lines.push(cur);
        cur = wd;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    const startY = c.color ? -12 : 10;
    lines.slice(0, 3).forEach((ln, li) => {
      cx.fillText(ln, 0, startY + li * 24);
    });

    // Price at bottom of tile
    if (c.price || c.amount) {
      cx.font = '800 22px Outfit, sans-serif';
      cx.fillStyle = '#1e293b';
      cx.fillText(`${c.price || c.amount} $`, 0, h / 2 - 26);
    }
  }

  for (let i = 0; i < 40; i++) {
    const tf = getSpaceTransform(i);
    const px = (tf.x + BOARD_SIZE / 2) * U;
    const pz = (tf.z + BOARD_SIZE / 2) * U;
    cx.save();
    cx.translate(px, pz);
    cx.rotate(-tf.rotY);
    drawTileContent(BOARD[i], i, tf.w * U, tf.d * U);
    cx.restore();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export default {
  id: 'monopoly',
  name: 'Monopoly 3D',
  tag: 'Gioco da tavolo 3D · Edizione Italia',
  desc: 'Scegli la tua pedina 3D, lancia davvero i dadi sul tabellone tridimensionale, costruisci case e alberghi 3D e conquista tutte le proprietà!',
  c1: '#22c55e',
  c2: '#2563eb',
  tokens: MONOPOLY_TOKENS,
  players: { min: 1, max: 6, def: 4, rival: true },
  difficulty: true,
  rules: [
    'All’inizio ogni giocatore sceglie la propria Pedina 3D ufficiale del Monopoly (Cilindro, Auto da corsa, Cane Scotty, Corazzata, Ditale, Stivale, Carriola, Ferro da stiro).',
    'Al tuo turno premi «Lancia i Dadi 3D»: i due dadi vengono lanciati fisicamente sul tabellone 3D e la tua pedina salta casella per casella.',
    'Ogni volta che passi o ti fermi sul VIA! incassi 200 $ dalla Banca. Se fai doppio con i dadi hai diritto a un lancio extra (ma 3 doppi di fila ti mandano in Prigione!).',
    'Quando atterri su una proprietà libera puoi acquistarla al prezzo di listino; se rifiuti, parte subito l’Asta aperta a tutti i giocatori.',
    'Quando possiedi tutte le proprietà di uno stesso colore (Monopolio), la rendita raddoppia e puoi costruire Case 3D verdi (fino a 4) e Alberghi 3D rossi in modo uniforme.',
    'Usa il pannello a sinistra per ispezionare qualsiasi contratto, costruire case, ipotecare proprietà o proporre scambi agli avversari.'
  ],
  guide: `
    <h4 style="margin:0 0 6px;color:#ffd24a">Guida Rapida al Tabellone 3D</h4>
    <p style="margin:0 0 6px">• <b>Clic sul Tabellone 3D o sui Badge a sinistra</b>: Tocca qualsiasi casella sul tavolo 3D (o nella barra a sinistra) per leggere il Contratto completo con tutte le rendite da 1 a 4 case, Albergo e valore ipotecario.</p>
    <p style="margin:0 0 6px">• <b>Costruzione Uniforme</b>: Puoi costruire case appena possiedi l’intero gruppo colore senza ipoteche. Le case vanno distribuite uniformemente (non più di 1 casa di differenza tra le vie dello stesso colore).</p>
    <p style="margin:0">• <b>Inquadrature Telecamera 3D</b>: Usa i pulsanti in alto a destra per passare tra Visuale Dinamica, Vista dall’Alto, Panoramica e Zoom sulla tua Pedina.</p>
  `,

  async start(ctx) {
    const S = ctx.stage = newStage({
      c1: this.c1,
      c2: this.c2,
      bg: '#050c09',
      cam: [0, 9.8, 10.6],
      look: [0, 1.1, 0.4]
    });

    const host = createHost(ctx, {
      ...HOSTS.monopoly,
      position: [-3.8, 0, -3.2],
      lookAt: [0, 1.2, 0]
    });

    const P = ctx.players;
    // Assign distinct 3D Monopoly tokens if not already set
    const usedToks = new Set();
    P.forEach((p, i) => {
      let tok = p.token;
      if (!tok || usedToks.has(tok.id)) {
        tok = MONOPOLY_TOKENS.find(t => !usedToks.has(t.id)) || MONOPOLY_TOKENS[i % MONOPOLY_TOKENS.length];
      }
      usedToks.add(tok.id);
      p.token = tok;
      Object.assign(p.data, {
        cash: START_CASH,
        pos: 0,
        jail: 0,
        jailCard: 0,
        doubles: 0,
        bankrupt: false,
        seat: i,
        tokenId: tok.id
      });
    });

    const boardState = {
      owners: Array(40).fill(null),
      houses: Array(40).fill(0),
      mortgages: new Set(),
      bank: { houses: 32, hotels: 12 },
      players: P,
      current: 0
    };

    // ---- Build 3D Luxury Mahogany Table & Monopoly 3D Board ----
    const tableGroup = new THREE.Group();
    S.add(tableGroup);

    const mahogany = mat('#2c160e', { roughness: 0.32, metalness: 0.25 });
    const goldMat = mat(PAL.gold, { metalness: 0.92, roughness: 0.22 });
    const feltMat = mat('#0b291e', { roughness: 0.65, metalness: 0.05 });

    // Central pedestal & table top
    const pedBase = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.2, 0.25, 48), mahogany);
    pedBase.position.y = 0.125;
    const pedCol = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 0.85, 32), mahogany);
    pedCol.position.y = 0.55;
    const tableRim = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.22, 11.6), mahogany);
    tableRim.position.y = Y_TABLE - 0.06;
    const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(11.68, 0.06, 11.68), goldMat);
    goldTrim.position.y = Y_TABLE;
    tableGroup.add(pedBase, pedCol, tableRim, goldTrim);

    // 3D Monopoly Board Slab (anti-glare matte surface so text is 100% readable)
    const boardTex = createMonopolyBoardTexture();
    const boardTopMat = new THREE.MeshBasicMaterial({ map: boardTex, color: new THREE.Color(0.82, 0.82, 0.82), toneMapped: false });
    const boardSideMat = mat('#14201b', { roughness: 0.6, metalness: 0.2 });
    const boardMesh = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD_SIZE, 0.12, BOARD_SIZE),
      [boardSideMat, boardSideMat, boardTopMat, boardSideMat, boardSideMat, boardSideMat]
    );
    boardMesh.position.y = Y_BOARD - 0.06;
    boardMesh.userData.noShadow = true;
    tableGroup.add(boardMesh);

    // 3D Probabilità & Imprevisti Card Decks on Board
    const createCardDeck3D = (col, x, z, rotY) => {
      const dg = new THREE.Group();
      dg.position.set(x, Y_BOARD, z);
      dg.rotation.y = rotY;
      const stack = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 0.76), mat('#94a3b8', { roughness: 0.75, metalness: 0.05 }));
      stack.position.y = 0.06;
      const topCard = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.02, 0.77), mat(col, { roughness: 0.55, metalness: 0.1 }));
      topCard.position.y = 0.125;
      dg.add(stack, topCard);
      tableGroup.add(dg);
      return dg;
    };
    const chanceDeck3D = createCardDeck3D('#f97316', -1.8, -1.8, Math.PI / 4);
    const chestDeck3D = createCardDeck3D('#38bdf8', 1.8, 1.8, Math.PI / 4);

    // 40 3D Interactive Tile Hitboxes, Raised Color Bars, Ownership Pins & Building Containers
    const tileHitMeshes = [];
    const tileGroups = [];
    const buildingGroups = [];
    const ownerMarkers = [];

    for (let i = 0; i < 40; i++) {
      const tf = getSpaceTransform(i);
      const c = BOARD[i];
      const tg = new THREE.Group();
      tg.position.set(tf.x, Y_BOARD, tf.z);
      tg.rotation.y = tf.rotY;
      tableGroup.add(tg);
      tileGroups.push(tg);

      // Invisible clickable hitbox for raycast inspection
      const hit = new THREE.Mesh(
        new THREE.BoxGeometry(tf.w - 0.03, 0.06, tf.d - 0.03),
        new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0 })
      );
      hit.position.y = 0.02;
      hit.userData.id = i;
      tg.add(hit);
      tileHitMeshes.push(hit);

      // 3D Raised Color Strip for property groups
      if (c.color && GROUP_HEX[c.color]) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(tf.w - 0.05, 0.035, 0.34),
          mat(GROUP_HEX[c.color], { roughness: 0.32, metalness: 0.2 })
        );
        strip.position.set(0, 0.018, -tf.d / 2 + 0.19);
        tg.add(strip);
      }

      // Building container (houses / hotel sit on the color strip)
      const bGrp = new THREE.Group();
      bGrp.position.set(0, 0.035, -tf.d / 2 + 0.19);
      tg.add(bGrp);
      buildingGroups.push(bGrp);

      // Ownership 3D glowing marker pin (hidden until bought)
      const ownPin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16),
        mat('#ffffff', { metalness: 0.5, roughness: 0.2, emissive: '#ffffff', emissiveIntensity: 0.35 })
      );
      ownPin.position.set(0, 0.02, tf.d / 2 - 0.14);
      ownPin.visible = false;
      tg.add(ownPin);
      ownerMarkers.push(ownPin);
    }

    // 3D Highlight Ring for currently selected / active space
    const highlightRing = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.42, 32),
      new THREE.MeshBasicMaterial({ color: '#ffd24a', side: THREE.DoubleSide, toneMapped: false })
    );
    highlightRing.rotation.x = -Math.PI / 2;
    highlightRing.position.set(4.4, Y_BOARD + 0.015, 4.4);
    tableGroup.add(highlightRing);

    // 3D Dice Pair on the Board
    const die1 = createDie3D();
    const die2 = createDie3D();
    die1.position.set(-0.55, Y_BOARD + 0.22, 0.2);
    die2.position.set(0.55, Y_BOARD + 0.22, -0.2);
    tableGroup.add(die1, die2);

    // Create 3D Tokens for each player on Space 0 (VIA!)
    const tokenMeshes = P.map((p, idx) => {
      const tm = createTokenMesh3D(p.token.id, p.color);
      S.add(tm);
      return tm;
    });

    function getTokenOffsetOnTile(playerIdx, tileIdx) {
      const tf = getSpaceTransform(playerIdx >= 0 ? tileIdx : 0);
      // Offset multiple tokens sharing a space so they never overlap
      const sameTile = P.filter(q => !q.data.bankrupt && q.data.pos === tileIdx);
      const k = Math.max(0, sameTile.findIndex(q => q.id === P[playerIdx].id));
      const count = Math.max(1, sameTile.length);
      const angle = (k / count) * Math.PI * 2 + 0.4;
      const rad = count === 1 ? 0 : 0.22;
      return {
        x: tf.x + Math.cos(angle) * rad,
        y: Y_BOARD,
        z: tf.z + Math.sin(angle) * rad,
        rotY: tf.rotY - Math.PI / 2
      };
    }

    function syncTokensInstant() {
      P.forEach((p, idx) => {
        const m = tokenMeshes[idx];
        if (p.data.bankrupt) {
          m.visible = false;
          return;
        }
        m.visible = true;
        const pos = getTokenOffsetOnTile(idx, p.data.pos);
        m.position.set(pos.x, pos.y, pos.z);
        m.rotation.y = pos.rotY;
      });
    }
    syncTokensInstant();

    // Sync 3D Houses, Hotels & Ownership markers on the 3D board
    function sync3DBoardBuildings() {
      for (let i = 0; i < 40; i++) {
        const owner = boardState.owners[i];
        const pin = ownerMarkers[i];
        if (owner !== null && P[owner]) {
          pin.visible = true;
          const col = P[owner].color;
          pin.material.color.set(col);
          pin.material.emissive.set(col);
          pin.material.opacity = boardState.mortgages.has(i) ? 0.35 : 1;
        } else {
          pin.visible = false;
        }

        const level = boardState.houses[i] || 0;
        const bGrp = buildingGroups[i];
        if (bGrp.userData.level !== level) {
          bGrp.userData.level = level;
          while (bGrp.children.length) bGrp.remove(bGrp.children[0]);
          if (level === 5) {
            const hotel = createHotelMesh3D();
            hotel.scale.setScalar(0.01);
            bGrp.add(hotel);
            tween(hotel.scale, { x: 1, y: 1, z: 1 }, 0.45, 'overshoot');
          } else if (level > 0) {
            for (let hIdx = 0; hIdx < level; hIdx++) {
              const hs = createHouseMesh3D();
              hs.position.x = (hIdx - (level - 1) / 2) * 0.17;
              hs.scale.setScalar(0.01);
              bGrp.add(hs);
              tween(hs.scale, { x: 1, y: 1, z: 1 }, 0.4, 'overshoot');
            }
          }
        }
      }
    }

    // ---- Camera Views ----
    let camMode = 'dynamic'; // 'dynamic' | 'top' | 'wide' | 'pawn'
    function applyCamera(targetSpaceIdx = null) {
      const curP = P[boardState.current] || P[0];
      const spIdx = targetSpaceIdx ?? curP.data.pos;
      const tf = getSpaceTransform(spIdx);
      if (camMode === 'top') {
        S.go([0, 14.2, 0.01], [0, Y_BOARD, 0]);
      } else if (camMode === 'wide') {
        S.go([0, 9.6, 11.2], [0, 1.1, 0.3]);
      } else if (camMode === 'pawn') {
        const outDir = new THREE.Vector3(tf.x, 0, tf.z).normalize();
        S.go([tf.x + outDir.x * 3.8, 3.6, tf.z + outDir.z * 3.8], [tf.x * 0.6, Y_BOARD + 0.2, tf.z * 0.6]);
      } else {
        // Dynamic: angled view biased toward active quadrant
        S.go([tf.x * 0.55, 8.2, Math.max(7.2, tf.z + 5.8)], [tf.x * 0.35, Y_BOARD, tf.z * 0.35]);
      }
    }

    // Camera Switcher Floating Bar on Right
    const camBar = h('div', 'camBar3D');
    const CAM_MODES = [
      ['dynamic', '🎥 Dinamica'],
      ['wide', '👁️ Panoramica'],
      ['top', '🗺️ Dall’Alto'],
      ['pawn', '🔍 Zoom Pedina']
    ];
    function renderCamBar() {
      camBar.replaceChildren(...CAM_MODES.map(([id, label]) => {
        const b = h('button', 'pill btn' + (camMode === id ? ' pri' : ''), label);
        b.style.fontSize = '0.76rem';
        b.onclick = () => {
          camMode = id;
          sfx.click();
          renderCamBar();
          applyCamera();
        };
        return b;
      }));
    }
    renderCamBar();
    ctx.sideAdd(camBar);

    // ---- Left Information Sidebar (.sidePanelLeft) ----
    let inspectedIdx = 0;
    let log = ['Benvenuti al tavolo 3D di Monopoly Italia!'];
    let finished = false;
    let deckChance = shuffle(CHANCE);
    let deckChest = shuffle(CHEST);

    const leftPanel = h('aside', 'sidePanelLeft');
    ctx.sideAdd(leftPanel);

    const logMsg = msg => {
      log.unshift(msg);
      log = log.slice(0, 8);
      renderLeftPanel();
    };

    function selectInspectSpace(idx) {
      inspectedIdx = ((idx % 40) + 40) % 40;
      const tf = getSpaceTransform(inspectedIdx);
      highlightRing.position.set(tf.x, Y_BOARD + 0.02, tf.z);
      renderLeftPanel();
    }

    // Raycast click on 3D board tiles to inspect any property (ignores camera drag)
    let pDownX = 0, pDownY = 0;
    const onPointerDown3D = e => {
      pDownX = e.clientX;
      pDownY = e.clientY;
    };
    const onPointerUp3D = e => {
      if (e.target.id !== 'gl' || ctx.dead) return;
      if (Math.hypot(e.clientX - pDownX, e.clientY - pDownY) > 6) return;
      const hit = raycast(tileHitMeshes, e);
      if (hit && hit.userData.id !== undefined) {
        sfx.click();
        selectInspectSpace(hit.userData.id);
      }
    };
    addEventListener('pointerdown', onPointerDown3D);
    addEventListener('pointerup', onPointerUp3D);
    ctx.onExit(() => {
      removeEventListener('pointerdown', onPointerDown3D);
      removeEventListener('pointerup', onPointerUp3D);
    });

    function renderDeedInspector(idx) {
      const c = BOARD[idx];
      const ownerIdx = boardState.owners[idx];
      const owner = ownerIdx !== null ? P[ownerIdx] : null;
      const level = boardState.houses[idx] || 0;
      const isMort = boardState.mortgages.has(idx);
      const name = c.itName || c.name;
      const hdrCol = GROUP_HEX[c.color] || (c.type === 'railroad' ? '#334155' : c.type === 'utility' ? '#0284c7' : '#475569');

      let bodyHtml = '';
      if (c.type === 'property') {
        bodyHtml = `
          <div class="deedRow"><span>Prezzo d’acquisto</span><b>${money(c.price)}</b></div>
          <div class="deedRow"><span>Rendita solo terreno</span><b>${money(c.rent[0])}</b></div>
          <div class="deedRow"><span>Rendita col Monopolio</span><b>${money(c.rent[0] * 2)}</b></div>
          <div class="deedRow"><span>Con 1 Casa 🏠</span><b>${money(c.rent[1])}</b></div>
          <div class="deedRow"><span>Con 2 Case 🏠🏠</span><b>${money(c.rent[2])}</b></div>
          <div class="deedRow"><span>Con 3 Case 🏠🏠🏠</span><b>${money(c.rent[3])}</b></div>
          <div class="deedRow"><span>Con 4 Case 🏠🏠🏠🏠</span><b>${money(c.rent[4])}</b></div>
          <div class="deedRow" style="color:#f87171"><span>Con ALBERGO 🏨</span><b>${money(c.rent[5])}</b></div>
          <div class="deedRow"><span>Costo ogni Casa/Hotel</span><b>${money(c.house || c.houseCost || 50)}</b></div>
          <div class="deedRow"><span>Valore Ipotecario</span><b>${money(mortgageValue(idx))}</b></div>
        `;
      } else if (c.type === 'railroad') {
        bodyHtml = `
          <div class="deedRow"><span>Prezzo Stazione</span><b>${money(c.price)}</b></div>
          <div class="deedRow"><span>Rendita (1 stazione)</span><b>25 $</b></div>
          <div class="deedRow"><span>Rendita (2 stazioni)</span><b>50 $</b></div>
          <div class="deedRow"><span>Rendita (3 stazioni)</span><b>100 $</b></div>
          <div class="deedRow"><span>Rendita (4 stazioni)</span><b>200 $</b></div>
          <div class="deedRow"><span>Valore Ipotecario</span><b>${money(mortgageValue(idx))}</b></div>
        `;
      } else if (c.type === 'utility') {
        bodyHtml = `
          <div class="deedRow"><span>Prezzo Società</span><b>${money(c.price)}</b></div>
          <div class="deedRow"><span>1 Società posseduta</span><b>4 × dadi</b></div>
          <div class="deedRow"><span>2 Società possedute</span><b>10 × dadi</b></div>
          <div class="deedRow"><span>Valore Ipotecario</span><b>${money(mortgageValue(idx))}</b></div>
        `;
      } else {
        bodyHtml = `<div style="padding:4px 0;color:var(--mut)">Casella speciale del tabellone (${c.type.toUpperCase()}).</div>`;
      }

      const curP = P[boardState.current];
      let actionsHtml = '';
      if (owner && owner.id === curP?.id && !curP.bot) {
        const hCost = c.house || c.houseCost || 50;
        const canB = canBuild(boardState, curP.id, idx) && curP.data.cash >= hCost;
        const canS = canSell(boardState, curP.id, idx);
        const canM = level === 0 && !isMort;
        const canU = isMort && curP.data.cash >= unmortgageCost(idx);
        actionsHtml = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          ${canB ? `<button type="button" class="btn pri act-build" style="padding:4px 10px;font-size:0.75rem">+🏠 Costruisci (${money(hCost)})</button>` : ''}
          ${canS ? `<button type="button" class="btn act-sell" style="padding:4px 10px;font-size:0.75rem">-🏠 Vendi (+${money(hCost / 2)})</button>` : ''}
          ${canM ? `<button type="button" class="btn act-mort" style="padding:4px 10px;font-size:0.75rem">🏦 Ipoteca (+${money(mortgageValue(idx))})</button>` : ''}
          ${canU ? `<button type="button" class="btn pri act-unmort" style="padding:4px 10px;font-size:0.75rem">🔓 Riscatta (${money(unmortgageCost(idx))})</button>` : ''}
        </div>`;
      }

      const isBuyable = c.type === 'property' || c.type === 'railroad' || c.type === 'utility';
      const statusLabel = !isBuyable
        ? 'Casella Speciale'
        : owner
          ? `${esc(owner.name)}${isMort ? ' (IPOTECATA)' : level === 5 ? ' · 🏨 HOTEL' : level > 0 ? ` · ${'🏠'.repeat(level)}` : ''}`
          : 'Libera in vendita';
      const statusCol = !isBuyable ? '#94a3b8' : owner ? owner.color : '#4ade80';

      return `
        <div class="deedCard3D">
          <div class="deedHeader" style="background:${hdrCol}">
            <div style="font-size:0.65rem;opacity:0.85;letter-spacing:0.12em">CONTRATTO · CASELLA #${idx}</div>
            <div style="font-size:1.02rem">${esc(name)}</div>
          </div>
          <div class="deedBody">
            <div class="deedRow">
              <span>Stato</span>
              <b style="color:${statusCol}">${statusLabel}</b>
            </div>
            ${bodyHtml}
            ${actionsHtml}
          </div>
        </div>
      `;
    }

    function renderLeftPanel() {
      const curP = P[boardState.current] || P[0];
      const playersHtml = P.map((p, idx) => {
        const props = ownedBy(boardState, idx);
        const badges = props.map(prIdx => {
          const sp = BOARD[prIdx];
          const lv = boardState.houses[prIdx] || 0;
          const mort = boardState.mortgages.has(prIdx);
          const gc = GROUP_HEX[sp.color] || '#94a3b8';
          return `<span class="spPropBadge" data-sp="${prIdx}" style="--gc:${gc};${mort ? 'opacity:0.45;text-decoration:line-through' : ''}" title="Clicca per ispezionare">${esc(sp.itName || sp.name)}${lv === 5 ? '🏨' : lv > 0 ? `(${lv}🏠)` : ''}</span>`;
        }).join('');

        return `
          <div class="spPlayerCard ${idx === boardState.current ? 'active' : ''} ${p.data.bankrupt ? 'bankrupt' : ''}" style="--pc:${p.color}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-weight:700;font-size:0.92rem;display:flex;align-items:center;gap:6px">
                <span style="font-size:1.15rem">${p.token.icon}</span>
                <span>${esc(p.name)}${p.bot ? ' <small style="color:var(--mut)">CPU</small>' : ''}</span>
                ${idx === boardState.current ? '<span class="activeTurnTag">► IN GIOCO ORA</span>' : ''}
              </span>
              <b style="color:#4ade80;font-size:0.95rem">${money(p.data.cash)}</b>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.74rem;color:var(--mut)">
              <span>📍 ${esc(BOARD[p.data.pos].itName || BOARD[p.data.pos].name)}</span>
              <span>Patrimonio: ${money(netWorth(boardState, idx))}${p.data.jail ? ' · ⛓️ Prigione' : ''}</span>
            </div>
            ${badges ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:2px">${badges}</div>` : ''}
          </div>
        `;
      }).join('');

      leftPanel.innerHTML = `
        <div class="spSection">
          <div class="spTitle">
            <span>👥 Giocatori & Pedine 3D</span>
            <button type="button" class="pill btn sp-token-btn" style="padding:2px 8px;font-size:0.7rem">🎩 Cambia Pedina</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:7px">${playersHtml}</div>
        </div>

        <div class="spSection">
          <div class="spTitle">
            <span>📜 Ispezione Contratto</span>
            <span>🏠 ${boardState.bank.houses}/32 · 🏨 ${boardState.bank.hotels}/12</span>
          </div>
          ${renderDeedInspector(inspectedIdx)}
        </div>

        <div class="spSection">
          <div class="spTitle"><span>📰 Cronaca del Tavolo</span></div>
          <div style="font-size:0.78rem;color:#cbd5e1;display:flex;flex-direction:column;gap:4px">
            ${log.map(l => `<div style="padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.05)">${esc(l)}</div>`).join('')}
          </div>
        </div>
      `;

      // Bind property badge clicks
      leftPanel.querySelectorAll('.spPropBadge').forEach(el => {
        el.onclick = () => {
          sfx.click();
          selectInspectSpace(Number(el.dataset.sp));
        };
      });

      // Bind token switcher modal
      const tokBtn = leftPanel.querySelector('.sp-token-btn');
      if (tokBtn) {
        tokBtn.onclick = () => openTokenPickerModal();
      }

      // Bind direct build/sell/mortgage buttons inside the deed inspector
      const bBuild = leftPanel.querySelector('.act-build');
      if (bBuild) bBuild.onclick = () => {
        const sp = BOARD[inspectedIdx];
        const hCost = sp.house || sp.houseCost || 50;
        if (build(boardState, curP.id, inspectedIdx)) {
          curP.data.cash -= hCost;
          sfx.win();
          logMsg(`${curP.name} costruisce su ${sp.itName || sp.name}!`);
          sync3DBoardBuildings();
          syncScores();
          renderLeftPanel();
        }
      };
      const bSell = leftPanel.querySelector('.act-sell');
      if (bSell) bSell.onclick = () => {
        const sp = BOARD[inspectedIdx];
        const refund = sellBuilding(boardState, curP.id, inspectedIdx);
        if (refund > 0) {
          curP.data.cash += refund;
          sfx.click();
          logMsg(`${curP.name} vende una costruzione su ${sp.itName || sp.name} (+${money(refund)}).`);
          sync3DBoardBuildings();
          syncScores();
          renderLeftPanel();
        }
      };
      const bMort = leftPanel.querySelector('.act-mort');
      if (bMort) bMort.onclick = () => {
        const sp = BOARD[inspectedIdx];
        const val = mortgageValue(inspectedIdx);
        boardState.mortgages.add(inspectedIdx);
        curP.data.cash += val;
        sfx.click();
        logMsg(`${curP.name} ipoteca ${sp.itName || sp.name} per ${money(val)}.`);
        sync3DBoardBuildings();
        syncScores();
        renderLeftPanel();
      };
      const bUnmort = leftPanel.querySelector('.act-unmort');
      if (bUnmort) bUnmort.onclick = () => {
        const sp = BOARD[inspectedIdx];
        const cost = unmortgageCost(inspectedIdx);
        if (curP.data.cash >= cost) {
          boardState.mortgages.delete(inspectedIdx);
          curP.data.cash -= cost;
          sfx.ok();
          logMsg(`${curP.name} riscatta l’ipoteca su ${sp.itName || sp.name} (-${money(cost)}).`);
          sync3DBoardBuildings();
          syncScores();
          renderLeftPanel();
        }
      };
    }

    function openTokenPickerModal() {
      const curP = P.find(p => !p.bot) || P[boardState.current] || P[0];
      const m = h('div', 'ov');
      const card = h('div', 'card');
      card.innerHTML = `
        <p class="kicker">Personalizzazione 3D</p>
        <h2 class="disp">Scegli la Pedina 3D di ${esc(curP.name)}</h2>
        <div class="opts" style="grid-template-columns:repeat(2,1fr);margin:12px 0"></div>
      `;
      const box = card.querySelector('.opts');
      MONOPOLY_TOKENS.forEach(tok => {
        const b = h('button', 'opt' + (curP.token.id === tok.id ? ' picked' : ''), `<span style="font-size:1.5rem">${tok.icon}</span><span><b>${tok.label}</b></span>`);
        b.onclick = () => {
          curP.token = tok;
          curP.data.tokenId = tok.id;
          const idx = P.indexOf(curP);
          S.scene.remove(tokenMeshes[idx]);
          tokenMeshes[idx] = createTokenMesh3D(tok.id, curP.color);
          S.add(tokenMeshes[idx]);
          syncTokensInstant();
          renderLeftPanel();
          sfx.ok();
          m.remove();
        };
        box.append(b);
      });
      const close = h('button', 'btn', 'Chiudi');
      close.onclick = () => m.remove();
      card.append(close);
      m.append(card);
      ctx.ui.append(m);
    }

    function syncScores() {
      P.forEach((p, idx) => {
        p.score = p.data.bankrupt ? 0 : netWorth(boardState, idx);
      });
      ctx.scoreboard();
    }

    // ---- 3D Real Dice Throw Animation ----
    async function roll3DDice(d1, d2) {
      // Focus camera on the 3D board for the throw
      S.go([0, 7.6, 6.8], [0, Y_BOARD, 0]);
      sfx.dice();

      const rot1 = DIE_TOP_ROT[d1] || DIE_TOP_ROT[1];
      const rot2 = DIE_TOP_ROT[d2] || DIE_TOP_ROT[1];

      // Start dice above the side of the board
      die1.position.set(-2.6, Y_BOARD + 2.4, 2.2);
      die2.position.set(-1.8, Y_BOARD + 2.7, 2.5);
      die1.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      die2.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);

      // Parabolic bounce 1
      await Promise.all([
        tween(die1.position, { x: -0.9, y: Y_BOARD + 0.22, z: 0.4 }, 0.36, 'in'),
        tween(die2.position, { x: 0.3, y: Y_BOARD + 0.22, z: -0.1 }, 0.38, 'in'),
        tween(die1.rotation, { x: rot1.x + Math.PI * 4, y: Math.PI * 2, z: rot1.z + Math.PI * 2 }, 0.72, 'out'),
        tween(die2.rotation, { x: rot2.x + Math.PI * 4, y: -Math.PI * 2, z: rot2.z + Math.PI * 2 }, 0.75, 'out')
      ]);
      sfx.dice();
      // Bounce 2 (rebound arc)
      await Promise.all([
        tween(die1.position, { x: -0.65, y: Y_BOARD + 0.75, z: 0.15 }, 0.18, 'out'),
        tween(die2.position, { x: 0.55, y: Y_BOARD + 0.82, z: -0.25 }, 0.19, 'out')
      ]);
      // Settle flat on exact face
      await Promise.all([
        tween(die1.position, { x: -0.52, y: Y_BOARD + 0.22, z: 0.1 }, 0.2, 'bounce'),
        tween(die2.position, { x: 0.62, y: Y_BOARD + 0.22, z: -0.2 }, 0.22, 'bounce')
      ]);
      die1.rotation.set(rot1.x, 0.25, rot1.z);
      die2.rotation.set(rot2.x, -0.3, rot2.z);
      await ctx.sleep(450);
    }

    // ---- 3D Pawn Step-by-Step Hopping Animation ----
    async function animatePawnSteps3D(player, steps) {
      const pIdx = P.indexOf(player);
      const mesh = tokenMeshes[pIdx];
      const total = Math.abs(steps);
      const dir = steps >= 0 ? 1 : -1;

      for (let s = 0; s < total; s++) {
        const prevPos = player.data.pos;
        player.data.pos = (player.data.pos + dir + 40) % 40;
        if (dir > 0 && player.data.pos === 0 && prevPos !== 0) {
          player.data.cash += GO_SALARY;
          sfx.win();
          S.burst(PAL.goldHi, 90, 2.5);
          logMsg(`${player.name} transita dal VIA! e ritira ${money(GO_SALARY)}!`);
          if (Math.random() < 0.6) host.react('go', player);
        }
        const target = getTokenOffsetOnTile(pIdx, player.data.pos);
        const tf = getSpaceTransform(player.data.pos);
        highlightRing.position.set(tf.x, Y_BOARD + 0.02, tf.z);

        // Camera smoothly follows the hopping 3D token
        if (camMode === 'dynamic' || camMode === 'pawn') {
          S.go([tf.x * 0.6, 5.6, Math.max(6.2, tf.z + 4.8)], [tf.x * 0.5, Y_BOARD, tf.z * 0.5]);
        }

        mesh.rotation.y = target.rotY;
        const midX = (mesh.position.x + target.x) / 2;
        const midZ = (mesh.position.z + target.z) / 2;
        await tween(mesh.position, { x: midX, y: Y_BOARD + 0.52, z: midZ }, 0.11, 'out');
        await tween(mesh.position, { x: target.x, y: Y_BOARD, z: target.z }, 0.11, 'in');
        sfx.tick();
      }
      syncTokensInstant();
      selectInspectSpace(player.data.pos);
      applyCamera(player.data.pos);
    }

    // ---- Modals for Buying, Auctions, Trades & Cards ----
    const askChoice = (player, title, subtitle, buttons, botPick) => {
      if (player.bot) return Promise.resolve(botPick());
      return new Promise(res => {
        const card = h('div', 'card');
        card.style.maxWidth = '520px';
        card.innerHTML = `<div class="meta"><span>${esc(title)}</span><span style="color:${player.color}">${player.token.icon} ${esc(player.name)} · ${money(player.data.cash)}</span></div><p style="margin:6px 0 12px">${subtitle}</p>`;
        const row = h('div', 'row');
        buttons.forEach(b => {
          const btn = h('button', 'btn ' + (b.pri ? 'pri' : ''), b.label);
          btn.disabled = !!b.disabled;
          btn.onclick = () => { sfx.click(); res(b.value); };
          row.append(btn);
        });
        card.append(row);
        ctx.dock(card);
      });
    };

    const activePlayers = () => P.filter(p => !p.data.bankrupt && p.alive && !p.retired);

    async function runAuction(spaceIdx) {
      const space = BOARD[spaceIdx];
      const dispName = space.itName || space.name;
      const contenders = new Set(activePlayers().map(p => p.id));
      let highBid = Math.max(10, Math.floor(space.price * 0.25));
      let leader = null;
      let passCount = 0;
      const order = activePlayers().map(p => p.id);
      let turnIdx = 0;

      while (contenders.size > 1 || (contenders.size === 1 && leader === null)) {
        const pid = order[turnIdx % order.length];
        turnIdx++;
        if (!contenders.has(pid)) continue;
        const p = P[pid];
        if (p.data.cash <= highBid) {
          contenders.delete(pid);
          continue;
        }
        let act;
        if (p.bot) {
          await ctx.botThink(200, 450);
          const maxWilling = space.price * (0.85 + (p.skill || 0.6) * 0.45);
          act = (highBid + 15 <= p.data.cash && highBid < maxWilling) ? 'bid' : 'pass';
        } else {
          act = await askChoice(
            p,
            `🔨 Asta per ${dispName}`,
            `Offerta attuale: <b>${money(highBid)}</b> ${leader !== null ? `(di ${esc(P[leader].name)})` : '(nessun offerente)'}`,
            [
              { label: `Rilancia (+15 $ → ${money(highBid + 15)})`, value: 'bid', pri: true, disabled: p.data.cash < highBid + 15 },
              { label: 'Passa', value: 'pass' }
            ],
            () => 'pass'
          );
        }
        if (act === 'bid') {
          highBid += 15;
          leader = pid;
          passCount = 0;
        } else {
          contenders.delete(pid);
          passCount++;
          if (leader !== null && contenders.size === 1 && contenders.has(leader)) break;
        }
        if (passCount > order.length * 2) break;
      }

      if (leader !== null) {
        const w = P[leader];
        w.data.cash -= highBid;
        boardState.owners[spaceIdx] = w.id;
        sfx.win();
        logMsg(`${w.name} si aggiudica ${dispName} all’asta per ${money(highBid)}!`);
        sync3DBoardBuildings();
      } else {
        logMsg(`Nessuna offerta all’asta per ${dispName}.`);
      }
    }

    async function buyOrAuction(player, spaceIdx) {
      const space = BOARD[spaceIdx];
      const dispName = space.itName || space.name;
      selectInspectSpace(spaceIdx);

      let buy = false;
      if (player.bot) {
        await ctx.botThink(350, 700);
        buy = player.data.cash >= space.price + 80;
      } else {
        const pick = await askChoice(
          player,
          `📜 ${dispName} (${money(space.price)})`,
          `Proprietà libera! Vuoi acquistarla per <b>${money(space.price)}</b> o mandarla all’asta?`,
          [
            { label: `Compra (${money(space.price)})`, value: 'buy', pri: true, disabled: player.data.cash < space.price },
            { label: 'Manda all’Asta', value: 'auction' }
          ],
          () => 'buy'
        );
        buy = pick === 'buy' && player.data.cash >= space.price;
      }

      if (buy) {
        player.data.cash -= space.price;
        boardState.owners[spaceIdx] = player.id;
        sfx.ok();
        logMsg(`${player.name} acquista ${dispName} per ${money(space.price)}.`);
        if (Math.random() < 0.75) host.react('right', player, { value: money(space.price) });
        sync3DBoardBuildings();
        syncScores();
        renderLeftPanel();
      } else {
        await runAuction(spaceIdx);
        syncScores();
        renderLeftPanel();
      }
    }

    async function ensureCash(player, needed) {
      while (player.data.cash < needed) {
        // Sell houses first
        const buildable = ownedBy(boardState, player.id).filter(i => canSell(boardState, player.id, i));
        if (buildable.length > 0) {
          const idx = buildable[0];
          const refund = sellBuilding(boardState, player.id, idx);
          player.data.cash += refund;
          logMsg(`${player.name} vende una casa su ${BOARD[idx].itName || BOARD[idx].name} (+${money(refund)}).`);
          sync3DBoardBuildings();
          continue;
        }
        // Mortgage unmortgaged properties
        const mortable = ownedBy(boardState, player.id).filter(i => !boardState.mortgages.has(i) && (boardState.houses[i] || 0) === 0);
        if (mortable.length > 0) {
          const idx = mortable[0];
          const val = mortgageValue(idx);
          boardState.mortgages.add(idx);
          player.data.cash += val;
          logMsg(`${player.name} ipoteca ${BOARD[idx].itName || BOARD[idx].name} (+${money(val)}).`);
          sync3DBoardBuildings();
          continue;
        }
        break;
      }
      return player.data.cash >= needed;
    }

    async function chargePlayer(player, amount, creditor = null, reason = '') {
      const ok = await ensureCash(player, amount);
      if (ok) {
        player.data.cash -= amount;
        if (creditor) creditor.data.cash += amount;
        sfx.bad();
        logMsg(`${player.name} paga ${money(amount)}${creditor ? ` a ${creditor.name}` : ''} (${reason}).`);
        if (amount >= 30) host.react('wrong', player, { value: money(amount) });
      } else {
        // Bankruptcy
        player.data.bankrupt = true;
        player.alive = false;
        const leftover = Math.max(0, player.data.cash);
        player.data.cash = 0;
        if (creditor) creditor.data.cash += leftover;
        ownedBy(boardState, player.id).forEach(i => {
          boardState.houses[i] = 0;
          boardState.owners[i] = creditor ? creditor.id : null;
          if (!creditor) boardState.mortgages.delete(i);
        });
        sync3DBoardBuildings();
        syncTokensInstant();
        logMsg(`💥 ${player.name} dichiara BANCAROTTA!`);
        await host.react('lose', player);
      }
      syncScores();
      renderLeftPanel();
    }

    async function sendToJail(player) {
      player.data.pos = 10;
      player.data.jail = 1;
      player.data.doubles = 0;
      sfx.bad();
      syncTokensInstant();
      selectInspectSpace(10);
      applyCamera(10);
      logMsg(`🚓 ${player.name} finisce dritto in Prigione!`);
      await host.react('jail', player);
    }

    async function drawCard3D(player, kind, diceTotal) {
      const deck3D = kind === 'chance' ? chanceDeck3D : chestDeck3D;
      tween(deck3D.scale, { x: 1.25, y: 1.5, z: 1.25 }, 0.25, 'overshoot').then(() => tween(deck3D.scale, { x: 1, y: 1, z: 1 }, 0.25));
      let deck = kind === 'chance' ? deckChance : deckChest;
      if (!deck.length) {
        deck = shuffle(kind === 'chance' ? CHANCE : CHEST);
        if (kind === 'chance') deckChance = deck; else deckChest = deck;
      }
      const card = deck.shift();
      const title = kind === 'chance' ? '⚡ IMPREVISTI' : '📦 PROBABILITÀ';
      logMsg(`${player.name} pesca ${title}: «${card.text}»`);

      // Visibile popup della carta sul tavolo
      const cardOv = h('div', 'cardPopup3D');
      cardOv.innerHTML = `
        <div class="cardPopupHeader" style="background:${kind === 'chance' ? '#ea580c' : '#0284c7'}">
          <span>${title}</span>
          <span style="font-size:0.75rem">${player.token.icon} ${esc(player.name)}</span>
        </div>
        <div class="cardPopupBody">
          <p style="font-size:1.05rem;line-height:1.45;margin:0 0 10px;font-weight:700">${esc(card.text)}</p>
          <div style="font-size:0.8rem;color:var(--mut)">Applicazione effetto carta in corso...</div>
        </div>
      `;
      ctx.ui.append(cardOv);
      setTimeout(() => cardOv.remove(), 3200);

      await host.say(`${title} per ${player.name}: «${card.text}»`, { mood: 'surprised' });

      // 1. Incasso o pagamento diretto in denaro
      if (card.cash !== undefined) {
        if (card.cash > 0) {
          player.data.cash += card.cash;
          sfx.win();
          logMsg(`💰 ${player.name} incassa ${money(card.cash)}.`);
        } else if (card.cash < 0) {
          await chargePlayer(player, -card.cash, null, title);
        }
      }

      // 2. Carta Uscita Gratis di Prigione
      if (card.jailCard) {
        player.data.jailCard = (player.data.jailCard || 0) + 1;
        sfx.win();
        logMsg(`🏷️ ${player.name} riceve la carta «Uscita Gratis di Prigione»!`);
      }

      // 3. Vai dritto in Prigione
      if (card.jail) {
        await sendToJail(player);
      }

      // 4. Paga a ogni giocatore
      if (card.payEach) {
        const others = activePlayers().filter(p => p.id !== player.id);
        for (const other of others) {
          await chargePlayer(player, card.payEach, other, title);
        }
      }

      // 5. Incassa da ogni giocatore
      if (card.collectEach) {
        const others = activePlayers().filter(p => p.id !== player.id);
        for (const other of others) {
          await chargePlayer(other, card.collectEach, player, title);
        }
      }

      // 6. Riparazioni immobiliari su case e alberghi
      if (card.repair && Array.isArray(card.repair)) {
        const [houseFee, hotelFee] = card.repair;
        let totalFee = 0;
        for (const idx of ownedBy(boardState, player.id)) {
          const lv = boardState.houses[idx] || 0;
          if (lv === 5) totalFee += hotelFee;
          else if (lv > 0) totalFee += lv * houseFee;
        }
        if (totalFee > 0) {
          logMsg(`🛠️ ${player.name} deve ${money(totalFee)} per riparazioni immobiliari.`);
          await chargePlayer(player, totalFee, null, 'Riparazioni immobiliari');
        }
      }

      // 7. Carte Movimento (avanza a casella, indietro 3 passi, stazione o società più vicina)
      if (card.move !== undefined || card.back !== undefined || card.nearest !== undefined) {
        const mv = resolveCardMovement(player.data.pos, card);
        if (mv) {
          if (card.back) {
            logMsg(`⬅️ ${player.name} fa ${card.back} passi indietro.`);
            await animatePawnSteps3D(player, -card.back);
          } else {
            const steps = (mv.position - player.data.pos + 40) % 40;
            await animatePawnSteps3D(player, steps === 0 ? 40 : steps);
          }
          player.data.pos = mv.position;
          syncTokensInstant();
          selectInspectSpace(player.data.pos);
          applyCamera(player.data.pos);
          await resolveSpace3D(player, diceTotal, mv);
        }
      }

      syncScores();
      renderLeftPanel();
    }

    async function resolveSpace3D(player, diceTotal, specialMove = null) {
      const idx = player.data.pos;
      const space = BOARD[idx];
      const dispName = space.itName || space.name;
      selectInspectSpace(idx);

      if (space.type === 'go' || space.type === 'jail' || space.type === 'parking') return;
      if (space.type === 'gotojail' || space.type === 'goToJail') {
        await sendToJail(player);
        return;
      }
      if (space.type === 'tax') {
        if (Math.random() < 0.8) host.react('tax', player, { value: money(space.amount) });
        await chargePlayer(player, space.amount, null, dispName);
        return;
      }
      if (space.type === 'chance') {
        await drawCard3D(player, 'chance', diceTotal);
        return;
      }
      if (space.type === 'chest') {
        await drawCard3D(player, 'chest', diceTotal);
        return;
      }

      if (['property', 'railroad', 'utility'].includes(space.type)) {
        const ownerId = boardState.owners[idx];
        if (ownerId === null) {
          await buyOrAuction(player, idx);
        } else if (ownerId !== player.id && !boardState.mortgages.has(idx)) {
          const owner = P[ownerId];
          const rent = rentDue(boardState, idx, diceTotal, specialMove ? {
            railMultiplier: specialMove.rentMultiplier || 1,
            utilityMultiplier: specialMove.rentMultiplier || null
          } : 1);
          if (rent > 0) {
            // Popup visibile ed evidente per l'affitto
            const rentPopup = h('div', 'rentPopup3D');
            rentPopup.innerHTML = `
              <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.12em;color:#f87171">🏠 AFFITTO DA PAGARE</div>
              <div style="font-size:1.15rem;font-weight:900;margin:4px 0">${esc(dispName)}</div>
              <div style="font-size:0.85rem">Proprietà di <b style="color:${owner.color}">${esc(owner.name)}</b></div>
              <div style="font-size:1.4rem;font-weight:900;color:#f87171;margin-top:6px">${money(rent)}</div>
            `;
            ctx.ui.append(rentPopup);
            setTimeout(() => rentPopup.remove(), 2600);

            await chargePlayer(player, rent, owner, `Affitto su ${dispName}`);
          }
        }
      }
    }

    // Bot automatic building phase
    function runBotManagement(player) {
      for (const idx of ownedBy(boardState, player.id)) {
        const sp = BOARD[idx];
        const hCost = sp.house || sp.houseCost || 50;
        if (sp.type === 'property' && canBuild(boardState, player.id, idx) && player.data.cash >= hCost + 220) {
          build(boardState, player.id, idx);
          player.data.cash -= hCost;
          logMsg(`${player.name} costruisce su ${sp.itName || sp.name}.`);
          if (Math.random() < 0.45) host.react('build', player);
          sync3DBoardBuildings();
        }
      }
    }

    // Handle retire hook
    ctx.onPlayerRetired = async p => {
      p.data.bankrupt = true;
      p.alive = false;
      ownedBy(boardState, p.id).forEach(i => {
        boardState.houses[i] = 0;
        boardState.owners[i] = null;
        boardState.mortgages.delete(i);
      });
      sync3DBoardBuildings();
      syncTokensInstant();
      logMsg(`⚐ ${p.name} si è ritirato dal tavolo.`);
      renderLeftPanel();
    };

    function updateTurnBanner(player) {
      let b = document.getElementById('turnBanner3D');
      if (!b) {
        b = h('div', 'turnBanner3D');
        b.id = 'turnBanner3D';
        ctx.ui.append(b);
      }
      const isHuman = !player.bot;
      b.className = `turnBanner3D ${isHuman ? 'humanTurn' : 'cpuTurn'}`;
      b.style.setProperty('--turnColor', player.color);
      b.innerHTML = `
        <div class="tbBadge">${isHuman ? '🎯 È IL TUO TURNO!' : '⏳ TURNO AVVERSARIO'}</div>
        <div class="tbMain">
          <span class="tbIcon">${player.token.icon}</span>
          <span class="tbName" style="color:${player.color}">${esc(player.name)}${player.bot ? ' <small>(CPU)</small>' : ''}</span>
          <span class="tbCash">${money(player.data.cash)}</span>
        </div>
        <div class="tbSub">${isHuman ? 'Premi «TIRA I DADI 3D» qui sotto per muovere la tua pedina' : 'CPU in azione sul tavolo 3D...'}</div>
      `;
    }
    ctx.onExit(() => document.getElementById('turnBanner3D')?.remove());

    // Human management dock between rolls / before ending turn
    async function humanActionDock(player, phaseLabel, primaryLabel) {
      return new Promise(res => {
        const drawDock = () => {
          const card = h('div', 'card');
          card.style.maxWidth = '680px';
          card.style.border = `2px solid ${player.color}`;
          card.style.boxShadow = `0 8px 32px rgba(0,0,0,0.8), 0 0 24px ${player.color}44`;
          card.innerHTML = `
            <div class="meta" style="font-size:0.95rem">
              <span style="font-weight:900;color:${player.color};display:flex;align-items:center;gap:6px">
                <span style="font-size:1.3rem">${player.token.icon}</span>
                <span>TOCCA A TE, ${esc(player.name).toUpperCase()}!</span>
              </span>
              <span style="color:#4ade80;font-weight:800;font-size:1.05rem">Disponibilità: ${money(player.data.cash)}</span>
            </div>
            <p style="margin:4px 0 10px;font-size:0.82rem;color:#cbd5e1">${esc(phaseLabel)}</p>
          `;
          const row = h('div', 'row');
          row.style.gap = '10px';
          const mainBtn = h('button', 'btn pri bigTurnBtn', primaryLabel);
          mainBtn.style.cssText = `font-size:1.08rem;font-weight:900;padding:12px 28px;min-height:50px;background:linear-gradient(135deg, ${player.color}, #2563eb);border:2px solid #ffffff;box-shadow:0 0 20px ${player.color}66;`;
          mainBtn.onclick = () => { sfx.click(); res('go'); };

          const tokBtn = h('button', 'btn', '🎩 Pedina 3D');
          tokBtn.onclick = () => { sfx.click(); openTokenPickerModal(); };

          const rulesBtn = h('button', 'btn', '📖 Regole');
          rulesBtn.onclick = () => { sfx.click(); ctx.showRules?.(); };

          row.append(mainBtn, tokBtn, rulesBtn);
          card.append(row);
          ctx.dock(card);
        };
        drawDock();
      });
    }

    // ---- Main 3D Game Loop ----
    syncScores();
    renderLeftPanel();
    applyCamera(0);
    await host.react('intro', P[0]);

    while (!finished && !ctx.dead) {
      const alive = activePlayers();
      if (alive.length <= 1) {
        const winner = alive[0] || P[0];
        finished = true;
        await host.react('win', winner, { value: money(netWorth(boardState, winner.id)) });
        ctx.finish({
          win: !winner.bot,
          title: `${winner.name} trionfa a Monopoly 3D!`,
          lines: [`Patrimonio finale: ${money(netWorth(boardState, winner.id))}`],
          ranking: P.map(p => ({ player: p, score: p.data.bankrupt ? 0 : netWorth(boardState, p.id) }))
        });
        return;
      }

      const player = P[boardState.current];
      if (!player || player.data.bankrupt || !player.alive || player.retired) {
        boardState.current = (boardState.current + 1) % P.length;
        continue;
      }

      ctx.setActive(player);
      updateTurnBanner(player);
      renderLeftPanel();
      ctx.hud(`<span class="pill">${player.token.icon} Turno di <b style="color:${player.color}">${esc(player.name)}</b> · <b>${money(player.data.cash)}</b></span>`);
      selectInspectSpace(player.data.pos);
      applyCamera(player.data.pos);

      if (!player.bot) {
        sfx.fanfare?.();
        host.say(`Tocca a te, ${player.name}! Fai la tua mossa sul tabellone!`, { mood: 'happy', to: player });
        await ctx.passDevice(player);
      }

      let rollAgain = true;
      player.data.doubles = 0;

      while (rollAgain && !player.data.bankrupt && !ctx.dead) {
        rollAgain = false;

        if (!player.bot) {
          await humanActionDock(player, 'Tocca a te lanciare i dadi 3D', '🎲 Lancia i Dadi 3D');
        } else {
          await ctx.botThink(450, 900);
        }
        if (ctx.dead || player.data.bankrupt) break;

        // Prison check before roll
        if (player.data.jail > 0) {
          if (player.data.jailCard > 0) {
            player.data.jailCard--;
            player.data.jail = 0;
            logMsg(`${player.name} usa il tagliando «Uscita Gratis di Prigione»!`);
          } else if (!player.bot) {
            const jPick = await askChoice(
              player,
              '⛓️ Sei in Prigione',
              `Turno ${player.data.jail}/3: vuoi pagare 50 $ di cauzione o tentare i dadi doppi?`,
              [
                { label: '🎲 Tenta i Doppi', value: 'roll', pri: true },
                { label: '💵 Paga 50 $', value: 'pay', disabled: player.data.cash < 50 }
              ],
              () => 'roll'
            );
            if (jPick === 'pay' && player.data.cash >= 50) {
              player.data.cash -= 50;
              player.data.jail = 0;
              logMsg(`${player.name} paga 50 $ di cauzione ed esce di Prigione.`);
            }
          }
        }

        const d1 = 1 + Math.floor(Math.random() * 6);
        const d2 = 1 + Math.floor(Math.random() * 6);
        const sum = d1 + d2;
        const isDouble = d1 === d2;

        await roll3DDice(d1, d2);
        logMsg(`🎲 ${player.name} lancia ${d1} + ${d2} = ${sum}${isDouble ? ' (DOPPIO!)' : ''}.`);

        if (player.data.jail > 0) {
          if (isDouble) {
            player.data.jail = 0;
            logMsg(`${player.name} fa doppio (${d1}-${d2}) ed esce di Prigione!`);
          } else if (player.data.jail >= 3) {
            player.data.jail = 0;
            await chargePlayer(player, 50, null, 'Cauzione obbligatoria Prigione');
            if (player.data.bankrupt) break;
          } else {
            player.data.jail++;
            logMsg(`${player.name} non fa doppio e resta in Prigione.`);
            break;
          }
        } else if (isDouble) {
          player.data.doubles++;
          if (player.data.doubles >= 3) {
            logMsg(`${player.name} fa 3 doppi di fila: eccesso di velocità!`);
            await sendToJail(player);
            break;
          }
          rollAgain = true;
          if (Math.random() < 0.65) host.react('doubles', player);
        }

        await animatePawnSteps3D(player, sum);
        await resolveSpace3D(player, sum);

        if (player.data.bankrupt || player.data.jail > 0) {
          rollAgain = false;
          break;
        }

        if (player.bot) {
          runBotManagement(player);
        } else if (!rollAgain) {
          await humanActionDock(player, 'Gestisci proprietà a sinistra o passa la mano', 'Fine Turno ▸');
        }
      }

      syncScores();
      renderLeftPanel();
      boardState.current = (boardState.current + 1) % P.length;
    }
  }
};
