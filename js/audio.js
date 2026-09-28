// Hollow County — procedural audio: synthesized SFX, spatial mixing, reverb, and a layered music sequencer.
'use strict';
HC.audio = (function () {
  const A = { ctx: null, ready: false, listener: { x: 0, y: 0 } };
  let ctx, master, sfxBus, musicBus, ambBus, reverb, revSend, noiseBuf, brownBuf;
  const voices = {};           // category -> count of active voices (for limiting)

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  A.mtof = mtof;

  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = A.ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain();
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(master);
    ambBus = ctx.createGain(); ambBus.connect(master);
    // reverb from a generated impulse response
    reverb = ctx.createConvolver();
    reverb.buffer = makeIR(2.6, 2.4);
    revSend = ctx.createGain(); revSend.gain.value = 0.9;
    revSend.connect(reverb); reverb.connect(master);
    noiseBuf = makeNoise(2, false);
    brownBuf = makeNoise(4, true);
    A.ready = true;
    A.setVolumes();
  };

  A.setVolumes = function () {
    if (!ctx) return;
    const s = HC.settings;
    master.gain.value = s.master;
    sfxBus.gain.value = s.sfx;
    ambBus.gain.value = s.sfx * 0.8;
    musicBus.gain.value = s.music * 0.55;
  };

  function makeNoise(sec, brown) {
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  }
  function makeIR(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 90 ? i / 90 : 1);
      }
    }
    return b;
  }

  // ------------------------------------------------------------ primitives
  const now = () => ctx.currentTime;
  function gainEnv(t, a, peak, d, dest, hold) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    if (hold) g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + (hold || 0) + d);
    g.connect(dest);
    return g;
  }
  function osc(type, f, t, dur, dest, f2) {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    o.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function noise(t, dur, dest, ftype, freq, q, f2, brown) {
    const s = ctx.createBufferSource();
    s.buffer = brown ? brownBuf : noiseBuf;
    s.loop = true;
    let node = s;
    if (ftype) {
      const f = ctx.createBiquadFilter();
      f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
      if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
      s.connect(f); node = f;
    }
    node.connect(dest);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    return s;
  }
  function filt(type, freq, q, dest) {
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    f.connect(dest);
    return f;
  }

  // spatial output node. Returns null when inaudible.
  function out(o, rev) {
    let vol = o.vol === undefined ? 1 : o.vol;
    let pan = 0;
    if (o.x !== undefined) {
      const dx = o.x - A.listener.x, dy = o.y - A.listener.y;
      const d = Math.hypot(dx, dy);
      const ref = o.ref || 7;
      if (d > (o.max || 40)) return null;
      vol *= 1 / (1 + (d * d) / (ref * ref));
      pan = HC.clamp((dx - dy) / 14, -0.85, 0.85);
    }
    if (vol < 0.004) return null;
    const g = ctx.createGain();
    g.gain.value = vol;
    let tail = g;
    if (o.muffle) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; tail.connect(lp); tail = lp; }
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.value = pan; tail.connect(p); tail = p;
    }
    tail.connect(o.bus || sfxBus);
    if (rev) { const s = ctx.createGain(); s.gain.value = rev; tail.connect(s); s.connect(revSend); }
    return g;
  }
  function limit(cat, max, dur) {
    voices[cat] = voices[cat] || 0;
    if (voices[cat] >= max) return false;
    voices[cat]++;
    setTimeout(() => { voices[cat]--; }, dur * 1000);
    return true;
  }

  // formant voice (zombies, player grunts)
  function voice(o, p) {
    const t = now() + (p.delay || 0);
    const dest = out(o, p.rev || 0.25);
    if (!dest) return;
    const dur = p.dur;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(p.amp || 0.6, t + (p.att || 0.08));
    env.gain.setValueAtTime(p.amp || 0.6, t + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    env.connect(dest);
    const mix = ctx.createGain(); mix.gain.value = 1;
    const forms = p.formants;
    forms.forEach((fm, i) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = fm[2] || 7;
      bp.frequency.setValueAtTime(fm[0], t);
      bp.frequency.linearRampToValueAtTime(fm[1], t + dur);
      const g = ctx.createGain(); g.gain.value = [1, 0.55, 0.25][i] || 0.2;
      mix.connect(bp); bp.connect(g); g.connect(env);
    });
    const vib = ctx.createOscillator(); vib.frequency.value = p.vibRate || 5.5;
    const vibG = ctx.createGain(); vibG.gain.value = p.vib || 3;
    vib.connect(vibG);
    [1, 1.013].forEach((det) => {
      const oo = ctx.createOscillator();
      oo.type = 'sawtooth';
      oo.frequency.setValueAtTime(p.f0 * det, t);
      oo.frequency.exponentialRampToValueAtTime(p.f1 * det, t + dur);
      vibG.connect(oo.frequency);
      oo.connect(mix); oo.start(t); oo.stop(t + dur + 0.05);
    });
    vib.start(t); vib.stop(t + dur + 0.05);
    if (p.rasp) {
      const ng = ctx.createGain(); ng.gain.value = p.rasp;
      noise(t, dur, ng, 'bandpass', 1400, 0.8);
      ng.connect(env);
    }
    if (p.gurgle) {
      const lfo = ctx.createOscillator(); lfo.frequency.value = p.gurgle;
      const lg = ctx.createGain(); lg.gain.value = 0.35;
      lfo.connect(lg); lg.connect(env.gain);
      lfo.start(t); lfo.stop(t + dur);
    }
  }

  // ------------------------------------------------------------ sfx catalogue
  const R = () => Math.random();
  const S = {
    pistol(o) {
      const t = now(), d = out(o, 0.45); if (!d) return;
      noise(t, 0.2, gainEnv(t, 0.001, 0.9, 0.18, d), 'bandpass', 1700, 0.7, 500);
      noise(t, 0.05, gainEnv(t, 0.001, 0.7, 0.04, d), 'highpass', 3500);
      osc('sine', 170, t, 0.15, gainEnv(t, 0.002, 1.0, 0.16, d), 45);
    },
    shotgun(o) {
      const t = now(), d = out(o, 0.6); if (!d) return;
      noise(t, 0.45, gainEnv(t, 0.001, 1.1, 0.42, d), 'bandpass', 1100, 0.5, 250);
      noise(t, 0.08, gainEnv(t, 0.001, 0.8, 0.07, d), 'highpass', 2500);
      osc('sine', 120, t, 0.3, gainEnv(t, 0.002, 1.2, 0.32, d), 32);
    },
    rifle(o) {
      const t = now(), d = out(o, 0.4); if (!d) return;
      noise(t, 0.05, gainEnv(t, 0.0005, 1.0, 0.05, d), 'highpass', 2800);
      noise(t, 0.16, gainEnv(t, 0.001, 0.8, 0.15, d), 'bandpass', 1300, 0.9, 600);
      osc('sine', 210, t, 0.1, gainEnv(t, 0.001, 0.8, 0.1, d), 60);
    },
    pump(o) { S.click(Object.assign({ f: 900 }, o)); setTimeout(() => S.click(Object.assign({ f: 1300 }, o)), 150); },
    click(o) {
      const t = now(), d = out(o, 0.1); if (!d) return;
      noise(t, 0.03, gainEnv(t, 0.001, 0.5, 0.03, d), 'bandpass', o.f || 2400, 6);
      osc('square', (o.f || 2400) * 0.5, t, 0.01, gainEnv(t, 0.001, 0.08, 0.01, d));
    },
    empty(o) { S.click(Object.assign({ f: 3200, vol: 0.6 }, o)); },
    magout(o) { S.click(Object.assign({ f: 1500 }, o)); },
    magin(o) { S.click(Object.assign({ f: 1100 }, o)); setTimeout(() => S.click(Object.assign({ f: 1800 }, o)), 70); },
    swing(o) {
      const t = now(), d = out(o, 0.05); if (!d) return;
      noise(t, 0.2, gainEnv(t, 0.06, 0.35, 0.14, d), 'bandpass', 450, 1.5, 2200);
    },
    hit(o) {
      const t = now(), d = out(o, 0.2); if (!d) return;
      osc('sine', 120, t, 0.13, gainEnv(t, 0.001, 1.0, 0.13, d), 45);
      noise(t, 0.09, gainEnv(t, 0.001, 0.7, 0.08, d), 'lowpass', 900);
      noise(t, 0.03, gainEnv(t, 0.001, 0.4, 0.03, d), 'bandpass', 2600, 2);
    },
    squish(o) {
      const t = now(), d = out(o, 0.1); if (!d) return;
      noise(t, 0.08, gainEnv(t, 0.001, 0.5, 0.07, d), 'bandpass', 700 + R() * 400, 2, 300);
    },
    thud(o) {
      const t = now(), d = out(o, 0.35); if (!d) return;
      osc('sine', 85, t, 0.2, gainEnv(t, 0.001, 1.0, 0.22, d), 38);
      noise(t, 0.25, gainEnv(t, 0.001, 0.6, 0.22, d), 'bandpass', 320, 1.2);
      noise(t + 0.03, 0.12, gainEnv(t + 0.03, 0.001, 0.25, 0.12, d), 'bandpass', 1800, 4);
    },
    ricochet(o) {
      const t = now(), d = out(o, 0.2); if (!d) return;
      noise(t, 0.04, gainEnv(t, 0.001, 0.4, 0.04, d), 'highpass', 3000);
      osc('sine', 2600 + R() * 900, t, 0.1, gainEnv(t, 0.001, 0.08, 0.1, d), 1700);
    },
    glass(o) {
      const t = now(), d = out(o, 0.4); if (!d) return;
      noise(t, 0.3, gainEnv(t, 0.001, 0.6, 0.28, d), 'highpass', 3500);
      for (let i = 0; i < 9; i++) {
        const tt = t + R() * 0.18;
        osc('sine', 2800 + R() * 5000, tt, 0.2, gainEnv(tt, 0.001, 0.12, 0.08 + R() * 0.2, d));
      }
    },
    step(o) {
      const t = now(), d = out(o, 0); if (!d) return;
      const soft = o.soft;
      noise(t, 0.06, gainEnv(t, 0.002, soft ? 0.18 : 0.28, 0.05, d), 'lowpass', soft ? 380 : 900);
      if (!soft) noise(t, 0.015, gainEnv(t, 0.001, 0.08, 0.015, d), 'bandpass', 2500, 3);
    },
    doorOpen(o) {
      const t = now(), d = out(o, 0.2); if (!d) return;
      S.click(Object.assign({ f: 1700, vol: 0.5 }, o));
      const g = gainEnv(t + 0.03, 0.05, 0.12, 0.35, d, 0.1);
      osc('sawtooth', 150 + R() * 40, t + 0.03, 0.5, filt('bandpass', 900, 10, g), 230);
    },
    doorClose(o) { S.thud(Object.assign({}, o, { vol: (o.vol || 1) * 0.6 })); S.click(Object.assign({ f: 1400, vol: 0.5 }, o)); },
    locked(o) {
      const t = now(), d = out(o, 0.05); if (!d) return;
      for (let i = 0; i < 3; i++) S.click(Object.assign({ f: 1200 + i * 200, vol: 0.4 }, o));
      osc('square', 110, t, 0.15, gainEnv(t, 0.002, 0.08, 0.15, filt('lowpass', 600, 1, d)));
    },
    pickup(o) {
      const t = now(), d = out(o || {}, 0.1); if (!d) return;
      const lp = filt('lowpass', 2800, 1, d);
      osc('square', 660, t, 0.05, gainEnv(t, 0.002, 0.14, 0.05, lp));
      osc('square', 990, t + 0.055, 0.09, gainEnv(t + 0.055, 0.002, 0.14, 0.09, lp));
    },
    pickupWeapon(o) {
      S.click(Object.assign({ f: 1000, vol: 1 }, o));
      setTimeout(() => S.click(Object.assign({ f: 1600, vol: 1 }, o)), 120);
      setTimeout(() => S.pickup(o), 220);
    },
    pickupKey(o) { S.bell(Object.assign({ f: 1320, vol: 0.5 }, o)); setTimeout(() => S.bell(Object.assign({ f: 1760, vol: 0.4 }, o)), 120); },
    pickupHealth(o) {
      const t = now(), d = out(o || {}, 0.2); if (!d) return;
      noise(t, 0.15, gainEnv(t, 0.02, 0.15, 0.12, d), 'bandpass', 1500, 1, 3000);
      osc('sine', 520, t + 0.05, 0.3, gainEnv(t + 0.05, 0.005, 0.2, 0.25, d), 780);
    },
    bell(o) {
      const t = now(), d = out(o || {}, 0.5); if (!d) return;
      const f = o.f || 880;
      [[1, 0.5, 1.4], [2.76, 0.2, 0.7], [5.4, 0.1, 0.35]].forEach(([m, a, dec]) => osc('sine', f * m, t, dec, gainEnv(t, 0.002, a, dec, d)));
    },
    moodle() { S.bell({ f: 660, vol: 0.35 }); setTimeout(() => S.bell({ f: 990, vol: 0.25 }), 90); },
    secret() { [0, 110, 220, 330].forEach((ms, i) => setTimeout(() => S.bell({ f: [523, 659, 784, 1046][i], vol: 0.35 }), ms)); },
    uiMove() {
      const t = now(), d = out({ vol: 0.3 }, 0); if (!d) return;
      osc('square', 1200, t, 0.02, gainEnv(t, 0.001, 0.2, 0.02, filt('lowpass', 2500, 1, d)));
    },
    uiSelect() {
      const t = now(), d = out({ vol: 0.6 }, 0.3); if (!d) return;
      osc('sine', 180, t, 0.18, gainEnv(t, 0.001, 0.8, 0.18, d), 60);
      noise(t, 0.05, gainEnv(t, 0.001, 0.3, 0.05, d), 'bandpass', 1500, 2);
    },
    type() {
      const t = now(), d = out({ vol: 0.22 + R() * 0.1 }, 0); if (!d) return;
      noise(t, 0.03, gainEnv(t, 0.001, 0.8, 0.025, d), 'bandpass', 1800 + R() * 900, 3);
      noise(t, 0.012, gainEnv(t, 0.001, 0.5, 0.01, d), 'highpass', 5000);
    },
    typeBell() { S.bell({ f: 2400, vol: 0.2 }); },
    stamp() { S.thud({ vol: 0.7 }); },
    heartbeat(o) {
      const t = now(), d = out({ vol: (o && o.vol) || 0.5, bus: sfxBus }, 0); if (!d) return;
      osc('sine', 62, t, 0.12, gainEnv(t, 0.005, 0.9, 0.12, d), 40);
      osc('sine', 55, t + 0.2, 0.12, gainEnv(t + 0.2, 0.005, 0.6, 0.12, d), 38);
    },
    // ------ voices
    groan(o) {
      if (!limit('groan', 5, 1.8)) return;
      const f = (70 + R() * 50) * (o.pitch || 1);
      const dur = 0.8 + R() * 1.0;
      const v = R() < 0.5 ? [[380, 720], [780, 1100], [2500, 2400]] : [[650, 420], [1080, 800], [2450, 2300]];
      voice(Object.assign({ vol: 0.55, ref: 6 }, o), { f0: f * 1.12, f1: f * 0.82, dur, formants: v, rasp: 0.12, amp: 0.55, vib: 4, vibRate: 3 + R() * 4 });
    },
    zattack(o) {
      if (!limit('zatk', 4, 0.6)) return;
      const f = (140 + R() * 50) * (o.pitch || 1);
      voice(Object.assign({ vol: 0.8, ref: 6 }, o), { f0: f, f1: f * 0.7, dur: 0.45, formants: [[750, 700], [1150, 1100], [2600, 2500]], rasp: 0.5, amp: 0.7, att: 0.02, vib: 8, vibRate: 11 });
    },
    zdie(o) {
      if (!limit('zdie', 4, 1)) return;
      const f = (100 + R() * 30) * (o.pitch || 1);
      voice(Object.assign({ vol: 0.7, ref: 6 }, o), { f0: f, f1: f * 0.45, dur: 0.9, formants: [[600, 350], [1000, 700], [2400, 2200]], rasp: 0.3, amp: 0.6, gurgle: 17, vib: 6 });
    },
    phurt(o) {
      const f = 150 + R() * 30;
      voice(Object.assign({ vol: 0.75 }, o || {}), { f0: f * 1.1, f1: f * 0.8, dur: 0.2 + R() * 0.08, formants: [[620, 560], [1150, 1000], [2500, 2400]], rasp: 0.2, amp: 0.75, att: 0.01, vib: 2, rev: 0.1 });
    },
    pdie(o) {
      voice(Object.assign({ vol: 0.9 }, o || {}), { f0: 190, f1: 90, dur: 1.4, formants: [[700, 500], [1100, 850], [2500, 2300]], rasp: 0.4, amp: 0.8, att: 0.02, vib: 7, vibRate: 6, rev: 0.5 });
    },
    // ------ fire
    whoomp(o) {
      const t = now(), d = out(o, 0.5); if (!d) return;
      noise(t, 0.8, gainEnv(t, 0.08, 1.0, 0.7, d), 'lowpass', 180, 1, 1800, true);
      osc('sine', 70, t, 0.4, gainEnv(t, 0.02, 0.6, 0.4, d), 40);
    },
    crackle(o) {
      const t = now(), d = out(o, 0.05); if (!d) return;
      for (let i = 0; i < 3; i++) {
        const tt = t + R() * 0.15;
        noise(tt, 0.02, gainEnv(tt, 0.001, 0.15 + R() * 0.25, 0.02, d), 'bandpass', 1500 + R() * 3000, 2);
      }
      noise(t, 0.3, gainEnv(t, 0.1, 0.12, 0.2, d), 'lowpass', 500, 1, 0, true);
    },
    throwIt(o) { S.swing(o); },
    distantShot() {
      const t = now(), d = out({ vol: 0.12 + R() * 0.1 }, 1.2); if (!d) return;
      const lp = filt('lowpass', 500, 1, d);
      noise(t, 0.3, gainEnv(t, 0.002, 1, 0.3, lp), 'bandpass', 700, 0.7);
      osc('sine', 110, t, 0.2, gainEnv(t, 0.002, 0.6, 0.2, lp), 40);
    },
    dog() {
      const t = now(), pan = R() * 1.6 - 0.8;
      for (let i = 0; i < 2 + (R() * 3 | 0); i++) {
        voice({ vol: 0.08, bus: ambBus }, { f0: 420, f1: 300, dur: 0.16, delay: i * 0.32, formants: [[900, 700], [1600, 1400], [2800, 2600]], rasp: 0.4, amp: 0.8, att: 0.01, rev: 1.5 });
      }
      return pan && t;
    },
    ebs(o) { // Emergency Broadcast attention tone
      const t = now(), dur = (o && o.dur) || 3;
      const d = out({ vol: (o && o.vol) || 0.18 }, 0); if (!d) return;
      const g = gainEnv(t, 0.02, 1, 0.05, d, dur);
      osc('sine', 853, t, dur + 0.1, g); osc('sine', 960, t, dur + 0.1, g);
    },
    slam() { // logo slam
      const t = now(), d = out({ vol: 1 }, 1.0); if (!d) return;
      osc('sine', 90, t, 1.2, gainEnv(t, 0.002, 1.2, 1.2, d), 28);
      noise(t, 1.4, gainEnv(t, 0.001, 0.9, 1.3, d), 'lowpass', 2400, 0.7, 120);
      noise(t, 0.12, gainEnv(t, 0.001, 0.8, 0.1, d), 'highpass', 3000);
    },
    sting() { // death sting
      const t = now(), d = out({ vol: 0.6, bus: musicBus }, 1.5); if (!d) return;
      [38, 41, 44, 50].forEach((m) => {
        osc('triangle', mtof(m), t, 4, gainEnv(t, 0.005, 0.25, 4, d));
      });
      noise(t, 3, gainEnv(t, 1.5, 0.4, 1.4, d), 'lowpass', 200, 1, 1400, true);
    },
  };
  A.play = function (name, o) {
    if (!ctx || !A.ready) return;
    const fn = S[name];
    if (fn) try { fn(o || {}); } catch (e) { /* ignore scheduling glitches */ }
  };

  // ------------------------------------------------------------ loops (handles)
  A.loop = function (kind, o) {
    if (!ctx) return { stop() {}, set() {} };
    const t = now();
    const g = ctx.createGain(); g.gain.value = 0;
    let pan = null;
    if (ctx.createStereoPanner) { pan = ctx.createStereoPanner(); g.connect(pan); pan.connect(o && o.bus === 'music' ? musicBus : ambBus); }
    else g.connect(ambBus);
    const nodes = [];
    const src = (buf) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(t, Math.random()); nodes.push(s); return s; };
    const target = (o && o.vol) || 0.3;
    if (kind === 'rain') {
      const s = src(noiseBuf); const hp = filt('highpass', 1400, 0.5, g); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000; s.connect(lp); lp.connect(hp);
    } else if (kind === 'wind') {
      const s = src(brownBuf); const lp = filt('lowpass', 420, 0.8, g); s.connect(lp);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 180; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(); nodes.push(lfo);
    } else if (kind === 'static') {
      const s = src(noiseBuf); const bp = filt('bandpass', 2600, 0.6, g); s.connect(bp);
    } else if (kind === 'heli') {
      const s = src(brownBuf); const lp = filt('lowpass', 520, 1, g);
      const am = ctx.createGain(); am.gain.value = 0.5; s.connect(am); am.connect(lp);
      const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 11; const lg = ctx.createGain(); lg.gain.value = 0.5;
      lfo.connect(lg); lg.connect(am.gain); lfo.start(); nodes.push(lfo);
      const wh = ctx.createOscillator(); wh.frequency.value = 1850; const wg = ctx.createGain(); wg.gain.value = 0.02; wh.connect(wg); wg.connect(g); wh.start(); nodes.push(wh);
    } else if (kind === 'alarm') {
      const o1 = ctx.createOscillator(); o1.type = 'square'; o1.frequency.value = 880;
      const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 2; const lg = ctx.createGain(); lg.gain.value = 170;
      lfo.connect(lg); lg.connect(o1.frequency); const lp = filt('lowpass', 2200, 1, g); o1.connect(lp); o1.start(); lfo.start(); nodes.push(o1, lfo);
    } else if (kind === 'hum') {
      const o1 = ctx.createOscillator(); o1.frequency.value = 60; const o2 = ctx.createOscillator(); o2.frequency.value = 120; o2.type = 'sawtooth';
      const lp = filt('lowpass', 300, 1, g); o1.connect(lp); o2.connect(lp); o1.start(); o2.start(); nodes.push(o1, o2);
    }
    g.gain.linearRampToValueAtTime(target, t + ((o && o.fade) || 1.5));
    return {
      set(vol, p) {
        g.gain.setTargetAtTime(Math.max(0, vol), now(), 0.15);
        if (pan && p !== undefined) pan.pan.setTargetAtTime(HC.clamp(p, -0.9, 0.9), now(), 0.1);
      },
      stop(fade) {
        const f = fade === undefined ? 1 : fade;
        g.gain.cancelScheduledValues(now());
        g.gain.setValueAtTime(g.gain.value, now());
        g.gain.linearRampToValueAtTime(0, now() + f);
        setTimeout(() => nodes.forEach((n) => { try { n.stop(); } catch (e) { /* already stopped */ } }), f * 1000 + 100);
      },
    };
  };

  // ------------------------------------------------------------ music
  const M = { track: null, step: 0, next: 0, timer: null, base: null, combat: null, intensity: 0, drones: [] };
  A.musicState = M;

  const inst = {
    piano(dest, t, m, dur, vel) {
      const f = mtof(m), v = (vel || 0.5) * 0.28;
      const g = gainEnv(t, 0.004, v, Math.min(3.2, dur * 1.6 + 0.4), dest);
      const lp = filt('lowpass', 2600, 0.5, g);
      osc('triangle', f, t, dur * 1.6 + 0.5, lp);
      osc('sine', f * 2.001, t, dur + 0.3, gainEnv(t, 0.004, 0.35, dur * 0.9 + 0.2, lp));
      osc('sine', f * 0.999, t, dur * 1.6 + 0.5, lp);
    },
    pluck(dest, t, m, dur, vel) {
      const f = mtof(m), v = (vel || 0.5) * 0.22;
      const g = gainEnv(t, 0.003, v, 1.3, dest);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
      lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.35);
      lp.connect(g);
      osc('sawtooth', f, t, 1.4, lp); osc('sawtooth', f * 1.004, t, 1.4, lp);
    },
    pad(dest, t, notes, dur, vel) {
      const v = (vel || 0.5) * 0.06;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + Math.min(1.8, dur * 0.4));
      g.gain.setValueAtTime(v, t + dur * 0.8);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.2);
      const lp = filt('lowpass', 850, 0.7, dest); g.connect(lp);
      notes.forEach((m) => { osc('sawtooth', mtof(m) * 0.997, t, dur + 1.3, g); osc('sawtooth', mtof(m) * 1.004, t, dur + 1.3, g); });
    },
    bass(dest, t, m, dur, vel) {
      const f = mtof(m), v = (vel || 0.6) * 0.4;
      const g = gainEnv(t, 0.005, v, dur + 0.1, dest, dur * 0.5);
      const lp = filt('lowpass', 420, 1, g);
      osc('triangle', f, t, dur + 0.2, lp); osc('sawtooth', f, t, dur + 0.2, gainEnv(t, 0.005, 0.25, dur, lp));
    },
    guitar(dest, t, m, dur, vel, mute) {
      const f = mtof(m), v = (vel || 0.6) * 0.14;
      const g = gainEnv(t, 0.003, v, mute ? 0.14 : dur + 0.1, dest, mute ? 0 : dur * 0.6);
      const hp = filt('highpass', 110, 0.7, g);
      const pk = filt('peaking', 1400, 1, hp); pk.gain.value = 6;
      const lp = filt('lowpass', mute ? 1500 : 2600, 0.8, pk);
      const ws = ctx.createWaveShaper(); ws.curve = distCurve; ws.oversample = '2x'; ws.connect(lp);
      const pre = ctx.createGain(); pre.gain.value = 3.5; pre.connect(ws);
      const d = mute ? 0.18 : dur + 0.2;
      osc('sawtooth', f, t, d, pre); osc('sawtooth', f * 1.006, t, d, pre); osc('sawtooth', f * 1.498, t, d, pre);
    },
    kick(dest, t, vel) {
      const g = gainEnv(t, 0.001, (vel || 1) * 0.9, 0.3, dest);
      osc('sine', 150, t, 0.3, g, 42);
      noise(t, 0.01, gainEnv(t, 0.001, 0.25, 0.01, dest), 'lowpass', 3000);
    },
    snare(dest, t, vel) {
      noise(t, 0.2, gainEnv(t, 0.001, (vel || 1) * 0.45, 0.18, dest), 'bandpass', 1900, 0.8);
      osc('triangle', 190, t, 0.1, gainEnv(t, 0.001, (vel || 1) * 0.35, 0.1, dest), 150);
    },
    hat(dest, t, vel) { noise(t, 0.05, gainEnv(t, 0.001, (vel || 1) * 0.12, 0.04, dest), 'highpass', 7500); },
    tom(dest, t, vel, f) { osc('sine', f || 120, t, 0.3, gainEnv(t, 0.001, (vel || 1) * 0.6, 0.3, dest), (f || 120) * 0.6); },
    bell(dest, t, m, vel) {
      const f = mtof(m), v = (vel || 0.4) * 0.12;
      [[1, 1, 3], [2.76, 0.4, 1.5], [5.4, 0.2, 0.8]].forEach(([k, a, dec]) => osc('sine', f * k, t, dec, gainEnv(t, 0.002, v * a, dec, dest)));
    },
  };
  let distCurve = null;
  function mkCurve() {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; c[i] = Math.tanh(x * 4); }
    return c;
  }

  // chord helper: [root, ...intervals] as MIDI
  const CH = {
    m: (r) => [r, r + 7, r + 12, r + 15, r + 19],
    M: (r) => [r, r + 7, r + 12, r + 16, r + 19],
  };

  function levelTrack(p) {
    // p: {bpm, chords:[[type,root]...], inst, riff:[offsets or null]*16*2, root, bells}
    return {
      bpm: p.bpm,
      tick(step, t, L) {
        const bar = Math.floor(step / 16), s = step % 16;
        const [ty, r] = p.chords[bar % p.chords.length];
        const notes = CH[ty](r);
        const spb = 60 / p.bpm / 4;
        // ---- base layer
        if (s === 0) inst.pad(L.base, t, [notes[0] - 12, notes[1], notes[3]], spb * 16, 0.6);
        if (s === 0 && bar % 2 === 0) inst.bass(L.base, t, r - 12, spb * 12, 0.5);
        const arp = p.arp || [0, null, 2, null, 3, null, 4, null, 2, null, 3, null, 1, null, null, null];
        const a = arp[s];
        if (a !== null && a !== undefined && (p.sparse ? (bar % 2 === 0 || s < 8) : true)) inst[p.inst](L.base, t, notes[a] + (p.oct || 0), spb * 2, 0.35 + (s === 0 ? 0.15 : 0));
        if (p.bells && s === 6 && bar % 4 === 3) inst.bell(L.base, t, notes[4] + 12, 0.5);
        // ---- combat layer
        const riff = p.riff;
        const rv = riff[(bar % 2) * 16 + s];
        if (rv !== null && rv !== undefined) inst.guitar(L.combat, t, p.root + rv, spb * 1.8, 0.7, rv === 0);
        if (s % 2 === 0) inst.hat(L.combat, t, s % 4 === 0 ? 1 : 0.6);
        if (s === 0 || s === 8 || s === 10 || (p.dbl && s === 3)) inst.kick(L.combat, t, 1);
        if (s === 4 || s === 12) inst.snare(L.combat, t, 1);
        if (s === 14 && bar % 4 === 3) { inst.tom(L.combat, t, 0.8, 140); inst.tom(L.combat, t + spb, 0.8, 100); }
        if (s === 0) inst.bass(L.combat, t, p.root - 12 + (rv || 0), spb * 3, 0.9);
      },
    };
  }
  const E = null;
  const TRACKS = {
    title: {
      bpm: 62,
      tick(step, t, L) {
        const bar = Math.floor(step / 16) % 8, s = step % 16;
        const prog = [[CH.m, 50], [CH.M, 46], [CH.M, 53], [CH.M, 48], [CH.m, 50], [CH.m, 43], [CH.M, 46], [CH.M, 45]];
        const [fn, r] = prog[bar];
        const notes = fn(r);
        const spb = 60 / 62 / 4;
        if (s === 0) { inst.pad(L.base, t, [notes[0] - 12, notes[1], notes[3]], spb * 16, 0.7); inst.bass(L.base, t, r - 12, spb * 14, 0.4); }
        const arp = [0, E, 1, E, 2, E, 3, E, 4, E, 3, E, 2, E, 1, E];
        if (arp[s] !== E) inst.piano(L.base, t, notes[arp[s]], spb * 2, s === 0 ? 0.55 : 0.35);
        const mel = { 1: { 0: 69, 8: 67, 12: 65 }, 2: { 0: 65, 6: 64, 8: 62 }, 3: { 0: 64, 8: 60 }, 5: { 0: 70, 4: 69, 8: 67 }, 6: { 0: 65, 8: 62 }, 7: { 0: 64, 4: 61, 8: 64 } };
        if (mel[bar] && mel[bar][s]) inst.piano(L.base, t, mel[bar][s] + 12, spb * 6, 0.45);
        if (s === 0 && bar % 4 === 0) inst.bell(L.base, t, 86, 0.35);
      },
    },
    m1: levelTrack({ bpm: 74, inst: 'pluck', root: 40, chords: [['m', 52], ['M', 48], ['m', 45], ['M', 47]], riff: [0, null, 0, 0, null, 0, 3, null, 0, null, 0, 0, 5, null, 3, 1, 0, null, 0, 0, null, 0, 7, null, 6, null, 5, null, 3, null, 1, null], bells: true }),
    m2: levelTrack({ bpm: 60, inst: 'piano', root: 36, sparse: true, chords: [['m', 48], ['M', 44], ['m', 41], ['M', 43]], arp: [0, null, null, 3, null, null, 4, null, null, 2, null, null, 1, null, null, null], riff: [0, null, 0, null, 1, null, 0, null, 0, null, 0, null, 6, null, 5, null, 0, null, 0, null, 1, null, 3, null, 0, 0, 0, null, 6, 5, 3, 1], bells: true, oct: 12 }),
    m3: levelTrack({ bpm: 84, inst: 'pluck', root: 45, chords: [['m', 57], ['M', 53], ['m', 50], ['M', 52]], arp: [0, 2, 3, 4, 3, 2, 0, 2, 1, 2, 3, 4, 3, 2, 1, 2], riff: [0, 0, null, 0, 0, null, 3, 0, 0, null, 5, null, 3, null, 1, null, 0, 0, null, 0, 0, null, 10, null, 8, null, 7, null, 5, null, 3, null], dbl: true }),
    m4: levelTrack({ bpm: 70, inst: 'piano', root: 38, chords: [['m', 50], ['M', 46], ['m', 43], ['M', 45]], riff: [0, 0, 0, null, 0, 0, 1, null, 0, 0, 0, null, 3, null, 1, null, 0, 0, 0, null, 0, 0, 5, null, 3, null, 1, null, 0, null, -1, null], bells: true, sparse: true }),
    boss: levelTrack({ bpm: 96, inst: 'guitar', root: 38, chords: [['m', 50], ['M', 49], ['m', 50], ['M', 46]], arp: [0, null, null, null, 0, null, null, null, 0, null, null, null, 0, null, 1, null], riff: [0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 1, 6, null, 5, null, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 10, null, 8, null, 6, 5], dbl: true }),
    inter: levelTrack({ bpm: 88, inst: 'piano', root: 45, chords: [['m', 57], ['M', 53], ['M', 48], ['M', 55]], arp: [0, null, 2, 3, null, 2, 4, null, 0, null, 2, 3, null, 4, 3, null], riff: [] }),
    ending: {
      bpm: 58,
      tick(step, t, L) {
        const bar = Math.floor(step / 16) % 4, s = step % 16;
        const prog = [[CH.M, 48], [CH.M, 43], [CH.m, 45], [CH.M, 41]];
        const [fn, r] = prog[bar];
        const notes = fn(r), spb = 60 / 58 / 4;
        if (s === 0) { inst.pad(L.base, t, [notes[0] - 12, notes[1], notes[3]], spb * 16, 0.6); inst.bass(L.base, t, r - 12, spb * 14, 0.45); }
        if (s % 4 === 0) inst.piano(L.base, t, notes[[0, 2, 3, 4][s / 4]] + 12, spb * 4, 0.35);
        if (s === 8 && bar % 2 === 1) inst.bell(L.base, t, notes[4] + 12, 0.3);
      },
    },
  };

  A.music = {
    play(name, fade) {
      if (!ctx) return;
      distCurve = distCurve || mkCurve();
      if (M.track === name) return;
      A.music.stop(fade === undefined ? 1.5 : fade);
      if (!name || !TRACKS[name]) return;
      M.track = name;
      M.step = 0;
      M.next = now() + 0.1;
      M.base = ctx.createGain(); M.base.gain.value = 0; M.base.connect(musicBus);
      M.combat = ctx.createGain(); M.combat.gain.value = 0; M.combat.connect(musicBus);
      const rs = ctx.createGain(); rs.gain.value = 0.55; M.base.connect(rs); rs.connect(revSend);
      M.base.gain.linearRampToValueAtTime(1, now() + 2);
      M.intensity = 0;
      const tr = TRACKS[name];
      const L = { base: M.base, combat: M.combat };
      M.timer = setInterval(() => {
        if (!ctx || ctx.state !== 'running') return;
        const spb = 60 / tr.bpm / 4;
        if (M.next < now() - 0.5) M.next = now() + 0.05;
        while (M.next < now() + 0.15) {
          try { tr.tick(M.step, M.next, L); } catch (e) { /* skip bad step */ }
          M.step++; M.next += spb;
        }
      }, 30);
    },
    stop(fade) {
      if (M.timer) clearInterval(M.timer);
      M.timer = null;
      const f = fade || 1;
      [M.base, M.combat].forEach((g) => {
        if (!g) return;
        g.gain.cancelScheduledValues(now()); g.gain.setValueAtTime(g.gain.value, now());
        g.gain.linearRampToValueAtTime(0, now() + f);
        setTimeout(() => g.disconnect(), f * 1000 + 3000);
      });
      M.base = M.combat = null;
      M.track = null;
    },
    intensity(v) {
      if (!M.combat) return;
      v = HC.clamp(v, 0, 1);
      if (Math.abs(v - M.intensity) < 0.02) return;
      M.intensity = v;
      M.combat.gain.setTargetAtTime(v * 0.9, now(), v > 0.5 ? 0.4 : 1.6);
      M.base.gain.setTargetAtTime(1 - v * 0.55, now(), 1.2);
    },
    get current() { return M.track; },
  };
  return A;
})();
