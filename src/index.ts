// Neon Slicer VR — Holodeck VR slicing game
// Slice flying neon wireframe objects with dual energy blades
// First slicing/cutting genre in the IWSDK portfolio

import {
  World, PanelUI, ScreenSpace, Follower, FollowBehavior,
  PanelDocument, UIKitDocument,
  Mesh, Group, BoxGeometry, SphereGeometry, CylinderGeometry,
  OctahedronGeometry, IcosahedronGeometry, TorusKnotGeometry,
  ConeGeometry, TorusGeometry, PlaneGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  Color, Vector3, Quaternion, Euler,
  Fog, AmbientLight, PointLight, DirectionalLight,
  BufferGeometry, Float32BufferAttribute,
  EdgesGeometry, LineSegments,
  AdditiveBlending, Raycaster, Vector2,
  InputComponent,
} from '@iwsdk/core';

// ============================================================
// TYPES
// ============================================================
type GameState = 'title' | 'modeSelect' | 'difficulty' | 'playing' | 'paused' | 'gameOver' | 'leaderboard' | 'achievements' | 'settings' | 'help' | 'skins' | 'stats' | 'countdown';
type ObjType = 'cube' | 'sphere' | 'diamond' | 'star' | 'bomb' | 'freeze';
type GameMode = 'classic' | 'zen' | 'timeAttack' | 'survival' | 'frenzy' | 'daily';
type Difficulty = 'easy' | 'medium' | 'hard';

interface FlyingObj {
  group: Group;
  innerMesh: Mesh;
  wireMesh: LineSegments;
  glowMesh: Mesh;
  type: ObjType;
  radius: number;
  points: number;
  velocity: Vector3;
  angVel: Vector3;
  active: boolean;
  age: number;
}

interface SlicedHalf {
  mesh: Group;
  position: Vector3;
  velocity: Vector3;
  angVel: Vector3;
  age: number;
  maxAge: number;
}

interface Particle {
  mesh: Mesh;
  velocity: Vector3;
  age: number;
  maxAge: number;
  active: boolean;
}

interface BladeTrailPt {
  pos: Vector3;
  age: number;
}

interface Achievement {
  id: string;
  name: string;
  desc: string;
}

interface LeaderboardEntry {
  score: number;
  mode: string;
  slices: number;
  combo: number;
  date: string;
}

// ============================================================
// CONSTANTS
// ============================================================
const GRAVITY = -9.81;
const MIN_SLICE_SPEED = 2.0; // m/s tip speed to count as a slice
const COMBO_DECAY_TIME = 1.8; // seconds before combo resets
const MAX_COMBO = 10;
const OBJ_POOL_SIZE = 30;
const PARTICLE_POOL_SIZE = 150;
const TRAIL_MAX_POINTS = 25;
const HALF_LIFETIME = 1.2;

const OBJ_CONFIGS: Record<ObjType, { color: string; emissive: string; points: number; radius: number }> = {
  cube:    { color: '#00ffff', emissive: '#00cccc', points: 100, radius: 0.12 },
  sphere:  { color: '#00ff80', emissive: '#00cc60', points: 150, radius: 0.10 },
  diamond: { color: '#ff00ff', emissive: '#cc00cc', points: 200, radius: 0.11 },
  star:    { color: '#ffd700', emissive: '#ccaa00', points: 300, radius: 0.13 },
  bomb:    { color: '#ff3333', emissive: '#cc0000', points: -500, radius: 0.14 },
  freeze:  { color: '#4488ff', emissive: '#2266cc', points: 50,  radius: 0.10 },
};

const THEMES = [
  { name: 'NEON HOLODECK', grid: '#00ffff', accent: '#ff00ff', bg: '#000510', fog: '#000510', wall: '#003344' },
  { name: 'CRIMSON ARENA', grid: '#ff3344', accent: '#ffaa00', bg: '#0a0000', fog: '#0a0000', wall: '#330011' },
  { name: 'TOXIC NEON',    grid: '#00ff80', accent: '#80ff00', bg: '#000a05', fog: '#000a05', wall: '#003318' },
  { name: 'ULTRA VIOLET',  grid: '#aa44ff', accent: '#ff44aa', bg: '#050010', fog: '#050010', wall: '#220044' },
  { name: 'SOLAR BLAZE',   grid: '#ff8c00', accent: '#ffdd00', bg: '#0a0500', fog: '#0a0500', wall: '#332200' },
];

const BLADE_SKINS = [
  { name: 'Neon Cyan',  color: '#00ffff', emissive: '#00cccc', glow: '#00ffff', unlock: 'default' },
  { name: 'Inferno',    color: '#ff4400', emissive: '#cc3300', glow: '#ff6600', unlock: '50 slices' },
  { name: 'Plasma',     color: '#ff00ff', emissive: '#cc00cc', glow: '#ff44ff', unlock: '5K score' },
  { name: 'Solar',      color: '#ffd700', emissive: '#ccaa00', glow: '#ffee44', unlock: '10 games' },
  { name: 'Frost',      color: '#4488ff', emissive: '#2266cc', glow: '#66aaff', unlock: 'x5 combo' },
  { name: 'Toxic',      color: '#00ff80', emissive: '#00cc60', glow: '#44ff99', unlock: 'Clear board' },
  { name: 'Void',       color: '#8844cc', emissive: '#6622aa', glow: '#aa66ee', unlock: '80% accuracy' },
  { name: 'Rainbow',    color: '#ffffff', emissive: '#aaaaaa', glow: '#ffffff', unlock: 'All modes' },
];

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_slice',    name: 'First Blood',        desc: 'Slice your first object' },
  { id: 'ten_slices',     name: 'Warming Up',          desc: 'Slice 10 objects total' },
  { id: 'fifty_slices',   name: 'Blade Runner',        desc: 'Slice 50 objects total' },
  { id: 'hundred_slices', name: 'Slice Master',        desc: 'Slice 100 objects total' },
  { id: 'five_hundred',   name: 'Blade Legend',         desc: 'Slice 500 objects total' },
  { id: 'combo_x3',       name: 'Combo Starter',       desc: 'Reach x3 combo' },
  { id: 'combo_x5',       name: 'Combo King',          desc: 'Reach x5 combo' },
  { id: 'combo_x8',       name: 'Combo God',           desc: 'Reach x8 combo' },
  { id: 'combo_x10',      name: 'Maximum Combo',       desc: 'Reach x10 combo' },
  { id: 'score_1k',       name: 'Getting Started',     desc: 'Score 1,000 points' },
  { id: 'score_5k',       name: 'Sharp Blade',         desc: 'Score 5,000 points' },
  { id: 'score_10k',      name: 'Neon Master',         desc: 'Score 10,000 points' },
  { id: 'score_25k',      name: 'Legendary Slicer',    desc: 'Score 25,000 points' },
  { id: 'no_miss_10',     name: 'Perfect Eye',         desc: 'Slice 10 in a row without miss' },
  { id: 'no_miss_25',     name: 'Untouchable',         desc: 'Slice 25 in a row without miss' },
  { id: 'bomb_dodge',     name: 'Bomb Dodger',         desc: 'Avoid 10 bombs in one game' },
  { id: 'freeze_5',       name: 'Time Lord',           desc: 'Slice 5 freeze orbs in one game' },
  { id: 'accuracy_80',    name: 'Sharpshooter',        desc: 'Finish with 80%+ accuracy' },
  { id: 'accuracy_95',    name: 'Perfectionist',       desc: 'Finish with 95%+ accuracy' },
  { id: 'games_10',       name: 'Dedicated',           desc: 'Play 10 games' },
  { id: 'games_50',       name: 'Veteran',             desc: 'Play 50 games' },
  { id: 'classic_win',    name: 'Classic Champion',    desc: 'Complete Classic mode' },
  { id: 'survival_60',    name: 'Survivor',            desc: 'Survive 60 seconds in Survival' },
  { id: 'frenzy_1k',      name: 'Frenzy Master',       desc: 'Score 1,000+ in Frenzy' },
  { id: 'daily_done',     name: 'Daily Challenger',    desc: 'Complete a Daily Challenge' },
  { id: 'zen_100',        name: 'Zen Master',          desc: 'Slice 100 objects in Zen' },
  { id: 'skin_unlock',    name: 'Fashionista',         desc: 'Unlock a blade skin' },
  { id: 'theme_explorer', name: 'Theme Explorer',      desc: 'Play with all arena themes' },
  { id: 'dual_slice',     name: 'Dual Blade',          desc: 'Slice 2 objects simultaneously' },
  { id: 'speed_slice',    name: 'Lightning Blade',     desc: 'Slice 5 objects in 2 seconds' },
];

// ============================================================
// STORAGE
// ============================================================
const STORAGE_KEY = 'neon_slicer_save';

interface SaveData {
  career: {
    games: number; totalSlices: number; bestScore: number; totalScore: number;
    bestCombo: number; totalBombs: number; totalMisses: number; totalShots: number;
    playTimeMs: number; modesPlayed: string[]; themesUsed: string[];
  };
  achievements: string[];
  leaderboard: LeaderboardEntry[];
  settings: { masterVol: number; sfxVol: number; musicVol: number; themeIdx: number; skinIdx: number };
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    career: { games: 0, totalSlices: 0, bestScore: 0, totalScore: 0, bestCombo: 0, totalBombs: 0, totalMisses: 0, totalShots: 0, playTimeMs: 0, modesPlayed: [], themesUsed: [] },
    achievements: [],
    leaderboard: [],
    settings: { masterVol: 100, sfxVol: 100, musicVol: 100, themeIdx: 0, skinIdx: 0 },
  };
}

