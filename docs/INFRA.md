# Studio TV — infrastructure for game authors

A game is `export default {id, name, tag, desc, c1, c2, rules: [...], players?, async start(ctx)}`.
`c1`/`c2` are the show colours. The engine tones them down with `tune()` before using them in 3D and as the CSS `--ac`/`--ac2` variables.

## ctx (passed to `start`)

| field | use |
|---|---|
| `ctx.stage = newStage({...})` | Create the 3D set first and assign it here. `finish` and the host use it. |
| `ctx.ask({q, opts, right, time, cat, n, onReveal, extra, player})` | Multiple-choice card → `{pick, ok}`. If `player.bot` is set, the CPU answers by itself (skill `player.skill`, default .6). |
| `ctx.dock(...nodes)` | Replaces the bottom card area. |
| `ctx.hud(html)` | Game pills at the top right, e.g. `<span class="pill">Montepremi <b>…</b></span>`. |
| `ctx.sideAdd(node)` | Adds a free element to `#ui`. |
| `ctx.w(promise)`, `ctx.sleep(ms)` | Wrap any await. They never resolve after the game is exited. |
| `ctx.onExit(fn)` | Cleanup for listeners, intervals and audio. |
| `ctx.finish({win, title, lines, score})` | Single-player end screen. Best score stored per game. |
| `ctx.finish({title?, ranking:[{player, score}], win?, lines?})` | Multiplayer end screen. Ranking is sorted for you. `win` defaults to "top entry is human", `title` to "Vince NOME!". If you omit `ranking` with more than one player, it is built from `ctx.players`. |
| `ctx.accent` | `{a, b}`: the tuned show colours. |
| `ctx.hudTools`, `ctx.subSlot` | Containers used by the host. Leave them alone. |

## Players

- Declare `players: {min, max, def}`, e.g. `{min: 1, max: 4, def: 3}`.
  - After the rules, the player sees **Quanti giocatori?** with buttons from `min` to `max`, plus a **Completa con giocatori CPU** toggle that adds bots up to `def`, and name inputs.
  - Games without `players` skip the setup screen and get one human, "Tu".
- **Player object:** `ctx.players = [{id, name, color, bot, skill?, score, alive, data:{}}]`. `ctx.humans` holds only the humans. Put per-game state in `p.data`.
- **Scoreboard:**
  - `ctx.setScore(p, n)` / `ctx.addScore(p, n)` update the score and re-render the chips.
  - `ctx.setActive(p)` highlights a player.
  - `ctx.scoreboard()` re-renders (call it after changing `p.alive`). Chips appear automatically when there is more than one player.
- **Hot-seat:** `await ctx.passDevice(p)` shows "Passa il dispositivo a NOME" and waits for a click. It returns at once for bots and when only one human is playing.
- **Bots:**
  - `ctx.botAsk(q, skill=.6)` → `{pick, ok}`. Same shape as `ask`.
  - `ctx.botChance(skill)` → boolean.
  - `await ctx.botThink(min, max)` → a random pause.
- "Rigioca" reuses the same seats and names.
- If the CPU toggle is off, `ctx.players.length` can be below `def`. Duel-style games must handle that, or set `min` to the number they need.
- Bots carry `p.skill` (.45–.75). Pass it on: `ctx.botAsk(q, p.skill)`.

Typical turn loop:
```js
for (const p of ctx.players.filter(p => p.alive)) {
  await ctx.passDevice(p); ctx.setActive(p);
  const r = await ctx.ask({...q, player: p});
  if (r.ok) ctx.addScore(p, 100);
}
ctx.finish({ranking: ctx.players.map(p => ({player: p, score: p.score}))});
```

## Setup contract (all games, 2026-10 rewrite)

- Export flags:
  - `players.rival: true` — game needs 2 seats. Solo human gets a forced CPU rival; CPU switch locked on.
  - `players.cpuRequiredBelow: n` - if CPU is off, the setup count selector starts at `n`; the format is kept intact without silently inserting bots.
  - `questions: true` — game asks quiz questions. Setup shows **Difficoltà domande**. Games without it hide the row.
