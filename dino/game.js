/* ==========================================================================
   PRIMAL RUN — a prehistoric pixel-art endless runner
   Vanilla JS + Canvas, no dependencies. Built to feel native on iOS.
   Pixel art: Arks (dino), edermunizz (forest), Pixel Frog (creatures) — see CREDITS.md
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
  GROUND = VH * 0.84;
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
// Assets — pixel-art sprites (loaded once, drawn crisp/unsmoothed).
//   dino : Arks "DinoSprites" (24x24 x24)  idle 0-3, run 4-10, kick 11-13,
//          hit 14-16, crouch/sprint 17-23
//   bat/rino/pig : Pixel Adventure (CC0) creatures, used as obstacles
//   plx-1..6 : "Free Pixel Art Forest" parallax layers (384x216, floor baked in)
// See CREDITS.md for full attribution.
// --------------------------------------------------------------------------
const Assets = (() => {
  const imgs = {};
  const srcs = {
    dino: 'assets/dino.png',
    bat:  'assets/bat.png',
    rino: 'assets/rino.png',
    pig:  'assets/pig.png',
    plx1: 'assets/parallax/plx-1.png', plx2: 'assets/parallax/plx-2.png',
    plx3: 'assets/parallax/plx-3.png', plx4: 'assets/parallax/plx-4.png',
    plx5: 'assets/parallax/plx-5.png', plx6: 'assets/parallax/plx-6.png',
  };
  let pending = 0, ready = false;
  function load(cb) {
    const keys = Object.keys(srcs);
    pending = keys.length;
    keys.forEach(k => {
      const im = new Image();
      const done = () => { if (--pending <= 0) { ready = true; cb && cb(); } };
      im.onload = done; im.onerror = done;
      im.src = srcs[k];
      imgs[k] = im;
    });
  }
  return { load, img: k => imgs[k], isReady: () => ready };
})();

// Draw frame `i` from a horizontal sprite sheet (frames are fw×fh, row 0).
function drawFrame(img, fw, fh, i, dx, dy, dw, dh, flip) {
  if (!img || !img.width) return;
  const n = Math.max(1, Math.floor(img.width / fw));
  const f = ((i % n) + n) % n;
  if (flip) {
    ctx.save();
    ctx.translate(dx + dw, dy); ctx.scale(-1, 1);
    ctx.drawImage(img, f * fw, 0, fw, fh, 0, 0, dw, dh);
    ctx.restore();
  } else {
    ctx.drawImage(img, f * fw, 0, fw, fh, dx, dy, dw, dh);
  }
}

// Sprite metadata for the creatures used as obstacles.
const SPR = {
  dino: { fw: 24, fh: 24 },
  bat:  { fw: 46, fh: 30, n: 7 },
  rino: { fw: 52, fh: 34, n: 6 },
  pig:  { fw: 36, fh: 30, n: 16 },
};

// Parallax layers: factor = how fast it scrolls relative to the dino (1 = floor).
const PLX = [
  { k: 'plx1', f: 0.10 }, { k: 'plx2', f: 0.18 }, { k: 'plx3', f: 0.30 },
  { k: 'plx4', f: 0.48 }, { k: 'plx5', f: 1.00 },
];

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

const GRAVITY = 2300;
const JUMP_V = -930;
const HOLD_FORCE = -2600;     // extra lift while holding (variable jump)
const MAX_HOLD = 0.2;

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
function seedWorld() { /* parallax is procedural from game.distance — nothing to seed */ }

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
  dino.dead = false; dino.deadAt = 0; dino.runCycle = 0; dino.blink = 0;
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
  dino.deadAt = game.time;
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
  // Ground creatures: rino (big, charges low+wide) or angry pig (smaller).
  const v = Math.random() < 0.5
    ? { kind: 'rino', w: 56, h: 44 }
    : { kind: 'pig',  w: 44, h: 40 };
  obstacles.push({ x: VW + 40, y: GROUND - v.h, w: v.w, h: v.h, kind: v.kind, t: rand(0, 1) });
}
function spawnFlyer() {
  // Bat flies at head height — hits a standing dino, clears a ducking one.
  const y = GROUND - rand(86, 98);
  flyers.push({ x: VW + 40, y, baseY: y, w: 56, h: 36, flap: rand(0, 6.28), bob: rand(0, 6.28) });
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
    // On the title screen, gently scroll the forest and idle-animate the dino.
    if (state === STATE.TITLE) { game.distance += 70 * dt; dino.runCycle += dt * 3; }
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
    // Sprites carry transparent padding — inset the hitbox so hits feel fair.
    const ob = { x: o.x + o.w*0.14, y: o.y + o.h*0.20, w: o.w*0.72, h: o.h*0.78 };
    if (aabb(hb, ob)) return gameOver();
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

  updateParticles(dt);

  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 40);
  if (game.flash > 0) game.flash = Math.max(0, game.flash - dt * 3);
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

  // Crisp pixel art — never smooth when upscaling sprites.
  ctx.imageSmoothingEnabled = false;

  // --- Parallax forest background (fills the screen, floor baked in) ---
  drawParallax();

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

