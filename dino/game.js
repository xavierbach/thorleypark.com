/* ==========================================================================
   PRIMAL RUN — a Cretaceous endless runner
   Vanilla JS + Canvas. No assets, no dependencies. Built to feel native on iOS.
   ========================================================================== */
(() => {
'use strict';

// --------------------------------------------------------------------------
// Setup & DOM
// --------------------------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const el = {
  hud:        document.getElementById('hud'),
  score:      document.getElementById('score'),
  best:       document.getElementById('best'),
  mult:       document.getElementById('multiplier'),
  title:      document.getElementById('screen-title'),
  over:       document.getElementById('screen-over'),
  overTitle:  document.getElementById('over-title'),
  overBadge:  document.getElementById('over-badge'),
  overScore:  document.getElementById('over-score'),
  overBest:   document.getElementById('over-best'),
  pause:      document.getElementById('screen-pause'),
  btnStart:   document.getElementById('btn-start'),
  btnRetry:   document.getElementById('btn-retry'),
  btnPause:   document.getElementById('btn-pause'),
  btnResume:  document.getElementById('btn-resume'),
  btnQuit:    document.getElementById('btn-quit'),
};

const BEST_KEY = 'primalRun.best';
let best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
el.best.textContent = best;

// --------------------------------------------------------------------------
// Viewport — responsive, DPR-aware. World uses a fixed virtual height so
// physics feel identical on every device; width follows the aspect ratio.
// --------------------------------------------------------------------------
const VH = 540;            // virtual world height (px)
let VW = 960;              // virtual world width (recomputed on resize)
let scale = 1, dpr = 1;
let GROUND = VH * 0.82;    // y of ground surface in world units

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  scale = h / VH;
  VW = w / scale;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  GROUND = VH * 0.82;
  recomputeDifficulty();
  // Keep the dino anchored to the new ground if not mid-jump.
  if (dino.onGround) dino.y = GROUND - (dino.ducking ? dino.h * 0.62 : dino.h);
}

// Speed & spawn distance scale with world width so the reaction WINDOW (time
// from an obstacle appearing to reaching the dino) feels identical on a narrow
// portrait phone and a wide desktop.
function recomputeDifficulty() {
  game.baseSpeed = VW * 0.62;
  game.maxSpeed = VW * 1.18;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// --------------------------------------------------------------------------
// Audio — synthesized via WebAudio so we ship zero sound files.
// --------------------------------------------------------------------------
const Sound = (() => {
  let actx = null, master = null, muted = false;
  function ensure() {
    if (actx) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain();
      master.gain.value = 0.35;
      master.connect(actx.destination);
    } catch (e) { actx = null; }
  }
  function resume() { ensure(); if (actx && actx.state === 'suspended') actx.resume(); }
  function tone(freq, dur, type='sine', vol=1, sweep=0) {
    if (!actx || muted) return;
    const t = actx.currentTime;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (sweep) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol=0.4) {
    if (!actx || muted) return;
    const t = actx.currentTime;
    const buf = actx.createBuffer(1, actx.sampleRate * dur, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = actx.createBufferSource(); src.buffer = buf;
    const g = actx.createGain(); g.gain.value = vol;
    const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }
  return {
    resume,
    jump()   { tone(420, 0.18, 'square', 0.5, 360); },
    djump()  { tone(620, 0.16, 'square', 0.45, 300); },
    land()   { noise(0.08, 0.25); },
    pickup() { tone(880, 0.08, 'triangle', 0.5); setTimeout(() => tone(1320, 0.1, 'triangle', 0.5), 70); },
    roar()   { tone(110, 0.5, 'sawtooth', 0.6, -50); noise(0.5, 0.3); },
    hit()    { tone(140, 0.4, 'sawtooth', 0.7, -90); noise(0.35, 0.5); },
    point()  { tone(1046, 0.08, 'sine', 0.3); },
    toggleMute() { muted = !muted; return muted; },
  };
})();

// --------------------------------------------------------------------------
// Haptics
// --------------------------------------------------------------------------
function haptic(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch(e){} } }

// --------------------------------------------------------------------------
// Game state
// --------------------------------------------------------------------------
const STATE = { TITLE: 0, PLAY: 1, OVER: 2, PAUSE: 3 };
let state = STATE.TITLE;

const game = {
  speed: 0, baseSpeed: 320, maxSpeed: 760,
  distance: 0, score: 0, combo: 1, comboTimer: 0,
  spawnTimer: 0, ptTimer: 0, gemTimer: 0,
  shake: 0, time: 0, dayPhase: 0, flash: 0,
};

// Player (the T-Rex)
const dino = {
  x: VW * 0.18, y: 0, w: 64, h: 70,
  vy: 0, onGround: true, ducking: false,
  jumps: 0, maxJumps: 2, holdTime: 0, holding: false,
  runCycle: 0, dead: false, blink: 0,
};

const GRAVITY = 2400;
const JUMP_V = -880;
const HOLD_FORCE = -2600;     // extra lift while holding (variable jump)
const MAX_HOLD = 0.18;

