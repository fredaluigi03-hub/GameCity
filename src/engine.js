// Studio TV engine — three.js stage, studio set, tween/anim helpers, builders.
// Exports: THREE, PAL, tune, ease, tween, anim, raycast, newStage, label3d, person, chair, podium, deskTable, mat, glow, quality
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export {THREE};

// ---------- palette ----------
export const PAL = {
  ink: '#090c15', navy: '#0e1424', navy2: '#141d32', gold: '#c9a96e', goldHi: '#e2d3be', ivory: '#f8fafc', mut: '#94a3b8',
  ok: '#10b981', bad: '#ef4444', players: ['#38bdf8', '#4fb3a9', '#f43f5e', '#a855f7', '#fb923c', '#4ade80', '#e879f9', '#94a3b8']
};
const _c = new THREE.Color(), _hsl = {};
// tone down neon show colours: clamp saturation/lightness, returns '#rrggbb'
export function tune(col, s = .55, l = [.38, .58]) {
  _c.set(col).getHSL(_hsl);
  if (_hsl.s < .12) return PAL.goldHi; // white/grey show colours -> champagne/platinum, never flat grey
  return '#' + _c.setHSL(_hsl.h, Math.min(_hsl.s, s), Math.min(l[1], Math.max(l[0], _hsl.l))).getHexString();
}

// ---------- renderer / quality ----------
const hasBrowser = typeof document !== 'undefined' && typeof window !== 'undefined';
const canvas = hasBrowser ? document.getElementById('gl') : null;
const renderer = hasBrowser ? new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'}) : null;
if (renderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .75;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}
let low = (() => {
  if (!hasBrowser) return true;
  const q = new URLSearchParams(location.search).get('q');
  if (q) return q === 'low';
  try {
    const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    return /swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(name);
  } catch { return false; }
})();
if (renderer) {
  renderer.shadowMap.enabled = !low;
  renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 1.5));
}
const composer = hasBrowser ? new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth, innerHeight, {type: THREE.HalfFloatType, samples: 0})) : null;
const pass = hasBrowser ? new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera()) : null;
const bloom = hasBrowser ? new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .06, .28, 1.18) : null; // subtle studio bloom, no glare on boards/dice
if (composer) {
  composer.addPass(pass); composer.addPass(bloom); composer.addPass(new OutputPass());
}
export const quality = {get low() { return low; }};

let envTex = null;
const env = () => envTex ||= new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;

let S = null;
const clock = new THREE.Clock();
const tweens = [];
const mouse = {x: 0, y: 0};
const V3 = THREE.Vector3;

// ---------- easing ----------
const c1 = 1.70158, c2 = c1 * 1.525;
export const ease = {
  out: t => 1 - Math.pow(1 - t, 3),
  inout: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  lin: t => t,
  in: t => t * t * t,
  back: t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
  overshoot: t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
  inOutBack: t => t < .5 ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2,
  inBack: t => (c1 + 1) * t * t * t - c1 * t * t,
  // damped spring settling on 1 (a few soft wobbles)
  spring: t => t >= 1 ? 1 : 1 - Math.exp(-6.5 * t) * Math.cos(t * 13),
  elastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * 2.0944) + 1,
  sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  bounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; }
};

// tween(obj, to, dur, ease) -> Promise. `to` may be {k:v}, [x,y,z], Vector3/Euler/Color, or a colour string when obj is a Color.
// A new tween on the same obj+key takes over the old one (old promise resolves when it has no keys left).
export function tween(o, to, dur = .6, e = ease.out) {
  if (typeof e === 'string') e = ease[e] || ease.out;
  if (!Array.isArray(to) && !to.isColor && !to.isVector3 && !to.isEuler && typeof to === 'object') to = {...to};
  if (o.isColor && !to.isColor && (typeof to === 'string' || typeof to === 'number')) to = new THREE.Color(to);
  if (Array.isArray(to)) to = o.isColor ? {r: to[0], g: to[1], b: to[2]} : {x: to[0], y: to[1], z: to[2]};
  else if (to.isColor) to = {r: to.r, g: to.g, b: to.b};
  else if (to.isVector3 || to.isEuler) to = {x: to.x, y: to.y, z: to.z};
  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i]; if (w.o !== o) continue;
    for (const k in to) delete w.to[k];
    if (!Object.keys(w.to).length) { tweens.splice(i, 1); w.res(); }
  }
  return new Promise(res => { const from = {}; for (const k in to) from[k] = o[k]; tweens.push({o, from, to, dur: Math.max(dur, .001), e, t: 0, res}); });
}

