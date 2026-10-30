import { THREE, newStage, tween, raycast, ease, PAL, tune, person } from './engine.js';
import { h, sfx } from './ui.js';
import { GAME_FINALS } from './games/finals.js';

/**
 * GameCity — Open Space 3D Hub (Architettura Gerarchica a 3 Macro-Porte)
 *
 * 1. HUB CENTRALE (3 Macro-Porte Maestose a 120°):
 *    - 🚪 SHOW GAME TV: I 5 grandi quiz show serali (L'Eredità, Avanti un Altro, Caduta Libera, Affari Tuoi, Reazione a Catena)
 *    - 🚪 GIOCHI DA TAVOLO: I 5 grandi classici 3D multiplayer (Monopoly Italia 3D, Tombola 90, Bingo 90, Ouija 3D, Forza 4 3D)
 *    - 🚪 RANDOM & ROUND FINALI: I 4 minigiochi/duelli + accesso DIRETTO ai Round Finali dei giochi TV!
 *
 * 2. SUB-HUB DI SETTORE:
 *    - Una volta entrati in una porta, il personaggio atterra nel settore dedicato con le porte specifiche.
 *    - Pulsante ben visibile "← Torna alle 3 Porte" per rientrare all'Hub Principale in qualsiasi momento.
 *
 * 3. NAVIGAZIONE FRECCE CORRETTA:
 *    - Freccia DESTRA (›): ruota la telecamera verso la porta visibile a DESTRA.
 *    - Freccia SINISTRA (‹): ruota la telecamera verso la porta visibile a SINISTRA.
 *
 * 4. OTTIMIZZAZIONE RESPONSIVE MOBILE:
 *    - Porte ampie, ben distanziate, testi ad alto contrasto, comandi touch senza sovrapposizioni.
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

  // Illuminazione cosmica
  const cosmicSunLight = new THREE.DirectionalLight('#fff4dc', 2.3);
  cosmicSunLight.position.set(-30, 45, -60);
  S.add(cosmicSunLight);

  const cosmicFillLight = new THREE.DirectionalLight('#bae6fd', 1.4);
  cosmicFillLight.position.set(35, 25, 55);
  S.add(cosmicFillLight);

  const centerOmniLight = new THREE.PointLight('#38bdf8', 35, 32, 1.2);
  centerOmniLight.position.set(0, 6, 0);
  S.add(centerOmniLight);

  // ============================================================================
  // 1. CIELO STELLATO A 360° & NEBULOSE COSMICHE
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
  // 2. PIANETI 3D, LUNE E ANELLI NELLO SPAZIO
  // ============================================================================
  const planetsGroup = new THREE.Group();
  S.add(planetsGroup);

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
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 512, 18);
      ctx.fillRect(0, 238, 512, 18);
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
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 0, 512, 256);
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
    rg.addColorStop(0.2, c1 + 'cc');
    rg.addColorStop(0.55, c2 + 'ee');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Saturno
  const saturnGrp = new THREE.Group();
  saturnGrp.position.set(-48, 16, 56);
  const saturnSphere = new THREE.Mesh(
    new THREE.SphereGeometry(8.5, 36, 28),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture('saturn'), roughness: 0.65 })
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
  saturnGrp.add(saturnSphere, saturnRings);
  planetsGroup.add(saturnGrp);

  // Terra Nova
  const earthGrp = new THREE.Group();
  earthGrp.position.set(52, 14, 48);
  const earthSphere = new THREE.Mesh(
    new THREE.SphereGeometry(6.8, 36, 28),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture('earth'), roughness: 0.55 })
  );
  earthGrp.add(earthSphere);
  planetsGroup.add(earthGrp);

  // Aether (Viola)
  const purpleGrp = new THREE.Group();
  purpleGrp.position.set(4, 27, -68);
  const purpleSphere = new THREE.Mesh(
    new THREE.SphereGeometry(6.2, 32, 24),
    new THREE.MeshStandardMaterial({ map: makePlanetTexture('purple'), roughness: 0.5 })
  );
  purpleGrp.add(purpleSphere);
  planetsGroup.add(purpleGrp);

  // Asteroidi fluttuanti
  const asteroidGrp = new THREE.Group();
  S.add(asteroidGrp);
  const astMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.82 });
  const crystals = [];
  for (let i = 0; i < 24; i++) {
    const rad = 20 + Math.random() * 25;
    const ang = (i / 24) * Math.PI * 2;
    const y = -6 + Math.random() * 16;
    const ast = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.8, 0), astMat);
    ast.position.set(Math.sin(ang) * rad, y, Math.cos(ang) * rad);
    ast.userData = { rx: (Math.random() - 0.5) * 0.5, ry: (Math.random() - 0.5) * 0.5, baseY: y };
    asteroidGrp.add(ast);
    crystals.push(ast);
  }

  // ============================================================================
  // 3. PIATTAFORMA CENTRALE CON ANELLO ENERGETICO
  // ============================================================================
  const hubFloorGrp = new THREE.Group();
  S.add(hubFloorGrp);

  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(8.0, 9.8, 80),
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
    new THREE.RingGeometry(2.2, 2.55, 64),
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
    new THREE.SphereGeometry(0.185, 24, 20),
    new THREE.MeshPhysicalMaterial({ color: '#bae6fd', transparent: true, opacity: 0.28, roughness: 0.08 })
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
  const jetNozzleL = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 12), jetFlameMat);
  jetNozzleL.rotation.x = Math.PI;
  jetNozzleL.position.set(-0.1, 1.08, -0.17);
  const jetNozzleR = jetNozzleL.clone();
  jetNozzleR.position.x = 0.1;
  avatar.add(jetNozzleL, jetNozzleR);

  const avatarLight = new THREE.PointLight('#ffffff', 12, 7);
  avatarLight.position.set(0, 2.4, 0.6);
  avatar.add(avatarLight);

  // Drone compagno
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
  // 5. STRUTTURA DEI SETTORI (3 Macro-Porte Hub + Sub-Hub)
  // ============================================================================

  // Creazione voci standalone per i round finali
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
  let N = 3;
  let step = (Math.PI * 2) / N;
  let R = 8.8;
  const doorsGroup = new THREE.Group();
  S.add(doorsGroup);

  // Helper risoluzione oggetto porta
  function resolveDoorItem(ref) {
    if (typeof ref === 'object' && ref !== null) return ref;
    if (FINAL_ENTRIES[ref]) return FINAL_ENTRIES[ref];
    return gamesMap.get(ref);
  }

  // Texture vortice dimensionale
  function makeVortexTexture(accentHex) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const ctx = cv.getContext('2d');
    const cx = 128, cy = 128;

    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 128);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.3, accentHex);
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

  // Texture battenti porta ad alta definizione
  function makeDoorPanelTexture(item, accentHex, secHex, isLeft) {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 1024;
    const ctx = cv.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 512, 1024);
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
    ctx.fillRect(0, 0, 512, 1024);

    // Cornice esterna con bordo luminoso
    ctx.lineWidth = 14;
    ctx.strokeStyle = accentHex;
    ctx.strokeRect(18, 18, 476, 988);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.strokeRect(28, 28, 456, 968);

    // Formelle
    ctx.lineWidth = 6;
    ctx.strokeStyle = secHex || '#fbbf24';
    ctx.strokeRect(48, 56, 416, 400);
    ctx.strokeRect(48, 550, 416, 420);

    // Medaglione superiore
    ctx.beginPath();
    ctx.arc(256, 220, 115, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();
    ctx.lineWidth = 6;
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

    ctx.font = 'bold 118px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accentHex;
    ctx.fillText(item.icon || ICONS[item.id] || '★', 256, 222);

    // Targhetta centrale con nome
    ctx.fillStyle = 'rgba(6, 10, 22, 0.95)';
    ctx.beginPath();
    ctx.roundRect(44, 460, 424, 76, 14);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = accentHex;
    ctx.stroke();

    ctx.font = '900 40px "Bebas Neue", Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = accentHex;
    ctx.shadowBlur = 14;
    ctx.fillText(item.name.toUpperCase(), 256, 502);
    ctx.shadowBlur = 0;

    // Decorazione pannello inferiore
    if (item.isSector) {
      ctx.font = 'bold 46px "Bebas Neue", sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.fillText(isLeft ? '✦ ENTRA NEL ✦' : '✦ SETTORE ✦', 256, 750);
    } else if (item.finalOnly) {
      ctx.font = 'bold 48px "Bebas Neue", sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(isLeft ? '🏆 ROUND' : 'FINALE 🏆', 256, 750);
    } else if (item.id === 'tombola') {
      ctx.font = 'bold 68px "Bebas Neue", sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(isLeft ? '77 · 48' : '25 · 90', 256, 750);
    } else if (item.id === 'monopoly') {
      ctx.font = 'bold 54px "Bebas Neue", sans-serif';
      ctx.fillStyle = '#4ade80';
      ctx.fillText(isLeft ? 'VIA! 200$' : 'PROBABILITÀ', 256, 750);
    } else if (item.id === 'forza4') {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          ctx.beginPath();
          ctx.arc(164 + c * 184, 630 + r * 110, 40, 0, Math.PI * 2);
          ctx.fillStyle = (r + c + (isLeft ? 0 : 1)) % 2 === 0 ? '#ef4444' : '#facc15';
          ctx.fill();
        }
      }
    } else {
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillText(isLeft ? '✦ GIOCO TV ✦' : '✦ LIVE SHOW ✦', 256, 750);
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Cartello olografico superiore gigante
  function makeHoloMarquee(item, index, accentHex) {
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = 460;
    const ctx = cv.getContext('2d');

    const bgGrad = ctx.createLinearGradient(0, 0, 1024, 460);
    bgGrad.addColorStop(0, 'rgba(14, 22, 46, 0.98)');
    bgGrad.addColorStop(0.5, 'rgba(8, 12, 26, 0.96)');
    bgGrad.addColorStop(1, 'rgba(4, 7, 18, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(24, 24, 976, 412, 36);
    ctx.fill();

    ctx.lineWidth = 14;
    ctx.strokeStyle = accentHex;
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    const tagText = item.isSector
      ? `CATEGORIA ${index + 1} DI ${N} · ${item.tag.toUpperCase()}`
      : item.finalOnly
      ? `🏆 ROUND FINALE DIRETTO · ${item.tag.toUpperCase()}`
      : `PORTA ${String(index + 1).padStart(2, '0')} DI ${N} · ${item.tag.toUpperCase()}`;

    ctx.font = '800 28px Outfit, sans-serif';
    const tagWidth = Math.min(900, ctx.measureText(tagText).width + 64);
    const tagX = (1024 - tagWidth) / 2;

    const pillGrad = ctx.createLinearGradient(tagX, 48, tagX + tagWidth, 48);
    pillGrad.addColorStop(0, accentHex);
    pillGrad.addColorStop(1, '#3b82f6');
    ctx.fillStyle = pillGrad;
    ctx.beginPath();
    ctx.roundRect(tagX, 44, tagWidth, 54, 27);
    ctx.fill();

    ctx.fillStyle = '#050814';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, 512, 72);

    ctx.font = '900 86px "Bebas Neue", Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = accentHex;
    ctx.shadowBlur = 30;
    ctx.fillText(item.name.toUpperCase(), 512, 210);
    ctx.shadowBlur = 0;

    const actionText = item.isSector
      ? '✨ ENTRA NEL SETTORE 🚪'
      : item.finalOnly
      ? '🏆 SFIDA FINALE DIRETTA · TOCCA PER ENTRARE 🚪'
      : '✨ TOCCA PER ENTRARE NEL GIOCO 🚪';

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(70, 310, 884, 82, 22);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.stroke();

    ctx.font = '800 34px Outfit, sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText(actionText, 512, 352);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Sculture 3D uniche sopra e attorno alle porte
  function addUniqueDoorTheme3D(grp, item, a, b) {
    const id = item.id;
    const accentMat = new THREE.MeshStandardMaterial({ color: a, metalness: 0.65, roughness: 0.25 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.85, roughness: 0.2 });
    const glowAccent = new THREE.MeshBasicMaterial({ color: a, toneMapped: false });

    if (item.isSector) {
      if (id === 'shows') {
        // Truss studio TV + Faro teatrale + Ciak
        const trussMat = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.8, roughness: 0.2 });
        const truss = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 0.35), trussMat);
        truss.position.set(0, 4.65, 0.3);
        // Telecamera TV su cavalletto a sinistra
        const camBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.8), new THREE.MeshStandardMaterial({ color: '#0f172a' }));
        camBody.position.set(-1.95, 2.3, 0.4);
        const camLens = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.35, 16), goldMat);
        camLens.rotation.x = Math.PI / 2;
        camLens.position.set(-1.95, 2.3, 0.85);
        grp.add(truss, camBody, camLens);
      } else if (id === 'boardgames') {
        // Grandi Dadi 3D su architrave
        const dieWhite = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), new THREE.MeshStandardMaterial({ color: '#f8fafc' }));
        dieWhite.position.set(-0.45, 4.85, 0.3);
        dieWhite.rotation.set(0.3, 0.4, 0.2);
        const dieRed = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: '#dc2626' }));
        dieRed.position.set(0.45, 4.8, 0.3);
        dieRed.rotation.set(-0.2, 0.5, -0.3);
        grp.add(dieWhite, dieRed);
      } else {
        // Trofeo d'Oro gigante per Random e Round Finali
        const trophyCup = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.25, 0.65, 16), goldMat);
        trophyCup.position.set(0, 4.85, 0.3);
        const trophyBase = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.55), new THREE.MeshStandardMaterial({ color: '#1e293b' }));
        trophyBase.position.set(0, 4.45, 0.3);
        // Fulmini luminosi
        const boltGeo = new THREE.BoxGeometry(0.15, 3.8, 0.15);
        const boltL = new THREE.Mesh(boltGeo, glowAccent); boltL.position.set(-1.95, 2.1, 0.25);
        const boltR = new THREE.Mesh(boltGeo, glowAccent); boltR.position.set(1.95, 2.1, 0.25);
        grp.add(trophyCup, trophyBase, boltL, boltR);
      }
      return;
    }

    if (id === 'eredita' || id === 'eredita_finale') {
      const colGeo = new THREE.CylinderGeometry(0.28, 0.32, 4.4, 16);
      const colL = new THREE.Mesh(colGeo, goldMat); colL.position.set(-1.85, 2.2, 0.15);
      const colR = new THREE.Mesh(colGeo, goldMat); colR.position.set(1.85, 2.2, 0.15);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.08), new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.95, roughness: 0.1 }));
      blade.position.set(0, 3.85, 0.22);
      blade.rotation.z = -0.14;
      grp.add(colL, colR, blade);
    } else if (id === 'avanti' || id === 'avanti_finale') {
      for (let k = 0; k <= 8; k++) {
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 12, 12),
          new THREE.MeshBasicMaterial({ color: k % 2 === 0 ? '#fde047' : '#ec4899', toneMapped: false })
        );
        bulb.position.set(-1.6 + (k / 8) * 3.2, 4.35, 0.28);
        grp.add(bulb);
      }
      const pidigozzo = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 20), goldMat);
      pidigozzo.rotation.z = Math.PI / 2;
      pidigozzo.position.set(0, 4.75, 0.25);
      grp.add(pidigozzo);
    } else if (id === 'caduta' || id === 'caduta_finale') {
      const hazardMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.5, roughness: 0.3 });
      const pistL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.2, 12), hazardMat);
      pistL.position.set(-1.95, 2.1, 0.2);
      const pistR = pistL.clone(); pistR.position.x = 1.95;
      const ringTop = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 12, 24), glowAccent);
      ringTop.position.set(0, 4.65, 0.22);
      grp.add(pistL, pistR, ringTop);
    } else if (id === 'affari' || id === 'affari_finale') {
      const redBoxMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.35 });
      const blueBoxMat = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.35 });
      for (let k = 0; k < 3; k++) {
        const boxL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 0.55), k % 2 === 0 ? redBoxMat : blueBoxMat);
        boxL.position.set(-1.95, 0.5 + k * 0.65, 0.22);
        const boxR = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 0.55), k % 2 === 1 ? redBoxMat : blueBoxMat);
        boxR.position.set(1.95, 0.5 + k * 0.65, 0.22);
        grp.add(boxL, boxR);
      }
      const phone = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.28, 0.38), redBoxMat);
      phone.position.set(0, 4.7, 0.22);
      grp.add(phone);
    } else if (id === 'catena' || id === 'catena_finale') {
      for (let k = 0; k < 4; k++) {
        const linkL = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.075, 12, 24), k % 2 ? goldMat : accentMat);
        linkL.position.set(-1.9, 0.75 + k * 0.9, 0.22);
        linkL.rotation.y = (k % 2) * (Math.PI / 2);
        const linkR = linkL.clone(); linkR.position.x = 1.9;
        grp.add(linkL, linkR);
      }
    } else if (id === 'fight') {
      const tileCols = ['#ec4899', '#38bdf8', '#a855f7', '#fbbf24', '#10b981'];
      for (let k = 0; k < 5; k++) {
        const tm = new THREE.MeshBasicMaterial({ color: tileCols[k % tileCols.length], toneMapped: false });
        const tL = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.6, 0.12), tm);
        tL.position.set(-1.85, 0.65 + k * 0.75, 0.25);
        const tR = tL.clone(); tR.position.x = 1.85;
        grp.add(tL, tR);
      }
    } else if (id === 'hit') {
      const vinylMat = new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.2, metalness: 0.8 });
      [-1.9, 1.9].forEach(xPos => {
        const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24), vinylMat);
        vinyl.rotation.x = Math.PI / 2;
        vinyl.position.set(xPos, 2.3, 0.26);
        grp.add(vinyl);
      });
    } else if (id === 'math') {
      [-1.9, 1.9].forEach(xPos => {
        const poly = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.42, 0),
          new THREE.MeshStandardMaterial({ color: '#10b981', wireframe: true, emissive: '#10b981', emissiveIntensity: 0.6 })
        );
        poly.position.set(xPos, 2.4, 0.35);
        grp.add(poly);
      });
    } else if (id === 'cultura') {
      const diamond = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.48, 0),
        new THREE.MeshStandardMaterial({ color: '#38bdf8', metalness: 0.9, roughness: 0.1, emissive: '#6366f1', emissiveIntensity: 0.4 })
      );
      diamond.position.set(0, 4.8, 0.3);
      grp.add(diamond);
    } else if (id === 'monopoly') {
      const blackHatMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.25, metalness: 0.4 });
      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.07, 24), blackHatMat);
      hatBrim.position.set(0, 4.55, 0.25);
      const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 0.52, 24), blackHatMat);
      hatTop.position.set(0, 4.82, 0.25);
      const house = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.42), new THREE.MeshStandardMaterial({ color: '#10b981' }));
      house.position.set(-1.95, 1.4, 0.28);
      const hotel = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.48), new THREE.MeshStandardMaterial({ color: '#ef4444' }));
      hotel.position.set(-1.95, 2.3, 0.28);
      grp.add(hatBrim, hatTop, house, hotel);
    } else if (id === 'tombola') {
      const wickerMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.8 });
      const panariello = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.34, 0.62, 20), wickerMat);
      panariello.position.set(0, 4.72, 0.28);
      grp.add(panariello);
    } else if (id === 'bingo') {
      const ballCols = ['#ef4444', '#3b82f6', '#eab308', '#10b981', '#a855f7'];
      for (let k = 0; k < 5; k++) {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), new THREE.MeshStandardMaterial({ color: ballCols[k] }));
        const side = k < 3 ? -1.95 : 1.95;
        ball.position.set(side, 1.2 + (k % 3) * 1.1, 0.28);
        grp.add(ball);
      }
    } else if (id === 'ouija') {
      [-1.95, 1.95].forEach(xPos => {
        const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.65, 14), new THREE.MeshStandardMaterial({ color: '#fef3c7' }));
        candle.position.set(xPos, 1.5, 0.32);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 10), new THREE.MeshBasicMaterial({ color: '#fb923c', toneMapped: false }));
        flame.position.set(xPos, 1.92, 0.32);
        grp.add(candle, flame);
      });
    } else if (id === 'forza4') {
      const redDisc = new THREE.MeshStandardMaterial({ color: '#ef4444' });
      const yelDisc = new THREE.MeshStandardMaterial({ color: '#facc15' });
      for (let k = 0; k < 4; k++) {
        const dL = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 18), k % 2 === 0 ? redDisc : yelDisc);
        dL.rotation.x = Math.PI / 2;
        dL.position.set(-1.85, 0.9 + k * 0.85, 0.26);
        const dR = dL.clone(); dR.position.x = 1.85;
        grp.add(dL, dR);
      }
    }
  }

  // Costruzione porte del settore corrente
  function buildSectorDoors(sectorId) {
    // Rimuovi porte precedenti
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

    // Adatta cerchio pavimento
    outerRing.geometry.dispose();
    outerRing.geometry = new THREE.RingGeometry(R - 0.9, R + 0.9, 80);

    doors = validItems.map((item, i) => {
      let a = item.accentHex;
      let b = item.secHex;
      if (!a) {
        const colors = accent(item.baseGame || item);
        a = colors.a;
        b = colors.b;
      }

      // Angoli disposti in cerchio
      const ang = i * step;
      const grp = new THREE.Group();
      grp.position.set(Math.sin(ang) * R, 0, Math.cos(ang) * R);
      grp.rotation.y = ang + Math.PI; // Rivolta verso il centro (0, 0, 0)
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

      // Profili neon
      const neonMat = new THREE.MeshBasicMaterial({ color: a, toneMapped: false });
      const neonL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 4.05, 0.07), neonMat);
      neonL.position.set(-1.56, 2.1, 0.18);
      const neonR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 4.05, 0.07), neonMat);
      neonR.position.set(1.56, 2.1, 0.18);
      const neonT = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.07, 0.07), neonMat);
      neonT.position.set(0, 4.08, 0.18);

      // Battenti apribili
      const hingeL = new THREE.Group();
      hingeL.position.set(-1.54, 0, 0.08);
      const panelTexL = makeDoorPanelTexture(item, a, b, true);
      const doorLeafL = new THREE.Mesh(
        new THREE.BoxGeometry(1.53, 3.96, 0.1),
        new THREE.MeshStandardMaterial({ map: panelTexL, roughness: 0.35, metalness: 0.3 })
      );
      doorLeafL.position.set(0.765, 2.1, 0);
      const handleMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.95, roughness: 0.15 });
      const handleL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), handleMat);
      handleL.position.set(1.36, 2.0, 0.1);
      hingeL.add(doorLeafL, handleL);

      const hingeR = new THREE.Group();
      hingeR.position.set(1.54, 0, 0.08);
      const panelTexR = makeDoorPanelTexture(item, a, b, false);
      const doorLeafR = new THREE.Mesh(
        new THREE.BoxGeometry(1.53, 3.96, 0.1),
        new THREE.MeshStandardMaterial({ map: panelTexR, roughness: 0.35, metalness: 0.3 })
      );
      doorLeafR.position.set(-0.765, 2.1, 0);
      const handleR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), handleMat);
      handleR.position.set(-1.36, 2.0, 0.1);
      hingeR.add(doorLeafR, handleR);

      // Vortice dimensionale
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

      // Cartello superiore gigante
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
          opacity: 0.35,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      haloPlane.position.set(0, 5.85, 0.05);

      // Faretto teatrale
      const doorSpot = new THREE.SpotLight(a, 35, 25, Math.PI / 3, 0.45, 1.1);
      doorSpot.position.set(0, 7.5, 4.2);
      doorSpot.target = grp;
      grp.add(doorSpot);

      const doorRimLight = new THREE.PointLight(a, 12, 14);
      doorRimLight.position.set(0, 2.4, 1.5);
      grp.add(doorRimLight);

      // Sentiero luminoso
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
        doorSpot,
        doorRimLight,
        runwayLine,
        isOpen: false
      };
    });

    sel = 0;
  }

  // ============================================================================
  // 6. MOVIMENTO, TELECAMERA E LOGICA FRECCE CORRETTA
  // ============================================================================
  let sel = 0;
  let camYaw = 0;
  let camPitch = 0.16;
  let camDist = 6.2;
  let isEntering = false;
  const moveKeys = new Set();

  // Elementi UI
  const title = h('div', 'lobbyTitle');
  const prev = h('button', 'arrow l', '‹');
  prev.setAttribute('aria-label', 'Porta a sinistra');
  prev.title = 'Ruota verso la porta a sinistra';
  const next = h('button', 'arrow r', '›');
  next.setAttribute('aria-label', 'Porta a destra');
  next.title = 'Ruota verso la porta a destra';

  const info = h('div', 'dock');
  const tools = h('div', 'tools');
  const dpadToggle = h('button', 'pill btn dpadToggleBtn', '🕹️ Vola');
  dpadToggle.setAttribute('aria-label', 'Mostra o nascondi joystick di volo');
  dpadToggle.title = 'Attiva o disattiva il joystick per volare nello spazio';
  dpadToggle.onclick = () => {
    const isVis = dpad.classList.toggle('visible');
    dpadToggle.classList.toggle('active', isVis);
  };
  tools.append(dpadToggle, speedBtn(), muteBtn());

  // Touch virtual D-pad
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

    // Aggiorna titolo testata superiore
    const backBtnHtml = currentSectorId !== 'main'
      ? `<button class="backHubPill" id="backToHubTopBtn" aria-label="Torna alle 3 porte principali">← Torna alle 3 Porte</button>`
      : '';

    title.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;">
        <p class="kicker" style="letter-spacing:0.3em;margin:0;">${sec.kicker}</p>
        ${backBtnHtml}
      </div>
      <h1 class="disp" style="font-size:clamp(1.8rem, 5vw, 3.4rem);margin:2px 0 0;">${sec.title}</h1>
      <p class="spaceSubText" style="margin:2px 0 0;">${sec.subText}</p>
    `;

    const topBackBtn = title.querySelector('#backToHubTopBtn');
    if (topBackBtn) {
      topBackBtn.onclick = (e) => {
        e.stopPropagation();
        sfx.click();
        switchToSector('main');
      };
    }

    // Costruzione scheda Dock
    info.innerHTML = '';
    const c = h('div', 'card info spaceDoorCard');
    c.style.cssText = `border:1.5px solid ${a}aa;box-shadow:0 12px 36px rgba(0,0,0,0.85), 0 0 28px ${a}55;`;

    // RIGA NAVIGAZIONE FRECCE CORRETTA:
    // [ ‹ ] TITOLO [ › ]
    // In Three.js dal punto di vista della telecamera:
    // La porta a DESTRA sullo schermo corrisponde a sel - 1
    // La porta a SINISTRA sullo schermo corrisponde a sel + 1
    const navRow = h('div', 'spaceDoorNavRow');

    const prevDoorBtn = h('button', 'doorNavPill doorNavPrev', '‹');
    prevDoorBtn.setAttribute('aria-label', 'Porta a sinistra');
    prevDoorBtn.title = 'Ruota verso la porta a sinistra';
    prevDoorBtn.onclick = (e) => { e.stopPropagation(); sfx.click(); rotateLeft(); };

    const titleBlock = h('div', 'doorTitleBlock');
    const badgeText = isSector
      ? `CATEGORIA ${sel + 1} DI ${N} · ${esc(item.tag)}`
      : isFinalOnly
      ? `🏆 ROUND FINALE DIRETTO · ${esc(item.tag)}`
      : `PORTA ${String(sel + 1).padStart(2, '0')} DI ${N} · ${esc(item.tag)}`;

    titleBlock.innerHTML = `
      <p class="kicker" style="color:${a};margin-bottom:2px;">${badgeText}</p>
      <h3 class="disp doorHeading">${esc(item.name)}</h3>
    `;

    const nextDoorBtn = h('button', 'doorNavPill doorNavNext', '›');
    nextDoorBtn.setAttribute('aria-label', 'Porta a destra');
    nextDoorBtn.title = 'Ruota verso la porta a destra';
    nextDoorBtn.onclick = (e) => { e.stopPropagation(); sfx.click(); rotateRight(); };

    navRow.append(prevDoorBtn, titleBlock, nextDoorBtn);

    const descP = h('p', 'doorDesc');
    const pl = (!isSector && actualGame.players)
      ? ` · ${actualGame.players.min ?? 1}–${actualGame.players.max ?? 4} giocatori`
      : '';
    descP.innerHTML = `${esc(item.desc)}${pl}${b ? ` · Record <b class="gold">${b.toLocaleString('it-IT')}</b>` : ''}`;

    const btnWrap = h('div', 'row doorActionRow');
    btnWrap.style.cssText = 'margin:6px 0 0;gap:8px;flex-wrap:wrap;justify-content:center;';

    // Pulsante "Torna all'Hub" nella scheda se siamo in un settore
    if (currentSectorId !== 'main') {
      const backCardBtn = h('button', 'btn sub backToHubCardBtn', '← Hub (3 Porte)');
      backCardBtn.onclick = () => { sfx.click(); switchToSector('main'); };
      btnWrap.append(backCardBtn);
    }

    // Regole
    const rulesB = h('button', 'btn rulesBtn', '📖 Regole');
    rulesB.onclick = () => {
      sfx.click();
      if (isSector) {
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
        showRulesModal(actualGame);
      }
    };
    btnWrap.append(rulesB);

    // Pulsante di ingresso principale
    const play = h('button', 'btn pri bigEnterBtn');
    if (isSector) {
      play.innerHTML = '<span class="enterBtnFull">🚪 Apri Categoria ed Entra ▸</span><span class="enterBtnMobile">🚀 Entra nel Settore 🚪</span>';
    } else if (isFinalOnly) {
      play.innerHTML = '<span class="enterBtnFull">🏆 Gioca Subito il Round Finale ▸</span><span class="enterBtnMobile">🏆 Gioca Finale 🚪</span>';
    } else {
      play.innerHTML = '<span class="enterBtnFull">🚪 Avvicinati, Apri ed Entra ▸</span><span class="enterBtnMobile">🚀 Entra nel Gioco 🚪</span>';
    }
    play.style.cssText = `font-weight:900;padding:12px 22px;background:linear-gradient(135deg, ${a}, #2563eb);border:2px solid #ffffff;box-shadow:0 0 22px ${a}88;`;
    play.onclick = () => triggerPortalEntry(sel);
    btnWrap.append(play);

    c.append(navRow, descP, btnWrap);
    info.append(c);

    // Evidenzia visivamente la porta attiva con faretto e aura
    doors.forEach((d, idx) => {
      const active = idx === sel;
      tween(d.holoSign.scale, [active ? 1.15 : 0.9, active ? 1.15 : 0.9, 1], 0.35, ease.overshoot);
      d.haloPlane.material.opacity = active ? 0.75 : 0.16;
      d.doorSpot.intensity = active ? 120 : 25;
      d.doorRimLight.intensity = active ? 22 : 6;
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
      speakDrone(`${it.isSector ? 'Categoria' : 'Porta'}: ${it.name}`, 2000);
    }
  }

  // ROTAZIONE FRECCE:
  // Sullo schermo la porta visibile a destra è sel - 1
  // La porta visibile a sinistra è sel + 1
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

  // Frecce schermo esterno
  prev.onclick = () => rotateLeft();
  next.onclick = () => rotateRight();

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

    // Nascondi UI durante l'ingresso
    title.style.transition = 'opacity 0.35s ease';
    title.style.opacity = '0';
    info.style.transition = 'opacity 0.35s ease';
    info.style.opacity = '0';
    prev.style.display = 'none';
    next.style.display = 'none';
    tools.style.display = 'none';

    sfx.fanfare();
    speakDrone(`Andiamo ad aprire la porta di ${item.name}!`, 2600);

    // 1. Orientamento verso la porta
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

    // 2. Volo/Camminata verso la porta
    sfx.whoosh();
    jetFlameMat.color.set('#ffffff');
    const distToDoor = Math.hypot(targetX - avatar.position.x, targetZ - avatar.position.z);
    const moveDur = Math.max(0.65, Math.min(1.45, distToDoor * 0.1));

    tween(avatar.rotation, { x: 0.22 }, 0.25, ease.out);
    await Promise.all([
      tween(avatar.position, { x: targetX, y: 0.35, z: targetZ }, moveDur, ease.inout),
      tween(drone.position, { x: targetX + Math.cos(doorAngle) * 1.1, y: 2.3, z: targetZ - Math.sin(doorAngle) * 1.1 }, moveDur, ease.inout)
    ]);
    tween(avatar.rotation, { x: 0 }, 0.2, ease.out);

    // 3. Apertura fisica dei battenti
    avatar.point?.(900);
    await new Promise(r => setTimeout(r, 220));

    sfx.drum();
    sfx.click();
    speakDrone(`Porta aperta! Entriamo in ${item.name}!`, 2200);

    await Promise.all([
      tween(doorObj.hingeL.rotation, { y: -Math.PI * 0.68 }, 0.78, ease.out),
      tween(doorObj.hingeR.rotation, { y: Math.PI * 0.68 }, 0.78, ease.out),
      tween(doorObj.vortex.scale, { x: 1.18, y: 1.12, z: 1 }, 0.78, ease.overshoot)
    ]);
    doorObj.isOpen = true;

    // 4. Ingresso attraverso il vortice
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

    // 5. Flash cosmico e transizione
    S.flashWith(a);
    sfx.win();
    await new Promise(r => setTimeout(r, 380));

    // Se è un portale di settore: entriamo nel sub-settore!
    if (item.isSector) {
      switchToSector(item.sectorTarget);
      return;
    }

    // Se è un gioco o round finale: avvia configurazione/gioco!
    const targetGame = item.baseGame || item;
    const cfg = item.finalOnly ? { finalOnly: true } : {};
    if (targetGame.players) {
      setup(targetGame, cfg);
    } else {
      intro(targetGame);
    }
  }

  // Cambio settore fluido con rigenerazione porte
  function switchToSector(targetSectorId) {
    isEntering = false;
    currentSectorId = targetSectorId;

    // Riposiziona personaggio e drone al centro dello spazio
    avatar.position.set(0, 0.15, 0);
    avatar.rotation.set(0, 0, 0);
    drone.position.set(1.1, 2.2, 0.3);
    camYaw = 0;
    camPitch = 0.16;

    // Rigenera porte del settore scelto
    buildSectorDoors(currentSectorId);

    // Ripristina UI
    title.style.opacity = '1';
    info.style.opacity = '1';
    prev.style.display = 'block';
    next.style.display = 'block';
    tools.style.display = 'flex';

    updateCameraAndAvatarOrientation();
    updateHUD();

    const sec = SECTORS[currentSectorId] || SECTORS.main;
    speakDrone(currentSectorId === 'main' ? 'Tornato all\'Hub delle 3 Porte!' : `Benvenuto nel settore ${sec.title}!`, 2600);
  }

  // ============================================================================
  // 8. CONTROLLI MOUSE / TOUCH / TASTIERA
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

    if (dragMoved <= 10 && e.target.id === 'gl' && !ui.querySelector('.ov') && !isEntering) {
      const hit = raycast(doors.map(d => d.grp), e);
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
  // 9. ANIMATION LOOP
  // ============================================================================
  let walkCycle = 0;

  S.on((dt, t) => {
    starfield.rotation.y += dt * 0.003;
    saturnSphere.rotation.y += dt * 0.08;
    saturnRings.rotation.z -= dt * 0.04;
    earthSphere.rotation.y += dt * 0.12;
    purpleSphere.rotation.y += dt * 0.07;

    crystals.forEach(ast => {
      ast.rotation.x += dt * ast.userData.rx;
      ast.rotation.y += dt * ast.userData.ry;
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
        if (idx !== sel) selectDoorIndex(idx, false);

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

  // Costruisci le 3 macro-porte iniziali
  buildSectorDoors('main');
  updateCameraAndAvatarOrientation();
  updateHUD();
  speakDrone('Benvenuto! Scegli una delle 3 porte: Show Game, Giochi da Tavolo, o Random & Finali!', 3800);

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