let obstacles = [];   // ground hazards
let flyers = [];      // pterodactyls
let gems = [];        // amber collectibles
let particles = [];
let bgFar = [];       // distant hills
let bgMid = [];       // trees
let clouds = [];
let stars = [];
let embers = [];      // volcano embers

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// --------------------------------------------------------------------------
// World init
// --------------------------------------------------------------------------
function seedWorld() {
  bgFar = []; bgMid = []; clouds = []; stars = []; embers = [];
  for (let i = 0; i < 6; i++) bgFar.push({ x: rand(0, VW * 1.4), w: rand(180, 340), h: rand(80, 190) });
  for (let i = 0; i < 8; i++) bgMid.push({ x: rand(0, VW * 1.4), type: randInt(0, 1), s: rand(0.7, 1.3) });
  for (let i = 0; i < 5; i++) clouds.push({ x: rand(0, VW), y: rand(40, 200), s: rand(0.6, 1.4), spd: rand(8, 22) });
  for (let i = 0; i < 70; i++) stars.push({ x: rand(0, VW), y: rand(0, GROUND * 0.7), r: rand(0.4, 1.6), tw: rand(0, 6.28) });
}

function resetGame() {
  game.speed = game.baseSpeed;
  game.distance = 0; game.score = 0; game.combo = 1; game.comboTimer = 0;
  game.spawnTimer = 0.8; game.ptTimer = 3; game.gemTimer = 1.5;
  game.shake = 0; game.flash = 0;
  obstacles = []; flyers = []; gems = []; particles = [];
  dino.x = VW * 0.18;
  dino.y = GROUND - dino.h;
  dino.vy = 0; dino.onGround = true; dino.ducking = false;
  dino.jumps = 0; dino.holding = false; dino.holdTime = 0;
  dino.dead = false; dino.runCycle = 0; dino.blink = 0;
  seedWorld();
  el.mult.classList.add('hidden');
}

// --------------------------------------------------------------------------
// Input
// --------------------------------------------------------------------------
function startJump() {
  if (state !== STATE.PLAY || dino.dead) return;
  if (dino.jumps < dino.maxJumps) {
    dino.vy = JUMP_V * (dino.jumps === 0 ? 1 : 0.86);
    dino.onGround = false;
    dino.holding = true;
    dino.holdTime = 0;
    dino.jumps++;
    dino.ducking = false;
    if (dino.jumps === 1) { Sound.jump(); haptic(12); }
    else { Sound.djump(); haptic(18); spawnBurst(dino.x + dino.w/2, dino.y + dino.h, '#bfe3ff', 10); }
  }
}
function endJump() { dino.holding = false; }
function setDuck(on) {
  if (state !== STATE.PLAY || dino.dead) return;
  dino.ducking = on && dino.onGround;
  if (on && !dino.onGround) { dino.vy += 520; } // fast-fall
}

// Pointer (touch + mouse)
let touchStartY = 0, touchStartT = 0, touchId = null, swiped = false;
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  Sound.resume();
  const t = e.changedTouches[0];
  touchId = t.identifier; touchStartY = t.clientY; touchStartT = performance.now(); swiped = false;
  if (state === STATE.PLAY) startJump();
  else if (state === STATE.TITLE) startRun();
  else if (state === STATE.OVER && overReady) startRun();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === touchId && !swiped) {
      const dy = t.clientY - touchStartY;
      if (dy > 34) { swiped = true; setDuck(true); }
    }
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  endJump();
  setDuck(false);
}, { passive: false });

// Mouse (desktop)
canvas.addEventListener('mousedown', (e) => { Sound.resume(); if (state === STATE.PLAY) { startJump(); } });
window.addEventListener('mouseup', endJump);

// Keyboard
const keys = {};
window.addEventListener('keydown', (e) => {
  if (['Space','ArrowUp','ArrowDown','KeyW','KeyS','KeyP'].includes(e.code)) e.preventDefault();
  if (keys[e.code]) return;
  keys[e.code] = true;
  Sound.resume();
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    if (state === STATE.TITLE) startRun();
    else if (state === STATE.OVER) { if (overReady) startRun(); }
    else startJump();
  }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') setDuck(true);
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') endJump();
  if (e.code === 'ArrowDown' || e.code === 'KeyS') setDuck(false);
});

// Buttons
el.btnStart.addEventListener('click', () => { Sound.resume(); startRun(); });
el.btnRetry.addEventListener('click', () => { Sound.resume(); startRun(); });
el.btnPause.addEventListener('click', togglePause);
el.btnResume.addEventListener('click', togglePause);
el.btnQuit.addEventListener('click', quitToMenu);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === STATE.PLAY) togglePause();
});

// --------------------------------------------------------------------------
// State transitions
// --------------------------------------------------------------------------
function startRun() {
  resetGame();
  state = STATE.PLAY;
  el.title.classList.add('hidden');
  el.over.classList.add('hidden');
  el.pause.classList.add('hidden');
  el.hud.classList.remove('hidden');
  el.btnPause.classList.remove('hidden');
  Sound.roar(); haptic([20, 40, 30]);
}