// per-frame helpers bound to the current stage; each returns a stop() function
export const anim = {
  on(fn) { const st = S; if (!st) return () => {}; st.upd.push(fn); return () => { const i = st.upd.indexOf(fn); if (i >= 0) st.upd.splice(i, 1); }; },
  breathe(o, amp = .012, speed = 1.3) { const b = o.scale.y, ph = Math.random() * 6; return anim.on((dt, t) => { o.scale.y = b * (1 + Math.sin(t * speed + ph) * amp); }); },
  bob(o, amp = .05, speed = 2) { const b = o.position.y, ph = Math.random() * 6; return anim.on((dt, t) => { o.position.y = b + Math.sin(t * speed + ph) * amp; }); },
  sway(o, amp = .04, speed = .8) { const b = o.rotation.z, ph = Math.random() * 6; return anim.on((dt, t) => { o.rotation.z = b + Math.sin(t * speed + ph) * amp; }); },
  // smoothly turn an object (yaw only by default) towards a world point / Object3D / getter
  look(o, target, {speed = 4, pitch = false} = {}) {
    const tp = new V3(), wp = new V3();
    return anim.on(dt => {
      const t = typeof target === 'function' ? target() : target; if (!t) return;
      tp.copy(t.isObject3D ? t.getWorldPosition(wp) : t);
      o.parent && o.parent.worldToLocal(tp);
      const dx = tp.x - o.position.x, dz = tp.z - o.position.z, k = 1 - Math.exp(-dt * speed);
      o.rotation.y += angDiff(Math.atan2(dx, dz), o.rotation.y) * k;
      if (pitch) o.rotation.x += (-Math.atan2(tp.y - o.position.y, Math.hypot(dx, dz)) - o.rotation.x) * k;
    });
  }
};
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  if (S) { S.camera.aspect = w / h; S.camera.fov = w / h < .8 ? 88 : w / h < 1.2 ? 66 : 50; S.camera.updateProjectionMatrix(); }
}
const orbit = { active: false, pan: false, x: 0, y: 0, moved: 0, keys: new Set() };
if (hasBrowser) {
  addEventListener('resize', resize);
  addEventListener('pointermove', e => {
    mouse.x = e.clientX / innerWidth * 2 - 1;
    mouse.y = e.clientY / innerHeight * 2 - 1;
    if (!orbit.active || !S || S.noOrbit) return;
    const dx = e.clientX - orbit.x, dy = e.clientY - orbit.y;
    orbit.x = e.clientX; orbit.y = e.clientY;
    orbit.moved += Math.hypot(dx, dy);
    const offset = S.cp.clone().sub(S.cl);
    if (orbit.pan || e.shiftKey) {
      // Pan across horizontal plane + vertical lift
      const right = new V3().subVectors(S.cl, S.cp).setY(0).normalize().cross(new V3(0, 1, 0)).normalize();
      const fwd = new V3().subVectors(S.cl, S.cp).setY(0).normalize();
      const scale = Math.max(0.008, offset.length() * 0.0018);
      const move = right.multiplyScalar(-dx * scale).addScaledVector(fwd, dy * scale);
      S.cp.add(move); S.cl.add(move);
    } else {
      // Spherical orbit around S.cl
      const sph = new THREE.Spherical().setFromVector3(offset);
      sph.theta -= dx * 0.0065;
      sph.phi = Math.max(0.14, Math.min(Math.PI * 0.47, sph.phi - dy * 0.0055));
      offset.setFromSpherical(sph);
      S.cp.copy(S.cl).add(offset);
    }
  });
  addEventListener('pointerdown', e => {
    if (e.target?.id !== 'gl' || !S || S.noOrbit) return;
    orbit.active = true;
    orbit.pan = e.button === 2 || e.button === 1;
    orbit.x = e.clientX; orbit.y = e.clientY;
    orbit.moved = 0;
  });
  addEventListener('pointerup', () => { orbit.active = false; });
  addEventListener('contextmenu', e => { if (e.target?.id === 'gl' && S && !S.noOrbit) e.preventDefault(); });
  addEventListener('wheel', e => {
    if (e.target?.id !== 'gl' || !S || S.noOrbit) return;
    e.preventDefault();
    const offset = S.cp.clone().sub(S.cl);
    const dist = offset.length();
    const nextDist = Math.max(2.2, Math.min(28, dist * (1 + Math.sign(e.deltaY) * 0.1)));
    offset.setLength(nextDist);
    S.cp.copy(S.cl).add(offset);
  }, { passive: false });
  addEventListener('keydown', e => {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e'].includes(k)) orbit.keys.add(k);
  });
  addEventListener('keyup', e => {
    orbit.keys.delete(e.key.toLowerCase());
  });
}

const rc = new THREE.Raycaster(), v2 = new THREE.Vector2();
export function raycast(objs, ev) {
  v2.set(ev.clientX / innerWidth * 2 - 1, -ev.clientY / innerHeight * 2 + 1);
  rc.setFromCamera(v2, S.camera);
  const hit = rc.intersectObjects(objs, true)[0];
  if (!hit) return null;
  let o = hit.object; while (o && o.userData.id === undefined) o = o.parent;
  return o || null;
}

const shared = new Set(); // geometries/materials shared across stages: never disposed
function disposeStage() {
  S.scene.traverse(o => {
    if (o.geometry && !shared.has(o.geometry)) o.geometry.dispose();
    const m = o.material; if (m) [].concat(m).forEach(x => { if (shared.has(x)) return; x.map?.dispose(); x.dispose(); });
  });
  S = null;
}

function goLow() {
  low = true; bloom.enabled = false; renderer.setPixelRatio(1); renderer.shadowMap.enabled = false; resize();
  S?.scene.traverse(o => {
    if (o.isLight) o.castShadow = false;
    if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; });
    if (o.userData.hiFi) o.visible = false;
  });
}

// ---------- stage ----------
export function newStage(o = {}) {
  if (S) disposeStage();
  tweens.length = 0;
  const {c1 = PAL.gold, c2 = '#7b6cd8', bg = PAL.ink, cam = [0, 2.4, 10], look = [0, 1.8, 0], floor = true, studio = true} = o;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg).lerp(new THREE.Color(PAL.ink), .5);
  scene.fog = new THREE.FogExp2(scene.background, .024);
  scene.environment = env(); scene.environmentIntensity = .25;
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 300);
  S = {scene, camera, upd: [], c1: new THREE.Color(tune(c1)), c2: new THREE.Color(tune(c2)), cp: new V3(...cam), cl: new V3(...look), look: new V3(...look),
    vel: new V3(), lvel: new V3(), par: .5, flashC: new THREE.Color(), flash: 0, panels: [], t: 0, shake: 0, shadowT: 0};
  camera.position.set(...cam);
  S.add = x => (scene.add(x), x);
  S.on = f => S.upd.push(f);
  // camera: spring-damped dolly to position p looking at l; {snap:true} jumps
  S.go = (p, l, {snap = false} = {}) => { S.cp.set(...p); if (l) S.cl.set(...l); if (snap) { camera.position.copy(S.cp); S.look.copy(S.cl); S.vel.set(0, 0, 0); S.lvel.set(0, 0, 0); } };
  S.dolly = d => { const dir = S.cl.clone().sub(S.cp).normalize(); S.cp.addScaledVector(dir, d); };
  S.shakeIt = (a = .6) => { S.shake = Math.max(S.shake, a); };
  S.flashWith = c => { S.flashC.set(c); S.flash = 1; };
  S.burst = (col = PAL.goldHi, n = 180, y = 6) => {
    if (low) n = Math.min(n, 60);
    const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), v = [];
    for (let i = 0; i < n; i++) { p[i * 3 + 1] = y; v.push(new V3((Math.random() - .5) * 9, Math.random() * 7 + 2, (Math.random() - .5) * 9)); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({color: col, size: .16, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false});
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts);
    let life = 3;
    const f = dt => {
      life -= dt;
      for (let i = 0; i < n; i++) { v[i].y -= 9 * dt; v[i].multiplyScalar(1 - dt * .6); p[i * 3] += v[i].x * dt; p[i * 3 + 1] += v[i].y * dt; p[i * 3 + 2] += v[i].z * dt; }
      g.attributes.position.needsUpdate = true; m.opacity = Math.min(1, life / 1.5);
      if (life <= 0) { scene.remove(pts); g.dispose(); m.dispose(); S.upd.splice(S.upd.indexOf(f), 1); }
    };
    S.upd.push(f);
  };
  buildStudio(S, floor, studio);
  pass.scene = scene; pass.camera = camera;
  resize();
  return S;
}