// Tiled parallax forest. Each layer is scaled to fill the screen height and
// scrolls at its own fraction of the world speed (back layers slowest).
function drawParallax() {
  // Backdrop so screen-shake / wide screens never reveal gaps.
  ctx.fillStyle = "#1b3a2a";
  ctx.fillRect(-60, -60, VW + 120, VH + 120);
  for (const L of PLX) {
    const img = Assets.img(L.k);
    if (!img || !img.width) continue;
    const sh = VH + 2;                       // cover full height
    const sw = img.width * (sh / img.height);
    let off = (game.distance * L.f) % sw;
    if (off < 0) off += sw;
    for (let x = -off - sw; x < VW + sw; x += sw) {
      ctx.drawImage(img, 0, 0, img.width, img.height, x, -1, sw, sh);
    }
  }
}

function drawObstacle(o) {
  const m = o.kind === 'rino' ? SPR.rino : SPR.pig;
  const fps = o.kind === 'rino' ? 14 : 18;
  // Sprites are drawn facing left (the direction they charge the dino).
  const flip = (o.kind === 'pig');
  // Draw a touch taller than the hitbox so the creature's feet sit on the floor.
  const dh = o.h * 1.12, dw = dh * (m.fw / m.fh);
  const dx = o.x + o.w / 2 - dw / 2;
  const dy = o.y + o.h - dh;
  drawFrame(Assets.img(o.kind), m.fw, m.fh, Math.floor(o.t * fps), dx, dy, dw, dh, flip);
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
  // Animated bat sprite (the flying hazard).
  drawFrame(Assets.img('bat'), SPR.bat.fw, SPR.bat.fh, Math.floor(f.flap * 1.1),
            f.x, f.y, f.w, f.h, false);
}

// --------------------------------------------------------------------------
// The dino — animated from the Arks sprite sheet (24x24 frames):
//   idle 0-3 · run 4-10 · kick 11-13 · hit 14-16 · crouch/sprint 17-23
// --------------------------------------------------------------------------
function drawDino() {
  const img = Assets.img("dino");
  const baseH = dino.ducking ? dino.h * 0.62 : dino.h;
  const cx = dino.x + dino.w / 2;
  const feet = dino.y + baseH;                 // == GROUND when grounded

  // soft contact shadow (fades as the dino rises)
  const sh = clamp(1 - (GROUND - feet) / 170, 0.2, 1);
  ctx.fillStyle = `rgba(0,0,0,${0.22 * sh})`;
  ctx.beginPath();
  ctx.ellipse(cx, GROUND + 2, dino.w * 0.42 * sh, 6 * sh, 0, 0, 6.283);
  ctx.fill();

  // pick the animation frame for the current state
  let frame;
  if (dino.dead) {
    frame = 14 + Math.min(2, Math.floor((game.time - dino.deadAt) * 9));   // hit, then hold
  } else if (dino.ducking) {
    frame = 17 + (Math.floor(dino.runCycle * 1.6) % 7);                     // crouch run
  } else if (!dino.onGround) {
    frame = 6;                                                             // airborne pose
  } else if (state === STATE.PLAY) {
    frame = 4 + (Math.floor(dino.runCycle * 1.3) % 7);                      // run
  } else {
    frame = Math.floor(dino.runCycle * 0.6) % 4;                           // idle (title)
  }

  // Draw a touch larger than the hitbox; feet planted on the floor.
  const dh = baseH * (dino.ducking ? 1.35 : 1.16);
  const dw = dh;                                // 24x24 square source
  drawFrame(img, 24, 24, frame, cx - dw / 2, feet - dh, dw, dh, false);
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
Assets.load();           // sprites stream in; render() skips any not yet ready
requestAnimationFrame(frame);

// Read-only introspection hook (used by automated playtests; harmless to ship).
window.__primal = {
  state: () => state, dino,
  obstacles: () => obstacles, flyers: () => flyers,
  ground: () => GROUND, vw: () => VW, speed: () => game.speed,
};

})();