let overReady = false;
function gameOver() {
  if (dino.dead) return;
  dino.dead = true;
  overReady = false;
  state = STATE.OVER;
  game.shake = 22; game.flash = 1;
  Sound.hit(); haptic([40, 30, 60]);
  spawnBurst(dino.x + dino.w/2, dino.y + dino.h/2, '#ff6b4a', 26);

  const final = Math.floor(game.score);
  const isRecord = final > best;
  if (isRecord) { best = final; localStorage.setItem(BEST_KEY, best); }
  el.best.textContent = best;
  el.overScore.textContent = final;
  el.overBest.textContent = best;
  el.overBadge.textContent = isRecord ? '🏆' : (final > 1500 ? '🦕' : '🦴');
  el.overTitle.textContent = isRecord ? 'NEW RECORD' : 'EXTINCT';
  el.overTitle.classList.toggle('record', isRecord);

  setTimeout(() => {
    el.over.classList.remove('hidden');
    el.btnPause.classList.add('hidden');
    overReady = true;
  }, 700);
}

function togglePause() {
  if (state === STATE.PLAY) {
    state = STATE.PAUSE;
    el.pause.classList.remove('hidden');
  } else if (state === STATE.PAUSE) {
    state = STATE.PLAY;
    el.pause.classList.add('hidden');
  }
}

function quitToMenu() {
  state = STATE.TITLE;
  el.pause.classList.add('hidden');
  el.over.classList.add('hidden');
  el.hud.classList.add('hidden');
  el.btnPause.classList.add('hidden');
  el.title.classList.remove('hidden');
}

// --------------------------------------------------------------------------
// Particles
// --------------------------------------------------------------------------
function spawnBurst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), s = rand(40, 260);
    particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 60, life: rand(0.3, 0.8), max: 0.8, r: rand(2, 5), color });
  }
}
function spawnDust(x, y) {
  for (let i = 0; i < 6; i++)
    particles.push({ x, y, vx: rand(-120, -30), vy: rand(-120, -20), life: rand(0.3, 0.6), max: 0.6, r: rand(2, 4), color: 'rgba(180,150,110,0.8)' });
}

// --------------------------------------------------------------------------
// Spawning
// --------------------------------------------------------------------------
function spawnObstacle() {
  const variants = [
    { w: 26, h: 46, kind: 'rock' },
    { w: 38, h: 64, kind: 'rock' },
    { w: 64, h: 40, kind: 'rock' },   // wide low rock cluster
    { w: 70, h: 54, kind: 'lava' },   // lava pool (visual), still ground hazard
  ];
  const v = variants[randInt(0, variants.length - 1)];
  obstacles.push({ x: VW + 40, y: GROUND - v.h, w: v.w, h: v.h, kind: v.kind, t: 0 });
}
function spawnFlyer() {
  // High = jump under, Low = duck under
  const low = Math.random() < 0.55;
  const y = low ? GROUND - 96 : GROUND - 180;
  flyers.push({ x: VW + 40, y, baseY: y, w: 60, h: 34, flap: rand(0, 6.28), bob: rand(0, 6.28), low });
}
function spawnGem() {
  const arc = Math.random() < 0.5;
  const y = arc ? GROUND - rand(150, 230) : GROUND - rand(60, 110);
  gems.push({ x: VW + 40, y, w: 22, h: 26, spin: 0 });
}