// soft vertical alpha gradient used by light cones
const coneMat = col => new THREE.ShaderMaterial({
  uniforms: {c: {value: new THREE.Color(col)}, o: {value: .08}}, // peak alpha ~.028
  vertexShader: 'varying vec3 vN;varying vec3 vV;varying float vY;void main(){vY=uv.y;vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}',
  fragmentShader: 'uniform vec3 c;uniform float o;varying vec3 vN;varying vec3 vV;varying float vY;void main(){float f=pow(abs(dot(vN,vV)),2.2);float a=pow(vY,1.6)*f*o*.35;gl_FragColor=vec4(c*a,1.);}',
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
});

function trussGeo(len, s = .42) {
  const parts = [], r = .028, h = s / 2;
  const bar = (a, b, rad = r) => { const d = b.clone().sub(a), g = new THREE.CylinderGeometry(rad, rad, d.length(), 5, 1, true);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize())); g.translate(...a.clone().add(b).multiplyScalar(.5).toArray()); parts.push(g); };
  const C = [[-h, -h], [h, -h], [h, h], [-h, h]];
  C.forEach(([y, z]) => bar(new V3(-len / 2, y, z), new V3(len / 2, y, z), r * 1.4));
  const n = Math.round(len / s);
  for (let i = 0; i < n; i++) {
    const x0 = -len / 2 + i * len / n, x1 = x0 + len / n;
    for (let f = 0; f < 4; f++) { const [ya, za] = C[f], [yb, zb] = C[(f + 1) % 4]; bar(new V3(i % 2 ? x0 : x1, ya, za), new V3(i % 2 ? x1 : x0, yb, zb)); }
  }
  return mergeGeometries(parts);
}

function ledTexture(S) {
  const W = 160, H = 48, P = 4;
  const src = document.createElement('canvas'); src.width = W; src.height = H;
  const sx = src.getContext('2d');
  const cv = document.createElement('canvas'); cv.width = W * P; cv.height = H * P;
  const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  const grid = document.createElement('canvas'); grid.width = P; grid.height = P;
  const gx = grid.getContext('2d'); gx.fillStyle = 'rgba(0,0,0,.78)'; gx.fillRect(0, P - 1, P, 1); gx.fillRect(P - 1, 0, 1, P);
  const pat = x.createPattern(grid, 'repeat');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const a = '#' + S.c1.getHexString(), b = '#' + S.c2.getHexString();
  const draw = t => {
    const g = sx.createLinearGradient(0, 0, W, H); g.addColorStop(0, a); g.addColorStop(1, b);
    sx.globalAlpha = 1; sx.fillStyle = '#05070f'; sx.fillRect(0, 0, W, H);
    sx.globalAlpha = .28; sx.fillStyle = g; sx.fillRect(0, 0, W, H);
    // slow waves
    sx.globalAlpha = .55; sx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      sx.strokeStyle = k % 2 ? b : a; sx.beginPath();
      for (let i = 0; i <= W; i += 4) sx.lineTo(i, H / 2 + Math.sin(i * .045 + t * (.7 + k * .25) + k * 2) * (8 + k * 4) + (k - 1) * 9);
      sx.stroke();
    }
    // diagonal light sweep
    const sw = ((t * 22) % (W + 80)) - 40;
    const lg = sx.createLinearGradient(sw - 30, 0, sw + 30, 0); lg.addColorStop(0, 'rgba(255,240,210,0)'); lg.addColorStop(.5, 'rgba(255,240,210,.16)'); lg.addColorStop(1, 'rgba(255,240,210,0)');
    sx.globalAlpha = 1; sx.fillStyle = lg; sx.fillRect(0, 0, W, H);
    if (S.flash > .01) { sx.globalAlpha = S.flash * .35; sx.fillStyle = '#' + S.flashC.getHexString(); sx.fillRect(0, 0, W, H); }
    x.drawImage(src, 0, 0, cv.width, cv.height); x.fillStyle = pat; x.fillRect(0, 0, cv.width, cv.height);
    tex.needsUpdate = true;
  };
  draw(0);
  return {tex, draw};
}

