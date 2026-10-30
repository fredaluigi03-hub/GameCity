import { THREE, newStage, tween, raycast, ease, PAL, tune, person } from './engine.js';
import { h, sfx } from './ui.js';

/**
 * GameCity Space Cosmic Hub
 * Immersive 3D Deep Space Lobby with Zero-Gravity Avatar, Gemini AI Companion Drone,
 * and 14 Stargate Doors in an Orbital Ring.
 */
export function createSpaceLobby({
  GAMES,
  best,
  accent,
  setAccent,
  intro,
  setup,
  showRulesModal,
  speedBtn,
  muteBtn,
  ui
}) {
  const S = newStage({
    c1: '#38bdf8',
    c2: '#2563eb',
    cam: [0, 3.4, 16.5],
    look: [0, 2.3, 0],
    floor: false
  });
  S.par = 0.8;
  S.noOrbit = true;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // Deep space fog and background
  S.scene.background = new THREE.Color('#030612');
  S.scene.fog = new THREE.FogExp2(new THREE.Color('#030612'), 0.012);

  // ---------- 1. Dynamic 3D Starfield & Nebulae ----------
  const starGeo = new THREE.BufferGeometry();
  const starCount = 3600;
  const starPos = new Float32Array(starCount * 3);
  const starCols = new Float32Array(starCount * 3);
  const starPalette = [
    new THREE.Color('#ffffff'),
    new THREE.Color('#bae6fd'),
    new THREE.Color('#7dd3fc'),
    new THREE.Color('#fef08a'),
    new THREE.Color('#c084fc'),
    new THREE.Color('#67e8f9')
  ];

  for (let i = 0; i < starCount; i++) {
    const r = 35 + Math.random() * 150;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = r * Math.cos(phi);

    const c = starPalette[Math.floor(Math.random() * starPalette.length)];
    starCols[i * 3] = c.r;
    starCols[i * 3 + 1] = c.g;
    starCols[i * 3 + 2] = c.b;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starCols, 3));

  const starMat = new THREE.PointsMaterial({
    size: 0.28,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const starfield = new THREE.Points(starGeo, starMat);
  S.add(starfield);

  // Soft glowing cosmic nebula clouds
  function createNebulaTexture(colorHex) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const ctx = cv.getContext('2d');
    const rad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    rad.addColorStop(0, colorHex);
    rad.addColorStop(0.4, colorHex + '55');
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const nebulae = [
    { col: '#0284c7', pos: [-40, 25, -60], s: 50 },
    { col: '#7c3aed', pos: [55, 30, -50], s: 65 },
    { col: '#0d9488', pos: [-50, -20, 40], s: 45 },
    { col: '#be185d', pos: [45, 10, 60], s: 55 }
  ].map(n => {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(n.s, n.s),
      new THREE.MeshBasicMaterial({
        map: createNebulaTexture(n.col),
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    plane.position.set(...n.pos);
    plane.lookAt(0, 0, 0);
    S.add(plane);
    return plane;
  });

  // ---------- 2. Floating Zero-G Space Asteroids / Crystals ----------
  const asteroidGrp = new THREE.Group();
  S.add(asteroidGrp);
  const astMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.85,
    metalness: 0.3
  });
  const crystals = [];
  for (let i = 0; i < 22; i++) {
    const rad = 15 + Math.random() * 16;
    const ang = (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const y = -1.5 + Math.random() * 8.5;
    const sz = 0.25 + Math.random() * 0.75;
    const ast = new THREE.Mesh(new THREE.DodecahedronGeometry(sz, 0), astMat);
    ast.position.set(Math.sin(ang) * rad, y, Math.cos(ang) * rad);
    ast.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    ast.userData = {
      rx: (Math.random() - 0.5) * 0.4,
      ry: (Math.random() - 0.5) * 0.5,
      bobSpeed: 0.8 + Math.random() * 1.2,
      baseY: y
    };
    asteroidGrp.add(ast);
    crystals.push(ast);
  }

  // ---------- 3. Orbital Energy Runway Ring ----------
  const R = 12.0; // Radius of stargate ring
  const ringGrp = new THREE.Group();
  ringGrp.position.y = 0.05;
  S.add(ringGrp);

  const runwayRing = new THREE.Mesh(
    new THREE.RingGeometry(R - 0.6, R + 0.6, 96),
    new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
  );
  runwayRing.rotation.x = -Math.PI / 2;
  ringGrp.add(runwayRing);

  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(2.8, 3.0, 64),
    new THREE.MeshBasicMaterial({
      color: '#c9a96e',
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
  );
  innerRing.rotation.x = -Math.PI / 2;
  ringGrp.add(innerRing);

  // Center glowing energy core on the ground
  const centerPad = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 48),
    new THREE.MeshStandardMaterial({
      color: '#070b18',
      metalness: 0.85,
      roughness: 0.25
    })
  );
  centerPad.rotation.x = -Math.PI / 2;
  ringGrp.add(centerPad);

  // ---------- 4. Center Characters: Zero-G Floating Avatar & Gemini Drone ----------
  const centerGrp = new THREE.Group();
  centerGrp.position.set(0, 0, 0);
  S.add(centerGrp);

  // User avatar astronaut/player
  const avatar = person({
    suit: '#1e293b',
    shirt: '#0284c7',
    pants: '#0f172a',
    shoes: '#38bdf8',
    skin: '#e2b49a',
    tie: '#c9a96e'
  });
  avatar.position.set(0, 2.2, 0);
  centerGrp.add(avatar);

  // Backpack thruster jetpack
  const jetpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.44, 0.16),
    new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8, roughness: 0.3 })
  );
  jetpack.position.set(0, 1.45, -0.16);
  avatar.add(jetpack);

  // Twin micro thruster nozzles
  const jetNozzleL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.06, 0.1, 12),
    new THREE.MeshBasicMaterial({ color: '#38bdf8', toneMapped: false })
  );
  jetNozzleL.position.set(-0.11, 1.18, -0.16);
  const jetNozzleR = jetNozzleL.clone();
  jetNozzleR.position.x = 0.11;
  avatar.add(jetNozzleL, jetNozzleR);

  // Gemini AI Companion Drone ("Tu")
  const drone = new THREE.Group();
  drone.position.set(1.4, 2.8, 0.4);
  centerGrp.add(drone);

  // Drone spherical chassis
  const droneBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 24, 24),
    new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      metalness: 0.95,
      roughness: 0.18
    })
  );
  drone.add(droneBody);

  // Visor ocular eye ring
  const droneEyeMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    toneMapped: false
  });
  const droneEye = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.03, 12, 32),
    droneEyeMat
  );
  droneEye.position.set(0, 0, 0.28);
  drone.add(droneEye);

  // Glowing center pupil / starlight
  const dronePupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 12, 12),
    new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })
  );
  dronePupil.position.set(0, 0, 0.28);
  drone.add(dronePupil);

  // Twin gyroscopic spinning orbital rings
  const ringMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    metalness: 0.9,
    roughness: 0.2
  });
  const gyroRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.018, 8, 36), ringMat);
  const gyroRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.014, 8, 36), ringMat);
  drone.add(gyroRing1, gyroRing2);

  // Floating micro thruster flare beneath drone
  const droneThruster = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.26, 12),
    new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    })
  );
  droneThruster.position.y = -0.38;
  droneThruster.rotation.x = Math.PI;
  drone.add(droneThruster);

  // Dynamic light emanating from the drone
  const droneLight = new THREE.PointLight('#38bdf8', 15, 6);
  droneLight.position.set(0, 0, 0.4);
  drone.add(droneLight);

  // AI companion speech bubble in 3D UI
  const droneBubble = h('div', 'droneBubble3D');
  droneBubble.style.display = 'none';
  ui.append(droneBubble);

  function speakDrone(msg, duration = 3000) {
    droneBubble.textContent = msg;
    droneBubble.style.display = 'block';
    droneBubble.style.opacity = '1';
    droneEyeMat.color.set('#60a5fa');
    setTimeout(() => {
      droneBubble.style.opacity = '0';
      setTimeout(() => { droneBubble.style.display = 'none'; }, 300);
    }, duration);
  }

  // ---------- 5. The 14 Cosmic Stargate Doors ----------
  const N = GAMES.length;
  const step = (Math.PI * 2) / N;
  const doorsGroup = new THREE.Group();
  S.add(doorsGroup);

  // Helper for generating dynamic swirling cosmic vortex texture
  function makeVortexTexture(accentHex) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const ctx = cv.getContext('2d');
    const cx = 128, cy = 128;

    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 128);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.2, accentHex);
    bgGrad.addColorStop(0.7, '#070d24');
    bgGrad.addColorStop(1, 'rgba(3, 6, 18, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 2.5;
    for (let arm = 0; arm < 4; arm++) {
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 3.5; a += 0.08) {
        const rad = 6 + a * 12;
        const x = Math.cos(a + (arm * Math.PI) / 2) * rad;
        const y = Math.sin(a + (arm * Math.PI) / 2) * rad;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Helper for generating high-contrast holographic portal marquee billboard
  function makeHoloMarquee(game, index, accentHex) {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 256;
    const ctx = cv.getContext('2d');

    // Translucent dark futuristic card
    ctx.fillStyle = 'rgba(10, 16, 32, 0.94)';
    ctx.roundRect(16, 16, 480, 224, 24);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = accentHex;
    ctx.stroke();

    // Top Category / Portal tag
    ctx.font = '700 20px Outfit, sans-serif';
    ctx.fillStyle = accentHex;
    ctx.textAlign = 'center';
    ctx.fillText(`PORTALE ${String(index + 1).padStart(2, '0')} · ${game.tag.toUpperCase()}`, 256, 62);

    // Main Game Title
    ctx.font = '900 44px "Bebas Neue", Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(game.name.toUpperCase(), 256, 128);

    // Bottom info / players count
    const pl = game.players ? `${game.players.min ?? 1}–${game.players.max ?? 4} Giocatori` : 'Gioco Ufficiale';
    ctx.font = '600 20px Outfit, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`⚡ ${pl} · Clicca per entrare`, 256, 185);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Frame materials
  const pylonMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    metalness: 0.88,
    roughness: 0.22
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    metalness: 0.78,
    roughness: 0.32
  });

  const doors = GAMES.map((g, i) => {
    const { a, b } = accent(g);
    const ang = i * step;
    const grp = new THREE.Group();
    grp.position.set(Math.sin(ang) * R, 0, Math.cos(ang) * R);
    grp.rotation.y = ang + Math.PI; // Face inwards toward center
    grp.userData.id = i;
    grp.userData.game = g;
    grp.userData.accent = a;

    // Outer Stargate Arch Frame
    const leftPylon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.4, 0.45), pylonMat);
    leftPylon.position.set(-1.85, 2.2, 0);
    const rightPylon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.4, 0.45), pylonMat);
    rightPylon.position.set(1.85, 2.2, 0);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.55, 0.5), pylonMat);
    lintel.position.set(0, 4.35, 0);
    const threshold = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.16, 0.8), pylonMat);
    threshold.position.set(0, 0.08, 0);

    // Glowing Neon Portal Contour
    const neonMat = new THREE.MeshBasicMaterial({ color: a, toneMapped: false });
    const neonL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 4.0, 0.06), neonMat);
    neonL.position.set(-1.58, 2.1, 0.08);
    const neonR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 4.0, 0.06), neonMat);
    neonR.position.set(1.58, 2.1, 0.08);
    const neonT = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 0.06), neonMat);
    neonT.position.set(0, 4.06, 0.08);

    // Sliding Double Door Panels
    const doorLeafL = new THREE.Mesh(new THREE.BoxGeometry(1.58, 3.96, 0.09), leafMat);
    doorLeafL.position.set(-0.79, 2.1, 0.02);
    const doorLeafR = new THREE.Mesh(new THREE.BoxGeometry(1.58, 3.96, 0.09), leafMat);
    doorLeafR.position.set(0.79, 2.1, 0.02);

    // Central interlocking lock disc
    const lockCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.12, 24),
      new THREE.MeshStandardMaterial({
        color: '#0f172a',
        metalness: 0.9,
        roughness: 0.15,
        emissive: a,
        emissiveIntensity: 0.45
      })
    );
    lockCore.rotation.x = Math.PI / 2;
    lockCore.position.set(0, 2.1, 0.09);

    // Swirling Cosmic Vortex plane inside the doorway
    const vortexTex = makeVortexTexture(a);
    const vortexMat = new THREE.MeshBasicMaterial({
      map: vortexTex,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const vortex = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.9), vortexMat);
    vortex.position.set(0, 2.1, -0.06);

    // Holographic Marquee Billboard above the lintel
    const holoTex = makeHoloMarquee(g, i, a);
    const holoSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.7),
      new THREE.MeshBasicMaterial({
        map: holoTex,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide
      })
    );
    holoSign.position.set(0, 5.45, 0.05);

    // Ground approach light line leading to this gate
    const runwayLine = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 2.5),
      new THREE.MeshBasicMaterial({ color: a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })
    );
    runwayLine.rotation.x = -Math.PI / 2;
    runwayLine.position.set(0, 0.06, 1.6);

    grp.add(
      leftPylon, rightPylon, lintel, threshold,
      neonL, neonR, neonT,
      doorLeafL, doorLeafR, lockCore,
      vortex, holoSign, runwayLine
    );
    doorsGroup.add(grp);

    return {
      grp,
      game: g,
      index: i,
      accent: a,
      doorLeafL,
      doorLeafR,
      lockCore,
      vortex,
      holoSign,
      isOpen: false
    };
  });

  // ---------- 6. Interaction State & Cinematic Entry Sequence ----------
  let sel = 0;
  let ringAng = 0;
  let isEntering = false;

  // UI Elements
  const title = h('div', 'lobbyTitle');
  title.innerHTML = `
    <p class="kicker" style="letter-spacing:0.35em">★ COSMIC HUB DELLO SHOW ★</p>
    <h1 class="disp" style="font-size:clamp(2.4rem, 6.5vw, 4.4rem)">PORTALI DELLO SPAZIO</h1>
    <p style="letter-spacing:0.25em">SCEGLI UN PORTALE E FLUTTUA ALL'INTERNO</p>
  `;

  const prev = h('button', 'arrow l', '‹');
  prev.setAttribute('aria-label', 'Portale precedente');
  const next = h('button', 'arrow r', '›');
  next.setAttribute('aria-label', 'Portale successivo');

  const info = h('div', 'dock');
  const tools = h('div', 'tools');
  tools.append(speedBtn(), muteBtn());
  ui.append(title, prev, next, info, tools);

  function updateHUD() {
    const door = doors[sel];
    const g = door.game;
    const b = best(g.id);
    const { a, b: secCol } = accent(g);
    setAccent(a, secCol);

    info.innerHTML = '';
    const c = h('div', 'card info');
    c.style.cssText = `border:1px solid ${a}55;box-shadow:0 12px 36px rgba(0,0,0,0.8), 0 0 24px ${a}33;`;

    const pl = g.players ? ` · ${g.players.min ?? 1}–${g.players.max ?? 4} giocatori` : ' · 1 Concorrente';
    c.innerHTML = `
      <div>
        <p class="kicker" style="color:${a}">PORTALE ${String(sel + 1).padStart(2, '0')} · ${esc(g.tag)}</p>
        <h3 class="disp" style="font-size:2.2rem;margin:2px 0 6px">${esc(g.name)}</h3>
        <p style="color:#cbd5e1;font-size:0.92rem;line-height:1.45">${esc(g.desc)}${pl}${b ? ` · Record <b class="gold">${b.toLocaleString('it-IT')}</b>` : ''}</p>
      </div>
    `;

    const btnWrap = h('div', 'row');
    btnWrap.style.cssText = 'margin:0;gap:10px;flex-wrap:wrap;';

    const rulesB = h('button', 'btn rulesBtn', '📖 Regole');
    rulesB.onclick = () => { sfx.click(); showRulesModal(g); };

    const play = h('button', 'btn pri bigEnterBtn', '🚀 Entra nel Portale ▸');
    play.style.cssText = `font-weight:900;padding:12px 24px;background:linear-gradient(135deg, ${a}, #2563eb);border:2px solid #ffffff;box-shadow:0 0 20px ${a}77;`;
    play.onclick = () => triggerPortalEntry(sel);

    btnWrap.append(rulesB, play);
    c.append(btnWrap);
    info.append(c);

    // Scale current door's billboard
    doors.forEach((d, idx) => {
      const active = idx === sel;
      tween(d.holoSign.scale, [active ? 1.15 : 0.95, active ? 1.15 : 0.95, 1], 0.45, ease.overshoot);
      d.vortex.material.opacity = active ? 0.92 : 0.45;
    });

    // Make avatar face the currently selected door
    const currentDoor = doors[sel];
    const targetAngle = currentDoor.index * step + Math.PI;
    tween(avatar.rotation, { y: targetAngle }, 0.5, ease.out);

    // Drone cheer
    speakDrone(`Portale #${sel + 1}: ${g.name}!`, 2200);
    droneEyeMat.color.set(a);
    droneLight.color.set(a);
  }

  function rotateTo(index) {
    if (isEntering) return;
    sel = ((index % N) + N) % N;
    ringAng = -sel * step;
    sfx.whoosh();
    tween(doorsGroup.rotation, { y: ringAng }, 0.75, ease.inOutBack);
    tween(runwayRing.rotation, { z: -ringAng }, 0.75, ease.inOutBack);
    updateHUD();
  }

  prev.onclick = () => rotateTo(sel - 1);
  next.onclick = () => rotateTo(sel + 1);

  // Cinematic sequence: float toward door, open mechanical leaves, enter vortex
  async function triggerPortalEntry(index) {
    if (isEntering) return;
    isEntering = true;

    const doorObj = doors[index];
    const g = doorObj.game;
    const a = doorObj.accent;

    // Fade out navigation UI
    title.style.transition = 'opacity 0.4s ease';
    title.style.opacity = '0';
    info.style.transition = 'opacity 0.4s ease';
    info.style.opacity = '0';
    prev.style.display = 'none';
    next.style.display = 'none';
    tools.style.display = 'none';

    sfx.fanfare();
    speakDrone(`Rotta impostata! Ingresso a ${g.name} in corso...`, 3000);

    // Calculate door world position
    const doorAngle = index * step;
    const targetX = Math.sin(doorAngle) * (R - 2.2);
    const targetZ = Math.cos(doorAngle) * (R - 2.2);

    // 1. Avatar turns to face door
    avatar.rotation.y = doorAngle + Math.PI;

    // 2. Avatar floats weightlessly toward door
    sfx.whoosh();
    avatar.wave?.(800);

    // Thruster flare burst
    jetNozzleL.material.color.set('#ffffff');
    jetNozzleR.material.color.set('#ffffff');

    // Cinematic camera tracking shot
    const camTargetX = Math.sin(doorAngle) * (R - 6.2);
    const camTargetZ = Math.cos(doorAngle) * (R - 6.2);
    S.go([camTargetX, 3.2, camTargetZ], [targetX, 2.4, targetZ]);

    // Floating motion forward
    await Promise.all([
      tween(avatar.position, { x: targetX, y: 2.1, z: targetZ }, 1.5, ease.inout),
      tween(drone.position, { x: targetX + 0.9, y: 2.7, z: targetZ + 0.3 }, 1.5, ease.inout)
    ]);

    // 3. Stargate door unlatches and slides open!
    sfx.drum();
    sfx.click();
    tween(doorObj.lockCore.scale, { x: 1.5, y: 1.5, z: 1.5 }, 0.25, ease.overshoot).then(() => {
      tween(doorObj.lockCore.scale, { x: 0.1, y: 0.1, z: 0.1 }, 0.35);
    });

    await Promise.all([
      tween(doorObj.doorLeafL.position, { x: -2.2 }, 0.85, ease.out),
      tween(doorObj.doorLeafR.position, { x: 2.2 }, 0.85, ease.out),
      tween(doorObj.vortex.scale, { x: 1.25, y: 1.25, z: 1.25 }, 0.85, ease.overshoot)
    ]);

    doorObj.isOpen = true;
    speakDrone('Portale aperto! Buona fortuna!', 2000);

    // 4. Avatar floats inside the vortex doorway!
    const vortexX = Math.sin(doorAngle) * R;
    const vortexZ = Math.cos(doorAngle) * R;

    await Promise.all([
      tween(avatar.position, { x: vortexX, y: 2.2, z: vortexZ }, 0.9, ease.in),
      tween(drone.position, { x: vortexX + 0.4, y: 2.4, z: vortexZ }, 0.9, ease.in)
    ]);

    // 5. Blinding portal warp flash!
    S.flashWith(a);
    sfx.win();
    await new Promise(r => setTimeout(r, 450));

    // Transition to game setup / intro
    if (g.players) {
      setup(g);
    } else {
      intro(g);
    }
  }

  // Pointer, drag and wheel handlers
  let dragging = false;
  let startX = 0;
  let startAng = 0;
  let dragMoved = 0;

  const down = e => {
    if (e.target.id !== 'gl' || ui.querySelector('.ov') || isEntering) return;
    dragging = true;
    startX = e.clientX;
    startAng = doorsGroup.rotation.y;
    dragMoved = 0;
    document.body.style.cursor = 'grabbing';
  };

  const move = e => {
    if (dragging) {
      const dx = e.clientX - startX;
      dragMoved = Math.max(dragMoved, Math.abs(dx));
      doorsGroup.rotation.y = startAng + dx * 0.0035;
      runwayRing.rotation.z = -doorsGroup.rotation.y;
      return;
    }
    if (e.target.id === 'gl' && !isEntering) {
      const hit = raycast(doors.map(d => d.grp), e);
      document.body.style.cursor = hit ? 'pointer' : 'default';
    }
  };

  const up = e => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = '';
    if (dragMoved > 10) {
      const rawSteps = Math.round(-doorsGroup.rotation.y / step);
      sel = ((rawSteps % N) + N) % N;
      ringAng = -rawSteps * step;
      sfx.whoosh();
      tween(doorsGroup.rotation, { y: ringAng }, 0.5, ease.out);
      tween(runwayRing.rotation, { z: -ringAng }, 0.5, ease.out);
      updateHUD();
    } else if (e.target.id === 'gl' && !ui.querySelector('.ov') && !isEntering) {
      const hit = raycast(doors.map(d => d.grp), e);
      if (!hit) return;
      const clickedId = hit.userData.id;
      if (clickedId === sel) {
        triggerPortalEntry(sel);
      } else {
        rotateTo(clickedId);
      }
    }
  };

  let lastWheel = 0;
  const wheel = e => {
    if (ui.querySelector('.ov') || isEntering) return;
    const now = performance.now();
    if (now - lastWheel < 220) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 8) return;
    lastWheel = now;
    rotateTo(sel + (delta > 0 ? 1 : -1));
  };

  const key = e => {
    if (ui.querySelector('.ov') || isEntering) return;
    const k = e.key.toLowerCase();
    if (e.key === 'ArrowLeft' || k === 'a') rotateTo(sel - 1);
    else if (e.key === 'ArrowRight' || k === 'd') rotateTo(sel + 1);
    else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') triggerPortalEntry(sel);
  };

  addEventListener('keydown', key);
  addEventListener('pointerdown', down);
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  addEventListener('wheel', wheel, { passive: true });

  // ---------- 7. Zero-Gravity Floating Animation Loop ----------
  S.on((dt, t) => {
    // Starfield gentle rotation
    starfield.rotation.y += dt * 0.005;

    // Nebulae drift
    nebulae.forEach((n, idx) => {
      n.rotation.z += dt * (0.01 + idx * 0.005);
    });

    // Asteroids zero-g tumble
    crystals.forEach(ast => {
      ast.rotation.x += dt * ast.userData.rx;
      ast.rotation.y += dt * ast.userData.ry;
      ast.position.y = ast.userData.baseY + Math.sin(t * ast.userData.bobSpeed) * 0.15;
    });

    // Swirling cosmic portals
    doors.forEach(d => {
      d.vortex.rotation.z += dt * 0.85;
    });

    // Avatar weightless zero-g floating physics
    if (!isEntering) {
      avatar.position.y = 2.15 + Math.sin(t * 1.35) * 0.16;
      avatar.rotation.z = Math.sin(t * 0.85) * 0.04;
      avatar.rotation.x = Math.sin(t * 1.1) * 0.03;

      // Thruster micro-pulsing
      const pulse = 0.5 + Math.sin(t * 12) * 0.4;
      jetNozzleL.scale.set(1, 1 + pulse * 0.5, 1);
      jetNozzleR.scale.set(1, 1 + pulse * 0.5, 1);

      // Gemini AI companion drone orbit & bob
      drone.position.x = avatar.position.x + 1.3 + Math.sin(t * 1.6) * 0.18;
      drone.position.y = avatar.position.y + 0.65 + Math.cos(t * 2.1) * 0.14;
      drone.position.z = avatar.position.z + 0.35 + Math.sin(t * 1.1) * 0.12;

      gyroRing1.rotation.x += dt * 1.8;
      gyroRing1.rotation.y += dt * 1.2;
      gyroRing2.rotation.y += dt * 1.5;
      gyroRing2.rotation.z += dt * 2.1;
      droneThruster.scale.y = 1 + Math.sin(t * 16) * 0.35;
    }
  });

  // Teardown
  const teardown = () => {
    removeEventListener('keydown', key);
    removeEventListener('pointerdown', down);
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    removeEventListener('wheel', wheel);
    droneBubble.remove();
    document.body.style.cursor = '';
  };

  updateHUD();
  speakDrone('Benvenuto nello Spazio! Seleziona un gioco per entrare.', 3500);

  return { teardown, rotateTo, triggerPortalEntry };
}
