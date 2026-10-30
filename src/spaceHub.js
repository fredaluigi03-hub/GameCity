import { THREE, newStage, tween, raycast, ease, PAL, tune, person } from './engine.js';
import { h, sfx } from './ui.js';
import { GAME_FINALS } from './games/finals.js';

/**
 * GameCity — Open Space 3D Hub (High Performance & Zero-Lag Architecture)
 *
 * 1. HUB CENTRALE (3 Macro-Porte Maestose a 120°):
 *    - 🚪 SHOW GAME TV: I 5 grandi quiz show serali
 *    - 🚪 GIOCHI DA TAVOLO: I 5 grandi classici 3D multiplayer
 *    - 🚪 RANDOM & ROUND FINALI: Minigiochi di duello + accesso DIRETTO ai Round Finali TV!
 *
 * 2. PERFORMANCE & ZERO-LAG OPTIMIZATIONS:
 *    - Luci condivise dinamiche: 1 singolo faretto teatrale mobile anziché 20+ luci sulla GPU.
 *    - DOM riciclabile persistente: nessun layout thrashing o distruzione innerHTML continua.
 *    - Raycasting throttled: calcolo collisioni solo quando necessario (zero micro-stuttering).
 *    - Volta stellare calibrata (2000 punti) per garantire 60 FPS stabili anche su smartphone.
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
    bg: '#02040a',
    cam: [0, 3.6, -5.8],
    look: [0, 2.2, 8.8],
    floor: false,
    studio: false
  });
  S.par = 0.25;
  S.noOrbit = true;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // Spazio profondo aperto senza nebbia densa
  S.scene.background = new THREE.Color('#02040a');
  S.scene.fog = new THREE.FogExp2(new THREE.Color('#02040a'), 0.0022);

  // Mappa rapida giochi base
  const gamesMap = new Map(GAMES.map(g => [g.id, g]));

  // Illuminazione cosmica leggera e bilanciata
  const cosmicSunLight = new THREE.DirectionalLight('#fff4dc', 2.2);
  cosmicSunLight.position.set(-30, 45, -60);
  S.add(cosmicSunLight);

  const cosmicFillLight = new THREE.DirectionalLight('#bae6fd', 1.3);
  cosmicFillLight.position.set(35, 25, 55);
  S.add(cosmicFillLight);

  const centerOmniLight = new THREE.PointLight('#38bdf8', 25, 28, 1.2);
  centerOmniLight.position.set(0, 6, 0);
  S.add(centerOmniLight);

  // SINGOLE LUCI MIRATE CONDIVISE PER LA PORTA ATTIVA (Zero lag: evita decine di luci attive)
  const activeDoorSpot = new THREE.SpotLight('#38bdf8', 45, 30, Math.PI / 3, 0.45, 1.1);
  activeDoorSpot.position.set(0, 7.5, 5);
  S.add(activeDoorSpot);

  const activeDoorRimLight = new THREE.PointLight('#38bdf8', 14, 16);
  activeDoorRimLight.position.set(0, 2.4, 2);
  S.add(activeDoorRimLight);

  // ============================================================================
  // 1. CIELO STELLATO A 360° & NEBULOSE COSMICHE (Calibrato a 2000 particelle)
  // ============================================================================
  const starGeo = new THREE.BufferGeometry();
  const starCount = 2000;
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
    const r = 50 + Math.random() * 180;
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
    cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    const rad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    rad.addColorStop(0, colorHex);
    rad.addColorStop(0.45, secondaryHex + '66');
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const nebulae = [
    { c1: '#0284c7', c2: '#1e3a8a', pos: [-65, 28, -75], s: 90 },
    { c1: '#7c3aed', c2: '#4c1d95', pos: [70, 32, -60], s: 95 },
    { c1: '#0d9488', c2: '#134e4a', pos: [-70, -18, 55], s: 80 },
    { c1: '#db2777', c2: '#831843', pos: [65, 16, 72], s: 85 }
  ].map(n => {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(n.s, n.s),
      new THREE.MeshBasicMaterial({
        map: createNebulaTexture(n.c1, n.c2),
        transparent: true,
        opacity: 0.24,
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
  // 2. PIANETI 3D NELLO SPAZIO
  // ============================================================================
  const planetsGroup = new THREE.Group();
  S.add(planetsGroup);

  function makePlanetTexture(type) {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 128;
    const ctx = cv.getContext('2d');

    if (type === 'saturn') {
      const g = ctx.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, '#78350f');
      g.addColorStop(0.35, '#fde68a');
      g.addColorStop(0.7, '#f59e0b');
      g.addColorStop(1, '#451a03');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 128);
    } else if (type === 'earth') {
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = '#15803d';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.ellipse((i * 45) % 256, 20 + ((i * 25) % 80), 30, 20, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, '#3b0764');
      g.addColorStop(0.5, '#f0abfc');
      g.addColorStop(1, '#2e1065');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 128);
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeRingTexture(c1, c2) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const ctx = cv.getContext('2d');
    const rg = ctx.createRadialGradient(128, 128, 50, 128, 128, 125);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(0.2, c1 + 'cc');
    rg.addColorStop(0.55, c2 + 'ee');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Saturno
  const saturnGrp = new THREE.Group();
  saturnGrp.position.set(-48, 16, 56);
  const saturnSphere = new THREE.Mesh(
    new THREE.SphereGeometry(8.5, 24, 20),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture('saturn'), roughness: 0.65 })
  );
  const saturnRings = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 36),
    new THREE.MeshBasicMaterial({
      map: makeRingTexture('#fbbf24', '#d97706'),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  saturnRings.rotation.x = Math.PI * 0.42;
  saturnGrp.add(saturnSphere, saturnRings);
  planetsGroup.add(saturnGrp);

  // Terra Nova
  const earthGrp = new THREE.Group();
  earthGrp.position.set(52, 14, 48);
  const earthSphere = new THREE.Mesh(
    new THREE.SphereGeometry(6.8, 24, 20),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture('earth'), roughness: 0.55 })
  );
  earthGrp.add(earthSphere);
  planetsGroup.add(earthGrp);

  // Aether (Viola)
  const purpleGrp = new THREE.Group();
  purpleGrp.position.set(4, 27, -68);
  const purpleSphere = new THREE.Mesh(
    new THREE.SphereGeometry(6.2, 22, 18),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture('purple'), roughness: 0.5 })
  );
  purpleGrp.add(purpleSphere);
  planetsGroup.add(purpleGrp);

  // Asteroidi (12 pezzi per minima memoria GPU)
  const asteroidGrp = new THREE.Group();
  S.add(asteroidGrp);
  const astMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.82 });
  const crystals = [];
  for (let i = 0; i < 12; i++) {
    const rad = 22 + (i % 6) * 5;
    const ang = (i / 12) * Math.PI * 2;
    const y = -4 + (i % 5) * 3;
    const ast = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), astMat);
    ast.position.set(Math.sin(ang) * rad, y, Math.cos(ang) * rad);
    ast.userData = { rx: 0.25, ry: 0.3, baseY: y };
    asteroidGrp.add(ast);
    crystals.push(ast);
  }

  // ============================================================================
  // 3. PIATTAFORMA CENTRALE CON ANELLO ENERGETICO
  // ============================================================================
  const hubFloorGrp = new THREE.Group();
  S.add(hubFloorGrp);

  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(8.0, 9.8, 64),
    new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.02;
  hubFloorGrp.add(outerRing);

  const centerPadGlow = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 2.55, 48),
    new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  centerPadGlow.rotation.x = -Math.PI / 2;
  centerPadGlow.position.y = 0.03;
  hubFloorGrp.add(centerPadGlow);

  // ============================================================================
  // 4. PERSONAGGIO ASTRONAUTA ("IO") + DRONE COMPAGNO
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

  const helmetGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.185, 18, 14),
    new THREE.MeshBasicMaterial({ color: '#bae6fd', transparent: true, opacity: 0.28 })
  );
  helmetGlass.position.set(0, 0.13, 0.01);
  avatar.head.add(helmetGlass);

  const jetpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.42, 0.16),
    new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.22 })
  );
  jetpack.position.set(0, 1.38, -0.17);
  avatar.add(jetpack);

  const jetFlameMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending });
  const jetNozzleL = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 10), jetFlameMat);
  jetNozzleL.rotation.x = Math.PI;
  jetNozzleL.position.set(-0.1, 1.08, -0.17);
  const jetNozzleR = jetNozzleL.clone();
  jetNozzleR.position.x = 0.1;
  avatar.add(jetNozzleL, jetNozzleR);

  // Drone compagno
  const drone = new THREE.Group();
  drone.position.set(1.1, 2.2, 0.3);
  S.add(drone);
  const droneBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 18, 16),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.9, roughness: 0.2 })
  );
  const droneEyeMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', toneMapped: false });
  const droneEye = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 10, 20), droneEyeMat);
  droneEye.position.set(0, 0, 0.22);
  const gyroRing1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.015, 6, 24),
    new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8, roughness: 0.2 })
  );
  drone.add(droneBody, droneEye, gyroRing1);

  const droneBubble = h('div', 'droneBubble3D');
  droneBubble.style.display = 'none';
  ui.append(droneBubble);

  function speakDrone(msg, duration = 2400) {
    droneBubble.textContent = msg;
    droneBubble.style.display = 'block';
    droneBubble.style.opacity = '1';
    setTimeout(() => {
      droneBubble.style.opacity = '0';
      setTimeout(() => { droneBubble.style.display = 'none'; }, 250);
    }, duration);
  }

  // ============================================================================
  // 5. STRUTTURA DEI SETTORI (3 Macro-Porte Hub + Sub-Hub)
  // ============================================================================
  const makeFinalEntry = (gameId, name, tag, desc) => {
    const baseG = gamesMap.get(gameId);
    return {
      id: `${gameId}_finale`,
      baseGame: baseG,
      finalOnly: true,
      name,
      tag,
      desc,
      players: baseG?.players || { min: 1, max: 4 },
      rules: [
        `Accesso DIRETTO e immediato al Round Finale di ${baseG?.name || 'questo gioco'}!`,
        desc,
        'Mettiti alla prova senza dover giocare tutta la scalata precedente: sfida le domande decisive per vincere il montepremi!'
      ]
    };
  };

  const FINAL_ENTRIES = {
    eredita_finale: makeFinalEntry(
      'eredita',
      'LA GHIGLIOTTINA',
      "L'EREDITÀ · ROUND FINALE",
      '5 coppie di parole con la lama della ghigliottina che dimezza il montepremi (180.000 €) e 60s per la parola vincente.'
    ),
    avanti_finale: makeFinalEntry(
      'avanti',
      '21 AL CONTRARIO',
      'AVANTI UN ALTRO · ROUND FINALE',
      '21 risposte sbagliate consecutive in 150 secondi col montepremi scalare e il tasto freeze per vincere tutto.'
    ),
    caduta_finale: makeFinalEntry(
      'caduta',
      'I 10 PASSI',
      'CADUTA LIBERA · ROUND FINALE',
      '10 definizioni in 3 minuti da completare senza cadere nella botola per conquistare il montepremi di 100.000 €.'
    ),
    affari_finale: makeFinalEntry(
      'affari',
      'REGIONE FORTUNATA',
      'AFFARI TUOI · ROUND FINALE',
      'Stallo finale a 2 pacchi col Dottore oppure tenta il colpo da 100.000 € indovinando la Regione Fortunata.'
    ),
    catena_finale: makeFinalEntry(
      'catena',
      "L'ULTIMA CATENA",
      'REAZIONE A CATENA · ROUND FINALE',
      '15 parole collegate, terzo elemento misterioso e parola finale per difendere il montepremi fino alla fine.'
    )
  };

  const SECTORS = {
    main: {
      id: 'main',
      kicker: '★ SPAZIO APERTO · HUB CENTRALE ★',
      title: 'SCEGLI LA TUA PORTA',
      subText: '3 GRANDI CATEGORIE · SCEGLI ED ENTRA NEL SETTORE',
      radius: 8.8,
      items: [
        {
          id: 'shows',
          isSector: true,
          sectorTarget: 'shows',
          name: 'SHOW GAME TV',
          tag: '5 GRANDI QUIZ SHOW SERALI',
          desc: "L'Eredità, Avanti un Altro!, Caduta Libera, Affari Tuoi, Reazione a Catena. Entra negli studi dei più amati quiz televisivi italiani!",
          accentHex: '#38bdf8',
          secHex: '#fbbf24',
          icon: '📺'
        },
        {
          id: 'boardgames',
          isSector: true,
          sectorTarget: 'boardgames',
          name: 'GIOCHI DA TAVOLO',
          tag: '5 CLASSICI 3D MULTIPLAYER',
          desc: "Monopoly Italia 3D, Tombola Napoletana 90 Numeri, Gran Bingo 90, Tavola Ouija 3D, Forza 4 3D. Sfida amici e CPU sul tabellone!",
          accentHex: '#10b981',
          secHex: '#f59e0b',
          icon: '🎲'
        },
        {
          id: 'random',
          isSector: true,
          sectorTarget: 'random',
          name: 'RANDOM & FINALI',
          tag: 'MINIGIOCHI, SFIDE & FINALI SHOW',
          desc: "Tris Duello, Sfida Cultura, Hit Parade, Formula Math E accesso diretto ai leggendari Round Finali dei giochi TV!",
          accentHex: '#ec4899',
          secHex: '#a855f7',
          icon: '⚡'
        }
      ]
    },
    shows: {
      id: 'shows',
      kicker: '★ SETTORE SHOW GAME TV ★',
      title: 'I GRANDI QUIZ SHOW',
      subText: 'SCEGLI IL TUO SHOW SERALE · OPPURE TORNA ALL\'HUB CENTRALE',
      radius: 10.5,
      accentHex: '#38bdf8',
      itemIds: ['eredita', 'avanti', 'caduta', 'affari', 'catena']
    },
    boardgames: {
      id: 'boardgames',
      kicker: '★ SETTORE GIOCHI DA TAVOLO ★',
      title: 'I GRANDI CLASSICI 3D',
      subText: 'TABELLONI MULTIPLAYER 3D · OPPURE TORNA ALL\'HUB CENTRALE',
      radius: 10.5,
      accentHex: '#10b981',
      itemIds: ['monopoly', 'tombola', 'bingo', 'ouija', 'forza4']
    },
    random: {
      id: 'random',
      kicker: '★ SETTORE RANDOM & ROUND FINALI ★',
      title: 'DUELLI & FINALI TV',
      subText: 'MINIGIOCHI DI SFIDA & ACCESSO DIRETTO AI ROUND FINALI',
      radius: 11.8,
      accentHex: '#ec4899',
      itemIds: [
        'fight', 'cultura', 'hit', 'math',
        'eredita_finale', 'avanti_finale', 'caduta_finale', 'affari_finale', 'catena_finale'
      ]
    }
  };

  let currentSectorId = 'main';
  let doors = [];
  let doorGroups = [];
  let N = 3;
  let step = (Math.PI * 2) / N;
  let R = 8.8;
  const doorsGroup = new THREE.Group();
  S.add(doorsGroup);

  function resolveDoorItem(ref) {
    if (typeof ref === 'object' && ref !== null) return ref;
    if (FINAL_ENTRIES[ref]) return FINAL_ENTRIES[ref];
    return gamesMap.get(ref);
  }

  // Texture vortice dimensionale
  function makeVortexTexture(accentHex) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    const cx = 64, cy = 64;

    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 64);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.3, accentHex);
    bgGrad.addColorStop(0.75, '#090d1e');
    bgGrad.addColorStop(1, 'rgba(2, 4, 10, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 128, 128);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let arm = 0; arm < 4; arm++) {
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 3; a += 0.15) {
        const rad = 3 + a * 6;
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

  // Texture battenti porta
  function makeDoorPanelTexture(item, accentHex, secHex, isLeft) {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 512;
    const ctx = cv.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 256, 512);
    if (item.isSector) {
      if (item.id === 'shows') { grad.addColorStop(0, '#0c2e59'); grad.addColorStop(1, '#030f21'); }
      else if (item.id === 'boardgames') { grad.addColorStop(0, '#0a3d24'); grad.addColorStop(1, '#021a0e'); }
      else { grad.addColorStop(0, '#4a0e4e'); grad.addColorStop(1, '#1b031d'); }
    } else if (item.id === 'tombola') {
      grad.addColorStop(0, '#5c2d16'); grad.addColorStop(1, '#1e0c04');
    } else if (item.id === 'ouija') {
      grad.addColorStop(0, '#3b1d5c'); grad.addColorStop(1, '#0e0417');
    } else if (item.id === 'monopoly') {
      grad.addColorStop(0, '#0e4a2c'); grad.addColorStop(1, '#041c10');
    } else if (item.id === 'affari' || item.id === 'affari_finale') {
      grad.addColorStop(0, '#b91c1c'); grad.addColorStop(1, '#450a0a');
    } else if (item.id === 'forza4') {
      grad.addColorStop(0, '#1e40af'); grad.addColorStop(1, '#0f172a');
    } else {
      grad.addColorStop(0, '#1e293b'); grad.addColorStop(1, '#070b16');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);

    ctx.lineWidth = 8;
    ctx.strokeStyle = accentHex;
    ctx.strokeRect(9, 9, 238, 494);

    ctx.beginPath();
    ctx.arc(128, 110, 58, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = accentHex;
    ctx.stroke();

    const ICONS = {
      shows: '📺',
      boardgames: '🎲',
      random: '⚡',
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
      forza4: '🔴',
      eredita_finale: '⚔️',
      avanti_finale: '🎪',
      caduta_finale: '⚠️',
      affari_finale: '📦',
      catena_finale: '⛓️'
    };

    ctx.font = 'bold 58px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accentHex;
    ctx.fillText(item.icon || ICONS[item.id] || '★', 128, 112);

    // Targhetta centrale con nome
    ctx.fillStyle = 'rgba(6, 10, 22, 0.95)';
    ctx.beginPath();
    ctx.roundRect(22, 230, 212, 38, 7);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = accentHex;
    ctx.stroke();

    ctx.font = '900 20px "Bebas Neue", Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(item.name.toUpperCase(), 128, 251);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Cartello olografico superiore
  function makeHoloMarquee(item, index, accentHex) {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 230;
    const ctx = cv.getContext('2d');

    const bgGrad = ctx.createLinearGradient(0, 0, 512, 230);
    bgGrad.addColorStop(0, 'rgba(14, 22, 46, 0.98)');
    bgGrad.addColorStop(0.5, 'rgba(8, 12, 26, 0.96)');
    bgGrad.addColorStop(1, 'rgba(4, 7, 18, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(12, 12, 488, 206, 18);
    ctx.fill();

    ctx.lineWidth = 7;
    ctx.strokeStyle = accentHex;
    ctx.stroke();

    const tagText = item.isSector
      ? `CATEGORIA ${index + 1} DI ${N} · ${item.tag.toUpperCase()}`
      : item.finalOnly
      ? `🏆 ROUND FINALE DIRETTO · ${item.tag.toUpperCase()}`
      : `PORTA ${String(index + 1).padStart(2, '0')} DI ${N} · ${item.tag.toUpperCase()}`;

    ctx.font = '800 15px Outfit, sans-serif';
    const tagWidth = Math.min(440, ctx.measureText(tagText).width + 32);
    const tagX = (512 - tagWidth) / 2;

    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.roundRect(tagX, 22, tagWidth, 27, 13);
    ctx.fill();

    ctx.fillStyle = '#050814';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, 256, 36);

    ctx.font = '900 44px "Bebas Neue", Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(item.name.toUpperCase(), 256, 105);

    const actionText = item.isSector
      ? '✨ ENTRA NEL SETTORE 🚪'
      : item.finalOnly
      ? '🏆 SFIDA FINALE DIRETTA · TOCCA 🚪'
      : '✨ TOCCA PER ENTRARE NEL GIOCO 🚪';

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(35, 155, 442, 44, 11);
    ctx.fill();

    ctx.font = '800 17px Outfit, sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText(actionText, 256, 178);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Sculture 3D tematiche
  function addUniqueDoorTheme3D(grp, item, a, b) {
    const id = item.id;
    const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.85, roughness: 0.2 });
    const glowAccent = new THREE.MeshBasicMaterial({ color: a, toneMapped: false });

    if (item.isSector) {
      if (id === 'shows') {
        const trussMat = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.8, roughness: 0.2 });
        const truss = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 0.35), trussMat);
        truss.position.set(0, 4.65, 0.3);
        const camBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.8), new THREE.MeshStandardMaterial({ color: '#0f172a' }));
        camBody.position.set(-1.95, 2.3, 0.4);
        grp.add(truss, camBody);
      } else if (id === 'boardgames') {
        const dieWhite = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), new THREE.MeshStandardMaterial({ color: '#f8fafc' }));
        dieWhite.position.set(-0.45, 4.85, 0.3);
        dieWhite.rotation.set(0.3, 0.4, 0.2);
        grp.add(dieWhite);
      } else {
        const trophyCup = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.25, 0.65, 12), goldMat);
        trophyCup.position.set(0, 4.85, 0.3);
        grp.add(trophyCup);
      }
      return;
    }

    if (id === 'eredita' || id === 'eredita_finale') {
      const colL = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 4.4, 12), goldMat); colL.position.set(-1.85, 2.2, 0.15);
      const colR = colL.clone(); colR.position.x = 1.85;
      grp.add(colL, colR);
    } else if (id === 'avanti' || id === 'avanti_finale') {
      const pidigozzo = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 16), goldMat);
      pidigozzo.rotation.z = Math.PI / 2;
      pidigozzo.position.set(0, 4.75, 0.25);
      grp.add(pidigozzo);
    } else if (id === 'caduta' || id === 'caduta_finale') {
      const hazardMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.5, roughness: 0.3 });
      const pistL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.2, 10), hazardMat);
      pistL.position.set(-1.95, 2.1, 0.2);
      grp.add(pistL);
    } else if (id === 'affari' || id === 'affari_finale') {
      const redBoxMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.35 });
      const boxL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 0.55), redBoxMat);
      boxL.position.set(-1.95, 1.2, 0.22);
      grp.add(boxL);
    } else if (id === 'catena' || id === 'catena_finale') {
      const linkL = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.075, 8, 16), goldMat);
      linkL.position.set(-1.9, 1.5, 0.22);
      grp.add(linkL);
    } else if (id === 'fight') {
      const tL = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.6, 0.12), glowAccent);
      tL.position.set(-1.85, 1.5, 0.25);
      grp.add(tL);
    } else if (id === 'cultura') {
      const diamond = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.48, 0),
        new THREE.MeshStandardMaterial({ color: '#38bdf8', metalness: 0.9, roughness: 0.1 })
      );
      diamond.position.set(0, 4.8, 0.3);
      grp.add(diamond);
    } else if (id === 'monopoly') {
      const blackHatMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.25 });
      const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 0.52, 16), blackHatMat);
      hatTop.position.set(0, 4.82, 0.25);
      grp.add(hatTop);
    } else if (id === 'tombola') {
      const wickerMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.8 });
      const panariello = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.34, 0.62, 16), wickerMat);
      panariello.position.set(0, 4.72, 0.28);
      grp.add(panariello);
    } else if (id === 'forza4') {
      const redDisc = new THREE.MeshStandardMaterial({ color: '#ef4444' });
      const dL = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 14), redDisc);
      dL.rotation.x = Math.PI / 2;
      dL.position.set(-1.85, 1.5, 0.26);
      grp.add(dL);
    }
  }

  // Costruzione porte del settore corrente
  function buildSectorDoors(sectorId) {
    while (doorsGroup.children.length > 0) {
      const obj = doorsGroup.children[0];
      doorsGroup.remove(obj);
    }

    const sec = SECTORS[sectorId] || SECTORS.main;
    currentSectorId = sec.id;
    R = sec.radius || 8.8;

    const rawList = sec.items || (sec.itemIds || []).map(resolveDoorItem);
    const validItems = rawList.filter(Boolean);
    N = validItems.length;
    step = (Math.PI * 2) / N;

    outerRing.geometry.dispose();
    outerRing.geometry = new THREE.RingGeometry(R - 0.9, R + 0.9, 64);

    doors = validItems.map((item, i) => {
      let a = item.accentHex;
      let b = item.secHex;
      if (!a) {
        const colors = accent(item.baseGame || item);
        a = colors.a;
        b = colors.b;
      }

      const ang = i * step;
      const grp = new THREE.Group();
      grp.position.set(Math.sin(ang) * R, 0, Math.cos(ang) * R);
      grp.rotation.y = ang + Math.PI;
      grp.userData.id = i;
      grp.userData.item = item;
      grp.userData.accent = a;

      const frameMat = new THREE.MeshStandardMaterial({
        color: item.isSector ? '#0f172a' : item.id === 'tombola' ? '#451a03' : item.id === 'forza4' ? '#1d4ed8' : '#1e293b',
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

      const neonMat = new THREE.MeshBasicMaterial({ color: a, toneMapped: false });
      const neonL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 4.05, 0.07), neonMat);
      neonL.position.set(-1.56, 2.1, 0.18);
      const neonR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 4.05, 0.07), neonMat);
      neonR.position.set(1.56, 2.1, 0.18);
      const neonT = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.07, 0.07), neonMat);
      neonT.position.set(0, 4.08, 0.18);

      const hingeL = new THREE.Group();
      hingeL.position.set(-1.54, 0, 0.08);
      const panelTexL = makeDoorPanelTexture(item, a, b, true);
      const doorLeafL = new THREE.Mesh(
        new THREE.BoxGeometry(1.53, 3.96, 0.1),
        new THREE.MeshStandardMaterial({ map: panelTexL, roughness: 0.35, metalness: 0.3 })
      );
      doorLeafL.position.set(0.765, 2.1, 0);
      hingeL.add(doorLeafL);

      const hingeR = new THREE.Group();
      hingeR.position.set(1.54, 0, 0.08);
      const panelTexR = makeDoorPanelTexture(item, a, b, false);
      const doorLeafR = new THREE.Mesh(
        new THREE.BoxGeometry(1.53, 3.96, 0.1),
        new THREE.MeshStandardMaterial({ map: panelTexR, roughness: 0.35, metalness: 0.3 })
      );
      doorLeafR.position.set(-0.765, 2.1, 0);
      hingeR.add(doorLeafR);

      const vortexTex = makeVortexTexture(a);
      const vortex = new THREE.Mesh(
        new THREE.PlaneGeometry(3.1, 3.95),
        new THREE.MeshBasicMaterial({
          map: vortexTex,
          transparent: true,
          opacity: 0.88,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      vortex.position.set(0, 2.1, -0.14);

      const holoTex = makeHoloMarquee(item, i, a);
      const holoSign = new THREE.Mesh(
        new THREE.PlaneGeometry(item.isSector ? 6.4 : 5.4, item.isSector ? 2.8 : 2.45),
        new THREE.MeshBasicMaterial({
          map: holoTex,
          transparent: true,
          opacity: 0.98,
          side: THREE.DoubleSide,
          toneMapped: false
        })
      );
      holoSign.position.set(0, item.isSector ? 6.0 : 5.85, 0.15);

      const haloPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(7.2, 3.4),
        new THREE.MeshBasicMaterial({
          color: a,
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      haloPlane.position.set(0, 5.85, 0.05);

      const pathLen = R - 2.6;
      const runwayLine = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, pathLen),
        new THREE.MeshBasicMaterial({
          color: a,
          transparent: true,
          opacity: 0.28,
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
        vortex, haloPlane, holoSign, runwayLine
      );

      addUniqueDoorTheme3D(grp, item, a, b);
      doorsGroup.add(grp);

      return {
        grp,
        item,
        index: i,
        angle: ang,
        accent: a,
        hingeL,
        hingeR,
        vortex,
        holoSign,
        haloPlane,
        runwayLine,
        isOpen: false
      };
    });

    doorGroups = doors.map(d => d.grp);
    sel = 0;
  }

  // ============================================================================
  // 6. MOVIMENTO, TELECAMERA E HUD RICICLATO (Zero Layout Thrashing)
  // ============================================================================
  let sel = 0;
  let camYaw = 0;
  let camPitch = 0.16;
  let camDist = 6.2;
  let isEntering = false;
  const moveKeys = new Set();
  let lastRaycastTime = 0;

  // Header UI persistente
  const title = h('div', 'lobbyTitle');
  const secKickerRow = h('div');
  secKickerRow.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;';
  const secKickerEl = h('p', 'kicker');
  secKickerEl.style.cssText = 'letter-spacing:0.3em;margin:0;';
  const topBackBtn = h('button', 'backHubPill', '← Torna alle 3 Porte');
  topBackBtn.setAttribute('aria-label', 'Torna alle 3 porte principali');
  topBackBtn.style.display = 'none';
  topBackBtn.onclick = (e) => {
    e.stopPropagation();
    sfx.click();
    switchToSector('main');
  };
  secKickerRow.append(secKickerEl, topBackBtn);

  const secTitleEl = h('h1', 'disp');
  secTitleEl.style.cssText = 'font-size:clamp(1.8rem, 5vw, 3.4rem);margin:2px 0 0;';
  const secSubTextEl = h('p', 'spaceSubText');
  secSubTextEl.style.cssText = 'margin:2px 0 0;';
  title.append(secKickerRow, secTitleEl, secSubTextEl);

  // Frecce schermo
  const prev = h('button', 'arrow l', '‹');
  prev.setAttribute('aria-label', 'Porta a sinistra');
  prev.title = 'Ruota verso la porta a sinistra';
  prev.onclick = () => rotateLeft();

  const next = h('button', 'arrow r', '›');
  next.setAttribute('aria-label', 'Porta a destra');
  next.title = 'Ruota verso la porta a destra';
  next.onclick = () => rotateRight();

  // Dock Card persistente creata una volta sola
  const info = h('div', 'dock');
  const cardEl = h('div', 'card info spaceDoorCard');
  const navRow = h('div', 'spaceDoorNavRow');

  const prevDoorBtn = h('button', 'doorNavPill doorNavPrev', '‹');
  prevDoorBtn.setAttribute('aria-label', 'Porta a sinistra');
  prevDoorBtn.title = 'Ruota verso la porta a sinistra';
  prevDoorBtn.onclick = (e) => { e.stopPropagation(); sfx.click(); rotateLeft(); };

  const titleBlock = h('div', 'doorTitleBlock');
  const cardKickerEl = h('p', 'kicker');
  cardKickerEl.style.marginBottom = '2px';
  const headingEl = h('h3', 'disp doorHeading');
  titleBlock.append(cardKickerEl, headingEl);

  const nextDoorBtn = h('button', 'doorNavPill doorNavNext', '›');
  nextDoorBtn.setAttribute('aria-label', 'Porta a destra');
  nextDoorBtn.title = 'Ruota verso la porta a destra';
  nextDoorBtn.onclick = (e) => { e.stopPropagation(); sfx.click(); rotateRight(); };

  navRow.append(prevDoorBtn, titleBlock, nextDoorBtn);

  const descEl = h('p', 'doorDesc');

  const btnWrap = h('div', 'row doorActionRow');
  btnWrap.style.cssText = 'margin:6px 0 0;gap:8px;flex-wrap:wrap;justify-content:center;';

  const backCardBtn = h('button', 'btn sub backToHubCardBtn', '← Hub (3 Porte)');
  backCardBtn.style.display = 'none';
  backCardBtn.onclick = () => { sfx.click(); switchToSector('main'); };

  const rulesB = h('button', 'btn rulesBtn', '📖 Regole');
  rulesB.onclick = () => {
    sfx.click();
    const d = doors[sel];
    if (!d) return;
    const item = d.item;
    if (item.isSector) {
      showRulesModal({
        name: item.name,
        tag: item.tag,
        desc: item.desc,
        rules: [
          `Benvenuto nella categoria ${item.name}!`,
          item.desc,
          'Avvicinati alla porta o tocca "Entra" per esplorare tutti i giochi di questo settore!'
        ]
      });
    } else {
      showRulesModal(item.baseGame || item);
    }
  };

  const playBtn = h('button', 'btn pri bigEnterBtn');
  playBtn.style.cssText = 'font-weight:900;padding:12px 22px;border:2px solid #ffffff;';
  playBtn.onclick = () => triggerPortalEntry(sel);

  btnWrap.append(backCardBtn, rulesB, playBtn);
  cardEl.append(navRow, descEl, btnWrap);
  info.append(cardEl);

  // Tools & Touch D-pad
  const tools = h('div', 'tools');
  const dpadToggle = h('button', 'pill btn dpadToggleBtn', '🕹️ Vola');
  dpadToggle.setAttribute('aria-label', 'Mostra o nascondi joystick di volo');
  dpadToggle.onclick = () => {
    const isVis = dpad.classList.toggle('visible');
    dpadToggle.classList.toggle('active', isVis);
  };
  tools.append(dpadToggle, speedBtn(), muteBtn());

  const dpad = h('div', 'spaceMobileDpad');
  const dpadUp = h('button', 'dpadBtn dpadUp', '▲');
  const dpadDown = h('button', 'dpadBtn dpadDown', '▼');
  const dpadLeft = h('button', 'dpadBtn dpadLeft', '◀');
  const dpadRight = h('button', 'dpadBtn dpadRight', '▶');
  dpadUp.setAttribute('aria-label', 'Avanza nello spazio');
  dpadDown.setAttribute('aria-label', 'Indietreggia nello spazio');
  dpadLeft.setAttribute('aria-label', 'Ruota a sinistra');
  dpadRight.setAttribute('aria-label', 'Ruota a destra');

  const setupDpadKey = (btn, key) => {
    const press = e => {
      e.preventDefault();
      moveKeys.add(key);
      btn.classList.add('active');
    };
    const release = e => {
      e.preventDefault();
      moveKeys.delete(key);
      btn.classList.remove('active');
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
  };
  setupDpadKey(dpadUp, 'w');
  setupDpadKey(dpadDown, 's');
  setupDpadKey(dpadLeft, 'a');
  setupDpadKey(dpadRight, 'd');
  dpad.append(dpadUp, dpadDown, dpadLeft, dpadRight);

  ui.append(title, prev, next, info, tools, dpad);

  function normAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function updateCameraAndAvatarOrientation() {
    if (isEntering) return;

    avatar.rotation.y = camYaw;

    const isMobile = window.innerWidth <= 768;
    const effCamDist = isMobile ? (currentSectorId === 'main' ? 3.6 : 3.4) : camDist;
    const px = avatar.position.x;
    const pz = avatar.position.z;
    const camX = px - Math.sin(camYaw) * effCamDist;
    const camZ = pz - Math.cos(camYaw) * effCamDist;
    const camY = (isMobile ? 1.85 : 2.6) + Math.sin(camPitch) * 3.8;

    const lookX = px + Math.sin(camYaw) * 12.0;
    const lookZ = pz + Math.cos(camYaw) * 12.0;
    const lookY = (isMobile ? 2.5 : 2.15) - Math.sin(camPitch) * 1.2;

    S.go([camX, camY, camZ], [lookX, lookY, lookZ]);
  }

  // AGGIORNAMENTO HUD ZERO-ALLOCATION (Ultra-veloce, nessun layout thrashing)
  function updateHUD() {
    const sec = SECTORS[currentSectorId] || SECTORS.main;
    const door = doors[sel];
    if (!door) return;

    const item = door.item;
    const isSector = !!item.isSector;
    const isFinalOnly = !!item.finalOnly;
    const actualGame = item.baseGame || item;
    const b = !isSector ? best(actualGame.id) : null;
    const a = door.accent;

    setAccent(a, sec.accentHex || '#2563eb');

    // Aggiornamento testata senza distruzione DOM
    secKickerEl.textContent = sec.kicker;
    secTitleEl.textContent = sec.title;
    secSubTextEl.textContent = sec.subText;
    topBackBtn.style.display = currentSectorId !== 'main' ? 'inline-flex' : 'none';

    // Aggiornamento scheda Dock senza innerHTML wipe
    const badgeText = isSector
      ? `CATEGORIA ${sel + 1} DI ${N} · ${item.tag}`
      : isFinalOnly
      ? `🏆 ROUND FINALE DIRETTO · ${item.tag}`
      : `PORTA ${String(sel + 1).padStart(2, '0')} DI ${N} · ${item.tag}`;

    cardKickerEl.textContent = badgeText;
    cardKickerEl.style.color = a;
    headingEl.textContent = item.name;

    const pl = (!isSector && actualGame.players)
      ? ` · ${actualGame.players.min ?? 1}–${actualGame.players.max ?? 4} giocatori`
      : '';
    descEl.innerHTML = `${esc(item.desc)}${pl}${b ? ` · Record <b class="gold">${b.toLocaleString('it-IT')}</b>` : ''}`;

    cardEl.style.borderColor = a + 'aa';
    cardEl.style.boxShadow = `0 12px 36px rgba(0,0,0,0.85), 0 0 28px ${a}55`;

    backCardBtn.style.display = currentSectorId !== 'main' ? 'inline-flex' : 'none';

    if (isSector) {
      playBtn.innerHTML = '<span class="enterBtnFull">🚪 Apri Categoria ed Entra ▸</span><span class="enterBtnMobile">🚀 Entra nel Settore 🚪</span>';
    } else if (isFinalOnly) {
      playBtn.innerHTML = '<span class="enterBtnFull">🏆 Gioca Subito il Round Finale ▸</span><span class="enterBtnMobile">🏆 Gioca Finale 🚪</span>';
    } else {
      playBtn.innerHTML = '<span class="enterBtnFull">🚪 Avvicinati, Apri ed Entra ▸</span><span class="enterBtnMobile">🚀 Entra nel Gioco 🚪</span>';
    }
    playBtn.style.background = `linear-gradient(135deg, ${a}, #2563eb)`;
    playBtn.style.boxShadow = `0 0 22px ${a}88`;

    // Posiziona il singolo faretto teatrale sulla porta attiva
    const doorAng = door.angle;
    activeDoorSpot.color.set(a);
    activeDoorSpot.position.set(Math.sin(doorAng) * (R - 3.8), 7.5, Math.cos(doorAng) * (R - 3.8));
    activeDoorSpot.target = door.grp;

    activeDoorRimLight.color.set(a);
    activeDoorRimLight.position.set(Math.sin(doorAng) * (R - 1.2), 2.5, Math.cos(doorAng) * (R - 1.2));

    // Evidenziazione visiva immediata
    doors.forEach((d, idx) => {
      const active = idx === sel;
      d.holoSign.scale.setScalar(active ? 1.15 : 0.9);
      d.haloPlane.material.opacity = active ? 0.75 : 0.16;
      d.runwayLine.material.opacity = active ? 0.75 : 0.14;
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
    if (announce && changed && doors[sel]) {
      const it = doors[sel].item;
      speakDrone(`${it.isSector ? 'Categoria' : 'Porta'}: ${it.name}`, 1800);
    }
  }

  function rotateRight() {
    rotateTo(sel - 1);
  }

  function rotateLeft() {
    rotateTo(sel + 1);
  }

  function rotateTo(index) {
    if (isEntering) return;
    selectDoorIndex(index, true);
    if (!doors[sel]) return;
    const targetYaw = doors[sel].angle;
    const diff = normAngle(targetYaw - camYaw);
    camYaw = camYaw + diff;
    sfx.whoosh();
    updateCameraAndAvatarOrientation();
  }

  // ============================================================================
  // 7. SEQUENZA CINEMATICA D'INGRESSO & TRANSIZIONE SETTORI
  // ============================================================================
  async function triggerPortalEntry(index) {
    if (isEntering) return;
    isEntering = true;
    sel = ((index % N) + N) % N;
    updateHUD();

    const doorObj = doors[sel];
    if (!doorObj) { isEntering = false; return; }

    const item = doorObj.item;
    const a = doorObj.accent;
    const doorAngle = doorObj.angle;

    title.style.transition = 'opacity 0.25s ease';
    title.style.opacity = '0';
    info.style.transition = 'opacity 0.25s ease';
    info.style.opacity = '0';
    prev.style.display = 'none';
    next.style.display = 'none';
    tools.style.display = 'none';

    sfx.fanfare();
    speakDrone(`Entriamo in ${item.name}!`, 2200);

    const yawDiff = normAngle(doorAngle - avatar.rotation.y);
    avatar.rotation.y += yawDiff;
    camYaw = avatar.rotation.y;

    const stopRadius = R - 2.3;
    const targetX = Math.sin(doorAngle) * stopRadius;
    const targetZ = Math.cos(doorAngle) * stopRadius;

    const camApproachX = Math.sin(doorAngle) * (R - 7.0);
    const camApproachZ = Math.cos(doorAngle) * (R - 7.0);
    const doorWorldX = Math.sin(doorAngle) * R;
    const doorWorldZ = Math.cos(doorAngle) * R;

    S.go([camApproachX, 2.8, camApproachZ], [doorWorldX, 2.2, doorWorldZ]);

    sfx.whoosh();
    jetFlameMat.color.set('#ffffff');
    const distToDoor = Math.hypot(targetX - avatar.position.x, targetZ - avatar.position.z);
    const moveDur = Math.max(0.55, Math.min(1.2, distToDoor * 0.09));

    tween(avatar.rotation, { x: 0.22 }, 0.2, ease.out);
    await Promise.all([
      tween(avatar.position, { x: targetX, y: 0.35, z: targetZ }, moveDur, ease.inout),
      tween(drone.position, { x: targetX + Math.cos(doorAngle) * 1.1, y: 2.3, z: targetZ - Math.sin(doorAngle) * 1.1 }, moveDur, ease.inout)
    ]);
    tween(avatar.rotation, { x: 0 }, 0.15, ease.out);

    avatar.point?.(700);
    await new Promise(r => setTimeout(r, 180));

    sfx.drum();
    sfx.click();

    await Promise.all([
      tween(doorObj.hingeL.rotation, { y: -Math.PI * 0.68 }, 0.65, ease.out),
      tween(doorObj.hingeR.rotation, { y: Math.PI * 0.68 }, 0.65, ease.out),
      tween(doorObj.vortex.scale, { x: 1.18, y: 1.12, z: 1 }, 0.65, ease.overshoot)
    ]);
    doorObj.isOpen = true;

    sfx.whoosh();
    const insideX = Math.sin(doorAngle) * (R + 0.4);
    const insideZ = Math.cos(doorAngle) * (R + 0.4);
    const camInsideX = Math.sin(doorAngle) * (R - 2.2);
    const camInsideZ = Math.cos(doorAngle) * (R - 2.2);

    S.go([camInsideX, 2.3, camInsideZ], [insideX, 2.2, insideZ]);

    await Promise.all([
      tween(avatar.position, { x: insideX, y: 0.9, z: insideZ }, 0.65, ease.in),
      tween(drone.position, { x: insideX, y: 2.1, z: insideZ }, 0.65, ease.in)
    ]);

    S.flashWith(a);
    sfx.win();
    await new Promise(r => setTimeout(r, 320));

    if (item.isSector) {
      switchToSector(item.sectorTarget);
      return;
    }

    const targetGame = item.baseGame || item;
    const cfg = item.finalOnly ? { finalOnly: true } : {};
    if (targetGame.players) {
      setup(targetGame, cfg);
    } else {
      intro(targetGame);
    }
  }

  function switchToSector(targetSectorId) {
    isEntering = false;
    currentSectorId = targetSectorId;

    avatar.position.set(0, 0.15, 0);
    avatar.rotation.set(0, 0, 0);
    drone.position.set(1.1, 2.2, 0.3);
    camYaw = 0;
    camPitch = 0.16;

    buildSectorDoors(currentSectorId);

    title.style.opacity = '1';
    info.style.opacity = '1';
    prev.style.display = 'block';
    next.style.display = 'block';
    tools.style.display = 'flex';

    updateCameraAndAvatarOrientation();
    updateHUD();

    const sec = SECTORS[currentSectorId] || SECTORS.main;
    speakDrone(currentSectorId === 'main' ? 'Tornato all\'Hub delle 3 Porte!' : `Benvenuto in ${sec.title}!`, 2200);
  }

  // ============================================================================
  // 8. CONTROLLI MOUSE / TOUCH / TASTIERA (Throttled & Ottimizzati)
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

      const norm = ((camYaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const closestIdx = Math.round(norm / step) % N;
      if (closestIdx !== sel) {
        sel = closestIdx;
        updateHUD();
      }

      updateCameraAndAvatarOrientation();
      return;
    }

    // Raycasting throttled a 75ms quando non si trascina
    const now = performance.now();
    if (now - lastRaycastTime > 75 && e.target.id === 'gl' && !isEntering) {
      lastRaycastTime = now;
      const hit = raycast(doorGroups, e);
      document.body.style.cursor = hit ? 'pointer' : 'grab';
    }
  };

  const up = e => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = '';

    if (dragMoved <= 10 && e.target.id === 'gl' && !ui.querySelector('.ov') && !isEntering) {
      const hit = raycast(doorGroups, e);
      if (!hit) return;
      const clickedId = hit.userData.id;
      triggerPortalEntry(clickedId);
    }
  };

  const wheel = e => {
    if (ui.querySelector('.ov') || isEntering) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      if (e.deltaX > 0) rotateRight();
      else rotateLeft();
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
    } else if (k === 'escape') {
      if (currentSectorId !== 'main') {
        switchToSector('main');
      }
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
  // 9. ANIMATION LOOP (Ottimizzato a 60 FPS)
  // ============================================================================
  let walkCycle = 0;

  S.on((dt, t) => {
    starfield.rotation.y += dt * 0.003;
    saturnSphere.rotation.y += dt * 0.08;
    saturnRings.rotation.z -= dt * 0.04;
    earthSphere.rotation.y += dt * 0.12;

    crystals.forEach(ast => {
      ast.rotation.x += dt * 0.25;
      ast.position.y = ast.userData.baseY + Math.sin(t * 1.2) * 0.2;
    });

    doors.forEach(d => {
      d.vortex.rotation.z += dt * 0.9;
    });

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

        const lookX = avatar.position.x + Math.sin(camYaw) * 6;
        const lookZ = avatar.position.z + Math.cos(camYaw) * 6;
        const ang = ((Math.atan2(lookX, lookZ) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const idx = Math.round(ang / step) % N;
        if (idx !== sel) {
          sel = idx;
          updateHUD();
        }

        updateCameraAndAvatarOrientation();
      } else {
        avatar.position.y = 0.18 + Math.sin(t * 1.6) * 0.12;
        avatar.rotation.x *= 0.9;
        avatar.rotation.z = Math.sin(t * 0.9) * 0.03;
      }

      const pulse = 0.6 + Math.sin(t * 14) * 0.35 + (isMoving ? 0.5 : 0);
      jetNozzleL.scale.set(1, pulse, 1);
      jetNozzleR.scale.set(1, pulse, 1);

      drone.position.x = avatar.position.x + Math.cos(camYaw) * 1.15 + Math.sin(t * 1.5) * 0.12;
      drone.position.y = avatar.position.y + 2.0 + Math.cos(t * 2.1) * 0.12;
      drone.position.z = avatar.position.z - Math.sin(camYaw) * 1.15 + Math.cos(t * 1.3) * 0.12;
      gyroRing1.rotation.x += dt * 1.8;
      gyroRing1.rotation.y += dt * 1.4;
    }
  });

  // Avvio iniziale
  buildSectorDoors('main');
  updateCameraAndAvatarOrientation();
  updateHUD();
  speakDrone('Benvenuto! Scegli una delle 3 porte: Show Game, Giochi da Tavolo, o Random & Finali!', 3200);

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

  return { teardown, rotateTo, rotateRight, rotateLeft, triggerPortalEntry, switchToSector };
}