function buildStudio(S, withFloor, withStudio = true) {
  const {scene} = S;
  const ac1 = '#' + S.c1.getHexString(), ac2 = '#' + S.c2.getHexString();
  scene.add(new THREE.AmbientLight('#1b2142', .15));
  scene.add(new THREE.HemisphereLight('#ffeacc', '#0a0e22', .3));
  // key + fill (only the key casts shadows) — balanced studio intensity without tabletop glare
  const key = new THREE.SpotLight('#ffefd6', 135, 50, .68, .68, 1.6); key.position.set(4, 13, 11);
  key.target.position.set(0, 1, 0); scene.add(key, key.target);
  if (!low) { key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.camera.near = 4; key.shadow.camera.far = 40; }
  const fill = new THREE.SpotLight('#cfd8ff', 50, 50, .75, .85, 1.6); fill.position.set(-7, 8, 10); fill.target.position.set(0, 1.5, 0); scene.add(fill, fill.target);
  const rim1 = new THREE.PointLight(S.c1, 25, 30); rim1.position.set(-8, 4, -4);
  const rim2 = new THREE.PointLight(S.c2, 25, 30); rim2.position.set(8, 4, -4);
  scene.add(rim1, rim2);

  if (!withStudio) {
    S.on(dt => {
      S.flash = Math.max(0, S.flash - dt * 2.5);
      rim1.color.copy(S.c1).lerp(S.flashC, S.flash * .6);
      rim2.color.copy(S.c2).lerp(S.flashC, S.flash * .6);
    });
    return;
  }

  if (withFloor) {
    const fc = document.createElement('canvas'); fc.width = fc.height = 512; const fx = fc.getContext('2d');
    const rg = fx.createRadialGradient(256, 256, 0, 256, 256, 256); rg.addColorStop(0, '#2a3156'); rg.addColorStop(.45, '#151a33'); rg.addColorStop(1, '#05070f');
    fx.fillStyle = rg; fx.fillRect(0, 0, 512, 512);
    fx.strokeStyle = 'rgba(255,255,255,.04)'; fx.lineWidth = 1;
    for (let r = 24; r < 256; r += 24) { fx.beginPath(); fx.arc(256, 256, r, 0, 7); fx.stroke(); }
    const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace;
    const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({map: ft, roughness: .24, metalness: .45, envMapIntensity: .8}));
    fl.rotation.x = -Math.PI / 2; fl.receiveShadow = !low; fl.userData.noShadow = true; scene.add(fl);
    const ringM = (c, r0, r1, op = .5) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 128), new THREE.MeshBasicMaterial({color: c, toneMapped: false, side: THREE.DoubleSide, transparent: true, opacity: op}));
      m.rotation.x = -Math.PI / 2; m.position.y = .012; scene.add(m); return m; };
    ringM('rgba(255,255,255,.2)', 9.9, 9.96, .35); ringM(ac1, 6.94, 7.01, .6); ringM('rgba(255,255,255,.12)', 6.8, 6.82, .3);
  }

  // LED wall: dark cabinets with bezels + shared animated LED texture
  const led = ledTexture(S), N = 13, R = 17, span = Math.PI * .95;
  const screenM = new THREE.MeshBasicMaterial({map: led.tex, color: new THREE.Color(.72, .72, .72), toneMapped: false});
  const cabM = new THREE.MeshStandardMaterial({color: '#07090f', roughness: .5, metalness: .6});
  const pw = 2 * R * Math.sin(span / (N - 1) / 2), cabG = new THREE.BoxGeometry(pw, 9.4, .45);
  for (let i = 0; i < N; i++) {
    const a = (i / (N - 1) - .5) * span;
    const cab = new THREE.Mesh(cabG, cabM); cab.userData.noShadow = true; cab.position.set(Math.sin(a) * R, 5.2, -Math.cos(a) * R + 2); cab.rotation.y = -a; scene.add(cab);
    const pg = new THREE.PlaneGeometry(pw - .12, 9.05), uv = pg.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / N);
    const scr = new THREE.Mesh(pg, screenM); scr.position.z = .231; cab.add(scr); S.panels.push(scr);
  }
  // header strip above the wall
  const hdr = new THREE.Mesh(new THREE.CylinderGeometry(R - .2, R - .2, .12, 64, 1, true, Math.PI - span / 2 - .05, span + .1), new THREE.MeshBasicMaterial({color: ac1, toneMapped: false, side: THREE.DoubleSide}));
  hdr.position.set(0, 10, 2); scene.add(hdr);

  // truss rig + hanging fixtures
  const alu = new THREE.MeshStandardMaterial({color: '#9aa0ad', metalness: .9, roughness: .35});
  const rig = new THREE.Group(); scene.add(rig);
  const tr = (len, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(trussGeo(len), alu); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); rig.add(m); };
  tr(24, 0, 9.6, 5); tr(24, 0, 11, -5);
  [-12, 12].forEach(x => { tr(9.6, x, 4.8, 5, 0, 0, Math.PI / 2); tr(10, x, 10.3, 0, 0, Math.PI / 2); });
  const bodyM = new THREE.MeshStandardMaterial({color: '#111318', metalness: .7, roughness: .4});
  const yokeG = new THREE.BoxGeometry(.5, .06, .1), armG = new THREE.BoxGeometry(.05, .45, .1), canG = new THREE.CylinderGeometry(.17, .21, .5, 16), lensG = new THREE.CircleGeometry(.16, 20);
  const spots = [];
  const NS = 6;
  for (let i = 0; i < NS; i++) {
    const col = i % 2 ? ac2 : ac1, x = (i - (NS - 1) / 2) * 3.6;
    const fix = new THREE.Group(); fix.position.set(x, 10.55, -5); // back truss: beams fall behind the playing area scene.add(fix);
    const yoke = new THREE.Mesh(yokeG, bodyM); yoke.position.y = .2; fix.add(yoke);
    [-.24, .24].forEach(ax => { const a = new THREE.Mesh(armG, bodyM); a.position.set(ax, 0, 0); fix.add(a); });
    const head = new THREE.Group(); fix.add(head);
    const can = new THREE.Mesh(canG, bodyM); can.rotation.x = Math.PI / 2; head.add(can);
    const lens = new THREE.Mesh(lensG, new THREE.MeshBasicMaterial({color: col, toneMapped: false})); lens.position.z = .26; head.add(lens);
    const tg = new THREE.Object3D(); scene.add(tg);
    if (i === 1 || i === 4) { const sp = new THREE.SpotLight(col, 60, 30, .3, .7, 1.5); sp.position.copy(fix.position); sp.target = tg; scene.add(sp); }
    const cg = new THREE.ConeGeometry(.7, 10, 20, 1, true); cg.translate(0, -5, 0); cg.rotateX(-Math.PI / 2);
    const cone = new THREE.Mesh(cg, coneMat(col)); cone.position.copy(fix.position); cone.userData.hiFi = true; cone.visible = !low; scene.add(cone);
    spots.push({tg, cone, head, fix, ph: i * 1.3});
  }
  scene.traverse(o => { if (o.isMesh && (o.material === alu || o.material === bodyM)) o.userData.noShadow = true; });
  // dust motes
  const n = low ? 80 : 260, pp = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pp[i * 3] = (Math.random() - .5) * 30; pp[i * 3 + 1] = Math.random() * 12; pp[i * 3 + 2] = (Math.random() - .5) * 24; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  scene.add(new THREE.Points(pg, new THREE.PointsMaterial({color: '#cbd5e1', size: .032, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false})));

  const wp = new V3(); let ledT = 0;
  S.on((dt, t) => {
    S.flash = Math.max(0, S.flash - dt * 2.5);
    rim1.color.copy(S.c1).lerp(S.flashC, S.flash * .6); rim2.color.copy(S.c2).lerp(S.flashC, S.flash * .6);
    ledT += dt; if (ledT > (low ? .5 : 1 / 20) || S.flash > .01) { ledT = 0; led.draw(t); }
    for (const s of spots) {
      s.tg.position.set(s.fix.position.x * 1.25 + Math.sin(t * .45 + s.ph) * 1.6, 0, -8 + Math.cos(t * .38 + s.ph * 1.7) * 1.2);
      s.head.lookAt(s.tg.getWorldPosition(wp));
      if (s.cone.visible) { s.cone.lookAt(wp); s.cone.scale.z = s.fix.position.distanceTo(wp) / 10; }
    }
    for (let i = 0; i < n; i++) { pp[i * 3 + 1] += dt * .12; if (pp[i * 3 + 1] > 12) pp[i * 3 + 1] = 0; }
    pg.attributes.position.needsUpdate = true;
  });
}

// mark lit, opaque meshes as shadow casters/receivers (game meshes included), cheap periodic sweep
function shadowSweep() {
  S.scene.traverse(o => {
    if (!o.isMesh || o.userData.noShadow || o.castShadow) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && m.isMeshStandardMaterial && !m.transparent) { o.castShadow = true; o.receiveShadow = true; }
  });
}