- `cfg = {seats, cpu, cpuDiff, qDiff}`:
  - `cpu` true only when bots are present. **Never add bots unless `ctx.cpu`.** Games must not inject bots themselves.
  - `cpuDiff` `'facile'|'medio'|'difficile'`. Skill: `ctx.cpuDiff` → `SKILL` in main.js (.4/.6/.82). Pauses scale via `ctx.botThink`.
  - `qDiff` 1|2|3 → `ctx.qDiff`.
- `ctx.cpu`, `ctx.cpuDiff`, `ctx.qDiff` exposed.
- `ctx.pool(list, d = ctx.qDiff)` → items with `d` (default 2) equal to `d`; full list if fewer than 5.
- `PAL.players` has 8 colours.
- Debug: `__studio.ctx` = last launched ctx.

### Length rule

Length scales with player count. Single-winner first-correct formats are banned with fewer than 3 seats. Use manches or points to target. Rounds ≈ `ceil(target / n)`.

## Host (`src/host.js`)

```js
import {createHost, HOSTS} from '../host.js';
const host = createHost(ctx, 'eredita');           // or {...HOSTS.eredita, position: [-3, 0, 1], lookAt: [0, 1.6, 8]}
await host.react('intro');
await host.say('Prima domanda!', {mood: 'think', gesture: 'point', to: player});
host.ask(q.q);                                      // short read-aloud, no bubble, non-blocking
await host.react(r.ok ? 'right' : 'wrong', player, {value: eur(pot)});
host.turnTo(player);                                // uses player.data.obj (Object3D) or player.data.pos, else the camera
```
- **Reaction keys:** `intro right wrong win lose suspense outro`. Lines with `{value}` are only used when you pass a value. Lines with `{name}` are skipped when no player is given.
- **Moods:** `happy sad neutral think surprised`.
- **Gestures:** `wave point celebrate shrug clap`.
- **Ending a line:**
  - `say` resolves when the speech ends, or when the player skips it by clicking the bubble or pressing Space.
  - With no Italian voice, or with audio muted, it falls back to timed subtitles (~55 ms per character).
  - When the HUD toggle "Conduttore: off" is on, it resolves immediately.
- **Keep the game playable without the host.** Never put information the player needs only inside `say()`.
- Create the host **after** the last `newStage()` call. It adds itself to `ctx.stage`.
- `host.p` is the 3D person. `host.stop()` cuts the current line. Speech is cancelled on exit and when muted.

## Engine (`src/engine.js`)

- **`newStage({c1, c2, bg, cam, look, floor})` → `S`.** It builds the studio: glossy floor, LED wall, truss with moving heads, shadows and env map.
  - **Objects and per-frame code:** `S.add(o)`, `S.on((dt, t) => …)`.
  - **Camera** (spring-damped): `S.go(pos, look, {snap})`, `S.dolly(d)`, `S.par` (mouse parallax amount).
  - **Effects:** `S.flashWith(col)` flashes the LED wall, `S.shake = 1` or `S.shakeIt(.6)`, `S.burst(col, n, y)` fires confetti.
- **Tweens:**
  - `tween(obj, to, dur, ease)` returns a Promise.
  - `to` can be `{k: v}`, `[x, y, z]`, a Vector3/Euler/Color, or a colour string when `obj` is a Color.
  - A newer tween on the same key takes over the older one.
  - `ease` can be a function or its name: `out in inout lin back overshoot inOutBack inBack spring elastic sine bounce`.
- **`anim` helpers** (each returns `stop()`): `anim.on(fn)`, `anim.breathe(o, amp, speed)`, `anim.bob(o, amp, speed)`, `anim.sway(o, amp, speed)`, `anim.look(o, target, {speed, pitch})`.
- **`person(color, skin)` or `person({suit, shirt, tie, pants, shoes, skin, hair, hairStyle, eyes, female})`.**
  - Hair styles: `short slick curly long bob bun bald`.
  - Feet are at y=0 and the figure is about 1.85 tall. Its idle animation runs automatically and only moves inner joints, so you may move or rotate the root yourself.
  - Methods: `setMood(m)`, `speak(on)`, `lookAt(vec3|[x,y,z]|x,y,z|Object3D|null)` (turns the head only; turn the body with `rotation.y` or `anim.look`), `wave()`, `point()`, `celebrate()`, `shrug()`, `clap()` (each returns a Promise), `sit(on)`, `setClothes({suit: '#…'})`.
  - Properties: `body`, `head`, `clothes` (materials), `joints`.