// --------------------------------------------------------------------------
// Update
// --------------------------------------------------------------------------
function update(dt) {
  game.time += dt;

  if (state !== STATE.PLAY) {
    // idle ambience still animates background a touch
    updateBackground(dt, state === STATE.TITLE ? 120 : 0);
    updateParticles(dt);
    return;
  }

  // Speed ramps gradually with distance (relative to world width so the
  // ramp pace is consistent across screen sizes).
  game.speed = Math.min(game.maxSpeed, game.baseSpeed + game.distance * 0.011);
  const spd = game.speed;
  game.distance += spd * dt;

  // Score: distance + gems via combo
  game.score += spd * dt * 0.06 * game.combo;
  const shown = Math.floor(game.score);
  el.score.textContent = shown;
  if (shown > 0 && shown % 500 < (spd * dt * 0.06 * game.combo)) { Sound.point(); }

  // Combo decay
  if (game.combo > 1) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) { game.combo = 1; el.mult.classList.add('hidden'); }
  }

  // ---- Player physics ----
  dino.vy += GRAVITY * dt;
  if (dino.holding && dino.holdTime < MAX_HOLD && dino.vy < 0) {
    dino.vy += HOLD_FORCE * dt;
    dino.holdTime += dt;
  }
  dino.y += dino.vy * dt;

  const floor = GROUND - (dino.ducking ? dino.h * 0.62 : dino.h);
  if (dino.y >= floor) {
    if (!dino.onGround) { Sound.land(); spawnDust(dino.x + 8, GROUND); haptic(8); }
    dino.y = floor;
    dino.vy = 0;
    dino.onGround = true;
    dino.jumps = 0;
    dino.holding = false;
  } else {
    dino.onGround = false;
  }
  dino.runCycle += dt * (spd / 60);
  dino.blink -= dt;
  if (dino.blink < -0.1 && Math.random() < 0.01) dino.blink = 0.14;

  // ---- Spawn timers (scale with speed) ----
  const sf = spd / game.baseSpeed;
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    spawnObstacle();
    game.spawnTimer = rand(0.9, 1.7) / sf;
  }
  game.ptTimer -= dt;
  if (game.ptTimer <= 0 && game.distance > 600) {
    spawnFlyer();
    game.ptTimer = rand(2.4, 4.5) / sf;
  }
  game.gemTimer -= dt;
  if (game.gemTimer <= 0) {
    spawnGem();
    game.gemTimer = rand(1.4, 3.2);
  }

  // ---- Move & collide ----
  const dx = spd * dt;
  const hb = playerHitbox();

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i]; o.x -= dx; o.t += dt;
    if (o.x + o.w < -20) { obstacles.splice(i, 1); continue; }
    if (aabb(hb, o)) return gameOver();
  }
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i]; f.x -= dx * 1.08; f.flap += dt * 10; f.bob += dt * 3;
    f.y = f.baseY + Math.sin(f.bob) * 10;
    if (f.x + f.w < -20) { flyers.splice(i, 1); continue; }
    const fb = { x: f.x + 8, y: f.y + 6, w: f.w - 16, h: f.h - 12 };
    if (aabb(hb, fb)) return gameOver();
  }
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i]; g.x -= dx; g.spin += dt * 5;
    if (g.x + g.w < -20) { gems.splice(i, 1); continue; }
    if (aabb(hb, g)) {
      gems.splice(i, 1);
      game.combo = Math.min(8, game.combo + 1);
      game.comboTimer = 4;
      game.score += 50 * game.combo;
      el.mult.textContent = 'x' + game.combo;
      el.mult.classList.remove('hidden');
      el.mult.style.animation = 'none'; void el.mult.offsetWidth; el.mult.style.animation = '';
      Sound.pickup(); haptic(10);
      spawnBurst(g.x + g.w/2, g.y + g.h/2, '#ffd56b', 12);
    }
  }

  updateBackground(dt, spd);
  updateParticles(dt);

  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 40);
  if (game.flash > 0) game.flash = Math.max(0, game.flash - dt * 3);

  // Day/night phase cycles slowly with distance
  game.dayPhase = (game.distance / 4200) % 1;
}

function playerHitbox() {
  // Tighter than sprite for fair collisions
  if (dino.ducking)
    return { x: dino.x + 8, y: dino.y + 6, w: dino.w - 4, h: dino.h * 0.62 - 10 };
  return { x: dino.x + 12, y: dino.y + 8, w: dino.w - 26, h: dino.h - 12 };
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.vy += 600 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
}

function updateBackground(dt, spd) {
  for (const c of clouds) {
    c.x -= (c.spd + spd * 0.06) * dt;
    if (c.x < -120) { c.x = VW + rand(0, 200); c.y = rand(40, 200); c.s = rand(0.6, 1.4); }
  }
  for (const h of bgFar) {
    h.x -= spd * 0.12 * dt;
    if (h.x + h.w < -40) { h.x = VW + rand(0, 200); h.w = rand(180, 340); h.h = rand(80, 190); }
  }
  for (const t of bgMid) {
    t.x -= spd * 0.32 * dt;
    if (t.x < -60) { t.x = VW + rand(0, 220); t.type = randInt(0,1); t.s = rand(0.7, 1.3); }
  }
  for (const s of stars) s.tw += dt * 3;
  // Volcano embers
  if (Math.random() < 0.4) {
    embers.push({ x: VW * 0.78 + rand(-20, 20), y: GROUND - 230 + rand(-10, 10), vx: rand(-20, 10), vy: rand(-60, -20), life: rand(1, 2.4) });
  }
  for (let i = embers.length - 1; i >= 0; i--) {
    const e = embers[i];
    e.life -= dt; e.x -= spd * 0.12 * dt + (-e.vx * dt); e.y += e.vy * dt; e.vy += 30 * dt;
    if (e.life <= 0) embers.splice(i, 1);
  }
}

