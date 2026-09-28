// Hollow County — procedural character rig. Low-poly 3D figures (tapered limbs, hull-shaded torso,
// shaped heads, clothing layers) posed in local (right, forward, up) units and projected isometrically.
'use strict';
HC.rig = (function () {
  const R = {};
  const HW = HC.HW, HH = HC.HH, ZP = HC.ZP;
  const PX = Math.hypot(HW, HW);             // orthographic scale: px per world unit (sphere radius r -> r*PX)
  const C = HC.rgb, clamp = HC.clamp, lerp = HC.lerp;
  const TAU = Math.PI * 2, HP = Math.PI / 2;
  const LW = [-0.21, 0.565, 0.8];            // light direction (world): up, screen-left, slightly toward camera
  const VW = [1 / 1.625, 1 / 1.625, 0.8 / 1.625];   // toward-camera direction (world)
  const LSX = -0.6, LSY = -0.8;              // light direction in screen space (upper-left)
  const OL = 1.05;                           // outline width (px, pre-zoom)

  // ---------------------------------------------------------------- outfits
  const SK = {
    player: [206, 160, 122], pale: [166, 170, 146], grey: [142, 148, 132], ashen: [174, 164, 150], sallow: [156, 154, 116], dark: [114, 104, 86], green: [132, 146, 112],
  };
  R.SKIN = SK;
  const JEANS = [[58, 74, 110], [70, 88, 124], [46, 56, 84]];
  const OUTFITS = {
    medic: { skin: SK.player, hair: [48, 36, 28], hairStyle: 1, shirt: [92, 98, 64], pants: [84, 88, 62], shoes: [46, 38, 30], band: true, sleeves: 'rolled', tuck: true, belt: [48, 40, 30], collar: true },
    civ: [
      { shirt: [150, 46, 40], pants: JEANS[0] }, { shirt: [214, 206, 180], pants: JEANS[2] }, { shirt: [72, 96, 70], pants: [110, 96, 70] },
      { shirt: [196, 160, 70], pants: [48, 52, 60] }, { shirt: [90, 110, 150], pants: [140, 120, 90] }, { shirt: [120, 70, 110], pants: JEANS[1] },
      { shirt: [180, 110, 60], pants: [70, 60, 50] }, { shirt: [60, 60, 64], pants: JEANS[0] }, { shirt: [200, 200, 196], pants: [60, 62, 70], collar: true, tuck: true, belt: [40, 30, 24], sleeves: 'long' },
    ],
    doctor: [
      { shirt: [150, 176, 196], pants: [66, 68, 76], coat: [230, 230, 222], sleeves: 'long', collar: true, tie: [120, 40, 44], shoes: [34, 30, 28] },
      { shirt: [100, 150, 150], pants: [100, 150, 150], sleeves: 'short', vneck: true, scrubCap: [100, 150, 150], shoes: [210, 210, 206] },
      { shirt: [120, 160, 190], pants: [120, 160, 190], sleeves: 'short', vneck: true, shoes: [70, 70, 74] },
    ],
    patient: [{ shirt: [168, 196, 206], pants: null, gown: true, shoes: [196, 196, 188] }, { shirt: [200, 210, 200], pants: null, gown: true, shoes: null }],
    mall: [
      { shirt: [160, 40, 36], pants: [40, 40, 44], collar: true, tuck: true, belt: [26, 24, 22] }, { shirt: [40, 60, 110], pants: [150, 140, 120] },
      { shirt: [30, 30, 34], pants: [30, 30, 34], cap: [30, 30, 34], sleeves: 'short', tuck: true, belt: [20, 20, 20], badge: [190, 190, 196] },
    ],
    police: [{ shirt: [48, 60, 90], pants: [36, 40, 56], cap: [36, 40, 56], capStyle: 'peaked', sleeves: 'short', tuck: true, belt: [22, 22, 24], badge: [212, 180, 80], collar: true, shoes: [24, 24, 26] }],
    soldier: [
      { shirt: [86, 92, 62], pants: [80, 86, 58], helmet: [74, 80, 54], vest: [70, 74, 50], sleeves: 'long', tuck: true, belt: [50, 48, 36], gloves: [52, 50, 42], shoes: [44, 38, 30] },
      { shirt: [100, 96, 70], pants: [86, 90, 62], helmet: [74, 80, 54], sleeves: 'rolled', tuck: true, belt: [50, 48, 36], shoes: [44, 38, 30] },
    ],
    hazmat: [{ shirt: [206, 190, 80], pants: [206, 190, 80], helmet: [210, 200, 120], hood: true, sleeves: 'long', gloves: [34, 34, 32], shoes: [34, 34, 32], suit: true }],
    eod: [{ shirt: [70, 78, 58], pants: [70, 78, 58], helmet: [60, 66, 50], bulk: 1.55, visor: true, sleeves: 'long', gloves: [40, 40, 36], shoes: [34, 32, 28], suit: true }],
  };
  R.OUTFITS = OUTFITS;

  R.makeZombieLook = function (set, rng) {
    const base = rng.pick(OUTFITS[set] || OUTFITS.civ);
    const skin = rng.pick([SK.pale, SK.grey, SK.ashen, SK.sallow, SK.dark, SK.green]).map((v) => v * rng.range(0.9, 1.08));
    const covered = base.helmet || base.cap || base.hood || base.scrubCap;
    const hairStyle = covered ? 1 : rng.pick([0, 1, 1, 1, 2, 2, 4]);
    const o = Object.assign({
      skin, hair: rng.pick([[40, 32, 26], [90, 70, 50], [120, 110, 100], [150, 120, 70], [30, 28, 26], [160, 150, 140]]), hairStyle,
      shoes: rng.pick([[40, 36, 32], [40, 36, 32], [196, 194, 188], [84, 62, 42]]),
    }, base);
    if (!o.sleeves) o.sleeves = rng.chance(0.6) ? 'short' : 'long';
    o.pants = o.pants ? o.pants.slice() : null;
    o.blood = rng.range(0.15, 0.6);
    o.seed = rng.range(0, 100);
    o.slim = rng.range(0.92, 1.06);
    o.stains = [];                                             // [spine s, angle, radius] — blood on the torso
    const ns = 2 + Math.floor(o.blood * 6);
    for (let i = 0; i < ns; i++) o.stains.push([rng.range(0.02, 0.36), rng.range(-0.5, 3.6), rng.range(0.018, 0.045)]);
    o.holes = [];                                              // torn cloth showing skin
    if (!o.suit && rng.chance(0.7)) for (let i = 0, n = 1 + Math.floor(rng.range(0, 3)); i < n; i++) o.holes.push([rng.range(0.06, 0.34), rng.range(0, TAU), rng.range(0.018, 0.032)]);
    o.tornHem = !o.suit && !o.gown && !o.coat && !o.tuck && rng.chance(0.55);
    o.tornLeg = o.pants && !o.suit && rng.chance(0.3) ? (rng.chance(0.5) ? 1 : 2) : 0;
    o.bloodArm = rng.chance(0.6) ? (rng.chance(0.5) ? 1 : 2) : 0;
    o.stump = rng.pick([0, 1, 2, 3, 3]);                       // missing lower legs (only shown on crawlers)
    o.armsUp = rng.chance(0.55) ? rng.pick([1, 1, 1, 2, 3]) : 0;
    o.limp = rng.range(0, 0.6);
    o.limpSide = rng.chance(0.5) ? 1 : 0;
    o.tilt = rng.range(-0.08, 0.08);
    o.jaw = rng.range(0.15, 0.7);
    o.drop = rng.range(-0.035, 0.035);
    o.hunch = rng.range(0, 0.12);
    return o;
  };

  // ---------------------------------------------------------------- small vector helpers
  const lin = (a, ka, b, kb) => [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const madd = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  // two-bone IK: shoulder/hip S -> target T with bone lengths la, lb, bending toward pole
  function ik(S, T, la, lb, pole) {
    let dx = T[0] - S[0], dy = T[1] - S[1], dz = T[2] - S[2];
    let d = Math.hypot(dx, dy, dz) || 1e-6;
    const mx = (la + lb) * 0.998;
    if (d > mx) { const k = mx / d; dx *= k; dy *= k; dz *= k; d = mx; T = [S[0] + dx, S[1] + dy, S[2] + dz]; }
    const ux = dx / d, uy = dy / d, uz = dz / d;
    const pd = pole[0] * ux + pole[1] * uy + pole[2] * uz;
    let px = pole[0] - ux * pd, py = pole[1] - uy * pd, pz = pole[2] - uz * pd;
    const pl = Math.hypot(px, py, pz) || 1; px /= pl; py /= pl; pz /= pl;
    const a = clamp((la * la - lb * lb + d * d) / (2 * d), -la, la);
    const hh = Math.sqrt(Math.max(0, la * la - a * a));
    return [[S[0] + ux * a + px * hh, S[1] + uy * a + py * hh, S[2] + uz * a + pz * hh], T];
  }
  // body frame after forward lean (pitch) and sideways roll
  function frameOf(lean, roll) {
    const cl = Math.cos(lean), sl = Math.sin(lean), cr = Math.cos(roll), sr = Math.sin(roll);
    return { ex: [cr, -sl * sr, -cl * sr], ey: [0, cl, -sl], ez: [sr, sl * cr, cl * cr] };
  }
  const twistOf = (F, t) => { const c = Math.cos(t), s = Math.sin(t); return [lin(F.ex, c, F.ey, s), lin(F.ey, c, F.ex, -s)]; };

  // estimate gait speed from how fast the walk phase advances (cached on the look object)
  function runAmt(h, amp) {
    const o = h.look;
    const now = performance.now();
    let a = o._gait;
    if (!a) a = o._gait = { w: h.walk || 0, t: now, r: 0 };
    const dt = (now - a.t) / 1000;
    if (dt > 0.008) {
      const rate = dt < 0.5 ? clamp(((h.walk || 0) - a.w) / dt, 0, 20) : a.r;
      a.r += (rate - a.r) * Math.min(1, dt * 5); a.w = h.walk || 0; a.t = now;
    }
    return clamp((a.r - (h.zombie ? 5.4 : 8.4)) / 3, 0, 1) * amp;
  }

  // ---------------------------------------------------------------- pose
  const THIGH = 0.3, SHIN = 0.29, UARM = 0.265, FARM = 0.235;
  const S_SH = 0.378, S_NECK = 0.415;

  function swingAngle(t) {
    let th;
    if (t < 0.22) th = lerp(-100, -135, t / 0.22);
    else if (t < 0.55) th = lerp(-135, 75, HC.smooth((t - 0.22) / 0.33));
    else th = lerp(75, -60, HC.smooth((t - 0.55) / 0.45));
    return th * Math.PI / 180;
  }

  function buildPose(h) {
    const o = h.look || OUTFITS.medic;
    const zombie = !!h.zombie;
    const bw = o.bulk || 1;
    const bwL = 1 + (bw - 1) * 0.65;                    // limb/leg-spacing scale
    const amp = clamp(h.moveAmt || 0, 0, 1);
    const ph = h.walk || 0, s1 = Math.sin(ph), c1 = Math.cos(ph);
    const fall = clamp(h.fall || 0, 0, 1);
    const prone = fall > 0.5 && (h.fallDir || 1) < 0;
    const dead = !!h.dead;
    const run = prone || fall > 0.05 ? 0 : runAmt(h, amp);
    const seed = o.seed || 0;
    const w = zombie ? null : h.weapon;
    const swinging = h.swingT !== undefined && h.swingT >= 0 && h.swingT < 1;
    let mode = 'free';
    if (prone) mode = 'prone';
    else if (zombie) mode = h.pose === 'eat' ? 'eat' : 'zombie';
    else if (w === 'pistol') mode = h.aiming ? 'pistolAim' : 'pistol';
    else if (w === 'shotgun' || w === 'rifle') mode = h.aiming ? 'gunAim' : 'gun';
    else if (w === 'bat' || w === 'axe') mode = swinging ? 'melee' : 'meleeIdle';
    else if (w === 'fists') mode = swinging ? 'punch' : 'guard';
    if (fall > 0.05 && !prone) { if (mode !== 'zombie' && mode !== 'free') mode = 'free'; }

    let hipZ = 0.645, px = 0, py = 0, lean = 0, roll = 0, hy = 0, tw = 0, zo = 0;
    let hp = 0.04, hr = 0, hyaw = 0, jaw = zombie ? (o.jaw || 0.3) : 0, hsx = 0;
    const lunge = h.pose === 'lunge' ? Math.sin(Math.PI * clamp(h.t || 0, 0, 1)) : 0;
    const legs = [];
    const limp = zombie ? (o.limp || 0) : 0, limpSide = o.limpSide || 0;

    // ---- body + legs
    if (mode === 'prone') {
      zo = -0.6;
      const am = dead ? 0 : 0.35 + 0.65 * amp;
      lean = dead ? -0.05 : -0.26 - 0.07 * Math.sin(2 * ph) * am;
      tw = Math.sin(ph) * 0.18 * am; roll = Math.sin(ph) * 0.07 * am;
      hipZ = 0.64 + 0.03 * Math.sin(2 * ph) * am;
      hp = dead ? -0.15 : -1.15 + 0.12 * Math.sin(2 * ph) * am; hr = dead ? 0.7 : Math.sin(ph) * 0.12 * am; jaw = dead ? 0.35 : 0.45 + 0.25 * Math.max(0, Math.sin(ph * 1.7));
      for (let i = 0; i < 2; i++) {
        const sx = i ? -1 : 1, p = ph + i * Math.PI;
        legs.push({ t: [sx * (0.1 + 0.03 * i), -0.03 + Math.sin(p) * 0.02 * am, 0.1 + Math.cos(p) * 0.025 * am], pole: [sx * 0.2, -1, 0], pitch: 1.35, yaw: sx * 0.3 });
      }
    } else if (mode === 'eat') {
      const b = Math.sin((h.t || 0) * 9);
      hipZ = 0.33; py = -0.06; lean = 0.95 + b * 0.05; hp = 0.45 + b * 0.15; jaw = 0.6 + 0.3 * Math.max(0, b); hr = (o.tilt || 0) * 3;
      for (let i = 0; i < 2; i++) { const sx = i ? -1 : 1; legs.push({ t: [sx * 0.11, -0.22, 0.06], pole: [sx * 0.1, 1, -0.2], pitch: 1.2, yaw: sx * 0.2 }); }
    } else {
      const stride = amp * (zombie ? 0.14 + 0.16 * run : 0.2 + 0.14 * run);
      const liftH = amp * (zombie ? 0.045 + 0.11 * run : 0.075 + 0.1 * run);
      for (let i = 0; i < 2; i++) {
        const sx = i ? -1 : 1, p = ph + i * Math.PI, sp = Math.sin(p), cp = Math.cos(p);
        const drag = i === limpSide ? limp * (1 - run) : 0;
        const pitch = drag > 0.25 ? 0.25 + 0.5 * drag : amp * (0.7 * Math.max(0, -sp) * clamp(cp + 0.7, 0, 1) - 0.3 * Math.max(0, sp) * Math.max(0, cp));
        legs.push({ t: [sx * 0.092 * bwL, sp * stride * (1 - drag * 0.45), 0.075 + Math.max(0, cp) * liftH * (1 - drag * 0.9)], pole: [sx * 0.12, 1, 0], pitch, yaw: sx * (0.1 + drag * 0.35) });
      }
      px = -c1 * 0.016 * amp;
      hipZ = 0.645 - 0.024 * amp * (1 - Math.abs(c1)) - 0.035 * run;
      hy = s1 * 0.14 * amp; tw = -s1 * 0.26 * amp;
      if (zombie) {
        const lp = ph + limpSide * Math.PI, ls = limpSide ? -1 : 1;
        const onLimp = Math.max(0, -Math.cos(lp)) * limp * amp;
        lean = 0.12 + 0.08 * amp + 0.12 * run + (o.hunch || 0) + lunge * 0.32;
        roll = (o.tilt || 0) + ls * onLimp * 0.14;
        hipZ -= onLimp * 0.035;
        py += lunge * 0.1;
        hp = (h.chasing ? 0.06 : 0.32) + Math.sin(ph * 0.5 + seed) * 0.08 - lunge * 0.3;
        hr = (o.tilt || 0) * 3 + Math.sin(ph * 0.5 + seed * 2) * 0.14 * (1 - run) - roll * 0.5;
        hyaw = Math.sin(ph * 0.37 + seed) * 0.16 * (1 - lunge);
        jaw = Math.max(jaw, lunge);
        tw *= 0.7;
      } else {
        lean = 0.03 * amp + 0.14 * run;
        hp = 0.05 + 0.1 * run;
      }
      if (h.stagger) { const st = clamp(h.stagger * 2.4, 0, 1); lean -= st * 0.34; hp -= st * 0.35; roll += st * 0.08 * Math.sin(seed); }
      // weapon stances shape the upper body
      if (mode === 'pistolAim') { lean += 0.04; tw = tw * 0.3 + 0.03; hp = 0.12; }
      else if (mode === 'gunAim') { const rc = (h.recoil || 0); tw = tw * 0.3 - 0.3 - rc * 0.08; lean += 0.06 - rc * 0.04; hp = 0.16; hr = 0.2; hyaw = -0.12; hsx = 0.02; }
      else if (mode === 'gun') { tw = tw * 0.5 - 0.15; }
      else if (mode === 'melee') {
        const th = swingAngle(h.swingT);
        tw = clamp(th * 0.42, -0.7, 0.6); hy = th * 0.16; hyaw = -tw * 0.6;
        const strike = h.swingT > 0.22 && h.swingT < 0.6 ? Math.sin(Math.PI * (h.swingT - 0.22) / 0.38) : 0;
        lean += 0.06 + strike * 0.14; hipZ -= strike * 0.03;
        if (w === 'axe') { lean += strike * 0.1; hp = 0.1 + strike * 0.2; }
      } else if (mode === 'punch') {
        const e = Math.sin(Math.PI * clamp((h.swingT - 0.12) / 0.5, 0, 1));
        tw = -0.22 + 0.62 * e; lean += 0.04 + 0.1 * e; hyaw = -tw * 0.5;
      } else if (mode === 'guard') { tw -= 0.15; lean += 0.05; hp = 0.12; }
    }

    // ---- falls (on the back): straighten body, splay limbs
    const fk = fall > 0 && !prone ? HC.smooth(fall) : 0;
    const variant = Math.floor(seed * 7.3) % 3;
    if (fk > 0) {
      lean *= 1 - fk; roll *= 1 - fk; tw *= 1 - fk; hy *= 1 - fk; px *= 1 - fk; py *= 1 - fk; hipZ = lerp(hipZ, 0.645, fk);
      hp = lerp(hp, dead ? -0.1 : 0.2, fk); hr = lerp(hr, (variant - 1 || 0.8) * 0.7, fk); hyaw *= 1 - fk; jaw = zombie ? lerp(jaw, 0.6, fk) : jaw;
      const FL = [
        [[0.15, 0.0, 0.075], [-0.14, 0.0, 0.075]],
        [[0.16, 0.06, 0.18], [-0.12, 0.0, 0.075]],
        [[0.13, 0.0, 0.075], [-0.2, 0.05, 0.32]],
      ][variant];
      for (let i = 0; i < 2; i++) {
        legs[i].t = mix3(legs[i].t, FL[i], fk); legs[i].pitch = lerp(legs[i].pitch, 0.9, fk); legs[i].yaw = lerp(legs[i].yaw, (i ? -1 : 1) * 0.7, fk);
        if (FL[i][2] > 0.2) legs[i].pole = mix3(legs[i].pole, variant === 2 ? [-1, 0.4, 0] : [0.3, 1, 0], fk);
      }
    }

    // ---- frame, pelvis, shoulders
    const F = frameOf(lean, roll);
    const P0 = [px, py, hipZ];
    const [exH, eyH] = twistOf(F, hy);
    const [exS, eyS] = twistOf(F, hy + tw);
    const SC = madd(P0, F.ez, S_SH);
    const rel = (x, y, z) => [SC[0] + x, SC[1] + y, SC[2] + z];
    const shW = 0.15 * bw;
    const sh = [madd(madd(SC, exS, shW), F.ez, -0.012), madd(madd(SC, exS, -shW), F.ez, -0.012)];
    if (zombie && o.drop) { sh[0][2] += o.drop; sh[1][2] -= o.drop; }

    // ---- arm targets (wrists) + weapon
    const wr = [null, null], pole = [null, null];
    let wpn = null;
    const hang = (i, fwd, up) => { const sx = i ? -1 : 1; return [sh[i][0] + sx * 0.03 * bwL, sh[i][1] + fwd, sh[i][2] - 0.47 + (up || 0)]; };
    const swingArm = (i) => {
      const sx = i ? -1 : 1, sw = (i ? s1 : -s1) * amp * (0.2 + 0.1 * run);
      const wk = hang(i, sw + 0.03, Math.abs(sw) * 0.22);
      const rn = [sh[i][0] + sx * 0.02, sh[i][1] + sw * 0.7 + 0.06, sh[i][2] - 0.26 + Math.max(0, sw) * 0.2];
      wr[i] = run > 0 ? mix3(wk, rn, run) : wk; pole[i] = [sx * 0.3, -1, -0.2 - run * 0.5];
    };
    if (mode === 'prone') {
      const am = dead ? 0 : 0.35 + 0.65 * amp;
      for (let i = 0; i < 2; i++) {
        const sx = i ? -1 : 1, p = ph + i * Math.PI, sp = Math.sin(p), cp = Math.cos(p);
        wr[i] = dead ? [sx * 0.3, 0.075, SC[2] + 0.2 + 0.1 * i] : [sx * (0.19 - 0.05 * sp * am), 0.08 - 0.13 * Math.max(0, cp) * am, SC[2] + 0.2 + 0.19 * sp * am];
        pole[i] = [sx * 0.8, 0.5, -0.4];
      }
    } else if (mode === 'eat') {
      const b = Math.sin((h.t || 0) * 9);
      wr[0] = [0.13, SC[1] + 0.2, 0.08 + Math.max(0, b) * 0.14]; wr[1] = [-0.12, SC[1] + 0.24, 0.08 + Math.max(0, -b) * 0.08];
      pole[0] = [0.6, -0.3, 0.2]; pole[1] = [-0.6, -0.3, 0.2];
    } else if (mode === 'zombie') {
      const up = o.armsUp === true ? 1 : o.armsUp || 0;
      const reachAll = lunge > 0.05 || (up && (h.chasing || amp > 0.3));
      for (let i = 0; i < 2; i++) {
        const sx = i ? -1 : 1;
        const armUp = lunge > 0.05 || (reachAll && (up === 1 || (up === 2 && i === 0) || (up === 3 && i === 1)));
        if (armUp) {
          const reach = 0.4 + lunge * 0.2 + run * 0.06;
          const wob = Math.sin(ph + i * 1.7 + seed) * 0.05, wob2 = Math.sin(ph * 0.7 + i * 2.1) * 0.04;
          wr[i] = rel(sx * (0.1 - lunge * 0.02) * bwL, reach + wob, -0.02 + wob2 + lunge * 0.08 + (i ? -0.02 : 0));
          pole[i] = [sx * 0.7, -0.1, -1];
        } else if (run > 0.3) {
          const sw = (i ? s1 : -s1) * 0.3 * run;
          wr[i] = hang(i, sw + 0.1, 0.12 + Math.abs(sw) * 0.3); pole[i] = [sx * 0.5, -1, 0];
        } else {
          const sw = Math.sin(ph - 0.9 + i * Math.PI) * 0.07 * amp;
          wr[i] = hang(i, 0.05 + sw, 0.01); pole[i] = [sx * 0.3, -0.6, 0];
        }
      }
      if (h.stagger) {
        const st = clamp(h.stagger * 2.4, 0, 1);
        for (let i = 0; i < 2; i++) { const sx = i ? -1 : 1; wr[i] = mix3(wr[i], [sh[i][0] + sx * 0.24, sh[i][1] - 0.02, sh[i][2] - 0.22 + i * 0.1], st); }
      }
    } else if (mode === 'pistolAim') {
      const rc = (h.recoil || 0) * 0.08;
      const g = rel(0.035, 0.44 - rc, -0.03 + rc * 0.35);
      wr[0] = [g[0] + 0.005, g[1] - 0.02, g[2] - 0.005]; wr[1] = [g[0] - 0.035, g[1] - 0.035, g[2] - 0.02];
      pole[0] = [0.8, -0.2, -1]; pole[1] = [-0.8, -0.2, -1];
      wpn = [{ a: [g[0], g[1] - 0.025, g[2] + 0.028], b: [g[0], g[1] + 0.13, g[2] + 0.04 + rc * 0.5], ra: 0.021, rb: 0.019, c: METAL },
        { a: [g[0], g[1] - 0.012, g[2] + 0.025], b: [g[0], g[1] - 0.03, g[2] - 0.05], ra: 0.017, rb: 0.017, c: METAL2 }];
    } else if (mode === 'pistol') {
      swingArm(1);
      wr[0] = hang(0, 0.14, 0.06); pole[0] = [0.3, -1, 0];
      const g = wr[0];
      wpn = [{ a: [g[0], g[1] + 0.03, g[2] - 0.02], b: [g[0] + 0.01, g[1] + 0.13, g[2] - 0.1], ra: 0.021, rb: 0.019, c: METAL }];
    } else if (mode === 'gunAim' || mode === 'gun') {
      const rc = (h.recoil || 0) * 0.1, aim = mode === 'gunAim';
      const butt = aim ? rel(0.12, -0.02 - rc, -0.02 + rc * 0.2) : rel(0.14, 0.03, -0.12);
      const muz = aim ? rel(0.05, (w === 'rifle' ? 0.84 : 0.82) - rc, 0.0 + rc * 0.5) : rel(-0.05, 0.64, -0.46);
      const at = (k) => mix3(butt, muz, k);
      const grip = at(0.2), fore = at(w === 'rifle' ? 0.52 : 0.55);
      wr[0] = [grip[0], grip[1], grip[2] - 0.05]; wr[1] = [fore[0], fore[1] - 0.01, fore[2] - 0.035];
      pole[0] = [0.9, -0.2, -0.8]; pole[1] = [-0.6, -0.2, -1];
      if (w === 'rifle') {
        wpn = [{ a: butt, b: at(0.3), ra: 0.032, rb: 0.024, c: METAL }, { a: at(0.28), b: at(0.48), ra: 0.03, rb: 0.03, c: METAL },
          { a: at(0.38), b: add(at(0.4), [0, 0, -0.1]), ra: 0.017, rb: 0.017, c: METAL2 }, { a: at(0.48), b: at(0.76), ra: 0.024, rb: 0.022, c: METAL2 },
          { a: at(0.76), b: muz, ra: 0.011, rb: 0.011, c: METAL }];
      } else {
        wpn = [{ a: butt, b: at(0.34), ra: 0.034, rb: 0.024, c: WOOD }, { a: at(0.33), b: at(0.46), ra: 0.027, rb: 0.025, c: METAL },
          { a: at(0.46), b: muz, ra: 0.016, rb: 0.015, c: METAL2 }, { a: at(0.53), b: at(0.72), ra: 0.024, rb: 0.024, c: WOOD }];
      }
    } else if (mode === 'melee') {
      const th = swingAngle(h.swingT), dr = -Math.sin(th), df = Math.cos(th);
      const wind = th < 0 ? -th / 2.36 : 0, fol = th > 0 ? th / 1.31 : 0;
      const axe = w === 'axe';
      const hz = axe ? 0.0 + wind * 0.3 - fol * 0.22 : -0.03 + wind * 0.16 - fol * 0.08;
      const piv = rel(0, 0.06, hz);
      const dir = [dr, df, 0];
      wr[0] = madd(piv, dir, 0.3); wr[1] = add(madd(piv, dir, 0.22), [0, 0, -0.01]);
      pole[0] = [0.6, -0.5, -0.8]; pole[1] = [-0.6, -0.5, -0.8];
      const tipZ = axe ? 0.12 + wind * 0.45 - fol * 0.45 : 0.1 + wind * 0.28 - fol * 0.05;
      const a = madd(piv, dir, 0.2), b = add(madd(piv, dir, axe ? 0.95 : 1.02), [0, 0, tipZ]);
      wpn = meleeParts(w, a, b, [-Math.cos(th), -Math.sin(th), 0]);
    } else if (mode === 'meleeIdle') {
      wr[0] = rel(0.13, 0.19, -0.2); wr[1] = rel(0.04, 0.23, -0.24);
      pole[0] = [0.8, -0.3, -1]; pole[1] = [-0.3, -0.3, -1];
      const a = rel(0.12, 0.2, -0.27), b = rel(0.23, -0.2, 0.45);
      wpn = meleeParts(w, a, b, [0, 1, 0.3]);
    } else if (mode === 'punch') {
      const e = Math.sin(Math.PI * clamp((h.swingT - 0.12) / 0.5, 0, 1));
      wr[0] = rel(0.07 - 0.05 * e, 0.16 + 0.36 * e, -0.06 + 0.03 * e); wr[1] = rel(-0.08, 0.2, -0.02);
      pole[0] = [0.8, -0.4, -0.7]; pole[1] = [-0.8, -0.2, -0.8];
    } else if (mode === 'guard') {
      wr[0] = rel(0.09, 0.22, -0.05); wr[1] = rel(-0.07, 0.24, -0.02);
      pole[0] = [0.8, -0.4, -0.7]; pole[1] = [-0.8, -0.4, -0.7];
    } else { swingArm(0); swingArm(1); }

    if (fk > 0) {   // falling on the back: arms flail then flop
      const FA = [
        [[0.44, 0.0, 0.88], [-0.45, 0.0, 0.84]],
        [[0.32, 0.0, 1.36], [-0.24, 0.02, 0.55]],
        [[0.03, 0.12, 0.86], [-0.46, 0.0, 1.0]],
      ][variant];
      const fl = Math.sin(fall * Math.PI) * 0.3;
      for (let i = 0; i < 2; i++) { wr[i] = mix3(wr[i], FA[i], fk); wr[i][2] += fl; pole[i] = mix3(pole[i], [(i ? -1 : 1), 0.2, -0.3], fk); }
      if (fk > 0.3) wpn = null;
    }

    // ---- solve limbs
    const hipW = 0.082 * bwL;
    const LEGS = [], ARMS = [];
    for (let i = 0; i < 2; i++) {
      const sx = i ? -1 : 1, L = legs[i];
      const hip = madd(madd(P0, exH, sx * hipW), F.ez, -0.015);
      const pl = add(lin(eyH, L.pole[1], exH, L.pole[0]), [0, 0, L.pole[2]]);
      const [knee, ank] = ik(hip, L.t, THIGH, SHIN, pl);
      const yaw = L.yaw + hy * 0.6, cp = Math.cos(L.pitch), spp = Math.sin(L.pitch);
      const fd = [Math.sin(yaw) * cp, Math.cos(yaw) * cp, -spp];
      const heel = [ank[0] - fd[0] * 0.035, ank[1] - fd[1] * 0.035, ank[2] - fd[2] * 0.035 - 0.04];
      const toe = [ank[0] + fd[0] * 0.115, ank[1] + fd[1] * 0.115, ank[2] + fd[2] * 0.115 - 0.045];
      const stump = prone && ((o.stump === 1 && i === 0) || (o.stump === 2 && i === 1) || o.stump === 3);
      LEGS.push({ hip, knee, ank, heel, toe, stump });
      const [el, wrist] = ik(sh[i], wr[i], UARM, FARM, nrm(pole[i]));
      const hd = nrm([wrist[0] - el[0], wrist[1] - el[1], wrist[2] - el[2]]);
      ARMS.push({ sh: sh[i], el, wr: wrist, hand: madd(wrist, hd, 0.075) });
    }

    // ---- head frame: shoulder frame, then yaw, pitch (nod), roll
    const nb = madd(P0, F.ez, S_NECK);
    let hf = eyS, hu = F.ez, hx = exS;
    if (hyaw) { const c = Math.cos(hyaw), s = Math.sin(hyaw); const nx = lin(hx, c, hf, s); hf = lin(hf, c, hx, -s); hx = nx; }
    if (hp) { const c = Math.cos(hp), s = Math.sin(hp); const nf = lin(hf, c, hu, -s); hu = lin(hu, c, hf, s); hf = nf; }
    if (hr) { const c = Math.cos(hr), s = Math.sin(hr); const nu = lin(hu, c, hx, s); hx = lin(hx, c, hu, -s); hu = nu; }
    const nt = madd(madd(nb, lin(F.ez, 0.5, hu, 0.5), 0.05), hx, hsx);
    const eod = !!o.visor;
    const HR = 0.088 * (eod ? 1.35 : 1);
    const hc = madd(madd(nt, hu, HR * 0.78), hf, 0.012);
    return {
      zo, P0, F, hy, tw, bw, legs: LEGS, arms: ARMS, wpn, neck: [nb, nt],
      head: { c: hc, f: hf, u: hu, x: hx, r: HR, jaw }, mode, prone, fk, amp, ph, run,
    };
  }
  R.buildPose = buildPose;

  const METAL = [40, 40, 44], METAL2 = [62, 62, 66], WOOD = [112, 74, 44];
  function meleeParts(w, a, b, bladeDir) {
    if (w === 'bat') return [{ a, b: mix3(a, b, 0.3), ra: 0.016, rb: 0.02, c: [96, 66, 40] }, { a: mix3(a, b, 0.28), b, ra: 0.021, rb: 0.037, c: [182, 142, 92] }];
    const s = nrm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    let n = nrm(bladeDir); const d = n[0] * s[0] + n[1] * s[1] + n[2] * s[2]; n = nrm([n[0] - s[0] * d, n[1] - s[1] * d, n[2] - s[2] * d]);
    const top = madd(b, s, -0.02);
    return [{ a, b, ra: 0.02, rb: 0.022, c: [150, 108, 66] },
      { poly: [madd(top, s, -0.06), madd(top, s, 0.04), madd(madd(top, s, 0.07), n, 0.15), madd(madd(top, s, -0.1), n, 0.15)], c: [176, 38, 30], edge: [madd(madd(top, s, 0.07), n, 0.15), madd(madd(top, s, -0.1), n, 0.15)] },
      { poly: [madd(top, s, -0.04), madd(top, s, 0.03), madd(top, n, -0.09)], c: [150, 30, 26] }];
  }

  // ---------------------------------------------------------------- colour tones (cached per colour array)
  const toneCache = new WeakMap();
  function mkTone(c) {
    return {
      o: C([c[0] * 0.34 + 8, c[1] * 0.34 + 6, c[2] * 0.38 + 10]),
      d: C([c[0] * 0.7, c[1] * 0.7, c[2] * 0.77]),
      m: C(c),
      l: C([Math.min(255, c[0] * 1.13 + 16), Math.min(255, c[1] * 1.13 + 14), Math.min(255, c[2] * 1.1 + 10)], 0.55),
    };
  }
  function tone(c) { let t = toneCache.get(c); if (!t) { t = mkTone(c); toneCache.set(c, t); } return t; }

  const BLOOD = [96, 18, 14];
  function lookColors(o, zombie) {
    if (o._lc) return o._lc;
    const bl = zombie ? (o.blood || 0) : 0;
    const skin = o.skin || SK.player;
    const shirt = o.shirt || [120, 120, 120];
    const m = (c, k) => (c && bl ? HC.mix(c, BLOOD, bl * k) : c);
    const lc = {
      skin, shirt: m(shirt, 0.22), coat: m(o.coat, 0.28), pants: o.pants ? m(o.pants, 0.1) : null, vest: o.vest ? m(o.vest, 0.12) : null,
      hand: o.gloves || (bl ? HC.mix(skin, BLOOD, 0.2 + bl * 0.5) : skin),
      armB: bl ? HC.mix(skin, BLOOD, 0.35 + bl * 0.3) : skin,
      shinB: HC.mix(skin, BLOOD, 0.3),
      skinD: HC.shade(skin, 0.78),
      shoes: o.shoes || (o.gown ? null : [40, 36, 32]),
      hair: o.hair || [40, 32, 26], helmet: o.helmet || shirt, cap: o.cap || o.scrubCap,
      suit: o.suit ? shirt : null,
    };
    o._lc = lc;
    return lc;
  }

  // ---------------------------------------------------------------- 2D primitives
  function capsule(ctx, ax, ay, bx, by, ra, rb) {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    ctx.beginPath();
    if (L <= Math.abs(ra - rb) + 0.05) { if (ra >= rb) ctx.arc(ax, ay, ra, 0, TAU); else ctx.arc(bx, by, rb, 0, TAU); return; }
    const ang = Math.atan2(dy, dx), ph = Math.asin((ra - rb) / L);
    ctx.arc(ax, ay, ra, ang + HP + ph, ang + 3 * HP - ph);
    ctx.arc(bx, by, rb, ang - HP - ph, ang + HP + ph);
    ctx.closePath();
  }
  // shaded tapered limb: outline + shadow tone, then a lit core pushed toward the light
  function limb(ctx, a, b, ra, rb, tn) {
    capsule(ctx, a[0], a[1], b[0], b[1], ra, rb);
    ctx.strokeStyle = tn.o; ctx.stroke();
    ctx.fillStyle = tn.d; ctx.fill();
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L; let dl = nx * LSX + ny * LSY;
    if (dl < 0) { nx = -nx; ny = -ny; dl = -dl; }
    const k = 0.6, off = (1 - k) * (0.35 + 0.6 * dl);
    capsule(ctx, a[0] + nx * ra * off, a[1] + ny * ra * off, b[0] + nx * rb * off, b[1] + ny * rb * off, ra * k, rb * k);
    ctx.fillStyle = tn.m; ctx.fill();
  }
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const byX = (a, b) => a[0] - b[0] || a[1] - b[1];
  function hull(pts) {
    const n = pts.length;
    if (n < 3) return pts;
    pts.sort(byX);
    const lo = [], up = [];
    for (let i = 0; i < n; i++) { const p = pts[i]; while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = n - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    lo.pop(); up.pop();
    return lo.concat(up);
  }
  function polyPath(ctx, H) {
    ctx.beginPath(); ctx.moveTo(H[0][0], H[0][1]);
    for (let i = 1; i < H.length; i++) ctx.lineTo(H[i][0], H[i][1]);
    ctx.closePath();
  }
  // shaded convex volume from projected points [sx, sy, lightDot, viewDot]
  function volume(ctx, pts, tn, hi) {
    const H = hull(pts);
    if (H.length < 3) return;
    polyPath(ctx, H); ctx.strokeStyle = tn.o; ctx.stroke(); ctx.fillStyle = tn.d; ctx.fill();
    const lit = [];
    for (let i = 0; i < pts.length; i++) if (pts[i][2] > -0.12) lit.push(pts[i]);
    if (lit.length >= 3) { polyPath(ctx, hull(lit)); ctx.fillStyle = tn.m; ctx.fill(); }
    if (hi) {
      const hl = [];
      for (let i = 0; i < pts.length; i++) if (pts[i][2] > 0.62) hl.push(pts[i]);
      if (hl.length >= 3) { polyPath(ctx, hull(hl)); ctx.fillStyle = tn.l; ctx.fill(); }
    }
  }

  // ---------------------------------------------------------------- torso layout (spine param s from the pelvis)
  function torsoRings(o, bw) {
    const suit = !!o.visor;
    const belly = suit ? 0 : Math.max(0, bw - 1);
    const W = suit ? bw : 1 + (bw - 1) * 0.75, sl = o.slim || 1;
    return [
      [-0.075, 0.09 * W, 0.058 * W, 0],
      [0.0, 0.113 * W * sl, 0.07 * W, 0],
      [0.14, 0.098 * W * sl * (1 + belly * 1.1), 0.064 * W * (1 + belly * 2.4), belly * 0.08],
      [0.28, 0.124 * W * sl * (1 + belly * 0.5), 0.077 * W * (1 + belly * 1.3), belly * 0.035],
      [0.37, 0.146 * W, 0.064 * W, 0],
      [S_NECK, 0.055 * W, 0.045 * W, 0],
    ];
  }
  function ringAt(RG, s) {
    if (s <= RG[0][0]) return RG[0];
    for (let i = 1; i < RG.length; i++) {
      if (s <= RG[i][0]) { const a = RG[i - 1], b = RG[i], t = (s - a[0]) / (b[0] - a[0]); return [s, lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)]; }
    }
    return RG[RG.length - 1];
  }
  const CS8 = []; for (let k = 0; k < 8; k++) CS8.push([Math.cos(k * Math.PI / 4), Math.sin(k * Math.PI / 4)]);

  // ---------------------------------------------------------------- draw
  R.draw = function (ctx, h) {
    const o = h.look;
    const zombie = !!h.zombie;
    const pose = buildPose(h);
    const lc = lookColors(o, zombie);
    const sc = h.scale || 1, face = h.face || 0, cf = Math.cos(face), sf = Math.sin(face);
    const fall = h.fall || 0;
    const beta = fall ? (h.fallDir || 1) * fall * HP : 0;
    const cb = Math.cos(beta), sb = Math.sin(beta);
    const lift = fall ? 0.1 * Math.sin(fall * HP) : 0;
    const X = h.x, Y = h.y, Z = h.z || 0, zo = pose.zo;
    // local point -> [screen x, screen y, depth]
    const S = (p) => {
      const pz = p[2] + zo;
      const f = p[1] * cb - pz * sb;
      let z = p[1] * sb + pz * cb + lift; if (z < 0.02) z = 0.02;
      const wx = X + (f * cf - p[0] * sf) * sc, wy = Y + (f * sf + p[0] * cf) * sc, wz = Z + z * sc;
      return [(wx - wy) * HW, (wx + wy) * HH - wz * ZP, wx + wy];
    };
    // local direction -> world direction
    const Rt = (v) => { const f = v[1] * cb - v[2] * sb; return [f * cf - v[0] * sf, f * sf + v[0] * cf, v[1] * sb + v[2] * cb]; };
    const dotL = (v) => v[0] * LW[0] + v[1] * LW[1] + v[2] * LW[2];
    const dotV = (v) => v[0] * VW[0] + v[1] * VW[1] + v[2] * VW[2];

    const flash = h.flash || 0;
    const tinted = !!(h.burn || flash > 0 || h.dark || h.tintCol);
    const T = !tinted ? tone : (c) => {
      let r = c;
      if (h.burn) r = HC.mix(r, [34, 22, 16], Math.min(0.72, h.burn));
      if (flash > 0) r = HC.mix(r, [255, 170, 150], Math.min(1, flash) * 0.45);
      if (h.dark) r = HC.shade(r, h.dark);
      if (h.tintCol) r = HC.mix(r, h.tintCol, h.tintAmt);
      return mkTone(r);
    };
    const ppx = PX * sc;

    // ---- shadow
    if (!h.noShadow) {
      const a = S([0, 0, 0.0]), p0 = S(pose.P0), hc = S(pose.head.c);
      const sa = h.shadowA || 0.28;
      ctx.fillStyle = `rgba(0,0,0,${sa})`;
      ctx.beginPath();
      // ground projections of pelvis and head stretch the shadow along a lying body
      const gy0 = p0[2] * HH - Z * ZP, gy1 = hc[2] * HH - Z * ZP;
      const dx = hc[0] - p0[0], dy = gy1 - gy0, L = Math.hypot(dx, dy);
      const sr = 13 * (1 + (pose.bw - 1) * 0.7) * sc;
      const kf = Math.min(1, fall);
      const cx = lerp(a[0], (p0[0] + hc[0]) / 2, kf), cy = lerp(a[1], (gy0 + gy1) / 2, kf);
      ctx.ellipse(cx, cy, L / 2 * kf + sr, sr * lerp(0.5, 0.7, kf), kf > 0 && L > 0.5 ? Math.atan2(dy, dx) : 0, 0, TAU);
      ctx.fill();
    }

    const items = [];
    const bwL = 1 + (pose.bw - 1) * 0.65;
    const pushLimb = (A, B, ra, rb, c, bias, extra) => {
      const a = S(A), b = S(B);
      const it = { k: (a[2] + b[2]) / 2 + (bias || 0), t: 0, a, b, ra: ra * ppx, rb: rb * ppx, c };
      if (extra) Object.assign(it, extra);
      items.push(it);
      return it;
    };

    // ---- torso anchor depth
    const P0 = pose.P0, Fz = pose.F.ez;
    const tMid = S(madd(P0, Fz, 0.2));
    const tK = tMid[2];
    items.push({ k: tK, t: 1 });

    // ---- legs
    const bare = !!o.gown;
    const legC = bare ? lc.skin : (lc.pants || lc.skin);
    const shoeC = lc.shoes || lc.skin;
    const legItems = [];
    for (let i = 0; i < 2; i++) {
      const L = pose.legs[i];
      const tr = bare ? 0.06 : 0.068, kr = bare ? 0.041 : 0.047, ar = bare ? 0.027 : 0.034;
      legItems.push(pushLimb(L.hip, L.knee, tr * bwL, kr * bwL, legC));
      if (L.stump) {
        legItems.push(pushLimb(L.knee, madd(L.knee, nrm([L.knee[0] - L.hip[0], L.knee[1] - L.hip[1], L.knee[2] - L.hip[2]]), 0.03), kr * bwL * 0.9, kr * bwL * 0.8, [110, 26, 20]));
        continue;
      }
      const torn = zombie && o.tornLeg === i + 1;
      legItems.push(pushLimb(L.knee, L.ank, kr * bwL * (torn ? 0.85 : 1), ar * bwL * (torn ? 0.8 : 1), torn ? lc.shinB : legC));
      legItems.push(pushLimb(L.heel, L.toe, 0.036 * bwL, 0.031 * bwL, shoeC, 0.002));
    }
    // legs always sit under the torso volume, but keep their relative order
    for (const it of legItems) if (it.k > tK - 0.01) it.k = tK - 0.01 + (it.k - tK + 0.01) * 0.001;

    // ---- arms
    const sleeves = o.coat ? 'long' : o.gown ? 'short' : (o.sleeves || 'long');
    const armC = lc.coat || lc.suit || lc.shirt;
    for (let i = 0; i < 2; i++) {
      const A = pose.arms[i];
      const ur = 0.05 * bwL, er = 0.039 * bwL, wr = 0.029 * bwL;
      const skinA = zombie && o.bloodArm === i + 1 ? lc.armB : lc.skin;
      const band = !!o.band && i === 1;
      if (sleeves === 'short') {
        pushLimb(A.sh, A.el, ur * 0.94, er, skinA, 0.004);
        pushLimb(A.sh, mix3(A.sh, A.el, 0.5), ur * 1.14, er * 1.22, armC, 0.0045);
        pushLimb(A.el, A.wr, er, wr, skinA, 0.004);
      } else {
        pushLimb(A.sh, A.el, ur * 1.06, er * 1.08, armC, 0.004, band ? { band: 1 } : null);
        if (sleeves === 'rolled') {
          pushLimb(A.el, A.wr, er * 0.95, wr, skinA, 0.004);
          pushLimb(mix3(A.sh, A.el, 0.85), mix3(A.el, A.wr, 0.1), er * 1.25, er * 1.2, armC, 0.0045);
        } else pushLimb(A.el, A.wr, er * 1.06, wr * 1.12, armC, 0.004);
      }
      pushLimb(A.wr, A.hand, 0.029 * bwL, 0.023 * bwL, lc.hand, 0.006);
    }

    // ---- weapon
    if (pose.wpn) {
      for (const p of pose.wpn) {
        if (p.poly) {
          const pts = p.poly.map(S);
          let d = 0; for (const q of pts) d += q[2];
          items.push({ k: d / pts.length + 0.003, t: 3, pts, c: p.c, edge: p.edge && p.edge.map(S) });
        } else pushLimb(p.a, p.b, p.ra, p.rb, p.c, 0.003, { w: 1 });
      }
    }

    // ---- head
    const hcS = S(pose.head.c);
    let hk = hcS[2];
    if (fall < 0.5 && !pose.prone) hk = Math.max(hk, tK + 0.02);
    items.push({ k: hk, t: 2, c: hcS });

    items.sort((p, q) => p.k - q.k);
    const pj = ctx.lineJoin, pc = ctx.lineCap;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = OL;
    for (const it of items) {
      if (it.t === 0) {
        limb(ctx, it.a, it.b, it.ra, it.rb, T(it.c));
        if (it.band) armband(ctx, it);
      } else if (it.t === 1) drawTorso(ctx, h, o, lc, pose, S, Rt, dotL, dotV, T, ppx, zombie);
      else if (it.t === 2) drawHead(ctx, h, o, lc, pose, S, Rt, dotL, dotV, T, sc, it.c, zombie);
      else if (it.t === 3) {
        const tn = T(it.c);
        polyPath(ctx, it.pts); ctx.strokeStyle = tn.o; ctx.stroke(); ctx.fillStyle = tn.m; ctx.fill();
        if (it.edge) { ctx.strokeStyle = 'rgba(210,214,220,.9)'; ctx.beginPath(); ctx.moveTo(it.edge[0][0], it.edge[0][1]); ctx.lineTo(it.edge[1][0], it.edge[1][1]); ctx.stroke(); ctx.lineWidth = OL; }
      }
    }
    ctx.lineJoin = pj; ctx.lineCap = pc;

    if (h.burn > 0 && !(h.dead && fall >= 1)) {   // flames while burning/dying, never baked into corpses
      const t = performance.now() / 1000;
      const c = S(madd(P0, Fz, 0.25));
      for (let i = 0; i < 5; i++) {
        const fx = c[0] + Math.sin(t * 7 + i * 2) * 7, fy = c[1] + 8 - ((t * 60 + i * 13) % 34);
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 9);
        g.addColorStop(0, 'rgba(255,230,140,.9)'); g.addColorStop(0.5, 'rgba(255,120,30,.6)'); g.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, 9, 0, TAU); ctx.fill();
      }
    }
    return pose;
  };

  function armband(ctx, it) {
    const m = [lerp(it.a[0], it.b[0], 0.4), lerp(it.a[1], it.b[1], 0.4)];
    const r = (it.ra + it.rb) * 0.5;
    ctx.fillStyle = '#e8e6e0'; ctx.beginPath(); ctx.arc(m[0], m[1], r * 0.95, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c42'; ctx.fillRect(m[0] - r * 0.55, m[1] - r * 0.18, r * 1.1, r * 0.36); ctx.fillRect(m[0] - r * 0.18, m[1] - r * 0.55, r * 0.36, r * 1.1);
  }

  // ---------------------------------------------------------------- torso + clothing
  function drawTorso(ctx, h, o, lc, pose, S, Rt, dotL, dotV, T, ppx, zombie) {
    const RG = torsoRings(o, pose.bw);
    const F = pose.F, P0 = pose.P0;
    const twAt = (s) => pose.hy + pose.tw * clamp((s - 0.04) / 0.3, 0, 1);
    // frame cache per spine height
    const fr = (s) => {
      const t = twAt(s), c = Math.cos(t), sn = Math.sin(t);
      const ex = lin(F.ex, c, F.ey, sn), ey = lin(F.ey, c, F.ex, -sn);
      return { ex, ey, exW: Rt(ex), eyW: Rt(ey) };
    };
    const ring = (out, s, w, d, dy, dx, fwd) => {
      const f = fr(s);
      const c0 = madd(madd(madd(P0, F.ez, s), f.ey, dy + (fwd || 0)), f.ex, dx || 0);
      const lx = dotL(f.exW), ly = dotL(f.eyW);
      for (let k = 0; k < 8; k++) {
        const cs = CS8[k];
        const p = S(madd(madd(c0, f.ex, w * cs[0]), f.ey, d * cs[1]));
        const nx = d * cs[0], ny = w * cs[1], nl = Math.hypot(nx, ny) || 1;
        out.push([p[0], p[1], (lx * nx + ly * ny) / nl]);
      }
    };
    // point on the torso surface: [sx, sy, viewDot, lightDot]
    const surf = (s, th, out) => {
      const r = ringAt(RG, s), f = fr(s);
      const w = r[1] + (out || 0), d = r[2] + (out || 0), cx = Math.cos(th), sy = Math.sin(th);
      const p = S(madd(madd(madd(P0, F.ez, s), f.ex, w * cx), f.ey, d * sy + r[3]));
      const nx = d * cx, ny = w * sy, nl = Math.hypot(nx, ny) || 1;
      const nW = lin(f.exW, nx / nl, f.eyW, ny / nl);
      return [p[0], p[1], dotV(nW), dotL(nW)];
    };
    // angle on the ring that faces the camera most
    const f0 = fr(0.2);
    const thV = Math.atan2(dotV(f0.eyW), dotV(f0.exW));
    const frontV = dotV(f0.eyW);                   // >0: chest faces the camera
    const quad = (pts, fill) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    const vis = (p) => p[2] > 0.08;

    const coat = lc.coat, gown = !!o.gown, suit = lc.suit;
    const upperC = coat || lc.shirt;
    // pelvis / trousers
    if (!gown) {
      const pts = [];
      for (let i = 0; i < 3; i++) { const r = RG[i]; ring(pts, r[0], r[1], r[2], r[3]); }
      volume(ctx, pts, T(suit || lc.pants || lc.skin), false);
    }
    // shirt / coat / gown shell
    const pts = [];
    const long = coat || gown;
    if (long) {
      const hemS = coat ? -0.24 : -0.2, sway = Math.sin(pose.ph) * 0.02 * pose.amp;
      ring(pts, hemS, 0.132 * (o.slim || 1) * (1 + (pose.bw - 1) * 0.7), 0.1 * (1 + (pose.bw - 1) * 1.2), 0, sway, -0.035 * pose.amp);
      ring(pts, 0.0, RG[1][1] * 1.08, RG[1][2] * 1.15, 0);
    } else {
      const hs = o.tuck ? 0.1 : 0.015, r = ringAt(RG, hs);
      ring(pts, hs, r[1] * 1.05, r[2] * 1.07, r[3]);
    }
    for (let i = 2; i < RG.length; i++) { const r = RG[i]; ring(pts, r[0], r[1] * (long ? 1.04 : 1.02), r[2] * (long ? 1.06 : 1.03), r[3]); }
    volume(ctx, pts, T(upperC), true);

    const lw = ctx.lineWidth;
    // belt
    if (o.tuck && o.belt && !long) {
      ctx.strokeStyle = T(o.belt).m; ctx.lineWidth = 0.028 * ppx;
      ctx.beginPath(); let started = false;
      for (let k = -4; k <= 4; k++) {
        const p = surf(0.115, thV + k * 0.38, 0.003);
        if (p[2] < -0.05) { started = false; continue; }
        if (!started) { ctx.moveTo(p[0], p[1]); started = true; } else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke(); ctx.lineWidth = lw;
      const b = surf(0.115, HP, 0.005);
      if (vis(b)) { ctx.fillStyle = 'rgba(200,190,150,.9)'; ctx.fillRect(b[0] - 0.9, b[1] - 0.9, 1.8, 1.8); }
    }
    // lab coat: open front showing shirt, tie and trousers; lapels
    if (coat && frontV > -0.1) {
      const a = [surf(0.405, HP - 0.3, 0.004), surf(0.405, HP + 0.3, 0.004), surf(0.13, HP + 0.2, 0.004), surf(0.13, HP - 0.2, 0.004)];
      if (vis(surf(0.28, HP))) {
        quad(a, T(lc.shirt).m);
        const b = [a[3], a[2], surf(-0.23, HP + 0.36, 0.01), surf(-0.23, HP - 0.36, 0.01)];
        quad(b, T(lc.pants || lc.skin).d);
        if (o.tie) { const t0 = surf(0.39, HP, 0.006), t1 = surf(0.2, HP, 0.008); ctx.strokeStyle = T(o.tie).m; ctx.lineWidth = 0.022 * ppx; ctx.beginPath(); ctx.moveTo(t0[0], t0[1]); ctx.lineTo(t1[0], t1[1]); ctx.stroke(); ctx.lineWidth = lw; }
        ctx.strokeStyle = T(coat).o; ctx.beginPath(); ctx.moveTo(a[0][0], a[0][1]); ctx.lineTo(a[3][0], a[3][1]); ctx.lineTo(b[3][0], b[3][1]); ctx.moveTo(a[1][0], a[1][1]); ctx.lineTo(a[2][0], a[2][1]); ctx.lineTo(b[2][0], b[2][1]); ctx.stroke();
        const pk = surf(0.3, HP + 0.75, 0.004);
        if (vis(pk)) { ctx.fillStyle = T(coat).d; ctx.fillRect(pk[0] - 1.4, pk[1] - 0.4, 2.8, 0.9); }
      }
    }
    // hospital gown: open back with ties, small print
    if (gown) {
      const mb = surf(0.25, -HP);
      if (vis(mb)) {
        quad([surf(0.4, -HP - 0.28, 0.004), surf(0.4, -HP + 0.28, 0.004), surf(0.06, -HP + 0.1, 0.004), surf(0.06, -HP - 0.1, 0.004)], T(lc.skin).m);
        ctx.strokeStyle = T(o.shirt).d;
        for (const s of [0.34, 0.2]) { const a = surf(s, -HP - 0.18, 0.006), b = surf(s, -HP + 0.18, 0.006); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      }
      ctx.fillStyle = T(HC.shade(o.shirt, 0.72)).m;
      for (let i = 0; i < 7; i++) { const p = surf(0.05 + (i % 3) * 0.1, thV - 0.9 + i * 0.3, 0.004); if (vis(p)) ctx.fillRect(p[0] - 0.5, p[1] - 0.5, 1, 1); }
    }
    // tactical vest / EOD plate
    if (lc.vest) {
      const vp = [];
      ring(vp, 0.07, RG[2][1] * 1.2, RG[2][2] * 1.5, 0);
      ring(vp, 0.29, RG[3][1] * 1.12, RG[3][2] * 1.36, 0);
      ring(vp, 0.36, RG[4][1] * 0.86, RG[4][2] * 1.3, 0);
      volume(ctx, vp, T(lc.vest), true);
      const pc = T(HC.shade(o.vest, 0.78));
      for (const d of [-0.45, 0, 0.45]) {
        const c = surf(0.12, HP + d, 0.03);
        if (vis(c)) { ctx.fillStyle = pc.m; ctx.strokeStyle = pc.o; ctx.beginPath(); ctx.rect(c[0] - 1.5, c[1] - 1.6, 3, 3.2); ctx.fill(); ctx.stroke(); }
      }
    }
    if (o.visor && frontV > 0) {
      const a = [surf(0.36, HP - 0.55, 0.012), surf(0.36, HP + 0.55, 0.012), surf(0.1, HP + 0.5, 0.012), surf(0.1, HP - 0.5, 0.012)];
      quad(a, T(HC.shade(o.shirt, 1.18)).m);
      ctx.strokeStyle = T(o.shirt).o; polyPath(ctx, a); ctx.stroke();
    }
    // collar / neckline
    if (!suit && frontV > -0.2) {
      const c0 = surf(0.405, HP - 0.55, 0.004), c1 = surf(0.35, HP, 0.004), c2 = surf(0.405, HP + 0.55, 0.004);
      if (vis(c1)) {
        if (o.vneck || gown) quad([c0, c1, c2], T(lc.skin).d);
        else if (o.collar && !coat) { ctx.fillStyle = T(o.shirt).l; quad([c0, c1, surf(0.42, HP - 0.1, 0.02)], T(HC.shade(o.shirt, 1.12)).m); quad([c2, c1, surf(0.42, HP + 0.1, 0.02)], T(HC.shade(o.shirt, 1.12)).m); }
        else if (coat) { quad([c0, surf(0.3, HP - 0.2, 0.01), surf(0.405, HP - 0.3, 0.01)], T(HC.shade(coat, 0.9)).m); quad([c2, surf(0.3, HP + 0.2, 0.01), surf(0.405, HP + 0.3, 0.01)], T(HC.shade(coat, 0.9)).m); }
      }
    }
    if (o.badge) { const b = surf(0.29, HP + 0.55, 0.005); if (vis(b)) { ctx.fillStyle = T(o.badge).m; ctx.fillRect(b[0] - 0.9, b[1] - 1, 1.8, 2); } }

    // zombie damage: torn hem, holes, blood
    if (zombie) {
      if (o.tornHem && !long) {
        const hs = 0.015, sk = T(lc.skin);
        ctx.beginPath();
        let first = true;
        for (let k = 0; k <= 8; k++) { const p = surf(hs, thV - HP * 0.9 + k * HP * 0.225, 0.004); if (first) { ctx.moveTo(p[0], p[1]); first = false; } else ctx.lineTo(p[0], p[1]); }
        for (let k = 8; k >= 0; k--) { const p = surf(hs + (k % 2 ? 0.075 : 0.03) + (k % 3) * 0.012, thV - HP * 0.9 + k * HP * 0.225, 0.004); ctx.lineTo(p[0], p[1]); }
        ctx.closePath(); ctx.fillStyle = sk.d; ctx.fill();
      }
      if (o.holes && !o.visor) {
        const sk = T(lc.skinD);
        for (const hl of o.holes) {
          const c = surf(hl[0], hl[1], 0.004);
          if (!vis(c)) continue;
          const r = hl[2] * ppx;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + hl[0] * 20, rr = r * (k % 2 ? 0.55 : 1.05); if (k) ctx.lineTo(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr * 0.9); else ctx.moveTo(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr * 0.9); }
          ctx.closePath(); ctx.fillStyle = sk.m; ctx.fill(); ctx.strokeStyle = T(upperC).o; ctx.stroke();
        }
      }
      if (o.stains && !h.burn) {
        ctx.fillStyle = 'rgba(92,14,10,.72)';
        for (const s of o.stains) {
          const c = surf(s[0], s[1], 0.004);
          if (!vis(c)) continue;
          const r = s[2] * ppx * (0.55 + 0.45 * c[2]);
          ctx.beginPath(); ctx.ellipse(c[0], c[1], r, r * 1.25, 0, 0, TAU); ctx.ellipse(c[0] + r * 0.5, c[1] + r * 1.1, r * 0.45, r * 0.8, 0, 0, TAU); ctx.fill();
        }
        // blood soaked into the collar from the mouth
        if ((o.blood || 0) > 0.3 && frontV > 0) {
          const c = surf(0.36, HP + 0.1, 0.004);
          if (vis(c)) { const r = 0.035 * ppx; ctx.beginPath(); ctx.ellipse(c[0], c[1], r * 1.3, r, 0, 0, TAU); ctx.ellipse(c[0] + r * 0.3, c[1] + r * 1.2, r * 0.5, r * 1.1, 0, 0, TAU); ctx.fill(); }
        }
      }
    }
  }

  // ---------------------------------------------------------------- head, hair, headgear, face
  function drawHead(ctx, h, o, lc, pose, S, Rt, dotL, dotV, T, sc, cS, zombie) {
    const H = pose.head, r = H.r;
    const rp = r * PX * sc;
    const wf = Rt(H.f), wu = Rt(H.u), wx = Rt(H.x);
    // screen-space basis per unit of head radius
    const sp = (v) => [(v[0] - v[1]) * HW * r * sc, ((v[0] + v[1]) * HH - v[2] * ZP) * r * sc];
    const bF = sp(wf), bU = sp(wu), bX = sp(wx);
    const vF = dotV(wf), vU = dotV(wu), vX = dotV(wx);
    const lF = dotL(wf), lU = dotL(wu), lX = dotL(wx);
    const at = (a, b, c) => [cS[0] + a * bX[0] + b * bF[0] + c * bU[0], cS[1] + a * bX[1] + b * bF[1] + c * bU[1]];
    const vis = (a, b, c) => a * vX + b * vF + c * vU;
    const hood = !!o.hood, eod = !!o.visor;
    const skinC = hood ? lc.helmet : eod ? lc.helmet : lc.skin;
    const sk = T(skinC);
    const hair = T(lc.hair);
    const long = o.hairStyle === 2 && !hood && !eod && !o.helmet;
    const deadEyes = h.dead && (h.fall || 0) >= 1;

    // neck (drawn with the head so it always joins it)
    const n0 = S(pose.neck[0]), n1 = S(pose.neck[1]);
    const nr = (eod ? 0.075 : hood ? 0.06 : 0.034) * PX * sc * (1 + (pose.bw - 1) * 0.5);
    limb(ctx, n0, n1, nr * 1.05, nr, T(hood || eod ? lc.helmet : lc.skin));

    const backHair = () => {
      const a = at(0, -0.55, 0.1), b = at(0, -0.62, -1.45);
      limb(ctx, a, b, rp * 0.95, rp * 0.75, hair);
    };
    if (long && vis(0, -1, 0) < 0) backHair();

    // skull + jaw
    const jaw = H.jaw || 0;
    const jc = at(0, 0.3, -0.5 - jaw * 0.12), jr = rp * 0.7;
    ctx.beginPath(); ctx.arc(cS[0], cS[1], rp, 0, TAU); ctx.moveTo(jc[0] + jr, jc[1]); ctx.arc(jc[0], jc[1], jr, 0, TAU);
    ctx.strokeStyle = sk.o; ctx.stroke(); ctx.fillStyle = sk.d; ctx.fill();
    const lo = [LSX * rp * 0.22, LSY * rp * 0.22];
    ctx.beginPath(); ctx.arc(cS[0] + lo[0], cS[1] + lo[1], rp * 0.78, 0, TAU); ctx.fillStyle = sk.m; ctx.fill();
    if (!hood && !eod) { const jl = [jc[0] + lo[0] * 0.8, jc[1] + lo[1] * 0.8]; ctx.beginPath(); ctx.arc(jl[0], jl[1], jr * 0.72, 0, TAU); ctx.fill(); }

    // hair / hats clipped to the skull
    const hs = o.hairStyle;
    const capC = lc.cap;
    if (!hood && !eod) {
      const clipCap = (off, rad, fill) => {
        ctx.save(); ctx.beginPath(); ctx.arc(cS[0], cS[1], rp + 0.4, 0, TAU); ctx.clip();
        const c = at(off[0], off[1], off[2]);
        ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(c[0], c[1], rp * rad, 0, TAU); ctx.fill();
        ctx.restore();
      };
      if (hs === 0) clipCap([0, -0.72, -0.08], 0.86, hair.m);                                     // balding: fringe at back/sides
      else if (hs > 0 && !(capC && o.capStyle !== 'peaked') && !o.helmet) {
        clipCap([0, -0.34, hs === 2 ? 0.38 : 0.44], 1.0, hair.m);
        if (hs === 2 || hs === 4) clipCap([0, -0.6, 0.3], 0.62, hair.d);
      }
      if (capC && o.capStyle !== 'peaked') {                                                    // baseball / scrub cap
        clipCap([0, -0.18, 0.55], 1.0, T(capC).m);
        clipCap([-0.35, -0.3, 0.72], 0.55, T(capC).l);
      }
      if (hs === 4 && !capC && !o.helmet) { const b = at(0, -0.9, 0.55); ctx.fillStyle = hair.m; ctx.strokeStyle = hair.o; ctx.beginPath(); ctx.arc(b[0], b[1], rp * 0.36, 0, TAU); ctx.stroke(); ctx.fill(); }
    }

    // face features (only when the face is turned toward the camera)
    if (!hood && !eod && vis(0, 1, 0) > 0.05) {
      const eyeY = 0.1;
      for (const sx of [-1, 1]) {
        if (vis(sx * 0.4, 0.9, 0.1) < 0.12) continue;
        const e = at(sx * 0.36, 0.9, eyeY);
        if (zombie) {
          ctx.fillStyle = 'rgba(40,16,20,.72)'; ctx.beginPath(); ctx.ellipse(e[0], e[1], rp * 0.22, rp * 0.17, 0, 0, TAU); ctx.fill();
          if (!deadEyes) { ctx.fillStyle = 'rgba(226,218,176,.95)'; ctx.fillRect(e[0] - 0.55, e[1] - 0.45, 1.1, 0.9); }
        } else {
          ctx.fillStyle = deadEyes ? 'rgba(60,40,36,.8)' : 'rgba(28,22,20,.9)'; ctx.fillRect(e[0] - 0.5, e[1] - (deadEyes ? 0.2 : 0.5), 1, deadEyes ? 0.4 : 1);
          const b = at(sx * 0.38, 0.86, 0.36); ctx.fillStyle = hair.m; ctx.fillRect(b[0] - 0.75, b[1] - 0.25, 1.5, 0.5);
        }
      }
      if (vis(0, 1, -0.1) > 0.1) {
        const n = at(0.06, 1.0, -0.14); ctx.fillStyle = sk.d; ctx.fillRect(n[0] - 0.5, n[1] - 0.3, 1, 0.8);
      }
      const m = at(0, 0.88, -0.44 - jaw * 0.12);
      if (vis(0, 0.88, -0.44) > 0.05) {
        if (zombie) {
          const mh = rp * (0.1 + jaw * 0.2);
          ctx.fillStyle = 'rgba(52,8,8,.95)'; ctx.beginPath(); ctx.ellipse(m[0], m[1], rp * 0.2, mh, 0, 0, TAU); ctx.fill();
          const c = at(0.05, 0.72, -0.95 - jaw * 0.12);
          ctx.strokeStyle = 'rgba(120,16,12,.85)'; ctx.lineWidth = rp * 0.18; ctx.beginPath(); ctx.moveTo(m[0], m[1] + mh * 0.5); ctx.lineTo(c[0], c[1]); ctx.stroke(); ctx.lineWidth = OL;
        } else { ctx.fillStyle = 'rgba(90,50,44,.85)'; ctx.fillRect(m[0] - rp * 0.2, m[1] - 0.35, rp * 0.4, 0.7); }
      }
    }

    // headgear shells: projected 3D rings in head space -> shaded hull
    const shell = (rings, c, hi) => {
      const pts = [];
      for (const rg of rings) {
        const [u, rad, fo] = rg;
        for (let k = 0; k < 8; k++) {
          const cs = CS8[k];
          const a = cs[0] * rad, b = cs[1] * rad + (fo || 0), cz = u;
          const p = at(a, b, cz);
          const nx = cs[0], ny = cs[1], nz = u > 0.6 ? 0.8 : 0.25;
          pts.push([p[0], p[1], (nx * lX + ny * lF + nz * lU) / Math.hypot(nx, ny, nz)]);
        }
      }
      volume(ctx, pts, T(c), hi);
    };
    if (o.helmet && !hood && !eod) {
      shell([[0.02, 1.2, -0.05], [0.7, 0.92, -0.05], [1.08, 0.35, -0.05]], lc.helmet, true);
      if (vis(0, 1, 0) > 0) { const a = at(-0.95, 0.35, -0.2), b = at(0, 0.7, -1.0), c = at(0.95, 0.35, -0.2); ctx.strokeStyle = 'rgba(30,30,24,.7)'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); }
    }
    if (capC && o.capStyle === 'peaked') {
      shell([[0.2, 1.04, 0], [0.62, 1.1, 0], [0.8, 1.14, 0.04]], capC, true);
      const br = []; for (let k = 0; k <= 6; k++) { const a = -HP + k * Math.PI / 6; br.push(at(Math.sin(a) * 0.72, 0.62 + Math.cos(a) * 0.55, 0.26)); }
      ctx.fillStyle = '#16161a'; polyPath(ctx, br); ctx.fill();
      if (vis(0, 1, 0.3) > 0.05) { const b = at(0, 1.08, 0.5); ctx.fillStyle = '#d8b850'; ctx.fillRect(b[0] - 0.8, b[1] - 0.8, 1.6, 1.6); }
    } else if (capC && !o.scrubCap) {
      const br = []; for (let k = 0; k <= 6; k++) { const a = -HP + k * Math.PI / 6; br.push(at(Math.sin(a) * 0.62, 0.7 + Math.cos(a) * 0.62, 0.34 - Math.cos(a) * 0.08)); }
      const t = T(HC.shade(capC, 0.85)); ctx.fillStyle = t.m; ctx.strokeStyle = t.o; polyPath(ctx, br); ctx.stroke(); ctx.fill();
    }
    if (hood) {
      shell([[-0.85, 1.12, -0.12], [-0.1, 1.24, -0.1], [0.6, 1.02, -0.1], [1.0, 0.45, -0.1]], lc.helmet, true);
      if (vis(0, 1, 0) > -0.05) {
        const q = [at(-0.78, 1.14, 0.55), at(0.78, 1.14, 0.55), at(0.66, 1.1, -0.55), at(-0.66, 1.1, -0.55)];
        ctx.fillStyle = 'rgba(28,38,40,.92)'; polyPath(ctx, q); ctx.fill();
        ctx.strokeStyle = 'rgba(190,220,220,.35)'; ctx.beginPath(); const s0 = at(-0.4, 1.12, 0.3), s1 = at(-0.1, 1.12, 0.3); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(s1[0], s1[1]); ctx.stroke();
      }
    }
    if (eod) {
      shell([[-0.55, 1.12, -0.05], [0.15, 1.22, -0.05], [0.8, 0.95, -0.05], [1.12, 0.35, -0.05]], lc.helmet, true);
      if (vis(0, 1, 0) > -0.1) {
        const q = [at(-0.75, 1.1, 0.5), at(0.75, 1.1, 0.5), at(0.7, 1.05, -0.45), at(-0.7, 1.05, -0.45)];
        ctx.fillStyle = 'rgba(34,50,58,.95)'; polyPath(ctx, q); ctx.fill(); ctx.strokeStyle = '#1a1c18'; ctx.stroke();
        ctx.strokeStyle = 'rgba(200,225,235,.4)'; ctx.beginPath(); const s0 = at(-0.5, 1.16, 0.35), s1 = at(0.1, 1.16, 0.38); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(s1[0], s1[1]); ctx.stroke();
      }
    }
    if (long && vis(0, -1, 0) >= 0) backHair();
  }

  // Bake a corpse onto a context (used by decal layer)
  R.drawCorpse = function (ctx, h) { R.draw(ctx, Object.assign({}, h, { noShadow: true })); };
  return R;
})();