function saveSave(data: SaveData): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ============================================================
// SEEDED RNG (for daily challenge)
// ============================================================
function mulberry32(seed: number) {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateSeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// ============================================================
// AUDIO
// ============================================================
class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private droneOscs: OscillatorNode[] = [];
  private masterVol = 1;
  private sfxVol = 1;
  private musicVol = 1;

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);
  }

  setVolumes(master: number, sfx: number, music: number) {
    this.masterVol = master / 100;
    this.sfxVol = sfx / 100;
    this.musicVol = music / 100;
    if (this.masterGain) this.masterGain.gain.value = this.masterVol;
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVol;
    if (this.musicGain) this.musicGain.gain.value = this.musicVol;
  }

  private playSfx(freq: number, type: OscillatorType, dur: number, vol = 0.3, pitchVar = true) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const pv = pitchVar ? 1 + (Math.random() - 0.5) * 0.1 : 1;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq * pv;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur);
  }

  slice(points: number) {
    if (!this.ctx) return;
    const base = 600 + Math.min(points, 300) * 2;
    this.playSfx(base, 'sine', 0.15, 0.25);
    this.playSfx(base * 1.5, 'triangle', 0.1, 0.15);
  }

  sliceCombo(level: number) {
    if (!this.ctx) return;
    const base = 660 + level * 110;
    this.playSfx(base, 'sine', 0.2, 0.3);
    setTimeout(() => this.playSfx(base * 1.25, 'triangle', 0.15, 0.2), 80);
  }

  bombHit() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.5);
    // noise burst
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.3, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    noise.connect(ng);
    ng.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 0.3);
  }

  freeze() {
    if (!this.ctx) return;
    this.playSfx(1200, 'sine', 0.3, 0.2);
    this.playSfx(1800, 'triangle', 0.2, 0.15);
    this.playSfx(900, 'sine', 0.4, 0.1);
  }

  miss() {
    if (!this.ctx) return;
    this.playSfx(300, 'sawtooth', 0.3, 0.2);
    this.playSfx(200, 'sawtooth', 0.2, 0.15);
  }

  launch() {
    if (!this.ctx) return;
    this.playSfx(180, 'triangle', 0.15, 0.1);
  }

  buttonClick() {
    this.playSfx(880, 'sine', 0.08, 0.15, false);
  }

  achievement() {
    if (!this.ctx) return;
    const notes = [660, 880, 1100, 1320, 1540];
    notes.forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.2, 0.2, false), i * 60));
  }

  countdownTick() {
    this.playSfx(440, 'sine', 0.1, 0.2, false);
  }

  countdownGo() {
    this.playSfx(880, 'sine', 0.2, 0.3, false);
    this.playSfx(1100, 'triangle', 0.15, 0.2, false);
  }

  gameStart() {
    const notes = [440, 550, 660, 880];
    notes.forEach((f, i) => setTimeout(() => this.playSfx(f, 'triangle', 0.15, 0.2, false), i * 80));
  }

  gameOver() {
    const notes = [660, 550, 440, 330];
    notes.forEach((f, i) => setTimeout(() => this.playSfx(f, 'triangle', 0.2, 0.2, false), i * 120));
  }

  startDrone() {
    if (!this.ctx || !this.musicGain) return;
    this.stopDrone();
    const t = this.ctx.currentTime;
    const makeOsc = (freq: number, type: OscillatorType, vol: number) => {
      const osc = this.ctx!.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const g = this.ctx!.createGain();
      g.gain.value = vol;
      const lp = this.ctx!.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 400;
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.musicGain!);
      osc.start(t);
      this.droneOscs.push(osc);
    };
    makeOsc(55, 'sine', 0.08);
    makeOsc(82.5, 'triangle', 0.05);
    makeOsc(110, 'sine', 0.03);
    // LFO
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    const lfoG = this.ctx.createGain();
    lfoG.gain.value = 0.02;
    lfo.connect(lfoG);
    if (this.droneOscs[0]) lfoG.connect(this.droneOscs[0].frequency);
    lfo.start(t);
    this.droneOscs.push(lfo);
  }

  stopDrone() {
    this.droneOscs.forEach(o => { try { o.stop(); } catch {} });
    this.droneOscs = [];
  }
}