let fpsN = 0, fpsT = 0, slow = 0;
if (hasBrowser) document.addEventListener('visibilitychange', () => { fpsN = 0; fpsT = 0; clock.getDelta(); });
const camTmp = new V3(), acc = new V3();
function loop() {
  requestAnimationFrame(loop);
  const raw = clock.getDelta(), dt = Math.min(raw, .05);
  // adaptive quality: two consecutive 3s windows below 24fps -> low mode for good
  fpsN++; fpsT += raw;
  if (fpsT > 3) { slow = fpsN / fpsT < 24 ? slow + 1 : 0; if (slow >= 2 && !low) goLow(); fpsN = 0; fpsT = 0; }
  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i]; w.t += Math.min(raw, .25);
    const k = Math.min(1, w.t / w.dur), e = w.e(k);
    for (const key in w.to) w.o[key] = w.from[key] + (w.to[key] - w.from[key]) * e;
    if (k >= 1) { tweens.splice(i, 1); w.res(); }
  }
  if (!S) return;
  S.t += dt;
  if (!S.noOrbit && orbit.keys.size > 0) {
    const fwd = new V3().subVectors(S.cl, S.cp).setY(0).normalize();
    const right = fwd.clone().cross(new V3(0, 1, 0)).normalize();
    const spd = 7.5 * dt;
    if (orbit.keys.has('w')) { S.cp.addScaledVector(fwd, spd); S.cl.addScaledVector(fwd, spd); }
    if (orbit.keys.has('s')) { S.cp.addScaledVector(fwd, -spd); S.cl.addScaledVector(fwd, -spd); }
    if (orbit.keys.has('d')) { S.cp.addScaledVector(right, spd); S.cl.addScaledVector(right, spd); }
    if (orbit.keys.has('a')) { S.cp.addScaledVector(right, -spd); S.cl.addScaledVector(right, -spd); }
    if (orbit.keys.has('q') || orbit.keys.has('e')) {
      const offset = S.cp.clone().sub(S.cl);
      const sph = new THREE.Spherical().setFromVector3(offset);
      sph.theta += (orbit.keys.has('q') ? 1 : -1) * 1.6 * dt;
      offset.setFromSpherical(sph);
      S.cp.copy(S.cl).add(offset);
    }
  }
  for (const f of [...S.upd]) f(dt, S.t);
  // camera: critically-damped-ish spring with substeps (stable at low fps)
  const cam = S.camera; let rem = Math.min(raw, .25);
  camTmp.set(S.cp.x + mouse.x * S.par, S.cp.y - mouse.y * S.par * .5, S.cp.z);
  while (rem > 0) {
    const h = Math.min(rem, 1 / 60); rem -= h;
    acc.subVectors(camTmp, cam.position).multiplyScalar(14).addScaledVector(S.vel, -7.2); S.vel.addScaledVector(acc, h); cam.position.addScaledVector(S.vel, h);
    acc.subVectors(S.cl, S.look).multiplyScalar(16).addScaledVector(S.lvel, -8); S.lvel.addScaledVector(acc, h); S.look.addScaledVector(S.lvel, h);
  }
  cam.lookAt(S.look);
  if (S.shake > 0) {
    S.shake = Math.max(0, S.shake - dt * 1.6);
    const tr = S.shake * S.shake, t = S.t * 28;
    cam.position.x += (Math.sin(t) + Math.sin(t * 2.3 + 1)) * tr * .12;
    cam.position.y += (Math.sin(t * 1.7 + 2) + Math.sin(t * 3.1)) * tr * .1;
    cam.rotateZ(Math.sin(t * 1.3) * tr * .03);
  }
  if (!low && (S.shadowT -= raw) <= 0) { S.shadowT = .5; shadowSweep(); }
  if (low) renderer.render(S.scene, cam);
  else {
    composer.render();
    // some GPUs/drivers can't complete the MSAA half-float target: fall back to direct rendering
    if (glChecks-- > 0 && renderer.getContext().getError() !== 0) goLow();
  }
}
let glChecks = 30;
if (hasBrowser) {
  window.__eng = {goLow, renderer, composer, bloom, get S() { return S; }}; // debug hook
  loop();
}

// ---------- helpers ----------
function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }

// lines: string | [{t, fs, color, font}|string]; options: w,h,px,color,bg,border,fs,accent (top strip colour), radius
// bg/border: null to omit. Default look: navy gradient card with gold hairline.
export function label3d(lines, o = {}) {
  const {w = 3, h = 1, px = 180, color = PAL.ivory, bg = 'grad', border = PAL.gold, fs = .5} = o;
  const cv = document.createElement('canvas'); cv.width = Math.round(w * px); cv.height = Math.round(h * px);
  const x = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map: tex, color: new THREE.Color(.92, .92, .92), transparent: true, toneMapped: false})); // .92 < bloom threshold: text stays crisp
  m.userData.noShadow = true;
  m.set = (L, over = {}) => {
    const c = {...o, ...over}; const arr = [].concat(L).map(l => typeof l === 'string' ? {t: l} : l);
    const W = cv.width, H = cv.height, rad = Math.min(W, H) * (c.radius ?? .1), lw = Math.max(2, Math.round(H * .012));
    x.clearRect(0, 0, W, H);
    const b = c.bg === undefined ? bg : c.bg;
    if (b !== null) {
      if (b === 'grad') { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16204a'); g.addColorStop(1, '#070b1a'); x.fillStyle = g; } else x.fillStyle = b;
      rr(x, lw, lw, W - lw * 2, H - lw * 2, rad); x.fill();
      if (c.accent) { x.save(); rr(x, lw, lw, W - lw * 2, H - lw * 2, rad); x.clip(); x.fillStyle = c.accent; x.fillRect(0, 0, W, Math.max(6, H * .035)); x.restore(); }
    }
    const bd = c.border === undefined ? border : c.border;
    if (bd !== null) { x.lineWidth = lw; x.strokeStyle = bd; rr(x, lw, lw, W - lw * 2, H - lw * 2, rad); x.stroke(); }
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const tot = arr.reduce((s, l) => s + (l.fs ?? c.fs ?? fs), 0); let y = (H - tot * H) / 2;
    for (const l of arr) {
      const lh = (l.fs ?? c.fs ?? fs) * H; let size = lh * .95;
      const fam = l.font === 'Outfit' ? '600 %spx Outfit, Arial' : '%spx "Bebas Neue", Outfit, Arial';
      do { x.font = fam.replace('%s', size); size -= 3; } while (x.measureText(l.t).width > W * .9 && size > 8);
      x.fillStyle = l.color ?? c.color ?? color; x.fillText(l.t, W / 2, y + lh / 2); y += lh;
    }
    tex.needsUpdate = true;
  };
  m.set(lines);
  return m;
}

export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: .4, metalness: .3, ...o});
export const glow = (color) => new THREE.MeshBasicMaterial({color, toneMapped: false});
// physical material with clearcoat when quality allows (falls back to standard in low mode)
const pmat = (color, o = {}) => {
  const {clearcoat, clearcoatRoughness, sheen, sheenColor, sheenRoughness, ...rest} = o;
  if (low) return new THREE.MeshStandardMaterial({color, roughness: .45, metalness: .1, ...rest});
  const phys = Object.fromEntries(Object.entries({clearcoat, clearcoatRoughness, sheen, sheenColor, sheenRoughness}).filter(([, v]) => v !== undefined));
  return new THREE.MeshPhysicalMaterial({color, roughness: .45, metalness: .1, ...phys, ...rest});
};