// --------------------------------------------------------------------------
// Palette for day/night cycle
// --------------------------------------------------------------------------
function skyColors(phase) {
  // phase 0..1 → dawn → day → dusk → night → dawn
  const stops = [
    { p: 0.00, top: [255,176,120], bot: [255,221,170] }, // dawn
    { p: 0.30, top: [120,180,235], bot: [200,232,255] }, // day
    { p: 0.55, top: [248,150,90],  bot: [255,200,120] }, // dusk
    { p: 0.75, top: [30,28,70],    bot: [90,50,90] },    // night
    { p: 1.00, top: [255,176,120], bot: [255,221,170] }, // dawn
  ];
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (phase >= stops[i].p && phase <= stops[i+1].p) { a = stops[i]; b = stops[i+1]; break; }
  }
  const t = (phase - a.p) / (b.p - a.p || 1);
  const mix = (x, y) => Math.round(lerp(x, y, t));
  const top = `rgb(${mix(a.top[0],b.top[0])},${mix(a.top[1],b.top[1])},${mix(a.top[2],b.top[2])})`;
  const bot = `rgb(${mix(a.bot[0],b.bot[0])},${mix(a.bot[1],b.bot[1])},${mix(a.bot[2],b.bot[2])})`;
  const night = clamp((phase - 0.62) / 0.13, 0, 1) * clamp((0.86 - phase) / 0.1, 0, 1);
  return { top, bot, night: clamp(night, 0, 1) };
}

// --------------------------------------------------------------------------
// Render
// --------------------------------------------------------------------------
function render() {
  const W = VW, H = VH;
  ctx.save();
  // Map virtual world units → device pixels (DPR-aware, fills viewport height).
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);

  // Screen shake
  if (game.shake > 0) {
    ctx.translate(rand(-game.shake, game.shake), rand(-game.shake, game.shake));
  }

  const sky = skyColors(state === STATE.PLAY ? game.dayPhase : 0.15);

  // --- Sky ---
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND);
  grad.addColorStop(0, sky.top);
  grad.addColorStop(1, sky.bot);
  ctx.fillStyle = grad;
  ctx.fillRect(-40, -40, W + 80, GROUND + 80);

  // --- Stars (at night) ---
  if (sky.night > 0.02) {
    ctx.save();
    ctx.globalAlpha = sky.night;
    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(s.tw);
      ctx.fillStyle = `rgba(255,255,255,${tw})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }

  // --- Sun / Moon ---
  drawCelestial(sky.night);

  // --- Clouds ---
  ctx.fillStyle = `rgba(255,255,255,${0.55 - sky.night * 0.35})`;
  for (const c of clouds) drawCloud(c.x, c.y, c.s);

  // --- Far hills ---
  for (const h of bgFar) {
    ctx.fillStyle = sky.night > 0.4 ? '#23304a' : '#7d9b8e';
    ctx.beginPath();
    ctx.moveTo(h.x, GROUND);
    ctx.quadraticCurveTo(h.x + h.w/2, GROUND - h.h, h.x + h.w, GROUND);
    ctx.fill();
  }

  // --- Volcano (anchored, parallax slight) ---
  drawVolcano(sky.night);

  // --- Mid trees ---
  for (const t of bgMid) drawTree(t.x, t.type, t.s, sky.night);

  // --- Ground ---
  drawGround(sky.night);

  // --- Gems ---
  for (const g of gems) drawGem(g);

  // --- Obstacles ---
  for (const o of obstacles) drawObstacle(o);

  // --- Flyers ---
  for (const f of flyers) drawPterodactyl(f);

  // --- Player ---
  drawDino();

  // --- Particles ---
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- Damage flash ---
  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255,90,54,${game.flash * 0.5})`;
    ctx.fillRect(-40, -40, W + 80, H + 80);
  }

  ctx.restore();
}