// ============================================================
// MAIN GAME
// ============================================================
async function main() {
  const container = document.getElementById('app') as HTMLDivElement;
  const world = await World.create(container, {
    xr: { offer: 'once' as const },
    input: { canvasPointerEvents: true },
    features: {
      grabbing: false,
      locomotion: false,
      physics: false,
      spatialUI: true,
    },
    render: {
      near: 0.01,
      far: 200,
      camera: { position: [0, 1.6, 0], lookAt: [0, 1.5, -2] },
    },
  } as any);

  const audio = new AudioManager();
  const save = loadSave();
  let themeIdx = save.settings.themeIdx;
  let skinIdx = save.settings.skinIdx;

  // ---- State ----
  let gameState: GameState = 'title';
  let prevState: GameState = 'title';
  let gameMode: GameMode = 'classic';
  let difficulty: Difficulty = 'medium';
  let score = 0;
  let lives = 3;
  let combo = 0;
  let bestCombo = 0;
  let sliceCount = 0;
  let missCount = 0;
  let bombsHit = 0;
  let bombsDodged = 0;
  let freezeCount = 0;
  let totalSpawned = 0;
  let lastSliceTime = 0;
  let gameTime = 0;
  let gameTimer = 0; // for timed modes
  let waveNum = 0;
  let waveTimer = 0;
  let waveDelay = 0;
  let waveActive = false;
  let countdownTimer = 0;
  let countdownNum = 3;
  let toastTimer = 0;
  let toastText = '';
  let freezeTimer = 0; // slow-mo from freeze orbs
  let sessionStart = 0;
  let sliceStreak = 0; // consecutive slices without miss
  let slicesInWindow: number[] = []; // timestamps for speed_slice achievement
  let dailyRng: (() => number) | null = null;
  let survivalSpeedMult = 1;
  let gamePaused = false;
  let achPage = 0;

  // ---- Holodeck Environment ----
  const theme = () => THEMES[themeIdx];

  function applyTheme() {
    const t = theme();
    world.scene.fog = new Fog(t.fog, 8, 30);
    world.scene.background = new Color(t.bg);
    // update grid, lights, etc
    if (gridFloor) (gridFloor.material as MeshBasicMaterial).color.set(t.grid);
    if (gridCeiling) (gridCeiling.material as MeshBasicMaterial).color.set(t.grid);
    ambientLight.color.set('#333333');
    accentLight1.color.set(t.grid);
    accentLight2.color.set(t.accent);
    // update floating decorations
    floatingDecos.forEach((d, i) => {
      const c = i % 2 === 0 ? t.grid : t.accent;
      (d.children[0] as LineSegments).material = new LineBasicMaterial({ color: c, transparent: true, opacity: 0.4 });
    });
  }

  // Grid floor
  const gridGeo = new PlaneGeometry(20, 20, 20, 20);
  const gridFloor = new Mesh(gridGeo, new MeshBasicMaterial({ color: theme().grid, wireframe: true, transparent: true, opacity: 0.15 }));
  gridFloor.rotation.x = -Math.PI / 2;
  gridFloor.position.y = 0;
  world.scene.add(gridFloor);

  // Grid ceiling
  const gridCeiling = new Mesh(new PlaneGeometry(20, 20, 20, 20), new MeshBasicMaterial({ color: theme().grid, wireframe: true, transparent: true, opacity: 0.08 }));
  gridCeiling.rotation.x = Math.PI / 2;
  gridCeiling.position.y = 4;
  world.scene.add(gridCeiling);

  // Lights
  const ambientLight = new AmbientLight('#333333', 0.8);
  world.scene.add(ambientLight);
  const accentLight1 = new PointLight(theme().grid, 2, 15);
  accentLight1.position.set(-3, 3, -3);
  world.scene.add(accentLight1);
  const accentLight2 = new PointLight(theme().accent, 1.5, 15);
  accentLight2.position.set(3, 2, -4);
  world.scene.add(accentLight2);
  const dirLight = new DirectionalLight('#ffffff', 0.3);
  dirLight.position.set(0, 5, 2);
  world.scene.add(dirLight);

  // Floating wireframe decorations
  const floatingDecos: Group[] = [];
  const decoGeos = [
    new TorusGeometry(0.3, 0.1, 8, 12),
    new BoxGeometry(0.4, 0.4, 0.4),
    new SphereGeometry(0.25, 8, 6),
    new ConeGeometry(0.2, 0.5, 6),
  ];
  for (let i = 0; i < 14; i++) {
    const g = new Group();
    const geo = decoGeos[i % decoGeos.length];
    const edges = new EdgesGeometry(geo);
    const line = new LineSegments(edges, new LineBasicMaterial({ color: i % 2 === 0 ? theme().grid : theme().accent, transparent: true, opacity: 0.4 }));
    g.add(line);
    g.position.set((Math.random() - 0.5) * 16, 0.5 + Math.random() * 3, -3 + (Math.random() - 0.5) * 14);
    g.userData.bobSpeed = 0.3 + Math.random() * 0.5;
    g.userData.bobPhase = Math.random() * Math.PI * 2;
    g.userData.rotSpeed = 0.2 + Math.random() * 0.4;
    world.scene.add(g);
    floatingDecos.push(g);
  }

  // Ambient particles
  const ambientParticles: Mesh[] = [];
  for (let i = 0; i < 40; i++) {
    const m = new Mesh(new SphereGeometry(0.02, 4, 3), new MeshBasicMaterial({ color: theme().grid, transparent: true, opacity: 0.3, blending: AdditiveBlending }));
    m.position.set((Math.random() - 0.5) * 14, Math.random() * 3.5, -2 + (Math.random() - 0.5) * 12);
    m.userData.driftX = (Math.random() - 0.5) * 0.1;
    m.userData.driftY = (Math.random() - 0.5) * 0.05;
    m.userData.phase = Math.random() * Math.PI * 2;
    world.scene.add(m);
    ambientParticles.push(m);
  }

  // ---- Particle System ----
  const particlePool: Particle[] = [];
  const particleGeo = new SphereGeometry(0.015, 4, 3);
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const m = new Mesh(particleGeo, new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 1, blending: AdditiveBlending }));
    m.visible = false;
    world.scene.add(m);
    particlePool.push({ mesh: m, velocity: new Vector3(), age: 0, maxAge: 0.6, active: false });
  }

  function spawnParticles(pos: Vector3, count: number, color: string, speed = 3) {
    let spawned = 0;
    for (const p of particlePool) {
      if (p.active) continue;
      if (spawned >= count) break;
      p.active = true;
      p.age = 0;
      p.maxAge = 0.4 + Math.random() * 0.4;
      p.mesh.visible = true;
      p.mesh.position.copy(pos);
      (p.mesh.material as MeshBasicMaterial).color.set(color);
      (p.mesh.material as MeshBasicMaterial).opacity = 1;
      const dir = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      p.velocity.copy(dir).multiplyScalar(speed * (0.5 + Math.random()));
      spawned++;
    }
  }

  function updateParticles(dt: number) {
    for (const p of particlePool) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.velocity.y += GRAVITY * 0.3 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      (p.mesh.material as MeshBasicMaterial).opacity = 1 - p.age / p.maxAge;
      p.mesh.scale.setScalar(1 - p.age / p.maxAge * 0.5);
    }
  }

  // ---- Object Pool ----
  const objPool: FlyingObj[] = [];
  function createObjMesh(type: ObjType): { group: Group; innerMesh: Mesh; wireMesh: LineSegments; glowMesh: Mesh } {
    const cfg = OBJ_CONFIGS[type];
    const group = new Group();
    let geo: any;
    switch (type) {
      case 'cube':    geo = new BoxGeometry(0.18, 0.18, 0.18); break;
      case 'sphere':  geo = new SphereGeometry(0.1, 10, 8); break;
      case 'diamond': geo = new OctahedronGeometry(0.12); break;
      case 'star':    geo = new ConeGeometry(0.1, 0.22, 5); break;
      case 'bomb':    geo = new IcosahedronGeometry(0.13); break;
      case 'freeze':  geo = new TorusKnotGeometry(0.07, 0.03, 30, 6); break;
    }
    const mat = new MeshStandardMaterial({ color: cfg.color, emissive: cfg.emissive, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.3 });
    const innerMesh = new Mesh(geo, mat);
    group.add(innerMesh);
    const edges = new EdgesGeometry(geo);
    const wireMesh = new LineSegments(edges, new LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.8 }));
    group.add(wireMesh);
    const glowGeo = new SphereGeometry(cfg.radius * 1.6, 8, 6);
    const glowMesh = new Mesh(glowGeo, new MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.15, blending: AdditiveBlending }));
    group.add(glowMesh);
    return { group, innerMesh, wireMesh, glowMesh };
  }

  // Pre-create pool
  const objTypes: ObjType[] = ['cube', 'sphere', 'diamond', 'star', 'bomb', 'freeze'];
  for (let i = 0; i < OBJ_POOL_SIZE; i++) {
    const type = objTypes[i % objTypes.length];
    const { group, innerMesh, wireMesh, glowMesh } = createObjMesh(type);
    group.visible = false;
    world.scene.add(group);
    objPool.push({
      group, innerMesh, wireMesh, glowMesh, type,
      radius: OBJ_CONFIGS[type].radius,
      points: OBJ_CONFIGS[type].points,
      velocity: new Vector3(), angVel: new Vector3(),
      active: false, age: 0,
    });
  }

  function getPoolObj(type: ObjType): FlyingObj | null {
    // Find inactive obj of matching type, or reconfigure one
    let obj = objPool.find(o => !o.active && o.type === type);
    if (!obj) {
      obj = objPool.find(o => !o.active);
      if (obj) {
        // Reconfigure
        world.scene.remove(obj.group);
        const { group, innerMesh, wireMesh, glowMesh } = createObjMesh(type);
        group.visible = false;
        world.scene.add(group);
        obj.group = group;
        obj.innerMesh = innerMesh;
        obj.wireMesh = wireMesh;
        obj.glowMesh = glowMesh;
        obj.type = type;
        obj.radius = OBJ_CONFIGS[type].radius;
        obj.points = OBJ_CONFIGS[type].points;
      }
    }
    return obj || null;
  }

  function launchObj(type: ObjType, rng?: () => number) {
    const r = rng || Math.random;
    const obj = getPoolObj(type);
    if (!obj) return;
    obj.active = true;
    obj.age = 0;
    // Spawn below view
    const x = (r() - 0.5) * 2.2;
    const startY = -0.5;
    const z = -1.8 - r() * 0.8;
    obj.group.position.set(x, startY, z);
    // Launch velocity
    const diffMult = difficulty === 'easy' ? 0.8 : difficulty === 'hard' ? 1.3 : 1.0;
    const vy = (4.5 + r() * 2.5) * diffMult;
    const vx = (r() - 0.5) * 2.5;
    const vz = (r() - 0.5) * 0.6;
    obj.velocity.set(vx, vy, vz);
    obj.angVel.set((r() - 0.5) * 4, (r() - 0.5) * 4, (r() - 0.5) * 4);
    obj.group.visible = true;
    obj.group.scale.setScalar(1);
    obj.innerMesh.material = new MeshStandardMaterial({
      color: OBJ_CONFIGS[type].color, emissive: OBJ_CONFIGS[type].emissive,
      emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.3,
    });
    (obj.glowMesh.material as MeshBasicMaterial).opacity = 0.15;
    totalSpawned++;
    audio.launch();
  }

  // ---- Sliced Halves ----
  const slicedHalves: SlicedHalf[] = [];

  function createSliceHalves(obj: FlyingObj, sliceDir: Vector3) {
    const cfg = OBJ_CONFIGS[obj.type];
    const normal = new Vector3().crossVectors(sliceDir, new Vector3(0, 0, 1)).normalize();
    if (normal.length() < 0.01) normal.set(1, 0, 0);

    for (let side = 0; side < 2; side++) {
      const halfGroup = new Group();
      // Clone the inner mesh appearance
      let geo: any;
      switch (obj.type) {
        case 'cube':    geo = new BoxGeometry(0.18, 0.18, 0.09); break;
        case 'sphere':  geo = new SphereGeometry(0.1, 10, 8, 0, Math.PI); break;
        case 'diamond': geo = new OctahedronGeometry(0.12); break;
        case 'star':    geo = new ConeGeometry(0.1, 0.11, 5); break;
        case 'bomb':    geo = new IcosahedronGeometry(0.13); break;
        case 'freeze':  geo = new TorusKnotGeometry(0.07, 0.03, 15, 4); break;
      }
      const mat = new MeshStandardMaterial({ color: cfg.color, emissive: cfg.emissive, emissiveIntensity: 0.6, transparent: true, opacity: 0.9, metalness: 0.5, roughness: 0.3 });
      const mesh = new Mesh(geo, mat);
      halfGroup.add(mesh);
      const edges = new EdgesGeometry(geo);
      halfGroup.add(new LineSegments(edges, new LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.6 })));

      halfGroup.position.copy(obj.group.position);
      halfGroup.rotation.copy(obj.group.rotation);
      world.scene.add(halfGroup);

      const dir = side === 0 ? normal.clone() : normal.clone().negate();
      const vel = obj.velocity.clone().add(dir.multiplyScalar(1.5 + Math.random()));
      vel.y += (Math.random() - 0.5) * 2;

      slicedHalves.push({
        mesh: halfGroup,
        position: halfGroup.position,
        velocity: vel,
        angVel: new Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6),
        age: 0,
        maxAge: HALF_LIFETIME,
      });
    }
  }

  function updateSlicedHalves(dt: number) {
    for (let i = slicedHalves.length - 1; i >= 0; i--) {
      const h = slicedHalves[i];
      h.age += dt;
      if (h.age >= h.maxAge) {
        world.scene.remove(h.mesh);
        slicedHalves.splice(i, 1);
        continue;
      }
      h.velocity.y += GRAVITY * dt;
      h.position.addScaledVector(h.velocity, dt);
      h.mesh.rotation.x += h.angVel.x * dt;
      h.mesh.rotation.y += h.angVel.y * dt;
      h.mesh.rotation.z += h.angVel.z * dt;
      const alpha = 1 - h.age / h.maxAge;
      h.mesh.children.forEach(c => {
        if ((c as any).material) {
          (c as any).material.opacity = alpha;
        }
      });
      h.mesh.scale.setScalar(1 - h.age / h.maxAge * 0.3);
    }
  }

  // ---- Blade System ----
  const bladeSkin = () => BLADE_SKINS[skinIdx];

  // VR blades - one per hand
  const bladeRight = new Group();
  const bladeLeft = new Group();

  function createBladeMesh(bladeGroup: Group) {
    bladeGroup.children.forEach(c => bladeGroup.remove(c));
    const skin = bladeSkin();
    // Blade shaft
    const shaftGeo = new CylinderGeometry(0.006, 0.004, 0.55, 6);
    const shaftMat = new MeshStandardMaterial({ color: skin.color, emissive: skin.emissive, emissiveIntensity: 1.2, metalness: 0.8, roughness: 0.2 });
    const shaft = new Mesh(shaftGeo, shaftMat);
    shaft.position.y = 0.3;
    bladeGroup.add(shaft);
    // Glow
    const glowGeo = new CylinderGeometry(0.025, 0.015, 0.55, 6);
    const glowMat = new MeshBasicMaterial({ color: skin.glow, transparent: true, opacity: 0.2, blending: AdditiveBlending });
    const glow = new Mesh(glowGeo, glowMat);
    glow.position.y = 0.3;
    bladeGroup.add(glow);
    // Handle
    const handleGeo = new CylinderGeometry(0.015, 0.012, 0.08, 6);
    const handleMat = new MeshStandardMaterial({ color: '#444444', emissive: skin.emissive, emissiveIntensity: 0.3, metalness: 0.9, roughness: 0.1 });
    const handle = new Mesh(handleGeo, handleMat);
    handle.position.y = 0.02;
    bladeGroup.add(handle);
    // Tip glow
    const tipGeo = new SphereGeometry(0.012, 6, 4);
    const tipMat = new MeshBasicMaterial({ color: skin.glow, transparent: true, opacity: 0.6, blending: AdditiveBlending });
    const tip = new Mesh(tipGeo, tipMat);
    tip.position.y = 0.575;
    bladeGroup.add(tip);
  }

  createBladeMesh(bladeRight);
  createBladeMesh(bladeLeft);
  bladeRight.visible = false;
  bladeLeft.visible = false;
  world.scene.add(bladeRight);
  world.scene.add(bladeLeft);

  // Browser blade
  const browserBlade = new Group();
  createBladeMesh(browserBlade);
  browserBlade.visible = false;
  world.scene.add(browserBlade);

  // Blade trails
  const trailRight: BladeTrailPt[] = [];
  const trailLeft: BladeTrailPt[] = [];
  const trailBrowser: BladeTrailPt[] = [];

  // Trail mesh helpers
  function createTrailLine(): { line: LineSegments; geo: BufferGeometry } {
    const geo = new BufferGeometry();
    const positions = new Float32Array(TRAIL_MAX_POINTS * 6);
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const mat = new LineBasicMaterial({ color: bladeSkin().glow, transparent: true, opacity: 0.5, blending: AdditiveBlending });
    const line = new LineSegments(geo, mat);
    world.scene.add(line);
    return { line, geo };
  }

  const trailLineR = createTrailLine();
  const trailLineL = createTrailLine();
  const trailLineB = createTrailLine();

  function updateTrailLine(trail: BladeTrailPt[], tl: { line: LineSegments; geo: BufferGeometry }, dt: number) {
    // Age out old points
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].age += dt;
      if (trail[i].age > 0.3) trail.splice(i, 1);
    }
    // Update geometry
    const positions = tl.geo.attributes.position as any;
    let idx = 0;
    for (let i = 0; i < trail.length - 1 && idx < TRAIL_MAX_POINTS * 6; i++) {
      positions.array[idx++] = trail[i].pos.x;
      positions.array[idx++] = trail[i].pos.y;
      positions.array[idx++] = trail[i].pos.z;
      positions.array[idx++] = trail[i + 1].pos.x;
      positions.array[idx++] = trail[i + 1].pos.y;
      positions.array[idx++] = trail[i + 1].pos.z;
    }
    for (let i = idx; i < TRAIL_MAX_POINTS * 6; i++) positions.array[i] = 0;
    positions.needsUpdate = true;
    tl.geo.setDrawRange(0, idx / 3);
    (tl.line.material as LineBasicMaterial).color.set(bladeSkin().glow);
  }

  // Track blade tip positions for slice detection
  const prevTipRight = new Vector3();
  const prevTipLeft = new Vector3();
  const prevTipBrowser = new Vector3();
  const currTipRight = new Vector3();
  const currTipLeft = new Vector3();
  const currTipBrowser = new Vector3();
  let tipRightValid = false;
  let tipLeftValid = false;
  let tipBrowserValid = false;

  // Browser mouse tracking
  const mousePos = new Vector2();
  const mouseWorld = new Vector3();
  const raycaster = new Raycaster();
  let mouseActive = false;

  // Setup mouse listeners
  const canvas = container.querySelector('canvas');
  if (canvas) {
    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouseActive = true;
    });
    canvas.addEventListener('mouseleave', () => { mouseActive = false; });
  }

  // Keyboard
  const keys: Record<string, boolean> = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Escape') handlePause();
    if (e.code === 'KeyR' && gameState === 'gameOver') startRematch();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  // ---- UI Panel System ----
  interface PanelRef {
    entity: any;
    doc: UIKitDocument | null;
  }

  const panels: Record<string, PanelRef> = {};

  function createWorldPanel(config: string, maxW: number, maxH: number, pos: [number, number, number]): PanelRef {
    const entity = world.createTransformEntity(undefined, { persistent: true });
    entity.object3D.position.set(...pos);
    entity.addComponent(PanelUI, { config, maxWidth: maxW, maxHeight: maxH });
    entity.object3D.visible = false;
    return { entity, doc: null };
  }

  function createFollowerPanel(config: string, maxW: number, maxH: number, offset: [number, number, number]): PanelRef {
    const entity = world.createTransformEntity(undefined, { persistent: true });
    entity.addComponent(PanelUI, { config, maxWidth: maxW, maxHeight: maxH });
    entity.addComponent(Follower, {
      target: world.player.head,
      offsetPosition: offset,
      behavior: FollowBehavior.PivotY,
      speed: 5,
      tolerance: 0.3,
    });
    entity.object3D.visible = false;
    return { entity, doc: null };
  }

  // Create all panels
  panels.title        = createWorldPanel('/ui/title.json', 0.8, 1.2, [0, 1.5, -2.5]);
  panels.modeSelect   = createWorldPanel('/ui/modeselect.json', 0.8, 1.3, [0, 1.5, -2.5]);
  panels.difficulty    = createWorldPanel('/ui/difficulty.json', 0.6, 0.8, [0, 1.5, -2.5]);
  panels.pause         = createWorldPanel('/ui/pause.json', 0.6, 0.6, [0, 1.5, -2]);
  panels.gameOver      = createWorldPanel('/ui/gameover.json', 0.8, 1.1, [0, 1.5, -2.5]);
  panels.leaderboard   = createWorldPanel('/ui/leaderboard.json', 0.9, 1.3, [0, 1.5, -2.5]);
  panels.achievements  = createWorldPanel('/ui/achievements.json', 0.9, 1.4, [0, 1.5, -2.5]);
  panels.settings      = createWorldPanel('/ui/settings.json', 0.8, 1.1, [0, 1.5, -2.5]);
  panels.help          = createWorldPanel('/ui/help.json', 0.8, 1.4, [0, 1.5, -2.5]);
  panels.skins         = createWorldPanel('/ui/skins.json', 0.7, 1.1, [0, 1.5, -2.5]);
  panels.stats         = createWorldPanel('/ui/stats.json', 0.8, 1.2, [0, 1.5, -2.5]);
  panels.hud           = createFollowerPanel('/ui/hud.json', 0.35, 0.2, [0.3, -0.15, -0.5]);
  panels.combo         = createFollowerPanel('/ui/combo.json', 0.15, 0.08, [-0.25, 0, -0.5]);
  panels.toast         = createFollowerPanel('/ui/toast.json', 0.3, 0.06, [0, 0.15, -0.5]);
  panels.countdown     = createFollowerPanel('/ui/countdown.json', 0.2, 0.15, [0, 0, -0.6]);

  function showPanel(name: string) {
    const p = panels[name];
    if (p) p.entity.object3D.visible = true;
  }

  function hidePanel(name: string) {
    const p = panels[name];
    if (p) p.entity.object3D.visible = false;
  }

  function hideAllPanels() {
    Object.keys(panels).forEach(k => hidePanel(k));
  }

  function getDoc(name: string): UIKitDocument | null {
    const p = panels[name];
    if (!p) return null;
    if (!p.doc) {
      p.doc = p.entity.getValue(PanelDocument, 'document') as UIKitDocument | null;
    }
    return p.doc;
  }

  function setText(doc: UIKitDocument | null, id: string, text: string) {
    if (!doc) return;
    const el = doc.getElementById(id);
    if (el && (el as any).text) (el as any).text.value = text;
  }

  function bindClick(doc: UIKitDocument | null, id: string, fn: () => void) {
    if (!doc) return;
    const el = doc.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }


  // ---- UI Binding (deferred until docs available) ----
  let uiBound = false;
  function tryBindUI() {
    if (uiBound) return;
    const titleDoc = getDoc('title');
    if (!titleDoc) return;
    uiBound = true;
    audio.init();
    audio.setVolumes(save.settings.masterVol, save.settings.sfxVol, save.settings.musicVol);

    // Title
    bindClick(titleDoc, 'btn-play', () => { audio.buttonClick(); switchState('modeSelect'); });
    bindClick(titleDoc, 'btn-scores', () => { audio.buttonClick(); updateLeaderboard(); switchState('leaderboard'); });
    bindClick(titleDoc, 'btn-achievements', () => { audio.buttonClick(); achPage = 0; updateAchievements(); switchState('achievements'); });
    bindClick(titleDoc, 'btn-stats', () => { audio.buttonClick(); updateStats(); switchState('stats'); });
    bindClick(titleDoc, 'btn-skins', () => { audio.buttonClick(); updateSkins(); switchState('skins'); });
    bindClick(titleDoc, 'btn-settings', () => { audio.buttonClick(); updateSettingsUI(); switchState('settings'); });
    bindClick(titleDoc, 'btn-help', () => { audio.buttonClick(); switchState('help'); });

    // Mode select
    const modeDoc = getDoc('modeSelect');
    const modes: [string, GameMode][] = [['btn-classic','classic'],['btn-zen','zen'],['btn-timeattack','timeAttack'],['btn-survival','survival'],['btn-frenzy','frenzy'],['btn-daily','daily']];
    modes.forEach(([id, mode]) => {
      bindClick(modeDoc, id, () => { audio.buttonClick(); gameMode = mode; switchState('difficulty'); });
    });
    bindClick(modeDoc, 'btn-back-mode', () => { audio.buttonClick(); switchState('title'); });

    // Difficulty
    const diffDoc = getDoc('difficulty');
    const diffs: [string, Difficulty][] = [['btn-easy','easy'],['btn-medium','medium'],['btn-hard','hard']];
    diffs.forEach(([id, diff]) => {
      bindClick(diffDoc, id, () => { audio.buttonClick(); difficulty = diff; startCountdown(); });
    });
    bindClick(diffDoc, 'btn-back-diff', () => { audio.buttonClick(); switchState('modeSelect'); });

    // Pause
    const pauseDoc = getDoc('pause');
    bindClick(pauseDoc, 'btn-resume', () => { audio.buttonClick(); switchState('playing'); });
    bindClick(pauseDoc, 'btn-quit', () => { audio.buttonClick(); endGame(); });

    // Game over
    const goDoc = getDoc('gameOver');
    bindClick(goDoc, 'btn-rematch', () => { audio.buttonClick(); startCountdown(); });
    bindClick(goDoc, 'btn-title', () => { audio.buttonClick(); switchState('title'); });

    // Leaderboard
    bindClick(getDoc('leaderboard'), 'btn-back-lb', () => { audio.buttonClick(); switchState('title'); });

    // Achievements
    const achDoc = getDoc('achievements');
    bindClick(achDoc, 'ach-prev', () => { if (achPage > 0) { achPage--; updateAchievements(); } });
    bindClick(achDoc, 'ach-next', () => {
      if ((achPage + 1) * 15 < ACHIEVEMENTS.length) { achPage++; updateAchievements(); }
    });
    bindClick(achDoc, 'btn-back-ach', () => { audio.buttonClick(); switchState('title'); });

    // Settings
    const setDoc = getDoc('settings');
    bindClick(setDoc, 'vol-master-up', () => { save.settings.masterVol = Math.min(100, save.settings.masterVol + 10); updateSettingsUI(); applyVolumes(); });
    bindClick(setDoc, 'vol-master-down', () => { save.settings.masterVol = Math.max(0, save.settings.masterVol - 10); updateSettingsUI(); applyVolumes(); });
    bindClick(setDoc, 'vol-sfx-up', () => { save.settings.sfxVol = Math.min(100, save.settings.sfxVol + 10); updateSettingsUI(); applyVolumes(); });
    bindClick(setDoc, 'vol-sfx-down', () => { save.settings.sfxVol = Math.max(0, save.settings.sfxVol - 10); updateSettingsUI(); applyVolumes(); });
    bindClick(setDoc, 'vol-music-up', () => { save.settings.musicVol = Math.min(100, save.settings.musicVol + 10); updateSettingsUI(); applyVolumes(); });
    bindClick(setDoc, 'vol-music-down', () => { save.settings.musicVol = Math.max(0, save.settings.musicVol - 10); updateSettingsUI(); applyVolumes(); });
    bindClick(setDoc, 'theme-prev', () => { themeIdx = (themeIdx - 1 + THEMES.length) % THEMES.length; save.settings.themeIdx = themeIdx; updateSettingsUI(); applyTheme(); saveSave(save); });
    bindClick(setDoc, 'theme-next', () => { themeIdx = (themeIdx + 1) % THEMES.length; save.settings.themeIdx = themeIdx; updateSettingsUI(); applyTheme(); saveSave(save); });
    bindClick(setDoc, 'btn-back-settings', () => { audio.buttonClick(); saveSave(save); switchState('title'); });

    // Help
    bindClick(getDoc('help'), 'btn-back-help', () => { audio.buttonClick(); switchState('title'); });

    // Skins
    const skinDoc = getDoc('skins');
    for (let i = 1; i <= 8; i++) {
      const idx = i - 1;
      bindClick(skinDoc, `skin-${i}`, () => {
        if (isSkinUnlocked(idx)) {
          skinIdx = idx;
          save.settings.skinIdx = skinIdx;
          saveSave(save);
          createBladeMesh(bladeRight);
          createBladeMesh(bladeLeft);
          createBladeMesh(browserBlade);
          updateSkins();
          audio.buttonClick();
        }
      });
    }
    bindClick(skinDoc, 'btn-back-skins', () => { audio.buttonClick(); switchState('title'); });

    // Stats
    bindClick(getDoc('stats'), 'btn-back-stats', () => { audio.buttonClick(); switchState('title'); });
  }

  function applyVolumes() {
    audio.setVolumes(save.settings.masterVol, save.settings.sfxVol, save.settings.musicVol);
    saveSave(save);
  }

  function isSkinUnlocked(idx: number): boolean {
    if (idx === 0) return true; // default
    const s = save.career;
    switch (idx) {
      case 1: return s.totalSlices >= 50;
      case 2: return s.bestScore >= 5000;
      case 3: return s.games >= 10;
      case 4: return s.bestCombo >= 5;
      case 5: return save.achievements.includes('classic_win');
      case 6: return s.totalShots > 0 && (s.totalSlices / s.totalShots) >= 0.8;
      case 7: return s.modesPlayed.length >= 6;
      default: return false;
    }
  }

  // ---- UI Update Functions ----
  function updateHUD() {
    const doc = getDoc('hud');
    if (!doc) return;
    const modeNames: Record<GameMode, string> = { classic: 'CLASSIC', zen: 'ZEN', timeAttack: 'TIME ATTACK', survival: 'SURVIVAL', frenzy: 'FRENZY', daily: 'DAILY' };
    setText(doc, 'hud-mode', modeNames[gameMode]);
    setText(doc, 'hud-score', score.toString());
    setText(doc, 'hud-combo', `x${combo + 1}`);
    setText(doc, 'hud-lives', lives >= 0 ? lives.toString() : '--');
    if (gameMode === 'timeAttack' || gameMode === 'frenzy') {
      setText(doc, 'hud-time', Math.max(0, Math.ceil(gameTimer)).toString() + 's');
    } else if (gameMode === 'survival') {
      setText(doc, 'hud-time', Math.floor(gameTime).toString() + 's');
    } else {
      setText(doc, 'hud-time', '--');
    }
    setText(doc, 'hud-slices', sliceCount.toString());
    setText(doc, 'hud-best', `x${bestCombo + 1}`);
  }

  function updateComboDisplay() {
    const doc = getDoc('combo');
    if (!doc) return;
    setText(doc, 'combo-text', `x${combo + 1}`);
    panels.combo.entity.object3D.visible = gameState === 'playing' && combo > 0;
  }

  function showToast(text: string, dur = 2) {
    toastText = text;
    toastTimer = dur;
    const doc = getDoc('toast');
    setText(doc, 'toast-text', text);
    showPanel('toast');
  }

  function updateLeaderboard() {
    const doc = getDoc('leaderboard');
    if (!doc) return;
    for (let i = 1; i <= 10; i++) {
      const entry = save.leaderboard[i - 1];
      if (entry) {
        setText(doc, `lb-${i}-score`, entry.score.toString());
        setText(doc, `lb-${i}-mode`, entry.mode.toUpperCase());
        setText(doc, `lb-${i}-date`, entry.date);
      } else {
        setText(doc, `lb-${i}-score`, '-');
        setText(doc, `lb-${i}-mode`, '-');
        setText(doc, `lb-${i}-date`, '-');
      }
    }
  }

  function updateAchievements() {
    const doc = getDoc('achievements');
    if (!doc) return;
    const perPage = 15;
    const start = achPage * perPage;
    for (let i = 1; i <= perPage; i++) {
      const ach = ACHIEVEMENTS[start + i - 1];
      if (ach) {
        const done = save.achievements.includes(ach.id);
        setText(doc, `ach-${i}-check`, done ? '[X]' : '[ ]');
        setText(doc, `ach-${i}-name`, ach.name);
        setText(doc, `ach-${i}-desc`, ach.desc);
      } else {
        setText(doc, `ach-${i}-check`, '');
        setText(doc, `ach-${i}-name`, '');
        setText(doc, `ach-${i}-desc`, '');
      }
    }
    const totalPages = Math.ceil(ACHIEVEMENTS.length / perPage);
    setText(doc, 'ach-page', `${achPage + 1}/${totalPages}`);
  }

  function updateStats() {
    const doc = getDoc('stats');
    if (!doc) return;
    const s = save.career;
    setText(doc, 'stat-games', s.games.toString());
    setText(doc, 'stat-slices', s.totalSlices.toString());
    setText(doc, 'stat-best', s.bestScore.toString());
    setText(doc, 'stat-total', s.totalScore.toString());
    setText(doc, 'stat-combo', `x${s.bestCombo + 1}`);
    const acc = s.totalShots > 0 ? Math.round(s.totalSlices / s.totalShots * 100) : 0;
    setText(doc, 'stat-accuracy', `${acc}%`);
    setText(doc, 'stat-bombs', s.totalBombs.toString());
    setText(doc, 'stat-achievements', `${save.achievements.length}/${ACHIEVEMENTS.length}`);
    const mins = Math.round(s.playTimeMs / 60000);
    setText(doc, 'stat-time', `${mins}m`);
    setText(doc, 'stat-misses', s.totalMisses.toString());
  }

  function updateSkins() {
    const doc = getDoc('skins');
    if (!doc) return;
    for (let i = 1; i <= 8; i++) {
      const idx = i - 1;
      const unlocked = isSkinUnlocked(idx);
      const equipped = skinIdx === idx;
      setText(doc, `skin-${i}-name`, BLADE_SKINS[idx].name);
      setText(doc, `skin-${i}-status`, equipped ? 'EQUIPPED' : unlocked ? 'Available' : `Locked: ${BLADE_SKINS[idx].unlock}`);
    }
  }

  function updateSettingsUI() {
    const doc = getDoc('settings');
    if (!doc) return;
    setText(doc, 'vol-master', save.settings.masterVol.toString());
    setText(doc, 'vol-sfx', save.settings.sfxVol.toString());
    setText(doc, 'vol-music', save.settings.musicVol.toString());
    setText(doc, 'theme-name', THEMES[themeIdx].name);
  }

  function updateGameOverUI() {
    const doc = getDoc('gameOver');
    if (!doc) return;
    setText(doc, 'go-score', score.toString());
    setText(doc, 'go-slices', sliceCount.toString());
    setText(doc, 'go-combo', `x${bestCombo + 1}`);
    const acc = totalSpawned > 0 ? Math.round(sliceCount / totalSpawned * 100) : 0;
    setText(doc, 'go-accuracy', `${acc}%`);
    setText(doc, 'go-misses', missCount.toString());
    setText(doc, 'go-bombs', bombsHit.toString());
  }

  // ---- State Management ----
  function switchState(state: GameState) {
    prevState = gameState;
    gameState = state;
    hideAllPanels();
    switch (state) {
      case 'title': showPanel('title'); break;
      case 'modeSelect': showPanel('modeSelect'); break;
      case 'difficulty': showPanel('difficulty'); break;
      case 'playing':
        showPanel('hud');
        bladeRight.visible = true;
        bladeLeft.visible = true;
        browserBlade.visible = true;
        break;
      case 'paused': showPanel('pause'); showPanel('hud'); break;
      case 'gameOver':
        updateGameOverUI();
        showPanel('gameOver');
        bladeRight.visible = false;
        bladeLeft.visible = false;
        browserBlade.visible = false;
        break;
      case 'leaderboard': showPanel('leaderboard'); break;
      case 'achievements': showPanel('achievements'); break;
      case 'settings': showPanel('settings'); break;
      case 'help': showPanel('help'); break;
      case 'skins': showPanel('skins'); break;
      case 'stats': showPanel('stats'); break;
      case 'countdown': showPanel('countdown'); break;
    }
  }

  function handlePause() {
    if (gameState === 'playing') {
      switchState('paused');
    } else if (gameState === 'paused') {
      switchState('playing');
    }
  }

  // ---- Game Logic ----
  function startCountdown() {
    countdownNum = 3;
    countdownTimer = 0;
    switchState('countdown');
    const doc = getDoc('countdown');
    setText(doc, 'countdown-text', '3');
    audio.countdownTick();
  }

  function startGame() {
    score = 0;
    lives = (gameMode === 'zen' || gameMode === 'timeAttack' || gameMode === 'frenzy') ? -1 : 3;
    combo = 0;
    bestCombo = 0;
    sliceCount = 0;
    missCount = 0;
    bombsHit = 0;
    bombsDodged = 0;
    freezeCount = 0;
    totalSpawned = 0;
    lastSliceTime = 0;
    gameTime = 0;
    waveNum = 0;
    waveTimer = 0;
    waveDelay = 0;
    waveActive = false;
    freezeTimer = 0;
    sliceStreak = 0;
    slicesInWindow = [];
    survivalSpeedMult = 1;
    sessionStart = Date.now();

    if (gameMode === 'timeAttack') gameTimer = 60;
    else if (gameMode === 'frenzy') gameTimer = 30;
    else gameTimer = 0;

    if (gameMode === 'daily') dailyRng = mulberry32(dateSeed());
    else dailyRng = null;

    // Clear active objects
    objPool.forEach(o => { o.active = false; o.group.visible = false; });
    slicedHalves.forEach(h => world.scene.remove(h.mesh));
    slicedHalves.length = 0;

    audio.startDrone();
    audio.gameStart();
    switchState('playing');

    // Record theme usage
    if (!save.career.themesUsed.includes(THEMES[themeIdx].name)) {
      save.career.themesUsed.push(THEMES[themeIdx].name);
    }
    if (!save.career.modesPlayed.includes(gameMode)) {
      save.career.modesPlayed.push(gameMode);
    }
  }

  function startRematch() {
    startCountdown();
  }

  function endGame() {
    audio.stopDrone();
    audio.gameOver();

    // Save stats
    save.career.games++;
    save.career.totalSlices += sliceCount;
    save.career.totalScore += score;
    if (score > save.career.bestScore) save.career.bestScore = score;
    if (bestCombo > save.career.bestCombo) save.career.bestCombo = bestCombo;
    save.career.totalBombs += bombsHit;
    save.career.totalMisses += missCount;
    save.career.totalShots += totalSpawned;
    save.career.playTimeMs += Date.now() - sessionStart;

    // Leaderboard
    const entry: LeaderboardEntry = {
      score, mode: gameMode, slices: sliceCount, combo: bestCombo,
      date: new Date().toLocaleDateString(),
    };
    save.leaderboard.push(entry);
    save.leaderboard.sort((a, b) => b.score - a.score);
    save.leaderboard = save.leaderboard.slice(0, 20);

    // Check achievements
    checkAchievements();
    saveSave(save);

    // Clear objects
    objPool.forEach(o => { o.active = false; o.group.visible = false; });

    switchState('gameOver');
  }

  function checkAchievements() {
    const tryUnlock = (id: string) => {
      if (!save.achievements.includes(id)) {
        save.achievements.push(id);
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        if (ach) {
          showToast(`${ach.name}!`);
          audio.achievement();
        }
        // Check skin_unlock
        if (id !== 'skin_unlock' && save.achievements.length > 0) {
          // Check if any new skin unlocked
          for (let i = 1; i < BLADE_SKINS.length; i++) {
            if (isSkinUnlocked(i) && !save.achievements.includes('skin_unlock')) {
              tryUnlock('skin_unlock');
              break;
            }
          }
        }
      }
    };

    const s = save.career;
    if (s.totalSlices >= 1) tryUnlock('first_slice');
    if (s.totalSlices >= 10) tryUnlock('ten_slices');
    if (s.totalSlices >= 50) tryUnlock('fifty_slices');
    if (s.totalSlices >= 100) tryUnlock('hundred_slices');
    if (s.totalSlices >= 500) tryUnlock('five_hundred');
    if (bestCombo >= 2) tryUnlock('combo_x3');
    if (bestCombo >= 4) tryUnlock('combo_x5');
    if (bestCombo >= 7) tryUnlock('combo_x8');
    if (bestCombo >= 9) tryUnlock('combo_x10');
    if (score >= 1000) tryUnlock('score_1k');
    if (score >= 5000) tryUnlock('score_5k');
    if (score >= 10000) tryUnlock('score_10k');
    if (score >= 25000) tryUnlock('score_25k');
    if (sliceStreak >= 10) tryUnlock('no_miss_10');
    if (sliceStreak >= 25) tryUnlock('no_miss_25');
    if (bombsDodged >= 10) tryUnlock('bomb_dodge');
    if (freezeCount >= 5) tryUnlock('freeze_5');
    const acc = totalSpawned > 0 ? sliceCount / totalSpawned : 0;
    if (acc >= 0.8 && totalSpawned >= 10) tryUnlock('accuracy_80');
    if (acc >= 0.95 && totalSpawned >= 20) tryUnlock('accuracy_95');
    if (s.games >= 10) tryUnlock('games_10');
    if (s.games >= 50) tryUnlock('games_50');
    if (gameMode === 'classic' && lives > 0 && waveNum >= 10) tryUnlock('classic_win');
    if (gameMode === 'survival' && gameTime >= 60) tryUnlock('survival_60');
    if (gameMode === 'frenzy' && score >= 1000) tryUnlock('frenzy_1k');
    if (gameMode === 'daily') tryUnlock('daily_done');
    if (gameMode === 'zen' && sliceCount >= 100) tryUnlock('zen_100');
    if (s.themesUsed.length >= THEMES.length) tryUnlock('theme_explorer');
    if (s.modesPlayed.length >= 6) tryUnlock('speed_slice'); // reuse - actually let's use proper check
  }


  // ---- Slice Detection ----
  let dualSliceFrame = 0; // count simultaneous slices in a frame for dual_slice achievement

  function handleSlice(obj: FlyingObj) {
    if (!obj.active) return;
    obj.active = false;
    obj.group.visible = false;

    if (obj.type === 'bomb') {
      // Bomb hit!
      bombsHit++;
      score = Math.max(0, score + obj.points);
      if (lives > 0) lives--;
      audio.bombHit();
      spawnParticles(obj.group.position.clone(), 20, OBJ_CONFIGS.bomb.color, 5);
      createSliceHalves(obj, new Vector3(0, 1, 0));
      showToast('BOMB!');
      if (lives === 0 && (gameMode === 'classic' || gameMode === 'survival')) {
        endGame();
      }
      sliceStreak = 0;
      return;
    }

    if (obj.type === 'freeze') {
      freezeTimer = 5; // 5 second slow-mo
      freezeCount++;
      audio.freeze();
    }

    const points = obj.points * (combo + 1);
    score += points;
    sliceCount++;
    sliceStreak++;

    // Combo
    lastSliceTime = gameTime;
    combo = Math.min(combo + 1, MAX_COMBO - 1);
    if (combo > bestCombo) bestCombo = combo;

    // Audio
    audio.slice(obj.points);
    if (combo >= 2) audio.sliceCombo(combo);

    // Visual feedback
    const cfg = OBJ_CONFIGS[obj.type];
    spawnParticles(obj.group.position.clone(), 15, cfg.color, 4);
    createSliceHalves(obj, new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize());

    // Speed slice tracking
    const now = gameTime;
    slicesInWindow.push(now);
    slicesInWindow = slicesInWindow.filter(t => now - t <= 2);
    if (slicesInWindow.length >= 5 && !save.achievements.includes('speed_slice')) {
      save.achievements.push('speed_slice');
      showToast('Lightning Blade!');
      audio.achievement();
    }

    // Dual slice tracking
    dualSliceFrame++;

    updateComboDisplay();
    updateHUD();
  }

  function checkSliceDetection(prevTip: Vector3, currTip: Vector3, valid: boolean) {
    if (!valid || gameState !== 'playing') return;
    const tipSpeed = prevTip.distanceTo(currTip) / Math.max(lastDt, 0.001);
    if (tipSpeed < MIN_SLICE_SPEED) return;

    for (const obj of objPool) {
      if (!obj.active) continue;
      // Line segment vs sphere intersection
      const objPos = obj.group.position;
      const d = new Vector3().subVectors(currTip, prevTip);
      const f = new Vector3().subVectors(prevTip, objPos);
      const a = d.dot(d);
      const b = 2 * f.dot(d);
      const r = obj.radius + 0.03; // blade radius
      const c = f.dot(f) - r * r;
      let discriminant = b * b - 4 * a * c;
      if (discriminant >= 0) {
        discriminant = Math.sqrt(discriminant);
        const t1 = (-b - discriminant) / (2 * a);
        const t2 = (-b + discriminant) / (2 * a);
        if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1)) {
          handleSlice(obj);
        }
      }
    }
  }

  // ---- Wave/Spawn System ----
  function getObjTypeForWave(rng: () => number): ObjType {
    const r = rng();
    const hasBombs = gameMode !== 'zen' && gameMode !== 'frenzy';
    const bombChance = difficulty === 'easy' ? 0.08 : difficulty === 'hard' ? 0.2 : 0.13;
    const freezeChance = 0.08;

    if (hasBombs && r < bombChance) return 'bomb';
    if (r < bombChance + freezeChance) return 'freeze';
    const types: ObjType[] = ['cube', 'sphere', 'diamond', 'star'];
    const weights = [0.35, 0.3, 0.2, 0.15];
    const rr = rng();
    let cumul = 0;
    for (let i = 0; i < types.length; i++) {
      cumul += weights[i];
      if (rr < cumul) return types[i];
    }
    return 'cube';
  }

  function spawnWave(count: number, rng?: () => number) {
    const r = rng || Math.random;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (gameState !== 'playing') return;
        const type = getObjTypeForWave(r);
        launchObj(type, r);
      }, i * (100 + Math.random() * 200));
    }
  }

  function getWaveSize(wave: number): number {
    const base = difficulty === 'easy' ? 2 : difficulty === 'hard' ? 4 : 3;
    return Math.min(base + Math.floor(wave / 2), 8);
  }

  function getWaveDelay(): number {
    return difficulty === 'easy' ? 2.5 : difficulty === 'hard' ? 1.2 : 1.8;
  }

  // ---- Object update ----
  function updateObjects(dt: number) {
    const effectiveDt = freezeTimer > 0 ? dt * 0.3 : dt; // slow-mo

    for (const obj of objPool) {
      if (!obj.active) continue;
      obj.age += effectiveDt;

      // Apply gravity
      obj.velocity.y += GRAVITY * effectiveDt;
      obj.group.position.addScaledVector(obj.velocity, effectiveDt);

      // Rotate
      obj.group.rotation.x += obj.angVel.x * effectiveDt;
      obj.group.rotation.y += obj.angVel.y * effectiveDt;
      obj.group.rotation.z += obj.angVel.z * effectiveDt;

      // Pulsing glow
      (obj.glowMesh.material as MeshBasicMaterial).opacity = 0.1 + Math.sin(gameTime * 4) * 0.05;

      // Check if fallen below threshold
      if (obj.group.position.y < -1.5 && obj.velocity.y < 0) {
        obj.active = false;
        obj.group.visible = false;

        // Missed!
        if (obj.type !== 'bomb') {
          missCount++;
          sliceStreak = 0;
          if (gameMode === 'classic' || gameMode === 'survival') {
            if (lives > 0) lives--;
            audio.miss();
            if (lives === 0) {
              endGame();
              return;
            }
          }
        } else {
          // Bomb fell = good
          bombsDodged++;
        }
      }
    }
  }

  // ---- Main Update Loop ----
  let lastDt = 0.016;
  let totalTime = 0;

  function update(dt: number) {
    lastDt = dt;
    totalTime += dt;

    // Try to bind UI
    if (!uiBound) tryBindUI();

    // Update ambient visuals
    floatingDecos.forEach(d => {
      d.rotation.y += (d.userData.rotSpeed as number) * dt;
      d.position.y += Math.sin(totalTime * (d.userData.bobSpeed as number) + (d.userData.bobPhase as number)) * 0.002;
    });
    ambientParticles.forEach(p => {
      p.position.x += (p.userData.driftX as number) * dt;
      p.position.y += (p.userData.driftY as number) * dt;
      (p.material as MeshBasicMaterial).opacity = 0.2 + Math.sin(totalTime * 1.5 + (p.userData.phase as number)) * 0.15;
      if (Math.abs(p.position.x) > 8) p.position.x *= -0.9;
      if (p.position.y > 4 || p.position.y < 0) p.userData.driftY = -(p.userData.driftY as number);
    });

    // Update particles
    updateParticles(dt);
    updateSlicedHalves(dt);

    // Toast timer
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) hidePanel('toast');
    }

    // Countdown
    if (gameState === 'countdown') {
      countdownTimer += dt;
      if (countdownTimer >= 1) {
        countdownTimer -= 1;
        countdownNum--;
        const doc = getDoc('countdown');
        if (countdownNum > 0) {
          setText(doc, 'countdown-text', countdownNum.toString());
          audio.countdownTick();
        } else {
          setText(doc, 'countdown-text', 'SLICE!');
          audio.countdownGo();
          setTimeout(() => startGame(), 300);
        }
      }
      return;
    }

    if (gameState !== 'playing') return;

    // Game time
    const effectiveDt = freezeTimer > 0 ? dt * 0.3 : dt;
    gameTime += effectiveDt;

    // Freeze timer
    if (freezeTimer > 0) {
      freezeTimer -= dt; // real-time countdown
    }

    // Combo decay
    if (combo > 0 && gameTime - lastSliceTime > COMBO_DECAY_TIME) {
      combo = 0;
      updateComboDisplay();
    }

    // Timed modes
    if (gameMode === 'timeAttack' || gameMode === 'frenzy') {
      gameTimer -= dt;
      if (gameTimer <= 0) {
        endGame();
        return;
      }
    }

    // Survival speed increase
    if (gameMode === 'survival') {
      survivalSpeedMult = 1 + gameTime / 30 * 0.5; // +50% every 30s
    }

    // Update blade positions
    updateBlades(dt);

    // Reset dual slice counter
    dualSliceFrame = 0;

    // Slice detection
    checkSliceDetection(prevTipRight, currTipRight, tipRightValid);
    checkSliceDetection(prevTipLeft, currTipLeft, tipLeftValid);
    checkSliceDetection(prevTipBrowser, currTipBrowser, tipBrowserValid);

    // Dual slice achievement
    if (dualSliceFrame >= 2 && !save.achievements.includes('dual_slice')) {
      save.achievements.push('dual_slice');
      showToast('Dual Blade!');
      audio.achievement();
    }

    // Update objects
    updateObjects(dt);

    // Spawn logic
    updateSpawning(dt);

    // Update HUD periodically
    updateHUD();

    // XR controller input
    handleXRInput();
  }

  function updateBlades(dt: number) {
    // VR blade tracking
    const gripSpaces = (world as any).playerSpaceEntities;
    if (gripSpaces && gripSpaces.gripSpaces) {
      const rightGrip = gripSpaces.gripSpaces.right;
      const leftGrip = gripSpaces.gripSpaces.left;

      if (rightGrip && rightGrip.object3D) {
        bladeRight.visible = gameState === 'playing';
        // Position blade at grip
        const worldPos = new Vector3();
        rightGrip.object3D.getWorldPosition(worldPos);
        bladeRight.position.copy(worldPos);
        const worldQuat = new Quaternion();
        rightGrip.object3D.getWorldQuaternion(worldQuat);
        bladeRight.quaternion.copy(worldQuat);
        // Track tip
        prevTipRight.copy(currTipRight);
        const tipLocal = new Vector3(0, 0.575, 0);
        tipLocal.applyQuaternion(worldQuat).add(worldPos);
        currTipRight.copy(tipLocal);
        tipRightValid = true;
        // Trail
        trailRight.push({ pos: currTipRight.clone(), age: 0 });
        if (trailRight.length > TRAIL_MAX_POINTS) trailRight.shift();
      }

      if (leftGrip && leftGrip.object3D) {
        bladeLeft.visible = gameState === 'playing';
        const worldPos = new Vector3();
        leftGrip.object3D.getWorldPosition(worldPos);
        bladeLeft.position.copy(worldPos);
        const worldQuat = new Quaternion();
        leftGrip.object3D.getWorldQuaternion(worldQuat);
        bladeLeft.quaternion.copy(worldQuat);
        prevTipLeft.copy(currTipLeft);
        const tipLocal = new Vector3(0, 0.575, 0);
        tipLocal.applyQuaternion(worldQuat).add(worldPos);
        currTipLeft.copy(tipLocal);
        tipLeftValid = true;
        trailLeft.push({ pos: currTipLeft.clone(), age: 0 });
        if (trailLeft.length > TRAIL_MAX_POINTS) trailLeft.shift();
      }
    }

    // Browser blade - follows mouse
    if (mouseActive && gameState === 'playing') {
      browserBlade.visible = true;
      // Raycast mouse to z=-1.8 plane
      const camera = (world as any).scene?.getObjectByProperty?.('isCamera', true) || null;
      if (camera) {
        raycaster.setFromCamera(mousePos, camera);
        const t = (-1.8 - raycaster.ray.origin.z) / raycaster.ray.direction.z;
        if (t > 0) {
          const hit = raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, t);
          hit.y = Math.max(0, Math.min(hit.y, 3));
          hit.x = Math.max(-2, Math.min(hit.x, 2));
          browserBlade.position.lerp(hit, 0.3);
        }
      }
      prevTipBrowser.copy(currTipBrowser);
      currTipBrowser.copy(browserBlade.position).add(new Vector3(0, 0.575, 0));
      tipBrowserValid = true;
      trailBrowser.push({ pos: currTipBrowser.clone(), age: 0 });
      if (trailBrowser.length > TRAIL_MAX_POINTS) trailBrowser.shift();
    } else {
      browserBlade.visible = false;
      tipBrowserValid = false;
    }

    // Update trail visuals
    updateTrailLine(trailRight, trailLineR, dt);
    updateTrailLine(trailLeft, trailLineL, dt);
    updateTrailLine(trailBrowser, trailLineB, dt);
  }

  function updateSpawning(dt: number) {
    waveTimer += dt;
    const rng = dailyRng || Math.random;

    switch (gameMode) {
      case 'classic': {
        if (waveNum >= 10) {
          // All waves done - check if all objects settled
          const activeCount = objPool.filter(o => o.active).length;
          if (activeCount === 0 && slicedHalves.length === 0) endGame();
          return;
        }
        if (!waveActive && waveTimer >= getWaveDelay()) {
          waveActive = true;
          waveTimer = 0;
          waveNum++;
          const size = getWaveSize(waveNum);
          spawnWave(size, dailyRng || undefined);
        }
        if (waveActive) {
          const activeCount = objPool.filter(o => o.active).length;
          if (activeCount === 0) {
            waveActive = false;
            waveTimer = 0;
          }
        }
        break;
      }

      case 'zen': {
        // Continuous flow, no waves
        if (waveTimer >= (difficulty === 'easy' ? 1.5 : difficulty === 'hard' ? 0.6 : 1.0)) {
          waveTimer = 0;
          const count = 1 + Math.floor(rng() * 2);
          for (let i = 0; i < count; i++) {
            const types: ObjType[] = ['cube', 'sphere', 'diamond', 'star', 'freeze'];
            launchObj(types[Math.floor(rng() * types.length)]);
          }
        }
        break;
      }

      case 'timeAttack': {
        if (waveTimer >= (difficulty === 'easy' ? 1.2 : difficulty === 'hard' ? 0.5 : 0.8)) {
          waveTimer = 0;
          spawnWave(2 + Math.floor(rng() * 3));
        }
        break;
      }

      case 'survival': {
        const interval = Math.max(0.3, 1.5 - gameTime / 60);
        if (waveTimer >= interval) {
          waveTimer = 0;
          const count = Math.min(2 + Math.floor(gameTime / 20), 6);
          spawnWave(count);
        }
        break;
      }

      case 'frenzy': {
        if (waveTimer >= 0.4) {
          waveTimer = 0;
          const count = 2 + Math.floor(rng() * 3);
          const types: ObjType[] = ['cube', 'sphere', 'diamond', 'star'];
          for (let i = 0; i < count; i++) {
            launchObj(types[Math.floor(rng() * types.length)]);
          }
        }
        break;
      }

      case 'daily': {
        if (waveNum >= 15) {
          const activeCount = objPool.filter(o => o.active).length;
          if (activeCount === 0 && slicedHalves.length === 0) endGame();
          return;
        }
        if (!waveActive && waveTimer >= 2.0) {
          waveActive = true;
          waveTimer = 0;
          waveNum++;
          const size = 3 + Math.floor(dailyRng!() * 4);
          spawnWave(size, dailyRng!);
        }
        if (waveActive) {
          const activeCount = objPool.filter(o => o.active).length;
          if (activeCount === 0) {
            waveActive = false;
            waveTimer = 0;
          }
        }
        break;
      }
    }
  }

  function handleXRInput() {
    try {
      const rightGamepad = (world as any).input?.xr?.gamepads?.right;
      if (rightGamepad) {
        if (rightGamepad.getButtonDown?.(InputComponent.A_Button)) {
          // A button - could be used for special actions
        }
        if (rightGamepad.getButtonDown?.(InputComponent.Trigger)) {
          // Trigger - used for menu interaction (handled by PanelUI)
        }
      }
      const leftGamepad = (world as any).input?.xr?.gamepads?.left;
      if (leftGamepad) {
        if (leftGamepad.getButtonDown?.(InputComponent.A_Button)) {
          handlePause();
        }
      }
    } catch {}

    // B button via keyboard for browser
    if ((world as any).input?.keyboard) {
      const kb = (world as any).input.keyboard;
      if (kb.getKeyDown?.('KeyB')) handlePause();
    }
  }

  // ---- Register Update Loop ----
  (world as any).onUpdate = update;
  // Fallback: use requestAnimationFrame if onUpdate not supported
  let lastTime = performance.now();
  function rafLoop(now: number) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (!(world as any)._updateRegistered) update(dt);
    requestAnimationFrame(rafLoop);
  }

  // Try to use world's system registration
  try {
    const UpdateSystem = class {
      static queries = {};
      world: any;
      execute(dt: number) { update(dt / 1000); }
    };
    (world as any).ecs?.registerSystem?.(UpdateSystem);
    (world as any)._updateRegistered = true;
  } catch {
    requestAnimationFrame(rafLoop);
  }

  // ---- Initial State ----
  applyTheme();
  switchState('title');
}

// ============================================================
// ENTRY POINT
// ============================================================
main().catch(console.error);