// ---------- person ----------
// person(color, skin) or person({suit, shirt, tie, pants, shoes, skin, hair, hairStyle, eyes, female})
// hairStyle: short|slick|curly|long|bob|bun|bald. Height ~1.85, feet at y=0. Never animates the root transform.
const G = {}; // shared geometries (never disposed)
const sg = (k, f) => { if (!G[k]) { G[k] = f(); shared.add(G[k]); } return G[k]; };
export function person(color = '#2b3352', skin = '#e9c3a0') {
  const o = typeof color === 'object' && !color.isColor ? color : {suit: color, skin};
  const L = {suit: '#22293f', shirt: '#f1ece2', tie: o.accent || '#8a2b3a', pants: o.suit || o.color || '#1b2033', shoes: '#141414', skin: '#e9c3a0', hair: '#2a1d14', hairStyle: o.female ? 'long' : 'short', eyes: '#2b1d12', ...o};
  if (!o.pants) L.pants = new THREE.Color(L.suit).multiplyScalar(.7).getStyle();
  const M = {
    suit: pmat(L.suit, {roughness: .75, sheen: .6, sheenColor: new THREE.Color(L.suit).lerp(new THREE.Color('#fff'), .3), sheenRoughness: .6}),
    shirt: pmat(L.shirt, {roughness: .6}), tie: pmat(L.tie, {roughness: .35, clearcoat: .4}), pants: pmat(L.pants, {roughness: .8}),
    shoes: pmat(L.shoes, {roughness: .25, clearcoat: 1, clearcoatRoughness: .15, metalness: .2}), skin: pmat(L.skin, {roughness: .58}),
    hair: pmat(L.hair, {roughness: .5, sheen: .5, sheenColor: new THREE.Color(L.hair).lerp(new THREE.Color('#fff'), .4)}),
    eye: new THREE.MeshStandardMaterial({color: '#f6f3ee', roughness: .2}), iris: new THREE.MeshStandardMaterial({color: L.eyes, roughness: .2}),
    dark: new THREE.MeshStandardMaterial({color: '#3a1410', roughness: .8}), lip: new THREE.MeshStandardMaterial({color: new THREE.Color(L.skin).multiplyScalar(.72).lerp(new THREE.Color('#a0404a'), .35), roughness: .5})
  };
  const f = !!L.female, sw = f ? .88 : 1;
  const mesh = (g, m, x = 0, y = 0, z = 0, p) => { const k = new THREE.Mesh(g, m); k.position.set(x, y, z); (p || root).add(k); return k; };
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const hips = new THREE.Group(); hips.position.y = .93; rig.add(hips);
  // legs
  const leg = sx => {
    const hip = new THREE.Group(); hip.position.x = sx * .1; hips.add(hip);
    mesh(sg('thigh', () => new THREE.CapsuleGeometry(.075, .32, 4, 10)), M.pants, 0, -.22, 0, hip);
    const knee = new THREE.Group(); knee.position.y = -.44; hip.add(knee);
    mesh(sg('shin', () => new THREE.CapsuleGeometry(.063, .32, 4, 10)), M.pants, 0, -.2, 0, knee);
    const shoe = mesh(sg('shoe', () => { const g = new THREE.CapsuleGeometry(.055, .16, 4, 8); g.rotateX(Math.PI / 2); g.scale(1, .75, 1); return g; }), M.shoes, 0, -.43, .05, knee);
    return {hip, knee, shoe};
  };
  const LL = leg(1), RL = leg(-1);
  mesh(sg('pelvis', () => { const g = new THREE.CapsuleGeometry(.15, .08, 4, 12); g.rotateZ(Math.PI / 2); g.scale(1, 1, .7); return g; }), M.pants, 0, 0, 0, hips);
  // torso
  const spine = new THREE.Group(); hips.add(spine);
  const body = mesh(sg('torso' + f, () => { const g = new THREE.CylinderGeometry(.205 * sw, .165, .56, 16); g.scale(1, 1, .62); return g; }), M.suit, 0, .3, 0, spine);
  mesh(sg('chest' + f, () => { const g = new THREE.SphereGeometry(.205 * sw, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, .45, .62); return g; }), M.suit, 0, .58, 0, spine);
  mesh(sg('shirt', () => { const g = new THREE.CircleGeometry(.09, 3); g.rotateZ(-Math.PI / 2); g.scale(.8, 1.6, 1); return g; }), M.shirt, 0, .5, .128, spine).rotation.x = -.12;
  if (!f) { const tie = mesh(sg('tie', () => new THREE.BoxGeometry(.035, .2, .01)), M.tie, 0, .46, .134, spine); tie.rotation.x = -.12; }
  // neck + head
  mesh(sg('neck', () => new THREE.CylinderGeometry(.05, .058, .12, 10)), M.skin, 0, .64, 0, spine);
  const head = new THREE.Group(); head.position.y = .68; spine.add(head);
  mesh(sg('skull', () => { const g = new THREE.SphereGeometry(.118, 22, 16); g.scale(.9, 1.06, 1); return g; }), M.skin, 0, .13, 0, head);
  mesh(sg('jaw', () => { const g = new THREE.SphereGeometry(.085, 14, 10); g.scale(1, .8, 1); return g; }), M.skin, 0, .07, .022, head);
  [-1, 1].forEach(s => mesh(sg('ear', () => { const g = new THREE.SphereGeometry(.026, 8, 6); g.scale(.5, 1, .8); return g; }), M.skin, s * .105, .125, 0, head));
  mesh(sg('nose', () => { const g = new THREE.ConeGeometry(.016, .045, 8); g.rotateX(Math.PI / 2 + .5); return g; }), M.skin, 0, .12, .118, head);
  const eyes = [-1, 1].map(s => {
    const e = new THREE.Group(); e.position.set(s * .04, .148, .093); head.add(e);
    mesh(sg('eye', () => new THREE.SphereGeometry(.019, 12, 8)), M.eye, 0, 0, 0, e);
    mesh(sg('iris', () => new THREE.SphereGeometry(.011, 10, 6)), M.iris, 0, 0, .012, e);
    return e;
  });
  const brows = [-1, 1].map(s => mesh(sg('brow', () => new THREE.BoxGeometry(.042, .008, .01)), M.hair, s * .042, .182, .108, head));
  const mouth = new THREE.Group(); mouth.position.set(0, .075, .1); head.add(mouth);
  const smile = mesh(sg('smile', () => new THREE.TorusGeometry(.026, .0055, 6, 14, Math.PI)), M.lip, 0, 0, 0, mouth);
  const open = mesh(sg('mouthO', () => { const g = new THREE.SphereGeometry(.022, 12, 8); g.scale(1.1, 1, .45); return g; }), M.dark, 0, -.006, -.002, mouth);
  open.scale.y = .05;
  // hair
  const hs = L.hairStyle, cap = (th = .55, sc = [1, 1, 1]) => mesh(sg('cap' + th + sc, () => { const g = new THREE.SphereGeometry(.128, 20, 12, 0, Math.PI * 2, 0, Math.PI * th); g.scale(...sc); return g; }), M.hair, 0, .145, -.012, head);
  if (hs !== 'bald') { const c = cap(hs === 'slick' ? .48 : .56, hs === 'curly' ? [1.02, 1.1, 1.06] : [.95, 1.08, 1.04]); c.rotation.x = -.38; }
  if (hs === 'long' || hs === 'bob') mesh(sg('hl' + hs, () => { const g = new THREE.CylinderGeometry(.12, hs === 'long' ? .135 : .125, hs === 'long' ? .3 : .14, 16, 1, true, Math.PI * .6, Math.PI * 1.8); return g; }), M.hair, 0, hs === 'long' ? .02 : .1, -.015, head).material.side = THREE.DoubleSide;
  if (hs === 'bun') mesh(sg('bun', () => new THREE.SphereGeometry(.06, 12, 10)), M.hair, 0, .23, -.09, head);
  if (hs === 'curly') for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; mesh(sg('curl', () => new THREE.SphereGeometry(.045, 10, 8)), M.hair, Math.sin(a) * .09, .2 + Math.cos(a * 2) * .02, Math.cos(a) * .07 - .02, head); }
  // arms (shoulder -> elbow -> hand)
  const arm = sx => {
    const sh = new THREE.Group(); sh.position.set(sx * .245 * sw, .54, 0); spine.add(sh);
    mesh(sg('shoulder', () => new THREE.SphereGeometry(.07, 12, 8)), M.suit, 0, 0, 0, sh);
    mesh(sg('uarm', () => new THREE.CapsuleGeometry(.056, .22, 4, 10)), M.suit, 0, -.16, 0, sh);
    const el = new THREE.Group(); el.position.y = -.31; sh.add(el);
    mesh(sg('farm', () => new THREE.CapsuleGeometry(.048, .2, 4, 10)), M.suit, 0, -.13, 0, el);
    mesh(sg('cuff', () => new THREE.CylinderGeometry(.043, .043, .03, 10)), M.shirt, 0, -.25, 0, el);
    const hand = mesh(sg('hand', () => { const g = new THREE.SphereGeometry(.047, 12, 8); g.scale(.8, 1.15, .55); return g; }), M.skin, 0, -.3, 0, el);
    return {sh, el, hand};
  };
  const LA = arm(1), RA = arm(-1);

  // ---- pose system: targets smoothed in idle() ----
  const REST = {lsx: 0, lsz: .1, lex: -.15, lez: 0, rsx: 0, rsz: -.1, rex: -.15, rez: 0, spx: 0, spz: 0, hx: 0, hz: 0, hy: 0, lift: 0, sit: 0};
  const cur = {...REST}, tgt = {...REST};
  const mood = {brow: 0, browY: 0, smile: .4, tilt: 0};
  const mt = {...mood};
  let speaking = false, gest = null, gestT = 0, blinkT = 2 + Math.random() * 3, lookP = null, ph = Math.random() * 10;
  const wv = new V3();
  const setPose = (p = {}) => Object.assign(tgt, REST, p);
  const hold = ms => new Promise(r => setTimeout(r, ms));
  const run = async (name, pose, ms) => { gest = name; gestT = 0; setPose(pose); await hold(ms); if (gest === name) { gest = null; setPose(); } };

  root.body = body; root.head = head; root.rig = rig; root.clothes = M; root.look = L;
  root.joints = {hips, spine, head, LA, RA, LL, RL, mouth, eyes, brows};
  root.setClothes = c => { for (const k in c) M[k]?.color.set(c[k]); };
  root.setMood = m => {
    Object.assign(mt, {happy: {brow: .12, browY: .006, smile: 1, tilt: .05}, sad: {brow: -.3, browY: -.002, smile: -1, tilt: -.06}, think: {brow: .25, browY: .01, smile: 0, tilt: .14}, surprised: {brow: 0, browY: .016, smile: .2, tilt: 0}}[m] || {brow: 0, browY: 0, smile: .35, tilt: 0});
    root.mood = m;
    if (m === 'think' && !gest) setPose({rsx: -.55, rsz: .05, rex: -2.3, rez: .35, hz: .12});
    else if (!gest) setPose();
  };
  root.speak = (on = true) => { speaking = on; };
  // head-only look target (overrides Object3D.lookAt): Vector3 | [x,y,z] | x,y,z | Object3D | null
  root.lookAt = (v, y, z) => { lookP = v == null ? null : typeof v === 'number' ? new V3(v, y, z) : v.isVector3 ? v.clone() : v.isObject3D ? v.getWorldPosition(new V3()) : new V3(...v); };
  root.wave = (ms = 1600) => run('wave', {rsz: -2.5, rez: -.5, rex: -.2, hz: .06}, ms);
  root.point = (ms = 1300) => run('point', {rsx: -1.4, rsz: -.15, rex: -.05, spx: .04}, ms);
  root.celebrate = (ms = 1600) => run('celebrate', {lsz: 2.6, rsz: -2.6, lex: -.3, rex: -.3, hx: -.15}, ms);
  root.shrug = (ms = 1000) => run('shrug', {lsz: .45, rsz: -.45, lex: -1.5, rex: -1.5, lez: .5, rez: -.5, hz: .16}, ms);
  root.clap = (ms = 1400) => run('clap', {lsx: -.9, rsx: -.9, lsz: -.1, rsz: .1, lex: -1.1, rex: -1.1, lez: -.4, rez: .4}, ms);
  root.sit = (on = true) => { REST.sit = on ? 1 : 0; tgt.sit = REST.sit; };
  root.idle = (dt, t) => {
    const k = 1 - Math.exp(-dt * 9);
    for (const key in tgt) cur[key] += (tgt[key] - cur[key]) * k;
    for (const key in mt) mood[key] += (mt[key] - mood[key]) * k;
    gestT += dt; t += ph;
    let rez = cur.rez, rex = cur.rex, lift = 0, lsz = cur.lsz, rsz = cur.rsz;
    if (gest === 'wave') rez += Math.sin(gestT * 11) * .45;
    if (gest === 'celebrate') { lift = Math.abs(Math.sin(gestT * 7)) * .08; lsz += Math.sin(gestT * 14) * .1; rsz -= Math.sin(gestT * 14) * .1; }
    if (gest === 'clap') { cur.lez = -.4 + Math.abs(Math.sin(gestT * 12)) * -.25; cur.rez = -cur.lez; }
    if (speaking && !gest) { rex += Math.sin(t * 3.1) * .18 - .25; }
    // breathing + weight shift
    const br = Math.sin(t * 1.5);
    spine.scale.set(1 + br * .006, 1 + br * .01, 1 + br * .012);
    spine.rotation.set(cur.spx + br * .01, 0, cur.spz + Math.sin(t * .45) * .02);
    hips.position.y = .93 - cur.sit * .4 + lift; hips.rotation.z = Math.sin(t * .45) * -.012;
    LL.hip.rotation.x = RL.hip.rotation.x = -cur.sit * 1.5; LL.knee.rotation.x = RL.knee.rotation.x = cur.sit * 1.45;
    LA.sh.rotation.set(cur.lsx, 0, lsz + br * .015); LA.el.rotation.set(cur.lex, 0, cur.lez);
    RA.sh.rotation.set(cur.rsx, 0, rsz - br * .015); RA.el.rotation.set(rex, 0, rez);
    // head: look target + micro motion + mood tilt
    let hy = cur.hy, hx = cur.hx;
    if (lookP) { wv.copy(lookP); root.worldToLocal(wv); hy += Math.max(-1, Math.min(1, Math.atan2(wv.x, wv.z))); hx += Math.max(-.4, Math.min(.4, -Math.atan2(wv.y - 1.7, Math.hypot(wv.x, wv.z)))); }
    head.rotation.y += (hy + Math.sin(t * .7) * .05 - head.rotation.y) * k;
    head.rotation.x = hx + Math.sin(t * .9) * .02 + (speaking ? Math.sin(t * 5.3) * .03 : 0);
    head.rotation.z = cur.hz + mood.tilt * .5 + Math.sin(t * .5) * .015;
    spine.rotation.y = head.rotation.y * .25;
    // face
    brows[0].rotation.z = mood.brow; brows[1].rotation.z = -mood.brow;
    brows.forEach(b => { b.position.y = .182 + mood.browY + (speaking ? Math.max(0, Math.sin(t * 2.3)) * .004 : 0); });
    smile.rotation.z = mood.smile >= 0 ? Math.PI : 0; smile.scale.set(1, Math.max(.15, Math.abs(mood.smile)), 1);
    smile.position.y = mood.smile >= 0 ? .006 : -.016;
    open.scale.y += ((speaking ? .25 + Math.abs(Math.sin(t * 13) * Math.sin(t * 7.7)) * .9 : .05) - open.scale.y) * Math.min(1, dt * 22);
    blinkT -= dt; const bl = blinkT < 0 ? .1 : 1; if (blinkT < -.12) blinkT = 2 + Math.random() * 4;
    eyes.forEach(e => { e.scale.y = bl; });
  };
  root.setMood('neutral');
  if (S) S.on((dt, t) => root.idle(dt, t));
  root.traverse(m => { if (m.isMesh) { m.castShadow = !low; m.receiveShadow = !low; } });
  return root;
}

