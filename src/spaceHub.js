import { THREE, newStage, tween, raycast, ease, PAL, tune, person } from './engine.js';
import { h, sfx } from './ui.js';

/**
 * GameCity — Open Space 3D Hub
 * - Il giocatore ("Io") si trova al centro dello spazio aperto (0, 0, 0).
 * - Attorno al giocatore, disposte in cerchio a 360°, ci sono 14 porte 3D uniche,
 *   ciascuna scolpita con un design e simboli 3D dedicati al proprio gioco.
 * - Ambientazione nello spazio profondo aperto (senza muri studio) con migliaia di stelle,
 *   nebulose e 8 grandi pianeti 3D, lune, anelli e galassie in lontananza.
 * - Il giocatore può muoversi liberamente (WASD / Frecce / Mouse / Click) e, scelta una porta,
 *   si avvicina ad essa, apre fisicamente i battenti della porta ed entra nel gioco!
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
  const R = 15.0; // Raggio del cerchio delle 14 porte attorno al centro

  const S = newStage({
    c1: '#38bdf8',
    c2: '#2563eb',
    bg: '#02040a',
    cam: [0, 3.6, -5.8],
    look: [0, 2.2, R],
    floor: false,
    studio: false
  });
  S.par = 0.25;
  S.noOrbit = true;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // Spazio profondo aperto senza nebbia densa così i pianeti lontani brillano nitidi
  S.scene.background = new THREE.Color('#02040a');
  S.scene.fog = new THREE.FogExp2(new THREE.Color('#02040a'), 0.0025);

  // Illuminazione cosmica a 360° per illuminare tutte le porte del cerchio e i pianeti
  const cosmicSunLight = new THREE.DirectionalLight('#fff4dc', 2.2);
  cosmicSunLight.position.set(-30, 45, -60);
  S.add(cosmicSunLight);

  const cosmicFillLight = new THREE.DirectionalLight('#bae6fd', 1.4);
  cosmicFillLight.position.set(35, 25, 55);
  S.add(cosmicFillLight);

  const centerOmniLight = new THREE.PointLight('#38bdf8', 35, 32, 1.2);
  centerOmniLight.position.set(0, 6, 0);
  S.add(centerOmniLight);

  // ============================================================================
  // 1. CIELO STELLATO A 360° (SOPRA, ATTORNO E SOTTO) & NEBULOSE COSMICHE
  // ============================================================================
  const starGeo = new THREE.BufferGeometry();
  const starCount = 5200;
  const starPos = new Float32Array(starCount * 3);
  const starCols = new Float32Array(starCount * 3);
  const starPalette = [
    new THREE.Color('#ffffff'),
    new THREE.Color('#e0f2fe'),
    new THREE.Color('#7dd3fc'),
    new THREE.Color('#fef08a'),
    new THREE.Color('#fbcfe8'),
    new THREE.Color('#c4b5fd'),
    new THREE.Color('#fdba74')
  ];

  for (let i = 0; i < starCount; i++) {
    const r = 45 + Math.random() * 180;
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
    size: 0.35,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const starfield = new THREE.Points(starGeo, starMat);
  S.add(starfield);

  function createNebulaTexture(colorHex, secondaryHex) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const ctx = cv.getContext('2d');
    const rad = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
    rad.addColorStop(0, colorHex);
    rad.addColorStop(0.45, secondaryHex + '66');
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const nebulae = [
    { c1: '#0284c7', c2: '#1e3a8a', pos: [-65, 28, -75], s: 90 },
    { c1: '#7c3aed', c2: '#4c1d95', pos: [70, 32, -60], s: 95 },
    { c1: '#0d9488', c2: '#134e4a', pos: [-70, -18, 55], s: 80 },
    { c1: '#db2777', c2: '#831843', pos: [65, 16, 72], s: 85 },
    { c1: '#ea580c', c2: '#7c2d12', pos: [0, 48, -85], s: 75 },
    { c1: '#2563eb', c2: '#1e1b4b', pos: [0, -45, 0], s: 110 }
  ].map(n => {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(n.s, n.s),
      new THREE.MeshBasicMaterial({
        map: createNebulaTexture(n.c1, n.c2),
        transparent: true,
        opacity: 0.26,
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

  // ============================================================================
  // 2. PIANETI 3D, LUNE, ANELLI E GALASSIE IN LONTANANZA
  // ============================================================================
  const planetsGroup = new THREE.Group();
  S.add(planetsGroup);

  // Helper: Texture procedurale per pianeti
  function makePlanetTexture(type) {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 256;
    const ctx = cv.getContext('2d');

    if (type === 'saturn') {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, '#78350f');
      g.addColorStop(0.18, '#d97706');
      g.addColorStop(0.35, '#fde68a');
      g.addColorStop(0.5, '#b45309');
      g.addColorStop(0.68, '#f59e0b');
      g.addColorStop(0.85, '#92400e');
      g.addColorStop(1, '#451a03');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 256);
      for (let y = 0; y < 256; y += 6) {
        ctx.fillStyle = `rgba(255,255,255,${(Math.sin(y * 0.25) + 1) * 0.06})`;
        ctx.fillRect(0, y, 512, 3);
      }
    } else if (type === 'earth') {
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(0, 0, 512, 256);
      // Continenti verdi e dorati
      ctx.fillStyle = '#15803d';
      const blobs = [
        [90, 80, 65, 45], [130, 140, 45, 55], [260, 70, 85, 50],
        [290, 135, 55, 60], [410, 95, 60, 45], [60, 190, 50, 30]
      ];
      blobs.forEach(([x, y, rx, ry]) => {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2);
        ctx.fill();
      });
      // Calotte polari
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 512, 18);
      ctx.fillRect(0, 238, 512, 18);
      // Nuvole leggere
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.ellipse((i * 73) % 512, 30 + ((i * 47) % 196), 45, 10, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'lava') {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 4;
      for (let i = 0; i < 16; i++) {
        ctx.beginPath();
        ctx.moveTo((i * 37) % 512, 0);
        ctx.bezierCurveTo((i * 53) % 512, 85, (i * 91) % 512, 170, (i * 29) % 512, 256);
        ctx.stroke();
      }
      ctx.fillStyle = '#ef4444';
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc((i * 67) % 512, (i * 43) % 256, 8 + (i % 10), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'ice') {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, '#083344');
      g.addColorStop(0.3, '#06b6d4');
      g.addColorStop(0.5, '#67e8f9');
      g.addColorStop(0.7, '#0284c7');
      g.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 256);
    } else if (type === 'purple') {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, '#3b0764');
      g.addColorStop(0.35, '#9333ea');
      g.addColorStop(0.55, '#f0abfc');
      g.addColorStop(0.8, '#7e22ce');
      g.addColorStop(1, '#2e1065');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 256);
    } else {
      // Luna / roccia craterizzata
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#64748b';
      for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        ctx.arc((i * 83) % 512, (i * 59) % 256, 6 + (i % 14), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeRingTexture(c1, c2) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 512;
    const ctx = cv.getContext('2d');
    const rg = ctx.createRadialGradient(256, 256, 95, 256, 256, 250);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(0.15, c1 + 'cc');
    rg.addColorStop(0.35, c2 + '99');
    rg.addColorStop(0.45, 'rgba(0,0,0,0.08)');
    rg.addColorStop(0.55, c1 + 'ee');
    rg.addColorStop(0.8, c2 + '88');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // 2A. Gigante Gassoso ad Anelli (Saturno Aureo)
  const saturnGrp = new THREE.Group();
  saturnGrp.position.set(-48, 16, 56);
  const saturnSphere = new THREE.Mesh(
    new THREE.SphereGeometry(8.5, 40, 32),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture('saturn'), roughness: 0.65, metalness: 0.1 })
  );
  const saturnRings = new THREE.Mesh(
    new THREE.PlaneGeometry(38, 38),
    new THREE.MeshBasicMaterial({
      map: makeRingTexture('#fbbf24', '#d97706'),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  saturnRings.rotation.x = Math.PI * 0.42;
  saturnRings.rotation.y = 0.25;
  saturnGrp.add(saturnSphere, saturnRings);
  planetsGroup.add(saturnGrp);

  // 2B. Pianeta Terra Nova con Luna in orbita
  const earthGrp = new THREE.Group();
  earthGrp.position.set(52, 14, 48);
  const earthSphere = new THREE.Mesh(
    new THREE.SphereGeometry(6.8, 40, 32),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture('earth'), roughness: 0.55, metalness: 0.15 })
  );
  const earthAtmo = new THREE.Mesh(
    new THREE.SphereGeometry(7.25, 32, 24),
    new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, side: THREE.BackSide })
  );
  const moonPivot = new THREE.Group();
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 24, 20),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture('moon'), roughness: 0.85 })
  );
  moonMesh.position.set(12.5, 2.2, 0);
  moonPivot.add(moonMesh);
  earthGrp.add(earthSphere, earthAtmo, moonPivot);
  planetsGroup.add(earthGrp);

  // 2C. Pianeta Vulcanico di Lava (Pyros)
  const lavaGrp = new THREE.Group();
  lavaGrp.position.set(58, -9, -38);
  const lavaSphere = new THREE.Mesh(
    new THREE.SphereGeometry(5.8, 36, 28),
    new THREE.MeshStandardMaterial({
      map: makePlanetTexture('lava'),
      emissive: new THREE.Color('#ea580c'),
      emissiveIntensity: 0.45,
      roughness: 0.7
    })
  );
  const lavaGlow = new THREE.Mesh(
    new THREE.SphereGeometry(6.4, 28, 20),
    new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending })
  );
  lavaGrp.add(lavaSphere, lavaGlow);
  planetsGroup.add(lavaGrp);

  // 2D. Gigante di Ghiaccio Azzurro (Neptunia)
  const iceGrp = new THREE.Group();
  iceGrp.position.set(-56, 20, -44);
  const iceSphere = new THREE.Mesh(
    new THREE.SphereGeometry(7.2, 36, 28),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture('ice'), roughness: 0.45, metalness: 0.2 })
  );
  const iceRings = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 28),
    new THREE.MeshBasicMaterial({
      map: makeRingTexture('#67e8f9', '#0284c7'),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  iceRings.rotation.x = Math.PI * 0.22;
  iceRings.rotation.z = 0.6;
  iceGrp.add(iceSphere, iceRings);
  planetsGroup.add(iceGrp);

  // 2E. Pianeta Esotico Aether (Viola/Magenta con anello)
  const purpleGrp = new THREE.Group();
  purpleGrp.position.set(4, 27, -68);
  const purpleSphere = new THREE.Mesh(
    new THREE.SphereGeometry(6.2, 36, 28),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture('purple'), roughness: 0.5 })
  );
  const purpleHalo = new THREE.Mesh(
    new THREE.SphereGeometry(6.9, 28, 20),
    new THREE.MeshBasicMaterial({ color: '#c084fc', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending })
  );
  purpleGrp.add(purpleSphere, purpleHalo);
  planetsGroup.add(purpleGrp);

  // 2F. Stella Cosmica / Sole Dorato Lontano
  const sunGrp = new THREE.Group();
  sunGrp.position.set(-18, 36, 78);
  const sunCore = new THREE.Mesh(
    new THREE.SphereGeometry(4.5, 32, 24),
    new THREE.MeshBasicMaterial({ color: '#fef08a', toneMapped: false })
  );
  const sunCorona = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 34),
    new THREE.MeshBasicMaterial({
      map: createNebulaTexture('#fef08a', '#f59e0b'),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  sunCorona.lookAt(0, 0, 0);
  sunGrp.add(sunCore, sunCorona);
  planetsGroup.add(sunGrp);

  // Asteroidi fluttuanti nello spazio esterno
  const asteroidGrp = new THREE.Group();
  S.add(asteroidGrp);
  const astMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.82, metalness: 0.25 });
  const crystals = [];
  for (let i = 0; i < 28; i++) {
    const rad = 22 + Math.random() * 25;
    const ang = (i / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const y = -8 + Math.random() * 20;
    const sz = 0.35 + Math.random() * 0.95;
    const ast = new THREE.Mesh(new THREE.DodecahedronGeometry(sz, 0), astMat);
    ast.position.set(Math.sin(ang) * rad, y, Math.cos(ang) * rad);
    ast.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    ast.userData = {
      rx: (Math.random() - 0.5) * 0.45,
      ry: (Math.random() - 0.5) * 0.55,
      bobSpeed: 0.7 + Math.random() * 1.1,
      baseY: y
    };
    asteroidGrp.add(ast);
    crystals.push(ast);
  }

  // ============================================================================
  // 3. PIATTAFORMA ENERGETICA TRASLUCIDA CENTRALE & PONTI STELLARI
  // ============================================================================
  const hubFloorGrp = new THREE.Group();
  S.add(hubFloorGrp);

  // Anello esterno dove poggiano le 14 porte
  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(R - 1.1, R + 1.1, 112),
    new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.02;
  hubFloorGrp.add(outerRing);

  // Pedana centrale di partenza ("Io sto al centro")
  const centerPadGlow = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 2.55, 64),
    new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  centerPadGlow.rotation.x = -Math.PI / 2;
  centerPadGlow.position.y = 0.03;
  hubFloorGrp.add(centerPadGlow);

  const centerGlassDisc = new THREE.Mesh(
    new THREE.CircleGeometry(R - 0.5, 96),
    new THREE.MeshBasicMaterial({
      color: '#0c1938',
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  centerGlassDisc.rotation.x = -Math.PI / 2;
  centerGlassDisc.position.y = 0.0;
  hubFloorGrp.add(centerGlassDisc);

  // ============================================================================
  // 4. PERSONAGGIO AL CENTRO ("IO") + DRONE COMPAGNO
  // ============================================================================
  const avatar = person({
    suit: '#1e293b',
    shirt: '#38bdf8',
    pants: '#0f172a',
    shoes: '#e2e8f0',
    skin: '#e9c3a0',
    tie: '#f59e0b'
  });
  avatar.position.set(0, 0.15, 0);
  S.add(avatar);

  // Casco spaziale trasparente da astronauta
  const helmetGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.185, 24, 20),
    new THREE.MeshPhysicalMaterial({
      color: '#bae6fd',
      transparent: true,
      opacity: 0.24,
      roughness: 0.08,
      metalness: 0.1,
      clearcoat: 1
    })
  );
  helmetGlass.position.set(0, 0.13, 0.01);
  avatar.head.add(helmetGlass);

  const helmetCollar = new THREE.Mesh(
    new THREE.TorusGeometry(0.135, 0.018, 10, 24),
    new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.2 })
  );
  helmetCollar.rotation.x = Math.PI / 2;
  helmetCollar.position.set(0, 0.01, 0);
  avatar.head.add(helmetCollar);

  // Jetpack spaziale sulla schiena con ugelli luminosi
  const jetpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.42, 0.16),
    new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.22 })
  );
  jetpack.position.set(0, 1.38, -0.17);
  avatar.add(jetpack);

  const jetFlameMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const jetNozzleL = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 12), jetFlameMat);
  jetNozzleL.rotation.x = Math.PI;
  jetNozzleL.position.set(-0.1, 1.08, -0.17);
  const jetNozzleR = jetNozzleL.clone();
  jetNozzleR.position.x = 0.1;
  avatar.add(jetNozzleL, jetNozzleR);

  // Luce personale sul personaggio
  const avatarLight = new THREE.PointLight('#ffffff', 12, 7);
  avatarLight.position.set(0, 2.4, 0.6);
  avatar.add(avatarLight);

  // Drone IA Compagno
  const drone = new THREE.Group();
  drone.position.set(1.1, 2.2, 0.3);
  S.add(drone);

  const droneBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 24, 24),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.92, roughness: 0.18 })
  );
  const droneEyeMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', toneMapped: false });
  const droneEye = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 12, 28), droneEyeMat);
  droneEye.position.set(0, 0, 0.23);
  const gyroRing1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.015, 8, 32),
    new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.2 })
  );
  drone.add(droneBody, droneEye, gyroRing1);

  const droneBubble = h('div', 'droneBubble3D');
  droneBubble.style.display = 'none';
  ui.append(droneBubble);

  function speakDrone(msg, duration = 2600) {
    droneBubble.textContent = msg;
    droneBubble.style.display = 'block';
    droneBubble.style.opacity = '1';
    setTimeout(() => {
      droneBubble.style.opacity = '0';
      setTimeout(() => { droneBubble.style.display = 'none'; }, 280);
    }, duration);
  }

  // ============================================================================
  // 5. LE 14 PORTE 3D UNICHE IN CERCHIO ATTORNO AL GIOCATORE
  //    Ogni porta ha un'architettura, colori, battenti apribili e sculture 3D
  //    che rappresentano specificamente il suo gioco!
  // ============================================================================
  const N = GAMES.length;
  const step = (Math.PI * 2) / N;
  const doorsGroup = new THREE.Group();
  S.add(doorsGroup);

  // Texture del vortice dimensionale interno (visibile quando la porta si apre)
  function makeVortexTexture(accentHex) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const ctx = cv.getContext('2d');
    const cx = 128, cy = 128;

    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 128);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.28, accentHex);
    bgGrad.addColorStop(0.75, '#090d1e');
    bgGrad.addColorStop(1, 'rgba(2, 4, 10, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    for (let arm = 0; arm < 4; arm++) {
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 3.2; a += 0.1) {
        const rad = 5 + a * 12;
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

  // Texture personalizzata per i battenti di ciascuna porta
  function makeDoorPanelTexture(game, accentHex, secHex, isLeft) {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 512;
    const ctx = cv.getContext('2d');

    // Sfondo base specifico per stile di gioco
    const grad = ctx.createLinearGradient(0, 0, 256, 512);
    if (game.id === 'tombola') {
      grad.addColorStop(0, '#5c2d16');
      grad.addColorStop(1, '#2e1508');
    } else if (game.id === 'ouija') {
      grad.addColorStop(0, '#27173a');
      grad.addColorStop(1, '#0f0718');
    } else if (game.id === 'monopoly') {
      grad.addColorStop(0, '#0f3d26');
      grad.addColorStop(1, '#062013');
    } else if (game.id === 'affari') {
      grad.addColorStop(0, '#991b1b');
      grad.addColorStop(1, '#450a0a');
    } else if (game.id === 'forza4') {
      grad.addColorStop(0, '#1d4ed8');
      grad.addColorStop(1, '#1e3a8a');
    } else {
      grad.addColorStop(0, '#162038');
      grad.addColorStop(1, '#0a0f1d');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);

    // Cornice battente
    ctx.lineWidth = 8;
    ctx.strokeStyle = accentHex;
    ctx.strokeRect(10, 10, 236, 492);

    // Formelle decorative superiori e inferiori
    ctx.lineWidth = 4;
    ctx.strokeStyle = secHex || '#fbbf24';
    ctx.strokeRect(28, 32, 200, 195);
    ctx.strokeRect(28, 260, 200, 210);

    // Simbolo / motivo grafico specifico sulla porta
    ctx.fillStyle = accentHex;
    ctx.font = 'bold 68px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const ICONS = {
      eredita: '🏛️',
      avanti: '🎪',
      caduta: '⚠️',
      affari: '📦',
      catena: '⛓️',
      fight: '⚡',
      hit: '💿',
      math: '∑',
      cultura: '💎',
      monopoly: '🎩',
      tombola: '90',
      bingo: '75',
      ouija: '👁️',
      forza4: '🔴'
    };
    ctx.fillText(ICONS[game.id] || '★', 128, 130);

    // Decorazione specifica extra nel pannello basso
    if (game.id === 'affari') {
      // Nastro pacco dorato
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(114, 0, 28, 512);
      ctx.fillRect(0, 234, 256, 24);
    } else if (game.id === 'forza4') {
      // Oblò gialli e rossi stile Forza 4
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          ctx.beginPath();
          ctx.arc(82 + c * 92, 305 + r * 55, 20, 0, Math.PI * 2);
          ctx.fillStyle = (r + c + (isLeft ? 0 : 1)) % 2 === 0 ? '#ef4444' : '#facc15';
          ctx.fill();
        }
      }
    } else if (game.id === 'tombola') {
      // Griglia cartella napoletana stilizzata
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(44, 290, 168, 140);
      ctx.font = 'bold 34px "Bebas Neue", sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(isLeft ? '77 · 48' : '25 · 90', 128, 360);
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Cartello Olografico 3D sopra ogni porta
  function makeHoloMarquee(game, index, accentHex) {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 220;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = 'rgba(7, 11, 24, 0.94)';
    ctx.roundRect(12, 12, 488, 196, 22);
    ctx.fill();

    ctx.lineWidth = 5;
    ctx.strokeStyle = accentHex;
    ctx.stroke();

    ctx.font = '700 19px Outfit, sans-serif';
    ctx.fillStyle = accentHex;
    ctx.textAlign = 'center';
    ctx.fillText(`PORTA ${String(index + 1).padStart(2, '0')} · ${game.tag.toUpperCase()}`, 256, 54);

    ctx.font = '900 46px "Bebas Neue", Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(game.name.toUpperCase(), 256, 118);

    const pl = game.players ? `${game.players.min ?? 1}–${game.players.max ?? 4} Giocatori` : 'Gioco Ufficiale';
    ctx.font = '600 20px Outfit, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`✨ ${pl} · Clicca o avvicinati per aprire`, 256, 172);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Costruttore degli ornamenti 3D unici per ciascuna delle 14 porte
  function addUniqueDoorTheme3D(grp, game, a, b) {
    const id = game.id;
    const accentMat = new THREE.MeshStandardMaterial({ color: a, metalness: 0.65, roughness: 0.25 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.85, roughness: 0.2 });
    const glowAccent = new THREE.MeshBasicMaterial({ color: a, toneMapped: false });

    if (id === 'eredita') {
      // L'Eredità: Colonne dorate classiche + Lama della Ghigliottina sospesa in alto!
      const colGeo = new THREE.CylinderGeometry(0.28, 0.32, 4.4, 16);
      const colL = new THREE.Mesh(colGeo, goldMat); colL.position.set(-1.85, 2.2, 0.15);
      const colR = new THREE.Mesh(colGeo, goldMat); colR.position.set(1.85, 2.2, 0.15);
      // Lama obliqua della Ghigliottina
      const bladeShape = new THREE.BoxGeometry(2.6, 0.45, 0.08);
      const blade = new THREE.Mesh(bladeShape, new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.95, roughness: 0.1 }));
      blade.position.set(0, 3.85, 0.22);
      blade.rotation.z = -0.14;
      grp.add(colL, colR, blade);
    } else if (id === 'avanti') {
      // Avanti un Altro: Arco luminoso da varietà con lampadine 3D + cilindro dorato Pidigozzo!
      for (let k = 0; k <= 10; k++) {
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 12, 12),
          new THREE.MeshBasicMaterial({ color: k % 2 === 0 ? '#fde047' : '#ec4899', toneMapped: false })
        );
        const bx = -1.8 + (k / 10) * 3.6;
        bulb.position.set(bx, 4.35, 0.28);
        grp.add(bulb);
      }
      const pidigozzo = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 20), goldMat);
      pidigozzo.rotation.z = Math.PI / 2;
      pidigozzo.position.set(0, 4.75, 0.25);
      grp.add(pidigozzo);
    } else if (id === 'caduta') {
      // Caduta Libera: Pistoni idraulici giallo/nero + Botola ammonitrice sopra
      const hazardMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.5, roughness: 0.3 });
      const pistL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.2, 12), hazardMat);
      pistL.position.set(-1.95, 2.1, 0.2);
      const pistR = pistL.clone(); pistR.position.x = 1.95;
      const ringTop = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 12, 24), glowAccent);
      ringTop.position.set(0, 4.65, 0.22);
      grp.add(pistL, pistR, ringTop);
    } else if (id === 'affari') {
      // Affari Tuoi: Pile di Pacchi Postali 3D rossi e blu + Telefono Rosso del Dottore!
      const redBoxMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.35 });
      const blueBoxMat = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.35 });
      for (let k = 0; k < 4; k++) {
        const boxL = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.52, 0.58), k % 2 === 0 ? redBoxMat : blueBoxMat);
        boxL.position.set(-1.95, 0.4 + k * 0.62, 0.22);
        boxL.rotation.y = (k % 2 ? 0.15 : -0.12);
        const boxR = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.52, 0.58), k % 2 === 1 ? redBoxMat : blueBoxMat);
        boxR.position.set(1.95, 0.4 + k * 0.62, 0.22);
        boxR.rotation.y = (k % 2 ? -0.15 : 0.12);
        grp.add(boxL, boxR);
      }
      // Telefono rosso in cima
      const phone = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.4), redBoxMat);
      phone.position.set(0, 4.7, 0.22);
      grp.add(phone);
    } else if (id === 'catena') {
      // Reazione a Catena: Grandi anelli di catena 3D intrecciati ai lati
      for (let k = 0; k < 5; k++) {
        const linkL = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.075, 12, 24), k % 2 ? goldMat : accentMat);
        linkL.position.set(-1.9, 0.65 + k * 0.82, 0.22);
        linkL.rotation.y = (k % 2) * (Math.PI / 2);
        const linkR = linkL.clone();
        linkR.position.x = 1.9;
        grp.add(linkL, linkR);
      }
    } else if (id === 'fight') {
      // The Floor: Piastrelle LED 3D multicolori luminose lungo gli stipiti
      const tileCols = ['#ec4899', '#38bdf8', '#a855f7', '#fbbf24', '#10b981'];
      for (let k = 0; k < 6; k++) {
        const tm = new THREE.MeshBasicMaterial({ color: tileCols[k % tileCols.length], toneMapped: false });
        const tL = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.55, 0.12), tm);
        tL.position.set(-1.85, 0.55 + k * 0.66, 0.25);
        const tR = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.55, 0.12), tm);
        tR.position.set(1.85, 0.55 + k * 0.66, 0.25);
        grp.add(tL, tR);
      }
    } else if (id === 'hit') {
      // Indovina l'Anno: Dischi in Vinile 3D sui pilastri + Clessidra d'oro
      const vinylMat = new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.2, metalness: 0.8 });
      [-1.9, 1.9].forEach(xPos => {
        const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 28), vinylMat);
        vinyl.rotation.x = Math.PI / 2;
        vinyl.position.set(xPos, 2.3, 0.26);
        const lbl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 20), glowAccent);
        lbl.rotation.x = Math.PI / 2;
        lbl.position.set(xPos, 2.3, 0.26);
        grp.add(vinyl, lbl);
      });
    } else if (id === 'math') {
      // Sfida Matematica: Poliedri Icosaedrici 3D e simboli + / ×
      [-1.9, 1.9].forEach(xPos => {
        const poly = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.42, 0),
          new THREE.MeshStandardMaterial({ color: '#10b981', wireframe: true, emissive: '#10b981', emissiveIntensity: 0.6 })
        );
        poly.position.set(xPos, 2.4, 0.35);
        grp.add(poly);
      });
    } else if (id === 'cultura') {
      // Cultura Generale: Diamante 3D gigante in cima e obelischi viola/oro
      const diamond = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.48, 0),
        new THREE.MeshStandardMaterial({ color: '#38bdf8', metalness: 0.9, roughness: 0.1, emissive: '#6366f1', emissiveIntensity: 0.4 })
      );
      diamond.position.set(0, 4.8, 0.3);
      grp.add(diamond);
    } else if (id === 'monopoly') {
      // Monopoly 3D: Cilindro nero (Top Hat) in cima + Casette verdi & Albergo rosso + Dadi 3D!
      const blackHatMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.25, metalness: 0.4 });
      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.07, 24), blackHatMat);
      hatBrim.position.set(0, 4.55, 0.25);
      const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 0.52, 24), blackHatMat);
      hatTop.position.set(0, 4.82, 0.25);
      const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.365, 0.1, 24), new THREE.MeshBasicMaterial({ color: '#ef4444' }));
      hatBand.position.set(0, 4.63, 0.25);
      // Casette verdi a sinistra e Dado a destra
      const house = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.42), new THREE.MeshStandardMaterial({ color: '#10b981' }));
      house.position.set(-1.95, 1.4, 0.28);
      const hotel = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.48), new THREE.MeshStandardMaterial({ color: '#ef4444' }));
      hotel.position.set(-1.95, 2.3, 0.28);
      const die = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), new THREE.MeshStandardMaterial({ color: '#ffffff' }));
      die.position.set(1.95, 1.85, 0.28);
      die.rotation.set(0.4, 0.5, 0.2);
      grp.add(hatBrim, hatTop, hatBand, house, hotel, die);
    } else if (id === 'tombola') {
      // Tombola Napoletana: O' Panariello in vimini 3D sopra l'architrave + Bussolotti in legno!
      const wickerMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.8 });
      const panariello = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.34, 0.62, 20), wickerMat);
      panariello.position.set(0, 4.72, 0.28);
      const tokenMat = new THREE.MeshStandardMaterial({ color: '#fde68a', roughness: 0.4 });
      [-1.95, 1.95].forEach(xPos => {
        const tok = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.16, 20), tokenMat);
        tok.rotation.x = Math.PI / 2;
        tok.position.set(xPos, 2.2, 0.26);
        grp.add(tok);
      });
      grp.add(panariello);
    } else if (id === 'bingo') {
      // Bingo: Sfere colorate da estrazione 3D attorno al portale
      const ballCols = ['#ef4444', '#3b82f6', '#eab308', '#10b981', '#a855f7', '#f97316'];
      for (let k = 0; k < 6; k++) {
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 20, 20),
          new THREE.MeshStandardMaterial({ color: ballCols[k], roughness: 0.18, metalness: 0.2 })
        );
        const side = k < 3 ? -1.95 : 1.95;
        const row = k % 3;
        ball.position.set(side, 1.1 + row * 1.05, 0.28);
        grp.add(ball);
      }
    } else if (id === 'ouija') {
      // Tavola Ouija: Candele 3D accese sui lati + Planchette mistica in cima
      const waxMat = new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.6 });
      const flameMat = new THREE.MeshBasicMaterial({ color: '#fb923c', toneMapped: false });
      [-1.95, 1.95].forEach(xPos => {
        const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.65, 14), waxMat);
        candle.position.set(xPos, 1.5, 0.32);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 10), flameMat);
        flame.position.set(xPos, 1.92, 0.32);
        grp.add(candle, flame);
      });
      const planchette = new THREE.Mesh(
        new THREE.ConeGeometry(0.48, 0.75, 3),
        new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.4 })
      );
      planchette.rotation.x = Math.PI / 2;
      planchette.position.set(0, 4.72, 0.25);
      grp.add(planchette);
    } else if (id === 'forza4') {
      // Forza 4: Colonne blu forate con gettoni 3D Rossi e Gialli incastonati
      const redDisc = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.25 });
      const yelDisc = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.25 });
      for (let k = 0; k < 4; k++) {
        const dL = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 20), k % 2 === 0 ? redDisc : yelDisc);
        dL.rotation.x = Math.PI / 2;
        dL.position.set(-1.85, 0.9 + k * 0.85, 0.26);
        const dR = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 20), k % 2 === 1 ? redDisc : yelDisc);
        dR.rotation.x = Math.PI / 2;
        dR.position.set(1.85, 0.9 + k * 0.85, 0.26);
        grp.add(dL, dR);
      }
    }
  }

  const doors = GAMES.map((g, i) => {
    const { a, b } = accent(g);
    const ang = i * step;
    const grp = new THREE.Group();
    grp.position.set(Math.sin(ang) * R, 0, Math.cos(ang) * R);
    grp.rotation.y = ang + Math.PI; // Rivolta verso il giocatore al centro (0,0,0)
    grp.userData.id = i;
    grp.userData.game = g;
    grp.userData.accent = a;

    // Stipiti e Architrave con colore personalizzato per il gioco
    const frameMat = new THREE.MeshStandardMaterial({
      color: g.id === 'tombola' ? '#451a03' : g.id === 'forza4' ? '#1d4ed8' : g.id === 'affari' ? '#7f1d1d' : '#0f172a',
      metalness: 0.75,
      roughness: 0.28
    });

    const leftPylon = new THREE.Mesh(new THREE.BoxGeometry(0.48, 4.4, 0.45), frameMat);
    leftPylon.position.set(-1.82, 2.2, 0);
    const rightPylon = new THREE.Mesh(new THREE.BoxGeometry(0.48, 4.4, 0.45), frameMat);
    rightPylon.position.set(1.82, 2.2, 0);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.55, 0.52), frameMat);
    lintel.position.set(0, 4.35, 0);
    const threshold = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 0.95), frameMat);
    threshold.position.set(0, 0.09, 0);

    // Profili Neon Luminosi del colore del gioco
    const neonMat = new THREE.MeshBasicMaterial({ color: a, toneMapped: false });
    const neonL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 4.05, 0.07), neonMat);
    neonL.position.set(-1.56, 2.1, 0.18);
    const neonR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 4.05, 0.07), neonMat);
    neonR.position.set(1.56, 2.1, 0.18);
    const neonT = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.07, 0.07), neonMat);
    neonT.position.set(0, 4.08, 0.18);

    // CARDINI E BATTENTI DELLA PORTA CHE SI APRONO RUOTANDO (Hinged Doors!)
    const hingeL = new THREE.Group();
    hingeL.position.set(-1.54, 0, 0.08);
    const panelTexL = makeDoorPanelTexture(g, a, b, true);
    const doorLeafL = new THREE.Mesh(
      new THREE.BoxGeometry(1.53, 3.96, 0.1),
      new THREE.MeshStandardMaterial({ map: panelTexL, roughness: 0.35, metalness: 0.3 })
    );
    doorLeafL.position.set(0.765, 2.1, 0);
    // Maniglia dorata sinistra
    const handleMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.95, roughness: 0.15 });
    const handleL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), handleMat);
    handleL.position.set(1.36, 2.0, 0.1);
    hingeL.add(doorLeafL, handleL);

    const hingeR = new THREE.Group();
    hingeR.position.set(1.54, 0, 0.08);
    const panelTexR = makeDoorPanelTexture(g, a, b, false);
    const doorLeafR = new THREE.Mesh(
      new THREE.BoxGeometry(1.53, 3.96, 0.1),
      new THREE.MeshStandardMaterial({ map: panelTexR, roughness: 0.35, metalness: 0.3 })
    );
    doorLeafR.position.set(-0.765, 2.1, 0);
    // Maniglia dorata destra
    const handleR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), handleMat);
    handleR.position.set(-1.36, 2.0, 0.1);
    hingeR.add(doorLeafR, handleR);

    // Vortice dimensionale dietro i battenti (visibile quando la porta si spalanca!)
    const vortexTex = makeVortexTexture(a);
    const vortexMat = new THREE.MeshBasicMaterial({
      map: vortexTex,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const vortex = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.95), vortexMat);
    vortex.position.set(0, 2.1, -0.14);

    // Cartello superiore con il nome del gioco
    const holoTex = makeHoloMarquee(g, i, a);
    const holoSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 1.55),
      new THREE.MeshBasicMaterial({
        map: holoTex,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        toneMapped: false
      })
    );
    holoSign.position.set(0, 5.55, 0.1);

    // Sentiero luminoso radiale dal centro fino alla porta
    const pathLen = R - 2.6;
    const runwayLine = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, pathLen),
      new THREE.MeshBasicMaterial({
        color: a,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    runwayLine.rotation.x = -Math.PI / 2;
    runwayLine.position.set(0, 0.03, pathLen / 2 + 0.5);

    grp.add(
      leftPylon, rightPylon, lintel, threshold,
      neonL, neonR, neonT,
      hingeL, hingeR,
      vortex, holoSign, runwayLine
    );

    // Aggiungi sculture 3D uniche specifiche del gioco!
    addUniqueDoorTheme3D(grp, g, a, b);

    doorsGroup.add(grp);

    return {
      grp,
      game: g,
      index: i,
      angle: ang,
      accent: a,
      hingeL,
      hingeR,
      vortex,
      holoSign,
      runwayLine,
      isOpen: false
    };
  });

  // ============================================================================
  // 6. MOVIMENTO DEL GIOCATORE AL CENTRO, TELECAMERA 360° & APERTURA PORTA
  // ============================================================================
  let sel = 0;
  let camYaw = 0; // Angolo verso cui guarda il personaggio dal centro (0 = Porta #0)
  let camPitch = 0.16; // Inclinazione verticale della visuale
  let camDist = 6.2; // Distanza della telecamera dietro al personaggio
  let isEntering = false;
  const moveKeys = new Set();

  // Elementi UI
  const title = h('div', 'lobbyTitle');
  title.innerHTML = `
    <p class="kicker" style="letter-spacing:0.3em">★ SPAZIO APERTO · HUB CENTRALE ★</p>
    <h1 class="disp" style="font-size:clamp(2.1rem, 5.2vw, 3.6rem)">SCEGLI LA TUA PORTA</h1>
    <p style="letter-spacing:0.16em;font-size:0.78rem;color:#bae6fd">MUOVITI CON <b>WASD / FRECCE</b> O <b>TRASCINA</b> · CLICCA UNA PORTA PER APRIRLA ED ENTRARE</p>
  `;

  const prev = h('button', 'arrow l', '‹');
  prev.setAttribute('aria-label', 'Porta precedente');
  prev.title = 'Ruota verso la porta precedente';
  const next = h('button', 'arrow r', '›');
  next.setAttribute('aria-label', 'Porta successiva');
  next.title = 'Ruota verso la porta successiva';

  const info = h('div', 'dock');
  const tools = h('div', 'tools');
  tools.append(speedBtn(), muteBtn());
  ui.append(title, prev, next, info, tools);

  function normAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function updateCameraAndAvatarOrientation() {
    if (isEntering) return;

    // Il personaggio si orienta verso la direzione di sguardo/movimento
    avatar.rotation.y = camYaw;

    // Telecamera in terza persona dietro e leggermente sopra il personaggio:
    // così vedi TE STESSO al centro e le porte in cerchio attorno a te nello spazio aperto!
    const px = avatar.position.x;
    const pz = avatar.position.z;
    const camX = px - Math.sin(camYaw) * camDist;
    const camZ = pz - Math.cos(camYaw) * camDist;
    const camY = 2.6 + Math.sin(camPitch) * 3.8;

    const lookX = px + Math.sin(camYaw) * 9.0;
    const lookZ = pz + Math.cos(camYaw) * 9.0;
    const lookY = 2.15 - Math.sin(camPitch) * 1.2;

    S.go([camX, camY, camZ], [lookX, lookY, lookZ]);
  }

  function updateHUD() {
    const door = doors[sel];
    const g = door.game;
    const b = best(g.id);
    const { a, b: secCol } = accent(g);
    setAccent(a, secCol);

    info.innerHTML = '';
    const c = h('div', 'card info');
    c.style.cssText = `border:1.5px solid ${a}88;box-shadow:0 12px 36px rgba(0,0,0,0.85), 0 0 28px ${a}44;`;

    const pl = g.players ? ` · ${g.players.min ?? 1}–${g.players.max ?? 4} giocatori` : ' · 1 Concorrente';
    c.innerHTML = `
      <div>
        <p class="kicker" style="color:${a}">PORTA ${String(sel + 1).padStart(2, '0')} DI ${N} · ${esc(g.tag)}</p>
        <h3 class="disp" style="font-size:2.1rem;margin:2px 0 6px">${esc(g.name)}</h3>
        <p style="color:#cbd5e1;font-size:0.9rem;line-height:1.42">${esc(g.desc)}${pl}${b ? ` · Record <b class="gold">${b.toLocaleString('it-IT')}</b>` : ''}</p>
      </div>
    `;

    const btnWrap = h('div', 'row');
    btnWrap.style.cssText = 'margin:0;gap:10px;flex-wrap:wrap;';

    const rulesB = h('button', 'btn rulesBtn', '📖 Regole');
    rulesB.onclick = () => { sfx.click(); showRulesModal(g); };

    const play = h('button', 'btn pri bigEnterBtn', '🚪 Avvicinati, Apri Porta ed Entra ▸');
    play.style.cssText = `font-weight:900;padding:12px 22px;background:linear-gradient(135deg, ${a}, #2563eb);border:2px solid #ffffff;box-shadow:0 0 22px ${a}88;`;
    play.onclick = () => triggerPortalEntry(sel);

    btnWrap.append(rulesB, play);
    c.append(btnWrap);
    info.append(c);

    // Evidenzia la porta selezionata e il suo sentiero radiale
    doors.forEach((d, idx) => {
      const active = idx === sel;
      tween(d.holoSign.scale, [active ? 1.18 : 0.92, active ? 1.18 : 0.92, 1], 0.4, ease.overshoot);
      d.runwayLine.material.opacity = active ? 0.68 : 0.16;
    });

    droneEyeMat.color.set(a);
    centerOmniLight.color.set(a);
  }

  function selectDoorIndex(index, announce = true) {
    if (isEntering) return;
    const nextSel = ((index % N) + N) % N;
    const changed = nextSel !== sel;
    sel = nextSel;
    if (changed) sfx.click();
    updateHUD();
    if (announce && changed) {
      speakDrone(`Porta #${sel + 1}: ${doors[sel].game.name}`, 2000);
    }
  }

  function rotateTo(index) {
    if (isEntering) return;
    selectDoorIndex(index, true);
    const targetYaw = doors[sel].angle;
    // Ruota lungo l'arco più breve
    const diff = normAngle(targetYaw - camYaw);
    camYaw = camYaw + diff;
    sfx.whoosh();
    updateCameraAndAvatarOrientation();
  }

  prev.onclick = () => rotateTo(sel - 1);
  next.onclick = () => rotateTo(sel + 1);

  // ============================================================================
  // SEQUENZA CINEMATICA: IL PERSONAGGIO SI MUOVE VERSO LA PORTA, LA APRE ED ENTRA
  // ============================================================================
  async function triggerPortalEntry(index) {
    if (isEntering) return;
    isEntering = true;
    sel = ((index % N) + N) % N;
    updateHUD();

    const doorObj = doors[sel];
    const g = doorObj.game;
    const a = doorObj.accent;
    const doorAngle = doorObj.angle;

    // Nascondi UI durante l'animazione d'ingresso
    title.style.transition = 'opacity 0.35s ease';
    title.style.opacity = '0';
    info.style.transition = 'opacity 0.35s ease';
    info.style.opacity = '0';
    prev.style.display = 'none';
    next.style.display = 'none';
    tools.style.display = 'none';

    sfx.fanfare();
    speakDrone(`Andiamo ad aprire la porta di ${g.name}!`, 2600);

    // 1. Il personaggio si gira verso la porta scelta
    const yawDiff = normAngle(doorAngle - avatar.rotation.y);
    avatar.rotation.y += yawDiff;
    camYaw = avatar.rotation.y;

    // Coordinate davanti alla porta (sulla soglia)
    const stopRadius = R - 2.3;
    const targetX = Math.sin(doorAngle) * stopRadius;
    const targetZ = Math.cos(doorAngle) * stopRadius;

    // Posizione della telecamera che segue il personaggio fin davanti alla porta
    const camApproachX = Math.sin(doorAngle) * (R - 7.2);
    const camApproachZ = Math.cos(doorAngle) * (R - 7.2);
    const doorWorldX = Math.sin(doorAngle) * R;
    const doorWorldZ = Math.cos(doorAngle) * R;

    S.go([camApproachX, 2.8, camApproachZ], [doorWorldX, 2.2, doorWorldZ]);

    // 2. Il personaggio si muove / fluttua verso la porta scelta!
    sfx.whoosh();
    jetFlameMat.color.set('#ffffff');

    const distToDoor = Math.hypot(targetX - avatar.position.x, targetZ - avatar.position.z);
    const moveDur = Math.max(0.65, Math.min(1.45, distToDoor * 0.1));

    // Inclinazione in avanti durante il volo/camminata verso la porta
    tween(avatar.rotation, { x: 0.22 }, 0.25, ease.out);
    await Promise.all([
      tween(avatar.position, { x: targetX, y: 0.35, z: targetZ }, moveDur, ease.inout),
      tween(drone.position, { x: targetX + Math.cos(doorAngle) * 1.1, y: 2.3, z: targetZ - Math.sin(doorAngle) * 1.1 }, moveDur, ease.inout)
    ]);
    tween(avatar.rotation, { x: 0 }, 0.2, ease.out);

    // 3. Il personaggio allunga il braccio e APRE FISICAMENTE I BATTENTI DELLA PORTA!
    avatar.point?.(900);
    await new Promise(r => setTimeout(r, 220));

    sfx.drum();
    sfx.click();
    speakDrone(`Porta aperta! Entriamo in ${g.name}!`, 2200);

    // I due battenti (hingeL e hingeR) ruotano sui cardini spalancandosi!
    await Promise.all([
      tween(doorObj.hingeL.rotation, { y: -Math.PI * 0.68 }, 0.78, ease.out),
      tween(doorObj.hingeR.rotation, { y: Math.PI * 0.68 }, 0.78, ease.out),
      tween(doorObj.vortex.scale, { x: 1.18, y: 1.12, z: 1 }, 0.78, ease.overshoot)
    ]);
    doorObj.isOpen = true;

    // 4. Il personaggio varca la soglia ed ENTRA DENTRO la porta aperta insieme alla telecamera!
    sfx.whoosh();
    const insideX = Math.sin(doorAngle) * (R + 0.4);
    const insideZ = Math.cos(doorAngle) * (R + 0.4);
    const camInsideX = Math.sin(doorAngle) * (R - 2.2);
    const camInsideZ = Math.cos(doorAngle) * (R - 2.2);

    S.go([camInsideX, 2.3, camInsideZ], [insideX, 2.2, insideZ]);

    await Promise.all([
      tween(avatar.position, { x: insideX, y: 0.9, z: insideZ }, 0.75, ease.in),
      tween(drone.position, { x: insideX, y: 2.1, z: insideZ }, 0.75, ease.in)
    ]);

    // 5. Flash del portale e avvio del gioco!
    S.flashWith(a);
    sfx.win();
    await new Promise(r => setTimeout(r, 380));

    if (g.players) {
      setup(g);
    } else {
      intro(g);
    }
  }

  // ============================================================================
  // 7. CONTROLLI MOUSE / TOUCH / TASTIERA (WASD + FRECCE + CLICK SULLE PORTE)
  // ============================================================================
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startYaw = 0;
  let startPitch = 0;
  let dragMoved = 0;

  const down = e => {
    if (e.target.id !== 'gl' || ui.querySelector('.ov') || isEntering) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startYaw = camYaw;
    startPitch = camPitch;
    dragMoved = 0;
    document.body.style.cursor = 'grabbing';
  };

  const move = e => {
    if (dragging && !isEntering) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      dragMoved = Math.max(dragMoved, Math.hypot(dx, dy));
      camYaw = startYaw - dx * 0.0055;
      camPitch = Math.max(-0.18, Math.min(0.65, startPitch + dy * 0.0035));

      // Determina la porta che si trova davanti allo sguardo del giocatore
      const norm = ((camYaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const closestIdx = Math.round(norm / step) % N;
      if (closestIdx !== sel) selectDoorIndex(closestIdx, false);

      updateCameraAndAvatarOrientation();
      return;
    }
    if (e.target.id === 'gl' && !isEntering) {
      const hit = raycast(doors.map(d => d.grp), e);
      document.body.style.cursor = hit ? 'pointer' : 'grab';
    }
  };

  const up = e => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = '';

    // Se è stato un click diretto su una porta in 3D:
    if (dragMoved <= 10 && e.target.id === 'gl' && !ui.querySelector('.ov') && !isEntering) {
      const hit = raycast(doors.map(d => d.grp), e);
      if (!hit) return;
      const clickedId = hit.userData.id;
      // Il personaggio si gira, si muove verso la porta cliccata, la apre ed entra!
      triggerPortalEntry(clickedId);
    }
  };

  const wheel = e => {
    if (ui.querySelector('.ov') || isEntering) return;
    // Zoom avanti/indietro oppure rotazione tra le porte
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      rotateTo(sel + (e.deltaX > 0 ? 1 : -1));
    } else {
      camDist = Math.max(3.8, Math.min(11.5, camDist + Math.sign(e.deltaY) * 0.65));
      updateCameraAndAvatarOrientation();
    }
  };

  const keyDown = e => {
    if (ui.querySelector('.ov') || isEntering) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      moveKeys.add(k);
    } else if ((e.key === 'Enter' || e.key === ' ') && tag !== 'BUTTON') {
      e.preventDefault();
      triggerPortalEntry(sel);
    }
  };

  const keyUp = e => {
    moveKeys.delete(e.key.toLowerCase());
  };

  addEventListener('keydown', keyDown);
  addEventListener('keyup', keyUp);
  addEventListener('pointerdown', down);
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  addEventListener('wheel', wheel, { passive: true });

  // ============================================================================
  // 8. LOOP DI ANIMAZIONE 3D: MOVIMENTO LIBERO, PIANETI, STELLE CADENTI & PORTE
  // ============================================================================
  let walkCycle = 0;

  S.on((dt, t) => {
    // Rotazione lenta della volta stellata e dei pianeti
    starfield.rotation.y += dt * 0.003;
    saturnSphere.rotation.y += dt * 0.08;
    saturnRings.rotation.z -= dt * 0.04;
    earthSphere.rotation.y += dt * 0.12;
    moonPivot.rotation.y += dt * 0.35;
    lavaSphere.rotation.y += dt * 0.06;
    iceSphere.rotation.y += dt * 0.09;
    purpleSphere.rotation.y += dt * 0.07;

    // Asteroidi nello spazio
    crystals.forEach(ast => {
      ast.rotation.x += dt * ast.userData.rx;
      ast.rotation.y += dt * ast.userData.ry;
      ast.position.y = ast.userData.baseY + Math.sin(t * ast.userData.bobSpeed) * 0.2;
    });

    // Vortici interni delle porte
    doors.forEach(d => {
      d.vortex.rotation.z += dt * 0.9;
    });

    // Movimento libero del personaggio nello spazio quando l'utente usa WASD / Frecce
    if (!isEntering) {
      const turnLeft = moveKeys.has('a') || moveKeys.has('arrowleft');
      const turnRight = moveKeys.has('d') || moveKeys.has('arrowright');
      const moveFwd = moveKeys.has('w') || moveKeys.has('arrowup');
      const moveBack = moveKeys.has('s') || moveKeys.has('arrowdown');

      let isMoving = false;

      if (turnLeft) {
        camYaw += dt * 1.85;
        isMoving = true;
      }
      if (turnRight) {
        camYaw -= dt * 1.85;
        isMoving = true;
      }

      if (moveFwd || moveBack) {
        const dir = moveFwd ? 1 : -1;
        const speed = 6.8 * dt * dir;
        avatar.position.x += Math.sin(camYaw) * speed;
        avatar.position.z += Math.cos(camYaw) * speed;
        isMoving = true;

        // Se il personaggio cammina/fluttua fino a una porta, la apre ed entra automaticamente!
        const distFromCenter = Math.hypot(avatar.position.x, avatar.position.z);
        if (distFromCenter >= R - 2.65) {
          const angAtPos = Math.atan2(avatar.position.x, avatar.position.z);
          const normAng = ((angAtPos % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const reachedIdx = Math.round(normAng / step) % N;
          triggerPortalEntry(reachedIdx);
          return;
        }
      }

      if (isMoving) {
        walkCycle += dt * 10;
        avatar.position.y = 0.25 + Math.abs(Math.sin(walkCycle)) * 0.12;
        avatar.rotation.x = moveFwd ? 0.18 : moveBack ? -0.12 : 0;

        // Aggiorna la porta più vicina/puntata
        const lookX = avatar.position.x + Math.sin(camYaw) * 6;
        const lookZ = avatar.position.z + Math.cos(camYaw) * 6;
        const ang = ((Math.atan2(lookX, lookZ) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const idx = Math.round(ang / step) % N;
        if (idx !== sel) selectDoorIndex(idx, false);

        updateCameraAndAvatarOrientation();
      } else {
        // Fluttuazione morbida Zero-G sul posto
        avatar.position.y = 0.18 + Math.sin(t * 1.6) * 0.12;
        avatar.rotation.x *= 0.9;
        avatar.rotation.z = Math.sin(t * 0.9) * 0.03;
      }

      // Pulsazione propulsori jetpack
      const pulse = 0.6 + Math.sin(t * 14) * 0.35 + (isMoving ? 0.5 : 0);
      jetNozzleL.scale.set(1, pulse, 1);
      jetNozzleR.scale.set(1, pulse, 1);

      // Drone compagno che orbita accanto al personaggio
      drone.position.x = avatar.position.x + Math.cos(camYaw) * 1.15 + Math.sin(t * 1.5) * 0.12;
      drone.position.y = avatar.position.y + 2.0 + Math.cos(t * 2.1) * 0.12;
      drone.position.z = avatar.position.z - Math.sin(camYaw) * 1.15 + Math.cos(t * 1.3) * 0.12;
      gyroRing1.rotation.x += dt * 1.8;
      gyroRing1.rotation.y += dt * 1.4;
    }
  });

  // Teardown
  const teardown = () => {
    removeEventListener('keydown', keyDown);
    removeEventListener('keyup', keyUp);
    removeEventListener('pointerdown', down);
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    removeEventListener('wheel', wheel);
    droneBubble.remove();
    document.body.style.cursor = '';
  };

  updateCameraAndAvatarOrientation();
  updateHUD();
  speakDrone('Sei al centro dello Spazio! Muoviti verso una porta o cliccala per aprirla ed entrare!', 3600);

  return { teardown, rotateTo, triggerPortalEntry };
}
