import {THREE, newStage, tween, label3d, mat, glow, raycast, person, anim, PAL} from '../engine.js';
import {h, sfx, eur, shuffle, tone} from '../ui.js';
import {createHost, HOSTS} from '../host.js';
import {REG, BANKER, ROUNDS, JACKPOT, LUCKY, SPECIALS, contents, BOARD_L, BOARD_R, offer, halfOptions, layout, DIM, ME, HOSTPOS, PHONE} from './affari_data.js';

const V3 = THREE.Vector3;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const any = a => a[Math.floor(Math.random() * a.length)];
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const REGCOL = REG.map((_, i) => '#' + new THREE.Color().setHSL(i / 20, .42, .42).getHexString());
const COL = {blue: '#1d3570', red: '#6e1d2c', nero: '#0b0b0f'};

// host lines specific to this show (flavour only: every choice is also on the cards)
const L = {
  region: ['{name}, di che regione sei? Giocherai con il pacco della tua terra.', 'Prima cosa, {name}: da dove vieni? Il tuo pacco è quello della tua regione.'],
  mine: ['Ecco il pacco numero {n}, {reg}. Da adesso è tuo, {name}: nessuno sa cosa c’è dentro.', 'Il pacco {n} della regione {reg}. Tienilo stretto, {name}.'],
  pick: ['Quale pacco apriamo, {name}?', 'Scegli tu, {name}. Chi chiamiamo?', 'Avanti, il prossimo pacco.', 'Fidati dell’istinto, {name}.', 'Guardali negli occhi, i pacchisti. Chi ha il premio piccolo?'],
  gen: ['Ma guarda chi c’è! Gennarino, il cane del Dottore!', 'Bau! È Gennarino! Il Dottore lo manda a salutarti.'],
  genJack: ['Gennarino nei primi tre pacchi! {name}, hai sbloccato il jackpot da {v}!'],
  bal: ['Musica, maestro! È la Ballerina!', 'La Ballerina! Un balletto e via, nessun danno.'],
  inv: ['Un’invenzione: {joke}! Il Dottore ha un senso dell’umorismo tutto suo.'],
  nero: ['Il Pacco Nero! Nemmeno il Dottore sapeva cosa c’era dentro… vediamo.', 'Pacco Nero, signori. Il mistero si svela adesso.'],
  ring: ['Squilla il telefono… è il Dottore.', 'Eccolo. Puntuale come sempre.', 'Silenzio in studio: chiama il Dottore.'],
  tease: ['Dottore, stasera la sento nervoso.', 'Il Dottore suda, lo sento dalla voce.', 'Dottore, ci tratti bene, eh! {name} è una brava persona.', 'Sì, Dottore… ho capito… glielo dico.'],
  cambio: ['Il Dottore ti propone un cambio, {name}: vuoi scambiare il tuo pacco con un altro?'],
  offer: ['Il Dottore offre {v}. {name}: affare o non affare?', 'Offerta del Dottore: {v}. Ci pensi bene, {name}.'],
  deal: ['Affare fatto! {v} per {name}. Ma adesso… vediamo cosa c’era nel tuo pacco.'],
  nodeal: ['Non affare! Si va avanti.', 'Coraggio da vendere. Dottore, ha sentito? Non affare!', 'Rifiuta! Il pubblico applaude.'],
  final: ['Due pacchi, {name}. Il tuo e il {n}. Il Dottore non sa, io non so. Decidi tu.', 'Siamo alla fine, {name}. Due pacchi, nessun indizio. Tieni, cambi, o tenti la regione fortunata?'],
  lucky: ['La regione fortunata! In questa busta c’è il nome di una regione. Indovinala e vinci {v}.'],
  lucky2: ['No… ma hai una seconda possibilità: tolgo metà delle regioni. Adesso vale {v}.'],
  luckyOk: ['È lei! La regione fortunata! {v}!'],
  luckyKo: ['No, mi dispiace. Nella busta c’era {reg}.'],
  open: ['Apriamo… il pacco {n}.', 'Pacco {n}, {reg}. Vediamo…']
};