// ---------- set builders ----------
// chair(color): studio armchair, seat top at y=.45, faces +z. Seat a person: same position/rotation, then p.sit(true)
export function chair(color = PAL.navy2) {
  const g = new THREE.Group(), up = pmat(color, {roughness: .7, sheen: .5, sheenColor: new THREE.Color('#ffffff')}), chrome = new THREE.MeshStandardMaterial({color: '#d9dce3', metalness: 1, roughness: .18});
  const seat = new THREE.Mesh(new THREE.BoxGeometry(.62, .12, .58), up); seat.position.y = .39;
  const back = new THREE.Mesh(new THREE.BoxGeometry(.62, .6, .1), up); back.position.set(0, .74, -.25); back.rotation.x = -.1;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .32, 12), chrome); col.position.y = .18;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.28, .3, .03, 24), chrome); base.position.y = .015;
  [-1, 1].forEach(s => { const a = new THREE.Mesh(new THREE.BoxGeometry(.06, .05, .48), chrome); a.position.set(s * .33, .58, -.02); g.add(a); });
  g.add(seat, back, col, base); return g;
}

// podium(color, label): contestant lectern with LED strip and name plate. Returns group with .setLabel(lines), .light(on|color)
export function podium(color = PAL.gold, label = '') {
  const g = new THREE.Group(), ac = tune(color);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(.62, .52, 1.05, 32, 1, false, -Math.PI * .45, Math.PI * .9), pmat('#0d1226', {roughness: .3, metalness: .5, clearcoat: 1, clearcoatRoughness: .1}));
  shell.position.y = .525;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.66, .66, .06, 32, 1, false, -Math.PI * .47, Math.PI * .94), pmat('#1a1f33', {roughness: .15, metalness: .7, clearcoat: 1}));
  top.position.y = 1.08;
  const stripM = new THREE.MeshBasicMaterial({color: ac, toneMapped: false});
  const strip = new THREE.Mesh(new THREE.CylinderGeometry(.635, .635, .03, 32, 1, true, -Math.PI * .45, Math.PI * .9), stripM); strip.position.y = 1.03;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.56, .58, .04, 32, 1, false, -Math.PI * .45, Math.PI * .9), stripM); base.position.y = .02;
  g.add(shell, top, strip, base);
  let plate = null;
  g.setLabel = L => {
    if (!plate) { plate = label3d(L, {w: .9, h: .32, px: 220, accent: ac, fs: .62}); plate.position.set(0, .7, .62); plate.rotation.x = -.08; g.add(plate); } else plate.set(L);
  };
  if (label) g.setLabel(label);
  g.light = (on = true) => { stripM.color.set(on === false ? '#1a1d28' : on === true ? ac : tune(on)); };
  g.strip = stripM;
  return g;
}

// deskTable(w): curved host desk with glossy top and gold LED trim, faces +z, top at y≈1.05
export function deskTable(w = 3.2, color = PAL.gold) {
  const g = new THREE.Group(), R = w / 1.6, arc = w / R;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R * .94, 1, 48, 1, false, -arc / 2, arc), pmat('#0c1124', {roughness: .35, metalness: .5, clearcoat: .8}));
  body.position.set(0, .5, -R + .5);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(R + .08, R + .08, .06, 48, 1, false, -arc / 2 - .02, arc + .04), pmat('#e9e2d2', {roughness: .12, metalness: .1, clearcoat: 1, clearcoatRoughness: .05}));
  top.position.set(0, 1.03, -R + .5);
  const trim = new THREE.Mesh(new THREE.CylinderGeometry(R + .005, R + .005, .025, 48, 1, true, -arc / 2, arc), new THREE.MeshBasicMaterial({color: tune(color), toneMapped: false}));
  trim.position.set(0, .2, -R + .5);
  g.add(body, top, trim); return g;
}