- **Builders:**
  - `chair(color)`: seat top at y=.45. To seat a person, give it the chair's position and rotation, then call `p.sit(true)`.
  - `podium(color, label)`: has `.setLabel(lines)` and `.light(true|false|color)`.
  - `deskTable(width, color)`: top at y≈1.05, front at z≈.5.
  - All face +z.
- **Other helpers:**
  - `label3d(lines, {w, h, px, color, bg, border, fs, accent, radius})`. Each line can be `{t, fs, color, font: 'Outfit'}`. `bg: 'grad'` (the default) gives a navy card. `.set(lines)` redraws it.
  - `mat(color, opts)` is MeshStandard. `glow(color)` is an unlit emissive material.
  - `raycast(objs, ev)` returns the nearest ancestor that has `userData.id`.
  - `quality.low` is true on slow or software GPUs. In that mode there are no shadows, bloom or light cones, and the pixel ratio is 1.

## Palette (`PAL` in engine.js, CSS variables in style.css)

| token | value | CSS |
|---|---|---|
| ink (bg) | `#070b1a` | `--ink` / `--bg` |
| navy / navy2 | `#0c1330` / `#141d44` | `--navy` / `--navy2` |
| gold / goldHi | `#d8b45a` / `#f3dc9a` | `--gold` / `--gold-hi` |
| ivory text / muted | `#f4efe3` / `#a9a491` | `--tx` / `--mut` |
| ok / bad | `#3fbf8a` / `#d9536a` | `--ok` / `--bad` |
| players | `#d8b45a #4fb3a9 #d0708a #7b93d8` | – |
| show accent | `tune(c1)`, `tune(c2)` | `--ac` / `--ac2` |

`tune(color, maxSat=.62, [minL, maxL])` desaturates a show colour so it fits the palette.

## Lighting / bloom (final values, engine.js)

Bloom runs on the linear HDR buffer before tone mapping. Lit props stay below about 1.0 so they never bloom. Only `glow()` emissive signage near 1.0 does. Keep game props on `mat()` or Standard materials. Use `glow()` only for small LED/sign accents, never for large surfaces.

- **Renderer:** ACES filmic tone mapping, exposure `.9`. Composer target is HalfFloat with 4× MSAA.
- **Bloom:**
  - UnrealBloom: strength `.3`, radius `.45`, threshold `.95`. Disabled in low mode.
  - `label3d` text renders at `.92`, under the threshold, so labels never halo.
- **Environment:** RoomEnvironment PMREM, `scene.environmentIntensity = .25`.
- **Lights:**

| light | values |
|---|---|
| Ambient | `#1b2142` @ `.15` |
| Hemisphere | `#ffeacc`/`#0a0e22` @ `.3` |
| Key spot | `#ffefd6` @ `300`, at (4, 13, 11) aimed at (0, 1, 0), angle `.62`, penumbra `.55`. The only shadow caster, map 1024, PCFSoft. |
| Fill spot | `#cfd8ff` @ `90`, at (-7, 8, 10) |
| Rim points | `tune(c1)` / `tune(c2)` @ `25`, at (±8, 4, -4) |

- **Moving heads:** 6 fixtures on the back truss (y 10.5, z -5), aimed at the floor behind the stage (z≈-8). Only 2 of them are real SpotLights, @ `60`.
- **Volumetric cones:** radius `.7` over 10 m, fresnel and length fade, peak alpha ≈ `.028`, additive. They sit behind the playing area, so props occlude them. Hidden in low mode.
- **LED wall:** texture × `.72`, unlit, no bloom in normal content.
- **Flash:**
  - `S.flashWith(c)` or `S.flash = k` overlays the LED wall at alpha `flash × .35` and tints the rim lights by up to 60%. Key and fill lights are never touched.
  - It decays at `2.5/s`.