function drawCelestial(night) {
  const cx = W() * 0.5, prog = state === STATE.PLAY ? game.dayPhase : 0.15;
  // sun arcs across; moon opposite
  const ang = prog * Math.PI * 2;
  const sunX = VW * (0.5 - Math.cos(ang) * 0.42);
  const sunY = GROUND * 0.55 - Math.sin(ang) * GROUND * 0.42;
  if (night < 0.85) {
    ctx.save();
    ctx.globalAlpha = 1 - night;
    const g = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
    g.addColorStop(0, 'rgba(255,245,200,1)');
    g.addColorStop(0.4, 'rgba(255,210,120,0.9)');
    g.addColorStop(1, 'rgba(255,180,84,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sunX, sunY, 90, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff6da';
    ctx.beginPath(); ctx.arc(sunX, sunY, 30, 0, 6.283); ctx.fill();
    ctx.restore();
  }
  if (night > 0.1) {
    const mx = VW * (0.5 + Math.cos(ang) * 0.42);
    const my = GROUND * 0.55 + Math.sin(ang) * GROUND * 0.42;
    ctx.save();
    ctx.globalAlpha = night;
    ctx.fillStyle = '#eef0ff';
    ctx.beginPath(); ctx.arc(mx, my, 26, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(180,185,220,0.6)';
    ctx.beginPath(); ctx.arc(mx - 8, my - 6, 6, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + 7, my + 5, 4, 0, 6.283); ctx.fill();
    ctx.restore();
  }
}
function W() { return VW; }

function drawCloud(x, y, s) {
  ctx.beginPath();
  ctx.arc(x, y, 22*s, 0, 6.283);
  ctx.arc(x + 26*s, y + 6*s, 18*s, 0, 6.283);
  ctx.arc(x - 24*s, y + 8*s, 16*s, 0, 6.283);
  ctx.arc(x + 6*s, y + 12*s, 20*s, 0, 6.283);
  ctx.fill();
}

function drawVolcano(night) {
  const vx = VW * 0.78, base = GROUND, top = GROUND - 230, halfW = 150;
  ctx.fillStyle = night > 0.4 ? '#2a2230' : '#5b4a52';
  ctx.beginPath();
  ctx.moveTo(vx - halfW, base);
  ctx.lineTo(vx - 36, top + 20);
  ctx.lineTo(vx + 36, top + 20);
  ctx.lineTo(vx + halfW, base);
  ctx.closePath();
  ctx.fill();
  // lava glow at crater
  const g = ctx.createRadialGradient(vx, top + 20, 4, vx, top + 20, 80);
  g.addColorStop(0, 'rgba(255,120,40,0.95)');
  g.addColorStop(1, 'rgba(255,90,54,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(vx, top + 20, 80, 0, 6.283); ctx.fill();
  // lava streaks
  ctx.strokeStyle = 'rgba(255,110,50,0.7)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(vx - 14, top + 24); ctx.quadraticCurveTo(vx - 50, base - 80, vx - 70, base);
  ctx.moveTo(vx + 16, top + 24); ctx.quadraticCurveTo(vx + 44, base - 100, vx + 60, base);
  ctx.stroke();
  // embers
  for (const e of embers) {
    ctx.globalAlpha = clamp(e.life, 0, 1);
    ctx.fillStyle = '#ff8a3c';
    ctx.beginPath(); ctx.arc(e.x, e.y, 2.4, 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTree(x, type, s, night) {
  const baseY = GROUND;
  if (type === 0) {
    // fern palm
    ctx.strokeStyle = night > 0.4 ? '#1c3326' : '#2d5016';
    ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, baseY - 70 * s); ctx.stroke();
    ctx.fillStyle = night > 0.4 ? '#244a33' : '#3d6b1e';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI/2 + (i - 2) * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, baseY - 70 * s);
      ctx.quadraticCurveTo(x + Math.cos(a) * 40 * s, baseY - 70 * s + Math.sin(a) * 40 * s - 18*s,
        x + Math.cos(a) * 66 * s, baseY - 70 * s + Math.sin(a) * 66 * s);
      ctx.lineWidth = 8 * s; ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
    }
  } else {
    // cycad bush
    ctx.fillStyle = night > 0.4 ? '#1f3a28' : '#356017';
    ctx.beginPath();
    ctx.ellipse(x, baseY - 22 * s, 30 * s, 26 * s, 0, 0, 6.283);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - 18*s, baseY - 14 * s, 18 * s, 16 * s, 0, 0, 6.283);
    ctx.ellipse(x + 18*s, baseY - 16 * s, 20 * s, 18 * s, 0, 0, 6.283);
    ctx.fill();
  }
}

function drawGround(night) {
  const top = GROUND;
  ctx.fillStyle = night > 0.4 ? '#2a1f1a' : '#6b4f32';
  ctx.fillRect(-40, top, VW + 80, VH - top + 80);
  // surface highlight
  ctx.fillStyle = night > 0.4 ? '#3a2c22' : '#8a6a44';
  ctx.fillRect(-40, top, VW + 80, 8);
  // scrolling texture dashes
  ctx.strokeStyle = night > 0.4 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 3;
  const off = (game.distance * 0.5) % 60;
  ctx.beginPath();
  for (let x = -off; x < VW + 60; x += 60) {
    ctx.moveTo(x, top + 26); ctx.lineTo(x + 22, top + 26);
    ctx.moveTo(x + 30, top + 48); ctx.lineTo(x + 50, top + 48);
  }
  ctx.stroke();
}

function drawObstacle(o) {
  if (o.kind === 'lava') {
    // glowing lava pool
    const g = ctx.createLinearGradient(0, o.y, 0, o.y + o.h);
    g.addColorStop(0, '#ffd24a'); g.addColorStop(0.5, '#ff6b2c'); g.addColorStop(1, '#c0260f');
    ctx.fillStyle = g;
    roundRect(o.x, o.y + o.h * 0.4, o.w, o.h * 0.6, 6); ctx.fill();
    // bubbles
    ctx.fillStyle = 'rgba(255,220,120,0.9)';
    const b = (game.time * 3 + o.x) % 1;
    ctx.beginPath(); ctx.arc(o.x + o.w*0.3, o.y + o.h*0.5 - b*10, 3, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(o.x + o.w*0.7, o.y + o.h*0.6 - ((b+0.5)%1)*10, 2.4, 0, 6.283); ctx.fill();
    // rocky rim
    ctx.fillStyle = '#3a2a22';
    roundRect(o.x - 4, o.y + o.h * 0.34, o.w + 8, 8, 4); ctx.fill();
  } else {
    // jagged rock
    const g = ctx.createLinearGradient(0, o.y, 0, o.y + o.h);
    g.addColorStop(0, '#9aa3ad'); g.addColorStop(1, '#586069');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(o.x, o.y + o.h);
    ctx.lineTo(o.x + o.w * 0.18, o.y + o.h * 0.3);
    ctx.lineTo(o.x + o.w * 0.45, o.y);
    ctx.lineTo(o.x + o.w * 0.7, o.y + o.h * 0.36);
    ctx.lineTo(o.x + o.w, o.y + o.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(o.x + o.w * 0.45, o.y);
    ctx.lineTo(o.x + o.w * 0.7, o.y + o.h * 0.36);
    ctx.lineTo(o.x + o.w * 0.55, o.y + o.h * 0.4);
    ctx.closePath(); ctx.fill();
  }
}

function drawGem(g) {
  const cx = g.x + g.w/2, cy = g.y + g.h/2;
  const r = g.w/2 * (0.85 + 0.15 * Math.sin(g.spin * 2));
  ctx.save();
  ctx.translate(cx, cy);
  // glow
  const gl = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
  gl.addColorStop(0, 'rgba(255,213,107,0.8)'); gl.addColorStop(1, 'rgba(255,213,107,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 6.283); ctx.fill();
  // amber diamond
  ctx.rotate(g.spin * 0.5);
  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, '#ffe9a8'); grad.addColorStop(1, '#f5a623');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -g.h/2); ctx.lineTo(r, 0); ctx.lineTo(0, g.h/2); ctx.lineTo(-r, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.restore();
}

function drawPterodactyl(f) {
  const cx = f.x + f.w/2, cy = f.y + f.h/2;
  const flap = Math.sin(f.flap) * 0.7;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#4a3b6b';
  // body
  ctx.beginPath(); ctx.ellipse(0, 0, 16, 9, 0, 0, 6.283); ctx.fill();
  // head + beak
  ctx.beginPath();
  ctx.moveTo(-14, -2); ctx.lineTo(-30, -6 - flap*3); ctx.lineTo(-14, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d98a3a';
  ctx.beginPath(); ctx.moveTo(-26, -4); ctx.lineTo(-36, -3); ctx.lineTo(-26, 0); ctx.closePath(); ctx.fill();
  // crest
  ctx.fillStyle = '#e35b4a';
  ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(-22, -16); ctx.lineTo(-10, -8); ctx.closePath(); ctx.fill();
  // wings
  ctx.fillStyle = '#5d4b85';
  ctx.beginPath();
  ctx.moveTo(-4, -2);
  ctx.quadraticCurveTo(8, -28 * (0.6 + flap), 34, -6 - flap * 10);
  ctx.quadraticCurveTo(14, 2, 6, 2);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-2, 2);
  ctx.quadraticCurveTo(10, 24 * (0.6 - flap), 32, 10 + flap * 8);
  ctx.quadraticCurveTo(12, 6, 4, 4);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// --------------------------------------------------------------------------
// The T-Rex — drawn procedurally with a running cycle + jump/duck poses
// --------------------------------------------------------------------------
function drawDino() {
  const baseH = dino.ducking ? dino.h * 0.62 : dino.h;
  const x = dino.x, y = dino.y, w = dino.w;
  const green = '#3d8b3d', greenDark = '#2c6b2c', belly = '#7bc47b';
  const run = dino.runCycle;
  const airborne = !dino.onGround;

  ctx.save();
  // soft shadow on ground
  const sh = clamp(1 - (GROUND - (y + baseH)) / 160, 0.25, 1);
  ctx.fillStyle = `rgba(0,0,0,${0.22 * sh})`;
  ctx.beginPath();
  ctx.ellipse(x + w*0.5, GROUND + 2, w*0.42 * sh, 7 * sh, 0, 0, 6.283);
  ctx.fill();

  ctx.translate(x, y);

  if (dino.ducking) {
    drawDinoDuck(w, baseH, green, greenDark, belly, run);
  } else {
    // ---- tail ----
    ctx.fillStyle = greenDark;
    ctx.beginPath();
    ctx.moveTo(6, baseH * 0.42);
    ctx.quadraticCurveTo(-26, baseH * 0.34, -34, baseH * 0.14);
    ctx.quadraticCurveTo(-22, baseH * 0.5, 8, baseH * 0.6);
    ctx.closePath(); ctx.fill();

    // ---- legs (running cycle or tucked when airborne) ----
    ctx.strokeStyle = green; ctx.lineWidth = 9; ctx.lineCap = 'round';
    let l1, l2;
    if (airborne) { l1 = 0.5; l2 = -0.3; }
    else { l1 = Math.sin(run); l2 = Math.sin(run + Math.PI); }
    drawLeg(w*0.34, baseH*0.58, l1, baseH, green);
    drawLeg(w*0.52, baseH*0.58, l2, baseH, greenDark);

    // ---- body ----
    const bg = ctx.createLinearGradient(0, baseH*0.2, 0, baseH);
    bg.addColorStop(0, green); bg.addColorStop(1, greenDark);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(0, baseH*0.5);
    ctx.quadraticCurveTo(-2, baseH*0.14, w*0.42, baseH*0.1);
    ctx.quadraticCurveTo(w*0.72, baseH*0.1, w*0.78, baseH*0.34);
    ctx.quadraticCurveTo(w*0.82, baseH*0.6, w*0.5, baseH*0.66);
    ctx.quadraticCurveTo(w*0.18, baseH*0.66, 0, baseH*0.5);
    ctx.closePath(); ctx.fill();

    // belly
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.moveTo(w*0.2, baseH*0.6);
    ctx.quadraticCurveTo(w*0.5, baseH*0.72, w*0.7, baseH*0.5);
    ctx.quadraticCurveTo(w*0.5, baseH*0.64, w*0.2, baseH*0.6);
    ctx.closePath(); ctx.fill();

    // ---- arm ----
    ctx.strokeStyle = greenDark; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w*0.62, baseH*0.42);
    ctx.lineTo(w*0.7, baseH*0.5 + (airborne ? -4 : Math.sin(run)*2));
    ctx.stroke();

    // ---- head ----
    ctx.fillStyle = green;
    ctx.beginPath();
    ctx.moveTo(w*0.6, baseH*0.2);
    ctx.quadraticCurveTo(w*0.78, baseH*0.0, w*1.02, baseH*0.06);
    ctx.quadraticCurveTo(w*1.06, baseH*0.2, w*0.98, baseH*0.28);
    ctx.lineTo(w*0.78, baseH*0.32);
    ctx.quadraticCurveTo(w*0.64, baseH*0.34, w*0.6, baseH*0.2);
    ctx.closePath(); ctx.fill();

    // jaw / teeth
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(w*0.86, baseH*0.27);
    ctx.lineTo(w*0.9, baseH*0.32);
    ctx.lineTo(w*0.94, baseH*0.27);
    ctx.lineTo(w*0.98, baseH*0.31);
    ctx.lineTo(w*1.0, baseH*0.26);
    ctx.closePath(); ctx.fill();

    // nostril
    ctx.fillStyle = greenDark;
    ctx.beginPath(); ctx.arc(w*0.98, baseH*0.12, 1.6, 0, 6.283); ctx.fill();

    // eye
    if (dino.blink > 0) {
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w*0.82, baseH*0.15); ctx.lineTo(w*0.9, baseH*0.15); ctx.stroke();
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(w*0.86, baseH*0.15, 4.4, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(w*0.88, baseH*0.15, 2.2, 0, 6.283); ctx.fill();
    }
  }
  ctx.restore();
}

function drawLeg(px, py, phase, baseH, color) {
  const footX = px + phase * 10;
  const knee = py + baseH * 0.18;
  ctx.strokeStyle = color; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(footX, knee);
  ctx.lineTo(footX + 8 + phase * 3, baseH - 1);
  ctx.stroke();
}

function drawDinoDuck(w, h, green, greenDark, belly, run) {
  // low, stretched pose
  ctx.fillStyle = greenDark;
  ctx.beginPath();
  ctx.moveTo(2, h*0.4);
  ctx.quadraticCurveTo(-28, h*0.3, -40, h*0.0);
  ctx.quadraticCurveTo(-20, h*0.6, 6, h*0.7);
  ctx.closePath(); ctx.fill();

  // legs (quick shuffle)
  const l1 = Math.sin(run*1.4), l2 = Math.sin(run*1.4 + Math.PI);
  drawLeg(w*0.4, h*0.62, l1, h, green);
  drawLeg(w*0.6, h*0.62, l2, h, greenDark);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, green); bg.addColorStop(1, greenDark);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(0, h*0.5);
  ctx.quadraticCurveTo(w*0.4, h*0.18, w*0.95, h*0.3);
  ctx.quadraticCurveTo(w*1.0, h*0.55, w*0.6, h*0.74);
  ctx.quadraticCurveTo(w*0.2, h*0.78, 0, h*0.5);
  ctx.closePath(); ctx.fill();

  // head forward
  ctx.fillStyle = green;
  ctx.beginPath();
  ctx.moveTo(w*0.78, h*0.32);
  ctx.quadraticCurveTo(w*1.1, h*0.2, w*1.28, h*0.34);
  ctx.quadraticCurveTo(w*1.1, h*0.5, w*0.82, h*0.5);
  ctx.closePath(); ctx.fill();
  // eye
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(w*1.02, h*0.34, 4, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(w*1.04, h*0.34, 2, 0, 6.283); ctx.fill();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// --------------------------------------------------------------------------
// Main loop — fixed-step-ish with delta clamp
// --------------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05; // clamp big stalls (tab switch)
  if (state !== STATE.PAUSE) update(dt);
  render();
  requestAnimationFrame(frame);
}

// Size the canvas now that game/dino exist (resize() reads both), then
// position the dino on the ground before the first paint.
resize();
dino.y = GROUND - dino.h;
seedWorld();
requestAnimationFrame(frame);

})();