export default {
  id: 'affari', name: 'Affari Tuoi', tag: 'Il Dottore ti chiama', desc: '20 pacchi, 20 regioni, un solo Dottore', c1: '#2f5fd0', c2: '#c8324f',
  players: {min: 1, max: 4, def: 1}, difficulty: true, // difficulty: show CPU row (banker generosity)
  rules: [
    'Scegli la tua regione: il pacco della tua regione è tuo fino alla fine. Gli altri 19 li tengono i pacchisti delle altre regioni.',
    'Nei pacchi: 0, 1, 10, 20, 50, 100, 200 € (blu) e 10.000 → 300.000 € (rossi), più gli speciali: Pacco Nero (copia nascosta di un premio), Gennarino (jackpot di 20.000 € se esce nei primi 3), Ballerina e Invenzione.',
    'Apri i pacchi a gruppi di 6, 3, 3, 2, 2, 1, 1. Dopo ogni gruppo telefona il Dottore: prima propone il cambio pacco, poi offerte in denaro. Affare o non affare?',
    'Finale con 2 pacchi: nessuno sa cosa contengono. Tieni il tuo, cambia, oppure gioca La regione fortunata (100.000 € al primo tentativo, 50.000 € al secondo).',
    'In più giocatori ognuno gioca la sua partita completa a turno, contro lo stesso Dottore: vince chi porta a casa di più. Il livello di difficoltà rende le offerte del Dottore più generose o più avare.'
  ],
  async start(ctx) {
    const S = ctx.stage = newStage({c1: this.c1, c2: this.c2, bg: '#05060d', cam: [0, 6, 12], look: [0, .9, 0]});
    S.par = .25;
    const T = (o, to, d, e) => ctx.w(tween(o, to, d, e));
    const baseLights = []; S.scene.traverse(o => { if (o.isLight) baseLights.push([o, o.intensity]); });
    const ledC = S.panels[0]?.material.color;

    // ---------- materials ----------
    const M = {
      box: mat('#7a1d2a', {roughness: .38, metalness: .12}), boxIn: mat('#120a0b', {roughness: .95, metalness: 0}),
      gold: mat('#c9a24e', {metalness: .9, roughness: .3}), ped: mat('#10152b', {metalness: .5, roughness: .32}),
      plinth: mat('#0b0f1f', {metalness: .3, roughness: .55}), led: glow('#d8b45a'), ivory: mat('#efe6cf', {roughness: .6, metalness: 0})
    };

    // ---------- pacchi (one per region, sticker = number + region) ----------
    const paccs = REG.map((reg, i) => {
      const g = new THREE.Group(); g.userData.id = 'p' + i;
      const inner = new THREE.Group(); g.add(inner); // hover lifts this, tweens move g
      const body = new THREE.Mesh(new THREE.BoxGeometry(DIM.boxW, DIM.boxH, DIM.boxD), M.box); body.position.y = DIM.boxH / 2;
      const cav = new THREE.Mesh(new THREE.PlaneGeometry(DIM.boxW - .06, DIM.boxD - .06), M.boxIn); cav.rotation.x = -Math.PI / 2; cav.position.y = DIM.boxH + .002;
      const band = new THREE.Mesh(new THREE.BoxGeometry(DIM.boxW + .012, .045, DIM.boxD + .012), M.gold); band.position.y = .05;
      const lidP = new THREE.Group(); lidP.position.set(0, DIM.boxH, -DIM.boxD / 2);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(DIM.boxW + .03, .05, DIM.boxD + .03), M.box); lid.position.set(0, .025, DIM.boxD / 2);
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(.05, .012, DIM.boxD + .035), M.gold); r1.position.set(0, .056, DIM.boxD / 2);
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(DIM.boxW + .035, .012, .05), M.gold); r2.position.set(0, .056, DIM.boxD / 2);
      const bow = new THREE.Mesh(new THREE.TorusGeometry(.035, .012, 8, 18), M.gold); bow.position.set(0, .075, DIM.boxD / 2); bow.rotation.x = Math.PI / 2;
      // value card on the lid's underside: only visible once the lid swings open
      const card = label3d(' ', {w: DIM.boxW - .08, h: DIM.boxD - .08, px: 320, border: PAL.gold});
      card.rotation.x = Math.PI / 2; card.position.set(0, -.003, DIM.boxD / 2); card.visible = false;
      lidP.add(lid, r1, r2, bow, card);
      const sticker = label3d([{t: String(i + 1), fs: .56}, {t: reg.toUpperCase(), fs: .26, font: 'Outfit'}], {w: .5, h: .3, px: 320, bg: '#efe6cf', border: '#b8913a', color: '#2a1810', radius: .12});
      sticker.position.set(0, DIM.boxH * .55, DIM.boxD / 2 + .004);
      inner.add(body, cav, band, lidP, sticker);
      S.add(g);
      return {g, inner, body, lidP, card, i, n: i + 1, reg, c: null, open: false, slot: null, moving: false};
    });

    // ---------- 19 holder slots: plinth + lit pedestal + regional character with sash ----------
    const SK = ['#f0d0b4', '#e2b893', '#d9a77f', '#c99272', '#e9c3a0', '#b98262'], HR = ['#2a1d14', '#6b4a2a', '#1c1416', '#b9b6b0', '#7a3b22', '#c9a46a'];
    const SU = ['#1d2236', '#2a2f3d', '#1f2a3a', '#2c2430', '#232a26', '#30283a'];
    const sashOn = (pp, col) => { const s = new THREE.Mesh(new THREE.BoxGeometry(.075, .66, .012), mat(col, {roughness: .5, metalness: .1})); s.position.set(0, .3, .136); s.rotation.z = .72; pp.joints.spine.add(s); return s; };
    const slots = Array.from({length: 19}, (_, k) => {
      const g = new THREE.Group(); S.add(g);
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(DIM.plinthW, 1, DIM.plinthD), M.plinth); plinth.position.z = DIM.plinthZ;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(DIM.plinthW, .018, .01), M.led); strip.position.z = DIM.plinthZ + DIM.plinthD / 2 + .006;
      const top = new THREE.Group();
      const ped = new THREE.Mesh(new THREE.BoxGeometry(DIM.pedW, DIM.pedH, DIM.pedD), M.ped); ped.position.y = DIM.pedH / 2;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(DIM.pedW + .04, .03, DIM.pedD + .04), M.gold); cap.position.y = DIM.pedH + .015;
      const led = new THREE.Mesh(new THREE.BoxGeometry(DIM.pedW - .1, .022, .005), M.led); led.position.set(0, .12, DIM.pedD / 2 + .003);
      const f = k % 3 === 1;
      const pp = person({suit: SU[k % 6], shirt: '#ece6da', tie: '#5a2a33', skin: SK[(k * 5) % 6], hair: HR[(k * 7) % 6], hairStyle: f ? ['long', 'bob', 'bun'][k % 3] : ['short', 'slick', 'curly', 'bald'][k % 4], female: f});
      pp.position.z = DIM.personZ;
      const sash = sashOn(pp, '#888');
      top.add(ped, cap, led, pp); g.add(plinth, strip, top);
      return {g, plinth, strip, top, person: pp, sash, d: null};
    });

    // ---------- contestant, own pedestal, host, phone ----------
    const ownPed = new THREE.Group(); ownPed.position.set(...ME.ped); S.add(ownPed);
    { const col = new THREE.Mesh(new THREE.CylinderGeometry(.42, .5, 1, 40), M.ped); col.position.y = .5;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(.47, .47, .04, 40), M.gold); cap.position.y = 1.02;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(.505, .505, .02, 40, 1, true), M.led); ring.position.y = .12;
      ownPed.add(col, cap, ring); }
    const OWN_TOP = new V3(ME.ped[0], 1.04, ME.ped[2]);
    const contestant = person({suit: PAL.gold, skin: '#e6bf9c', hair: '#3a2a1e'}); contestant.position.set(...ME.person); contestant.rotation.y = .25; S.add(contestant);
    const cSash = sashOn(contestant, PAL.gold);
    const host = createHost(ctx, {...HOSTS.affari, position: HOSTPOS, lookAt: [0, 1.6, ME.person[2]]});

    const phoneG = new THREE.Group(); phoneG.position.set(...PHONE); S.add(phoneG);
    const ph = new THREE.Group(), hs = new THREE.Group();
    { const col = new THREE.Mesh(new THREE.CylinderGeometry(.07, .12, 1, 16), M.ped); col.position.y = .5;
      const tab = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .035, 32), M.gold); tab.position.y = 1.02;
      ph.position.y = 1.04; ph.rotation.y = -.55;
      const red = mat('#7d1726', {roughness: .22, metalness: .25});
      const base = new THREE.Mesh(new THREE.BoxGeometry(.26, .09, .2), red); base.position.y = .045;
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .012, 24), M.ivory); dial.position.set(0, .096, .03);
      [-.08, .08].forEach(x => { const pr = new THREE.Mesh(new THREE.BoxGeometry(.03, .04, .03), red); pr.position.set(x, .11, -.04); ph.add(pr); });
      const grip = new THREE.Mesh(new THREE.CapsuleGeometry(.022, .2, 4, 10), red); grip.rotation.z = Math.PI / 2;
      [-.12, .12].forEach(x => { const cup = new THREE.Mesh(new THREE.CylinderGeometry(.036, .03, .04, 14), red); cup.position.set(x, -.018, 0); hs.add(cup); });
      hs.add(grip); hs.position.set(0, .15, -.04); ph.add(base, dial, hs); phoneG.add(col, tab, ph); }
    let ringing = false, ringI = 0;
    anim.on((dt, t) => { if (!ringing) return; hs.position.y = .15 + Math.abs(Math.sin(t * 38)) * .018; ph.rotation.z = Math.sin(t * 61) * .03; });
    const ring = on => { ringing = on; clearInterval(ringI); if (on) { sfx.phone(); ringI = setInterval(() => sfx.phone(), 1300); } else { ph.rotation.z = 0; hs.position.y = .15; } };
    const envelope = label3d([{t: '?', fs: .7}], {w: .36, h: .24, px: 300, bg: '#efe6cf', border: '#b8913a', color: '#7a1d2a'});
    envelope.position.set(PHONE[0] - .05, 1.22, PHONE[2] + .14); envelope.rotation.x = -.5; envelope.visible = false; S.add(envelope);

    // ---------- lights: call spot + box spot (dimming during offers) ----------
    const callSpot = new THREE.SpotLight('#ffe2b8', 0, 30, .38, .6, 1.5); callSpot.position.set(1.4, 9, 10); callSpot.target.position.set(1.6, 1, 4.4); S.add(callSpot); S.add(callSpot.target);
    const boxSpot = new THREE.SpotLight('#fff1d8', 0, 25, .16, .5, 1.5); S.add(boxSpot); S.add(boxSpot.target);
    const dim = on => { baseLights.forEach(([l, i]) => tween(l, {intensity: i * (on ? .3 : 1)}, .9)); if (ledC) tween(ledC, on ? [.22, .22, .22] : [.72, .72, .72], .9); tween(callSpot, {intensity: on ? 170 : 0}, .9); };

    // ---------- rolled-down prize board ----------
    const roll = new THREE.Group(); roll.rotation.x = .18; roll.visible = false; S.add(roll);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 5.3, 20), M.gold); bar.rotation.z = Math.PI / 2;
    const sheetG = new THREE.Group(); sheetG.scale.y = .001;
    const sheet = label3d(' ', {w: 5, h: 2, px: 150}); sheet.position.y = -1.05;
    const wgt = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 5.1, 12), M.gold); wgt.rotation.z = Math.PI / 2; wgt.position.y = -2.08;
    sheetG.add(sheet, wgt); roll.add(bar, sheetG);
    const showBoard = async (lines, bg) => { sheet.set(lines, {bg, border: PAL.gold}); roll.visible = true; sheetG.scale.y = .001; sfx.whoosh(); await T(sheetG.scale, {y: 1}, .75, 'bounce'); };
    const hideBoard = async () => { if (!roll.visible) return; await T(sheetG.scale, {y: .001}, .35, 'in'); roll.visible = false; };

    // ---------- special props (one each, reused) ----------
    const props = {};
    { const g = new THREE.Group(), fur = mat('#c79a62', {roughness: .85, metalness: 0}), dk = mat('#3a2616', {roughness: .7, metalness: 0});
      const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
      add(new THREE.CapsuleGeometry(.07, .16, 4, 10), fur, 0, .15, 0).rotation.z = Math.PI / 2;
      [[-.07, -.04], [-.07, .04], [.07, -.04], [.07, .04]].forEach(([x, z]) => add(new THREE.CylinderGeometry(.022, .022, .1, 8), fur, x, .05, z));
      add(new THREE.SphereGeometry(.075, 14, 10), fur, .15, .25, 0); add(new THREE.SphereGeometry(.04, 10, 8), fur, .22, .23, 0).scale.set(1.2, .8, .9);
      add(new THREE.SphereGeometry(.016, 8, 6), dk, .26, .24, 0);
      [-1, 1].forEach(s => { add(new THREE.ConeGeometry(.03, .08, 8), dk, .13, .32, s * .045).rotation.x = s * .4; add(new THREE.SphereGeometry(.012, 8, 6), dk, .205, .27, s * .03); });
      const tail = new THREE.Group(); tail.position.set(-.15, .19, 0); g.add(tail);
      const tl = new THREE.Mesh(new THREE.CylinderGeometry(.012, .016, .11, 8), fur); tl.position.y = .05; tail.add(tl); tail.rotation.z = .7;
      anim.on((dt, t) => { if (g.visible) { tail.rotation.x = Math.sin(t * 18) * .6; g.position.y = (g.userData.y ?? 0) + Math.abs(Math.sin(t * 6)) * .03; } });
      props.gen = g; }
    { const g = new THREE.Group(), pink = mat('#e9c6cc', {roughness: .6, metalness: 0}), skin = mat('#efcaa9', {roughness: .6, metalness: 0});
      const add = (geo, m, y) => { const o = new THREE.Mesh(geo, m); o.position.y = y; g.add(o); return o; };
      add(new THREE.CylinderGeometry(.008, .008, .13, 6), skin, .065); add(new THREE.CylinderGeometry(.03, .12, .05, 18), pink, .13);
      add(new THREE.CylinderGeometry(.024, .034, .1, 12), pink, .2); add(new THREE.SphereGeometry(.03, 12, 10), skin, .28); add(new THREE.SphereGeometry(.016, 8, 6), mat('#3a2616'), .31);
      const arms = add(new THREE.BoxGeometry(.2, .01, .012), skin, .24); arms.rotation.z = .25;
      anim.on(dt => { if (g.visible) g.rotation.y += dt * 7; });
      props.bal = g; }
    { const g = new THREE.Group(), brass = mat('#b8913a', {metalness: .9, roughness: .3});
      const add = (geo, m, y) => { const o = new THREE.Mesh(geo, m); o.position.y = y; g.add(o); return o; };
      add(new THREE.CylinderGeometry(.06, .07, .08, 16), brass, .04); add(new THREE.TorusGeometry(.05, .012, 8, 20), M.ivory, .1).rotation.x = Math.PI / 2;
      add(new THREE.CylinderGeometry(.008, .008, .16, 6), brass, .17); add(new THREE.SphereGeometry(.016, 8, 6), glow('#e05a4a'), .255);
      const prop = add(new THREE.BoxGeometry(.18, .008, .025), M.ivory, .245);
      anim.on(dt => { if (g.visible) prop.rotation.y += dt * 22; });
      props.inv = g; }
    Object.values(props).forEach(g => { g.visible = false; S.add(g); });
    const popProp = async (k, b) => {
      const g = props[k]; g.position.copy(b.g.position); g.position.y += DIM.boxH + .01; g.userData.y = g.position.y; g.rotation.y = b.g.rotation.y + (k === 'gen' ? -Math.PI / 2 : 0);
      g.scale.setScalar(.01); g.visible = true; await T(g.scale, {x: 1.6, y: 1.6, z: 1.6}, .8, 'spring');
    };

    // ---------- HTML prize boards (blue left / red right) ----------
    const left = h('div', 'side l'), right = h('div', 'side r'), cell = {};
    const cellName = id => id[0] === 'v' ? eur(+id.slice(1)) : SPECIALS[id].name[0] + SPECIALS[id].name.slice(1).toLowerCase();
    [[BOARD_L, left], [BOARD_R, right]].forEach(([ids, el]) => ids.forEach(id => { const d = h('div', '', cellName(id)); el.append(d); cell[id] = d; }));
    [left, right].forEach(el => { el.style.pointerEvents = 'none'; el.setAttribute('aria-label', 'Premi ancora in gioco'); ctx.sideAdd(el); });

    // ---------- layout / camera ----------
    let lay = null, camMode = 'wide';
    const portrait = () => innerWidth / innerHeight < .8;
    const slotTop = s => new V3(s.d.x, s.d.y0 + DIM.pedH + .03, s.d.z);
    const place = b => { if (b.moving) return; if (b.slot) { b.g.position.copy(slotTop(b.slot)); b.g.rotation.y = b.slot.d.ry; } else { b.g.position.copy(OWN_TOP); b.g.rotation.y = 0; } };
    const applyLayout = () => {
      lay = layout(innerWidth / innerHeight, innerWidth);
      slots.forEach((s, k) => { const d = s.d = lay.slots[k]; s.g.position.set(d.x, 0, d.z); s.g.rotation.y = d.ry; s.plinth.scale.y = d.y0; s.plinth.position.y = d.y0 / 2; s.strip.position.y = d.y0 - .015; s.top.position.y = d.y0; });
      paccs.forEach(b => { if (b.slot || b === cur?.mine) place(b); });
      roll.position.set(0, lay.key === 'land' ? 5.1 : 6.2, 3.2);
    };
    const wide = () => { camMode = 'wide'; S.go(lay.cam, lay.look); };
    const pushTo = (b, k = .72) => { camMode = 'push'; const t = b.g.position.clone().add(new V3(0, .3, 0)); S.go(new V3(...lay.cam).lerp(t, k).toArray(), t.toArray()); };
    const callCam = () => { camMode = 'call'; S.go([.9, portrait() ? 3.2 : 2.7, portrait() ? 12.5 : 10.2], [1.6, 1.35, 4.5]); };
    const finaleCam = () => { camMode = 'final'; S.go([0, portrait() ? 4.4 : 3.4, portrait() ? 13 : 10.5], [0, 1.4, 2.6]); };
    const onResize = () => { applyLayout(); if (camMode === 'wide') wide(); };
    addEventListener('resize', onResize);
    let cur = null;
    applyLayout(); S.go(lay.cam, lay.look, {snap: true});
    if (import.meta.env?.DEV) { // runtime sanity: slot pedestal+pacco volumes must never intersect
      S.scene.updateMatrixWorld(true);
      const bx = slots.map(s => new THREE.Box3().setFromCenterAndSize(new V3(s.d.x, s.d.y0 + 1.2, s.d.z), new V3(DIM.pedW, 2.4, DIM.pedD)));
      bx.forEach((a, i) => bx.forEach((b, j) => { if (i < j && a.intersectsBox(b)) console.warn('affari: slots overlap', i, j); }));
    }

    // ---------- picking (3D click on pacchi or dock buttons) ----------
    let pickable = null, resolvePick = null, hover = null;
    const setHover = b => {
      if (b === hover) return;
      if (hover) tween(hover.inner.position, {y: 0}, .2);
      hover = b; if (b) tween(b.inner.position, {y: DIM.hover}, .2);
      document.body.style.cursor = b ? 'pointer' : '';
    };
    const choose = b => { if (!resolvePick || !pickable.includes(b)) return; const r = resolvePick; resolvePick = null; pickable = null; setHover(null); sfx.click(); r(b); };
    const pointer = e => {
      if (!resolvePick) return;
      if (e.target.id !== 'gl') { if (e.type === 'pointermove') setHover(null); return; }
      const o = raycast(pickable.map(b => b.g), e), b = o ? paccs[+o.userData.id.slice(1)] : null;
      if (e.type === 'pointermove') setHover(b); else if (b) choose(b);
    };
    addEventListener('pointermove', pointer); addEventListener('pointerdown', pointer);
    ctx.onExit(() => { removeEventListener('pointermove', pointer); removeEventListener('pointerdown', pointer); removeEventListener('resize', onResize); clearInterval(ringI); ringing = false; resolvePick = null; document.body.style.cursor = ''; });
    const gridCss = min => `display:grid;grid-template-columns:repeat(auto-fill,minmax(${min}px,1fr));gap:6px;max-height:40vh;overflow:auto;margin-top:6px`;
    const btnCss = 'min-height:42px;padding:4px 6px;font-size:.74rem;letter-spacing:.02em;flex-direction:column;gap:0;line-height:1.1';
    const pick = (list, meta, sub) => ctx.w(new Promise(res => {
      pickable = list; resolvePick = res;
      const c = h('div', 'card'); c.innerHTML = `<div class="meta"><span>${meta}</span><span>${sub}</span></div>`;
      const g = h('div'); g.style.cssText = gridCss(58);
      [...list].sort((a, b) => a.n - b.n).forEach(b => { const bt = h('button', 'btn', `<b style="font-size:1rem">${b.n}</b><small style="font-size:.58rem;opacity:.75">${esc(b.reg.split(/[ -]/)[0])}</small>`); bt.style.cssText = btnCss; bt.setAttribute('aria-label', `Pacco ${b.n}, ${b.reg}`); bt.onclick = () => choose(b); g.append(bt); });
      c.append(g); ctx.dock(c);
    }));
    const choice = (meta, html, opts) => ctx.w(new Promise(res => {
      const c = h('div', 'card msg'); c.innerHTML = `<div class="meta"><span>${meta[0]}</span><span>${meta[1]}</span></div>${html}`;
      const row = h('div', 'row'); opts.forEach(([t, cls, v]) => { const b = h('button', 'btn ' + cls, t); b.onclick = () => { sfx.click(); res(v); }; row.append(b); });
      c.append(row); ctx.dock(c); row.querySelector('button').focus();
    }));
    const regionPick = (meta, sub, list) => ctx.w(new Promise(res => {
      const c = h('div', 'card'); c.innerHTML = `<div class="meta"><span>${meta}</span><span>${sub}</span></div>`;
      const g = h('div'); g.style.cssText = gridCss(104);
      list.forEach(r => { const b = h('button', 'btn', esc(r)); b.style.cssText = btnCss; b.onclick = () => { sfx.click(); res(r); }; g.append(b); });
      c.append(g); ctx.dock(c);
    }));
    const note = (t, sub = '') => ctx.dock(h('div', 'card msg', `<div class="big disp" style="color:var(--gold);font-size:clamp(1.4rem,4vw,2rem)">${t}</div><div>${sub}</div>`));

    // ---------- game helpers ----------
    const say = (k, v = {}, o = {}) => host.say(fill(any(L[k]), v), o);
    const sealedOthers = () => paccs.filter(b => b.slot && !b.open);
    const worth = c => c.v; // Pacco Nero = its duplicate value, specials = 0
    const hud = st => ctx.hud(`<span class="pill">${esc(st.p.name)}</span><span class="pill">Pacco <b>${st.mine ? `${st.mine.n} · ${esc(st.mine.reg)}` : '—'}</b></span><span class="pill">Round <b>${st.round || '—'}/${ROUNDS.length}</b></span>${st.offers.length ? `<span class="pill">Offerta max <b>${eur(Math.max(...st.offers))}</b></span>` : ''}`);
    const cardOf = c => c.sp && c.sp !== 'nero'
      ? [[{t: SPECIALS[c.sp].name, fs: .34}, {t: c.joke || SPECIALS[c.sp].sub, fs: .15, font: 'Outfit'}], '#1a2142']
      : [[{t: eur(c.v), fs: .42}], c.blue ? COL.blue : COL.red];
    const calm = () => { slots.forEach(s => { s.person.setMood('neutral'); s.person.lookAt(null); }); contestant.setMood('neutral'); contestant.lookAt(null); };
    const reactAll = (b, good) => {
      const hp = b.slot?.person;
      if (hp) { hp.setMood(good ? 'happy' : 'sad'); good ? (Math.random() < .5 ? hp.celebrate() : hp.clap()) : hp.shrug(); }
      slots.forEach(s => { if (s.person !== hp && Math.random() < (good ? .35 : .2)) { s.person.setMood(good ? 'happy' : 'surprised'); if (good) s.person.clap(); } });
      contestant.setMood(good ? 'happy' : 'sad'); if (good) contestant.clap();
    };

    // open a pacco: push in, drumroll, lid springs open, then the board rolls down. mode 'round' | 'final'
    async function openPacco(b, st, mode = 'round') {
      b.open = true; if (mode === 'round') st.opened++;
      const c = b.c, look = b.g.position.clone().setY(b.g.position.y + .3);
      pushTo(b, b.slot ? .72 : .6);
      slots.forEach(s => s.person.lookAt(look)); contestant.lookAt(look); host.turnTo(b.g); host.p.setMood('think');
      boxSpot.position.set(b.g.position.x, 8, b.g.position.z + 3); boxSpot.target.position.copy(b.g.position); tween(boxSpot, {intensity: 150}, .4);
      if (mode === 'round') host.say(fill(any(L.open), {n: b.n, reg: b.reg}));
      sfx.drum(); await ctx.sleep(420); sfx.drum(); await ctx.sleep(380);
      if (c.sp === 'nero') b.card.set([{t: 'PACCO NERO', fs: .34}, {t: '?', fs: .3}], {bg: COL.nero});
      else { const [lines, bg] = cardOf(c); b.card.set(lines, {bg}); }
      b.card.visible = true; sfx.open();
      await T(b.lidP.rotation, {x: DIM.lidOpen}, .9, 'spring');
      let good = c.blue;
      if (c.sp === 'gen') { tone(520, .09, 'square', .05); tone(470, .12, 'square', .05, .14); await popProp('gen', b); }
      if (c.sp === 'bal') { [784, 988, 1175, 988, 784, 659].forEach((f, i) => tone(f, .22, 'sine', .06, i * .16)); const hp = b.slot?.person || contestant; tween(hp.rotation, {y: hp.rotation.y + Math.PI * 2}, 1.4, 'inout'); await popProp('bal', b); }
      if (c.sp === 'inv') { tone(300, .3, 'triangle', .06, 0, 300); await popProp('inv', b); }
      if (c.sp === 'nero') { await ctx.sleep(700); sfx.drum(); const [nl, nb] = cardOf({v: c.v, blue: c.v < 10000}); b.card.set(nl, {bg: nb}); good = c.v < 10000; }
      await ctx.sleep(650);
      // wide shot + rolled-down board
      wide();
      const head = {t: `PACCO ${b.n} · ${b.reg.toUpperCase()}`, fs: .17, font: 'Outfit', color: PAL.goldHi};
      if (c.sp && c.sp !== 'nero') await showBoard([head, {t: SPECIALS[c.sp].name, fs: .4}, {t: c.joke || SPECIALS[c.sp].sub, fs: .14, font: 'Outfit'}], 'grad');
      else await showBoard([head, ...(c.sp === 'nero' ? [{t: 'PACCO NERO', fs: .16, font: 'Outfit'}] : []), {t: eur(c.v), fs: c.sp === 'nero' ? .4 : .5}], good ? COL.blue : COL.red);
      cell[c.id]?.classList.add('gone'); st.revealed.add(c.id);
      S.flashWith(good ? '#3f6fd0' : '#c8324f'); (good ? sfx.ok : sfx.bad)();
      if (!good && c.v >= 100000) S.shakeIt(.5);
      if (mode === 'round') {
        reactAll(b, good);
        const v = {name: st.p.name, v: eur(JACKPOT), joke: c.joke};
        if (c.sp === 'gen' && st.opened <= 3) { st.jackpot = JACKPOT; S.burst(PAL.goldHi, 120, 7); sfx.win(); await say('genJack', v, {mood: 'surprised', gesture: 'celebrate', to: st.p}); }
        else if (c.sp) await say(c.sp, v, {mood: 'surprised', to: st.p});
        else await host.react(good ? 'right' : 'wrong', st.p);
        if (!host.on) await ctx.sleep(900);
      } else await ctx.sleep(1200);
      await hideBoard(); tween(boxSpot, {intensity: 0}, .5); calm();
      Object.values(props).forEach(g => { g.visible = false; });
    }

    async function hop(b, to, ry) {
      b.moving = true; const from = b.g.position.clone(), mid = from.clone().lerp(to, .5); mid.y = Math.max(from.y, to.y) + 1.3;
      tween(b.g.rotation, {y: ry}, 1.1, 'inout');
      await T(b.g.position, mid, .55, 'out'); await T(b.g.position, to, .55, 'in'); b.moving = false; sfx.drum();
    }
    async function swapWith(st, nb) {
      const a = st.mine, s = nb.slot;
      sfx.whoosh(); s.person.lookAt(OWN_TOP); contestant.lookAt(nb.g.position.clone());
      await Promise.all([hop(a, slotTop(s), s.d.ry), hop(nb, OWN_TOP.clone(), 0)]);
      a.slot = s; nb.slot = null; st.mine = nb; hud(st); calm();
    }

    // Dottore's phone call after round k (1..6): call 1 = cambio pacco, call 4 sometimes cambio, else money offer
    async function call(st, k) {
      dim(true); callCam(); ring(true); host.turnTo(phoneG); host.p.setMood('surprised');
      slots.forEach(s => s.person.lookAt(phoneG.position.clone().setY(1.2)));
      note('📞 Squilla il telefono…', 'Il Dottore sta chiamando');
      await say('ring', {}, {mood: 'surprised'}); if (!host.on) await ctx.sleep(1600);
      ring(false); tween(hs.position, {y: .42}, .4, 'out'); tween(hs.rotation, {z: .5}, .4);
      await say('tease', {name: st.p.name}, {mood: 'think'});
      const vars = {name: st.p.name};
      if (k === 1 || (k === 4 && Math.random() < .4)) {
        await say('cambio', vars, {to: st.p, gesture: 'point'});
        const yes = await choice(['📞 Il Dottore', `Chiamata ${k}`], `<div class="big disp" style="color:var(--gold)">CAMBIO PACCO?</div><p style="margin-bottom:12px">Puoi scambiare il tuo pacco ${st.mine.n} con uno ancora chiuso.</p>`, [['CAMBIO', 'pri', true], ['TENGO IL MIO', '', false]]);
        if (yes) { wide(); const nb = await pick(sealedOthers(), 'Cambio pacco', 'Con quale pacco cambi?'); await swapWith(st, nb); }
        else await say('nodeal', vars);
      } else {
        const sealed = [...sealedOthers(), st.mine].map(b => b.c), o = offer(sealed, st.revealed, k, Math.random, BANKER[ctx.cpuDiff] ?? 1);
        st.offers.push(o); hud(st);
        await say('offer', {...vars, v: eur(o)}, {mood: 'surprised', to: st.p});
        const yes = await choice(['📞 Il Dottore', `Chiamata ${k}`], `<div class="big disp" style="color:var(--gold)">${eur(o)}</div><p style="margin-bottom:12px">Pacchi ancora chiusi: ${sealed.length} (compreso il tuo)</p>`, [['AFFARE', 'pri', true], ['NON AFFARE', 'danger', false]]);
        if (yes) { st.deal = o; S.flashWith(PAL.gold); sfx.win(); await say('deal', {...vars, v: eur(o)}, {mood: 'happy', gesture: 'clap', to: st.p}); }
        else { sfx.drum(); await say('nodeal', vars, {gesture: 'point', to: st.p}); }
      }
      tween(hs.position, {y: .15}, .35); tween(hs.rotation, {z: 0}, .35);
      dim(false); calm(); wide();
    }

    async function luckyRegion(st) {
      envelope.visible = true; envelope.scale.setScalar(.01); tween(envelope.scale, {x: 1, y: 1, z: 1}, .7, 'spring');
      const right = any(REG), vars = {name: st.p.name};
      await say('lucky', {...vars, v: eur(LUCKY[0])}, {gesture: 'point', to: st.p});
      const g1 = await regionPick('La regione fortunata', `1° tentativo · ${eur(LUCKY[0])}`, REG);
      sfx.drum(); await ctx.sleep(700);
      if (g1 === right) return {won: LUCKY[0], right};
      sfx.bad(); const opts = halfOptions(REG, right, g1);
      await say('lucky2', {...vars, v: eur(LUCKY[1])}, {mood: 'think', to: st.p});
      const g2 = await regionPick('La regione fortunata', `2° tentativo · ${eur(LUCKY[1])} · restano ${opts.length}`, opts);
      sfx.drum(); await ctx.sleep(700);
      return {won: g2 === right ? LUCKY[1] : 0, right};
    }

    // ---------- one human's whole game ----------
    async function play(p) {
      const st = cur = {p, opened: 0, revealed: new Set(), offers: [], deal: null, jackpot: 0, mine: null, round: 0};
      // reset the set
      Object.values(props).forEach(g => { g.visible = false; }); envelope.visible = false; roll.visible = false;
      paccs.forEach(b => { b.open = false; b.c = null; b.slot = null; b.card.visible = false; b.lidP.rotation.x = 0; b.inner.position.y = 0; b.g.visible = false; b.g.scale.setScalar(1); });
      Object.values(cell).forEach(d => d.classList.remove('gone'));
      calm(); wide(); hud(st);
      await ctx.passDevice(p); ctx.setActive(p);
      p.data.pos = [ME.person[0], 1.6, ME.person[2]];
      contestant.setClothes({suit: p.color}); cSash.material.color.set(p.color);
      note('Benvenuto in studio', esc(p.name));
      await host.react('intro', p);
      host.say(fill(any(L.region), {name: p.name}), {to: p});
      const reg = await regionPick(esc(p.name), 'Di che regione sei?', REG);
      host.stop();
      // assign: own pacco = player's region, the other 19 go to the holders in order; contents shuffled
      const cs = shuffle(contents());
      paccs.forEach((b, i) => { b.c = cs[i]; });
      st.mine = paccs[REG.indexOf(reg)];
      paccs.filter(b => b !== st.mine).forEach((b, k) => { b.slot = slots[k]; slots[k].sash.material.color.set(REGCOL[b.i]); });
      cSash.material.color.set(REGCOL[st.mine.i]);
      paccs.forEach(b => { place(b); b.g.visible = true; b.g.scale.setScalar(.01); tween(b.g.scale, {x: 1, y: 1, z: 1}, .7 + Math.random() * .4, 'spring'); });
      sfx.drum(); S.flashWith(PAL.gold); hud(st);
      await say('mine', {n: st.mine.n, reg: st.mine.reg, name: p.name}, {to: p, gesture: 'point', mood: 'happy'});

      for (let r = 0; r < ROUNDS.length && st.deal === null; r++) {
        st.round = r + 1; hud(st);
        for (let k = ROUNDS[r]; k > 0; k--) {
          host.say(fill(any(L.pick), {name: p.name}), {to: p});
          const b = await pick(sealedOthers(), `Round ${r + 1} di ${ROUNDS.length}`, `Apri ancora <b>${k}</b> pacc${k === 1 ? 'o' : 'hi'}`);
          host.stop(); ctx.dock();
          await openPacco(b, st);
        }
        if (r < ROUNDS.length - 1) await call(st, r + 1);
      }

      let w, how, win;
      const lines = [];
      if (st.deal !== null) {
        await openPacco(st.mine, st, 'final');
        w = st.deal; win = st.deal >= worth(st.mine.c); how = 'affare';
        lines.push(`${esc(p.name)} accetta ${eur(st.deal)}.`, `Nel pacco ${st.mine.n} (${st.mine.reg}) c’era ${st.mine.c.sp && st.mine.c.sp !== 'nero' ? SPECIALS[st.mine.c.sp].name.toLowerCase() + ' (0 €)' : eur(st.mine.c.v)}.`);
      } else {
        // finale: 2 sealed pacchi, contents revealed only AFTER the choice
        const other = sealedOthers()[0];
        dim(true); finaleCam(); hud(st);
        await say('final', {name: p.name, n: other.n}, {to: p, mood: 'think'});
        const ch = await choice(['Finale', 'Due pacchi chiusi'], `<div class="big disp" style="color:var(--gold);font-size:clamp(1.3rem,4vw,2rem)">Pacco ${st.mine.n} o pacco ${other.n}?</div><p style="margin-bottom:12px">${esc(st.mine.reg)} (tuo) · ${esc(other.reg)}. Nessuno sa cosa contengono.</p>`,
          [['TENGO IL MIO', 'pri', 'keep'], ['CAMBIO', '', 'swap'], ['REGIONE FORTUNATA', 'danger', 'lucky']]);
        dim(false);
        if (ch === 'lucky') {
          const r = await luckyRegion(st);
          w = r.won; win = w > 0; how = 'regione fortunata';
          if (w) { S.burst(PAL.goldHi, 160, 7); sfx.win(); await say('luckyOk', {v: eur(w)}, {mood: 'happy', gesture: 'celebrate', to: p}); }
          else await say('luckyKo', {reg: r.right}, {mood: 'sad', to: p});
          envelope.visible = false;
          lines.push(`La regione fortunata era ${r.right}: ${w ? 'vinti ' + eur(w) : 'nessuna vincita'}.`);
          await openPacco(other, st, 'final'); await openPacco(st.mine, st, 'final');
          lines.push(`Nei pacchi c’erano: ${st.mine.n} → ${cellName(st.mine.c.id === 'nero' ? 'v' + st.mine.c.v : st.mine.c.id)}, ${other.n} → ${cellName(other.c.id === 'nero' ? 'v' + other.c.v : other.c.id)}.`);
        } else {
          if (ch === 'swap') await swapWith(st, other);
          const left = ch === 'swap' ? paccs.find(b => b.slot && !b.open) : other;
          await openPacco(left, st, 'final');
          await openPacco(st.mine, st, 'final');
          w = worth(st.mine.c); how = ch === 'swap' ? 'cambio finale' : 'pacco tenuto';
          win = w >= Math.max(0, ...st.offers);
          lines.push(`${ch === 'swap' ? 'Hai cambiato' : 'Hai tenuto il tuo pacco'}: il pacco ${st.mine.n} conteneva ${st.mine.c.sp && st.mine.c.sp !== 'nero' ? SPECIALS[st.mine.c.sp].name.toLowerCase() + ' (0 €)' : eur(w)}.`, `Nell’altro c’era ${left.c.sp && left.c.sp !== 'nero' ? SPECIALS[left.c.sp].name.toLowerCase() : eur(left.c.v)}.`);
        }
      }
      if (st.jackpot) { w += st.jackpot; lines.push(`Jackpot di Gennarino: +${eur(st.jackpot)}.`); }
      ctx.setScore(p, w);
      if (win) { S.burst(PAL.goldHi, 140, 7); contestant.celebrate(); } else contestant.setMood('sad');
      await host.react(win ? 'win' : 'lose', p, {value: eur(w)});
      return {p, w, win, how, lines};
    }

    // ---------- show: each human plays a full game in turn ----------
    const humans = ctx.humans.length ? ctx.humans : ctx.players, results = [];
    for (let i = 0; i < humans.length; i++) {
      const r = await play(humans[i]); results.push(r);
      if (i < humans.length - 1) await choice([esc(r.p.name), 'Fine partita'], `<div class="big disp" style="color:var(--gold)">${eur(r.w)}</div>${r.lines.map(l => `<p>${l}</p>`).join('')}`, [['Prossimo concorrente', 'pri', 1]]);
    }
    host.react('outro', humans.length === 1 ? humans[0] : null);
    if (humans.length === 1) {
      const r = results[0];
      ctx.finish({win: r.win, title: r.win ? 'HAI BATTUTO IL DOTTORE!' : 'IL DOTTORE HA VINTO', lines: [...r.lines, `Vincita: ${eur(r.w)}`], score: r.w});
    } else ctx.finish({ranking: humans.map(p => ({player: p, score: p.score})), lines: results.map(r => `${esc(r.p.name)}: ${eur(r.w)} (${r.how})`)});
  }
};
