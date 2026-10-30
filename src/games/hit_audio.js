// Hit — WebAudio orchestra. One AudioContext per game start (create it synchronously inside start(), during the click).
//   const band = createBand(ctx);
//   const h = band.play(tune, {from, count, kit});   // schedules everything up front on the audio clock
//   h.end (ac time), h.heard() (melody notes started so far), h.ev {m, b, k, s, h} event lists for visuals
//   band.stop(); band.now(); band.cur (current handle or null)
// Mute follows sfx.onMute; the context is closed on exit.
import {sfx} from '../ui.js';

export function createBand(ctx) {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ac = null;
  try { ac = new AC(); } catch {}
  const VOL = .55;
  const band = {cur: null, now: () => ac ? ac.currentTime : performance.now() / 1000, play, stop};
  if (!ac) return band; // no WebAudio: play() still times events, silently

  const master = ac.createGain(); master.gain.value = sfx.muted ? 0 : VOL;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp).connect(ac.destination);
  const offMute = sfx.onMute(m => master.gain.setTargetAtTime(m ? 0 : VOL, ac.currentTime, .02));
  const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  ctx.onExit(() => { stop(); offMute(); try { ac.close(); } catch {} });

  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const osc = (type, f, t, end, out, detune = 0) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; o.connect(out); o.start(t); o.stop(end); return o; };
  const gain = (out, v = 0) => { const g = ac.createGain(); g.gain.value = v; g.connect(out); return g; };

  // ---- instruments: (bus, midi, start, duration s, velocity) ----
  const INS = {
    piano(bus, m, t, d, v) {
      const g = gain(bus), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.connect(g);
      const end = t + Math.max(d, .15) + .35;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .006);
      g.gain.exponentialRampToValueAtTime(v * .35, t + Math.min(.35, Math.max(d, .15))); g.gain.setTargetAtTime(.0001, t + Math.max(d, .15), .09);
      osc('triangle', hz(m), t, end, lp); const h2 = gain(lp, .25); osc('sine', hz(m) * 2, t, end, h2);
    },
    strings(bus, m, t, d, v) {
      const g = gain(bus), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900; lp.Q.value = .7; lp.connect(g);
      const end = t + d + .3, lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5.4; lg.gain.value = 7; lfo.connect(lg);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .7, t + Math.min(.09, d * .4)); g.gain.setValueAtTime(v * .7, t + d); g.gain.setTargetAtTime(.0001, t + d, .07);
      [-7, 7].forEach(dt => lg.connect(osc('sawtooth', hz(m), t, end, lp, dt).detune));
      lfo.start(t); lfo.stop(end);
    },
    brass(bus, m, t, d, v) {
      const g = gain(bus), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2; lp.connect(g);
      lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2600, t + .05); lp.frequency.setTargetAtTime(1500, t + .06, .1);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .75, t + .03); g.gain.setValueAtTime(v * .6, t + Math.max(.04, d - .02)); g.gain.setTargetAtTime(.0001, t + d, .04);
      osc('sawtooth', hz(m), t, t + d + .25, lp);
    },
    organ(bus, m, t, d, v) {
      const g = gain(bus); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .55, t + .012); g.gain.setValueAtTime(v * .55, t + d); g.gain.setTargetAtTime(.0001, t + d, .03);
      const end = t + d + .2; osc('sine', hz(m), t, end, g); osc('sine', hz(m) * 2, t, end, gain(g, .5)); osc('sine', hz(m) * 3, t, end, gain(g, .22)); osc('sine', hz(m) / 2, t, end, gain(g, .3));
    },
    bass(bus, m, t, d, v) {
      const g = gain(bus), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; lp.connect(g);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .008); g.gain.setTargetAtTime(.0001, t + .02, Math.min(.25, d * .5));
      osc('triangle', hz(m), t, t + d + .4, lp); osc('sine', hz(m), t, t + d + .4, gain(lp, .6));
    }
  };
  const kick = (bus, t) => { const g = gain(bus), o = ac.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + .12); o.connect(g); g.gain.setValueAtTime(.55, t); g.gain.exponentialRampToValueAtTime(.0001, t + .3); o.start(t); o.stop(t + .32); };
  const hit = (bus, t, f, v, len, type = 'highpass') => {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = gain(bus); s.buffer = noise; fl.type = type; fl.frequency.value = f; s.connect(fl).connect(g);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + len); s.start(t, Math.random() * .5); s.stop(t + len + .02);
  };
  const snare = (bus, t, v = .22) => { hit(bus, t, 1500, v, .16); const g = gain(bus); g.gain.setValueAtTime(v * .6, t); g.gain.exponentialRampToValueAtTime(.0001, t + .09); osc('triangle', 190, t, t + .1, g); };

  // from: skip the first `from` melody notes (resume); count: play at most `count` melody notes; kit: drums + bass
  function play(tune, {from = 0, count = Infinity, kit = tune.kit} = {}) {
    stop();
    if (ac?.state === 'suspended') ac.resume().catch(() => {});
    if (ac && tune.audio && !tune.audioBad) return playFile(tune);
    const spb = 60 / tune.bpm, bus = ac && gain(master, 1), t0 = band.now() + .08;
    const ev = {m: [], b: [], k: [], s: [], h: []};
    // locate start beat (note #from) and end beat (end of note #from+count)
    let beat = 0, idx = 0, b0 = null, b1 = 0;
    const mel = [];
    for (const n of tune.notes) {
      if (n.m !== null) {
        if (idx >= from && idx < from + count) { if (b0 === null) b0 = beat; mel.push({b: beat, d: n.d, m: n.m}); b1 = beat + n.d; }
        idx++;
      }
      beat += n.d;
    }
    if (b0 === null) b0 = b1 = 0;
    const at = b => t0 + (b - b0) * spb;
    for (const n of mel) { const t = at(n.b), d = n.d * spb * .92; if (ac) INS[tune.ins](bus, n.m, t, d, .2); ev.m.push({t, d, m: n.m}); }
    if (kit) {
      const step = tune.bar === 3 ? 1 : .5, first = Math.ceil((b0 - tune.pick) / step - 1e-6) * step + tune.pick;
      const noteAt = b => { let m = null; for (const n of mel) { if (n.b <= b + 1e-6) m = n.m; else break; } return m ?? mel[0]?.m; };
      for (let b = first; b < b1 - 1e-6; b += step) {
        const pos = ((b - tune.pick) % tune.bar + tune.bar) % tune.bar, t = at(b), on = x => Math.abs(pos - x) < 1e-3;
        const down = on(0) || (tune.bar === 4 && on(2));
        if (down) { if (ac) kick(bus, t); ev.k.push({t}); let m = noteAt(b); if (m != null) { while (m > 50) m -= 12; while (m < 36) m += 12; if (ac) INS.bass(bus, m, t, spb * (tune.bar === 3 ? 1 : 2) * .9, .32); ev.b.push({t, m}); } }
        else if ((tune.bar === 4 && (on(1) || on(3))) || (tune.bar === 2 && on(1)) || (tune.bar === 3 && (on(1) || on(2)))) { if (ac) snare(bus, t, tune.bar === 3 ? .1 : .2); ev.s.push({t}); }
        if (ac) hit(bus, t, 7000, .05, .04); ev.h.push({t});
      }
    }
    const h = band.cur = {t0, end: at(b1) + .25, ev, ins: tune.ins, from, kit,
      heard: () => from + ev.m.filter(e => e.t <= band.now() + .01).length,
      stop() { if (!bus) return; bus.gain.setTargetAtTime(0, ac.currentTime, .025); setTimeout(() => { try { bus.disconnect(); } catch {} }, 250); }};
    return h;
  }
  // optional local file (tune.audio, public/audio): visuals get a synthetic beat grid
  function playFile(tune) {
    const el = new Audio(tune.audio), bus = gain(master, 1), t0 = ac.currentTime + .05, spb = 60 / (tune.bpm || 110), len = tune.len || 15;
    try { ac.createMediaElementSource(el).connect(bus); } catch {}
    el.onerror = () => { tune.audioBad = true; };
    el.play().catch(() => { tune.audioBad = true; });
    const ev = {m: [], b: [], k: [], s: [], h: []};
    for (let t = t0; t < t0 + len; t += spb) { ev.m.push({t, d: spb * .8, m: 64}); ev.k.push({t}); }
    return band.cur = {t0, end: t0 + len, ev, ins: tune.ins, from: 0, kit: true, heard: () => ev.m.filter(e => e.t <= ac.currentTime).length,
      stop() { el.pause(); el.src = ''; try { bus.disconnect(); } catch {} }};
  }
  function stop() { const c = band.cur; band.cur = null; c?.stop(); }
  return band;
}
