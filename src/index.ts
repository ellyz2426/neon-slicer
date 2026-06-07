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
type GameState = 'title' | 'modeSelect' | 'difficulty' | 'playing' | 'paused' | 'gameOver' | 'leaderboard' | 'achievements' | 'settings' | 'help' | 'skins' | 'stats' | 'countdown' | 'modifiers' | 'season' | 'tutorial' | 'challenge' | 'history';
type ObjType = 'cube' | 'sphere' | 'diamond' | 'star' | 'bomb' | 'freeze' | 'shield' | 'magnet' | 'doublePoints' | 'crystal';
type GameMode = 'classic' | 'zen' | 'timeAttack' | 'survival' | 'frenzy' | 'daily' | 'precision' | 'endless' | 'blitz';
type Modifier = 'bigObjects' | 'speedDemon' | 'noBombs' | 'mirror' | 'oneLife' | 'tinyObjects' | 'chaos';
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
  hitsLeft: number; // for multi-hit objects like crystal
  spawnAge: number; // spawn animation timer
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

interface GameHistoryEntry {
  mode: string;
  difficulty: string;
  score: number;
  slices: number;
  accuracy: number;
  bestCombo: number;
  stars: number;
  duration: number; // seconds
  modifiers: string[];
  date: string;
}

interface ChallengeConfig {
  mode: GameMode;
  difficulty: Difficulty;
  modifiers: Modifier[];
  themeIdx: number;
  skinIdx: number;
  name: string;
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
  shield:  { color: '#00ff80', emissive: '#00cc60', points: 75,  radius: 0.11 },
  magnet:  { color: '#ffaa00', emissive: '#cc8800', points: 75,  radius: 0.10 },
  doublePoints: { color: '#ff44ff', emissive: '#cc22cc', points: 50, radius: 0.12 },
  crystal:      { color: '#aaeeff', emissive: '#88ccff', points: 500, radius: 0.15 },
};

const THEMES = [
  { name: 'NEON HOLODECK', grid: '#00ffff', accent: '#ff00ff', bg: '#000510', fog: '#000510', wall: '#003344' },
  { name: 'CRIMSON ARENA', grid: '#ff3344', accent: '#ffaa00', bg: '#0a0000', fog: '#0a0000', wall: '#330011' },
  { name: 'TOXIC NEON',    grid: '#00ff80', accent: '#80ff00', bg: '#000a05', fog: '#000a05', wall: '#003318' },
  { name: 'ULTRA VIOLET',  grid: '#aa44ff', accent: '#ff44aa', bg: '#050010', fog: '#050010', wall: '#220044' },
  { name: 'SOLAR BLAZE',   grid: '#ff8c00', accent: '#ffdd00', bg: '#0a0500', fog: '#0a0500', wall: '#332200' },
  { name: 'FROZEN GRID',   grid: '#88ccff', accent: '#44ddff', bg: '#000812', fog: '#000812', wall: '#002244' },
  { name: 'BLOOD MOON',    grid: '#ff2244', accent: '#ff6644', bg: '#080000', fog: '#080000', wall: '#440000' },
  { name: 'GHOST MATRIX',  grid: '#66ffcc', accent: '#aaffee', bg: '#000a08', fog: '#000a08', wall: '#003322' },
  { name: 'DEEP OCEAN',   grid: '#0066ff', accent: '#00ccff', bg: '#000208', fog: '#000208', wall: '#001133' },
  { name: 'NEON SUNSET',  grid: '#ff6644', accent: '#ffaa22', bg: '#0a0200', fog: '#0a0200', wall: '#331100' },
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
  { name: 'Obsidian',   color: '#333344', emissive: '#111122', glow: '#4444aa', unlock: 'Lv 10' },
  { name: 'Nova',       color: '#ff8844', emissive: '#ff6622', glow: '#ffaa66', unlock: 'Lv 25' },
  { name: 'Phantom',    color: '#88ffcc', emissive: '#44cc88', glow: '#aaffdd', unlock: 'Lv 40' },
  { name: 'Celestial',  color: '#ffccff', emissive: '#cc88cc', glow: '#ffeeff', unlock: 'Lv 50' },
  { name: 'Eclipse',    color: '#220044', emissive: '#440088', glow: '#6600cc', unlock: '25 bosses' },
  { name: 'Aurora',     color: '#44ffaa', emissive: '#22cc88', glow: '#88ffcc', unlock: '100 crystals' },
  { name: 'Crimson',    color: '#cc0022', emissive: '#990011', glow: '#ff2244', unlock: 'Survival 3m' },
  { name: 'Starlight',  color: '#ffffcc', emissive: '#cccc88', glow: '#ffffee', unlock: '50K total' },
  // Round 10 skins
  { name: 'Nebula',     color: '#6644ff', emissive: '#4422cc', glow: '#8866ff', unlock: 'Prestige I' },
  { name: 'Glacier',    color: '#aaddff', emissive: '#88bbcc', glow: '#cceeFF', unlock: 'Endless w25' },
  { name: 'Berserker',  color: '#ff2200', emissive: '#cc1100', glow: '#ff4422', unlock: 'Season win' },
  { name: 'Hologram',   color: '#44ffff', emissive: '#22cccc', glow: '#66ffff', unlock: '100% acc (20+)' },
];

const ACHIEVEMENTS: Achievement[] = [
  // Slicing milestones
  { id: 'first_slice',    name: 'First Blood',        desc: 'Slice your first object' },
  { id: 'ten_slices',     name: 'Warming Up',          desc: 'Slice 10 objects total' },
  { id: 'fifty_slices',   name: 'Blade Runner',        desc: 'Slice 50 objects total' },
  { id: 'hundred_slices', name: 'Slice Master',        desc: 'Slice 100 objects total' },
  { id: 'five_hundred',   name: 'Blade Legend',         desc: 'Slice 500 objects total' },
  { id: 'thousand_slices', name: 'Eternal Slicer',     desc: 'Slice 1,000 objects total' },
  // Combo
  { id: 'combo_x3',       name: 'Combo Starter',       desc: 'Reach x3 combo' },
  { id: 'combo_x5',       name: 'Combo King',          desc: 'Reach x5 combo' },
  { id: 'combo_x8',       name: 'Combo God',           desc: 'Reach x8 combo' },
  { id: 'combo_x10',      name: 'Maximum Combo',       desc: 'Reach x10 combo' },
  // Score
  { id: 'score_1k',       name: 'Getting Started',     desc: 'Score 1,000 points' },
  { id: 'score_5k',       name: 'Sharp Blade',         desc: 'Score 5,000 points' },
  { id: 'score_10k',      name: 'Neon Master',         desc: 'Score 10,000 points' },
  { id: 'score_25k',      name: 'Legendary Slicer',    desc: 'Score 25,000 points' },
  { id: 'score_50k',      name: 'Quantum Blade',       desc: 'Score 50,000 points' },
  { id: 'score_100k',     name: 'Transcendent',        desc: 'Score 100,000 points' },
  // Accuracy
  { id: 'no_miss_10',     name: 'Perfect Eye',         desc: 'Slice 10 in a row without miss' },
  { id: 'no_miss_25',     name: 'Untouchable',         desc: 'Slice 25 in a row without miss' },
  { id: 'no_miss_50',     name: 'Flawless',            desc: 'Slice 50 in a row without miss' },
  { id: 'accuracy_80',    name: 'Sharpshooter',        desc: 'Finish with 80%+ accuracy' },
  { id: 'accuracy_95',    name: 'Perfectionist',       desc: 'Finish with 95%+ accuracy' },
  { id: 'accuracy_100',   name: 'Perfect Game',        desc: 'Finish with 100% accuracy (min 20 objects)' },
  // Bomb/special
  { id: 'bomb_dodge',     name: 'Bomb Dodger',         desc: 'Avoid 10 bombs in one game' },
  { id: 'freeze_5',       name: 'Time Lord',           desc: 'Slice 5 freeze orbs in one game' },
  { id: 'shield_3',       name: 'Shielded',            desc: 'Collect 3 shields in one game' },
  { id: 'magnet_3',       name: 'Magnetic',            desc: 'Collect 3 magnets in one game' },
  { id: 'double_5',       name: 'Double Trouble',      desc: 'Collect 5 double points in one game' },
  { id: 'powerup_10',     name: 'Power Hungry',        desc: 'Collect 10 power-ups in one game' },
  { id: 'no_powerups',    name: 'Purist',              desc: 'Score 5K without using power-ups' },
  // Games played
  { id: 'games_10',       name: 'Dedicated',           desc: 'Play 10 games' },
  { id: 'games_50',       name: 'Veteran',             desc: 'Play 50 games' },
  { id: 'games_100',      name: 'Centurion',           desc: 'Play 100 games' },
  // Mode mastery
  { id: 'classic_win',    name: 'Classic Champion',    desc: 'Complete Classic mode' },
  { id: 'survival_60',    name: 'Survivor',            desc: 'Survive 60 seconds in Survival' },
  { id: 'survival_120',   name: 'Endurance',           desc: 'Survive 120 seconds in Survival' },
  { id: 'survival_180',   name: 'Immortal',            desc: 'Survive 180 seconds in Survival' },
  { id: 'frenzy_1k',      name: 'Frenzy Master',       desc: 'Score 1,000+ in Frenzy' },
  { id: 'frenzy_5k',      name: 'Frenzy Legend',       desc: 'Score 5,000+ in Frenzy' },
  { id: 'daily_done',     name: 'Daily Challenger',    desc: 'Complete a Daily Challenge' },
  { id: 'zen_100',        name: 'Zen Master',          desc: 'Slice 100 objects in Zen' },
  { id: 'precision_win',  name: 'Precision Expert',    desc: 'Complete Precision mode' },
  { id: 'timeattack_5k',  name: 'Speed Demon',         desc: 'Score 5K+ in Time Attack' },
  { id: 'all_modes',      name: 'Well Rounded',        desc: 'Play every game mode' },
  // Skins & customization
  { id: 'skin_unlock',    name: 'Fashionista',         desc: 'Unlock a blade skin' },
  { id: 'all_skins',      name: 'Collector',           desc: 'Unlock all blade skins' },
  { id: 'theme_explorer', name: 'Theme Explorer',      desc: 'Play with all arena themes' },
  // Special feats
  { id: 'dual_slice',     name: 'Dual Blade',          desc: 'Slice 2 objects simultaneously' },
  { id: 'speed_slice',    name: 'Lightning Blade',     desc: 'Slice 5 objects in 2 seconds' },
  { id: 'triple_slice',   name: 'Triple Threat',       desc: 'Slice 3 objects in 1 second' },
  { id: 'no_bomb_classic', name: 'Clean Run',          desc: 'Complete Classic without hitting a bomb' },
  { id: 'full_wave',      name: 'Perfect Wave',        desc: 'Slice every object in a wave' },
  { id: 'comeback',       name: 'Comeback Kid',        desc: 'Win with 1 life remaining' },
  // XP/Level
  { id: 'level_5',        name: 'Apprentice',          desc: 'Reach Level 5' },
  { id: 'level_10',       name: 'Journeyman',          desc: 'Reach Level 10' },
  { id: 'level_25',       name: 'Expert',              desc: 'Reach Level 25' },
  { id: 'level_50',       name: 'Grandmaster',         desc: 'Reach Level 50' },
  // Score totals
  { id: 'total_50k',      name: 'Score Hoarder',       desc: 'Earn 50,000 total score' },
  { id: 'total_100k',     name: 'Score Baron',         desc: 'Earn 100,000 total score' },
  { id: 'total_500k',     name: 'Score Tycoon',        desc: 'Earn 500,000 total score' },
  // Time played
  { id: 'play_1h',        name: 'Time Invested',       desc: 'Play for 1 hour total' },
  { id: 'play_5h',        name: 'Devoted',             desc: 'Play for 5 hours total' },
  // Boss
  { id: 'boss_kill',      name: 'Boss Slayer',         desc: 'Defeat a boss object' },
  { id: 'boss_no_hit',    name: 'Untouched',           desc: 'Beat a boss without losing a life' },
  // Endless
  { id: 'endless_w10',    name: 'Marathon Runner',     desc: 'Reach wave 10 in Endless' },
  { id: 'endless_w25',    name: 'Endurance Master',    desc: 'Reach wave 25 in Endless' },
  { id: 'endless_w50',    name: 'Infinity Blade',      desc: 'Reach wave 50 in Endless' },
  { id: 'endless_100k',   name: 'Endless Legend',      desc: 'Score 100K in Endless' },
  // Crystal
  { id: 'crystal_first',  name: 'Crystal Breaker',     desc: 'Shatter your first crystal' },
  { id: 'crystal_10',     name: 'Crystal Collector',   desc: 'Shatter 10 crystals' },
  { id: 'crystal_50',     name: 'Crystal Connoisseur', desc: 'Shatter 50 crystals total' },
  // Modifiers
  { id: 'mod_complete',   name: 'Modified',            desc: 'Complete a game with a modifier' },
  { id: 'mod_all',        name: 'Rule Breaker',        desc: 'Play with every modifier' },
  { id: 'chaos_10k',      name: 'Chaos Agent',         desc: 'Score 10K with Chaos modifier' },
  { id: 'onelife_win',    name: 'Flawless Victory',    desc: 'Complete Classic on One Life' },
  // Music
  { id: 'play_music',     name: 'Synthwave',           desc: 'Play with music enabled' },
  // Charge attack
  { id: 'charge_first',   name: 'Power Strike',        desc: 'Use a charge attack' },
  { id: 'charge_5',       name: 'Charged Up',          desc: 'Use 5 charge attacks' },
  { id: 'charge_aoe_3',   name: 'Chain Reaction',      desc: 'Slice 3+ objects with one charge' },
  // Type combos
  { id: 'type_combo_3',   name: 'Color Coded',         desc: 'Slice 3 same type in a row' },
  { id: 'type_combo_5',   name: 'Mono Maniac',         desc: 'Slice 5 same type in a row' },
  // Stars
  { id: 'star_first',     name: 'Rising Star',         desc: 'Earn your first star' },
  { id: 'stars_10',       name: 'Star Collector',      desc: 'Earn 10 total stars' },
  { id: 'stars_all',      name: 'Constellation',       desc: 'Earn 3 stars in every mode' },
  // Boss milestones
  { id: 'boss_5',         name: 'Boss Hunter',         desc: 'Defeat 5 bosses total' },
  { id: 'boss_25',        name: 'Boss Bane',           desc: 'Defeat 25 bosses total' },
  // Quick play
  { id: 'quick_play_3',   name: 'Quick Draw',          desc: 'Play 3 Quick Play games' },
  // Streak
  { id: 'streak_20',      name: 'On Fire',             desc: 'Reach a 20 slice streak' },
  { id: 'streak_50',      name: 'Unstoppable',         desc: 'Reach a 50 slice streak' },
  // Season
  { id: 'season_win',     name: 'Season Champion',     desc: 'Complete a Season' },
  { id: 'season_stage_4', name: 'Quarterfinals',       desc: 'Reach Season Stage 4' },
  { id: 'season_stage_8', name: 'Grand Finals',        desc: 'Reach Season Stage 8' },
  // Daily streak
  { id: 'daily_streak_3', name: 'Consistent',          desc: '3-day Daily Challenge streak' },
  { id: 'daily_streak_7', name: 'Weekly Warrior',      desc: '7-day Daily Challenge streak' },
  // Prestige
  { id: 'prestige_1',     name: 'Prestige I',          desc: 'Prestige for the first time' },
  { id: 'prestige_3',     name: 'Prestige III',        desc: 'Reach Prestige III' },
  // Formation
  { id: 'form_circle',    name: 'Circle Slayer',       desc: 'Perfect a circle formation wave' },
  { id: 'form_line',      name: 'Blade Wall',          desc: 'Perfect a line formation wave' },
  // Score milestones
  { id: 'total_1m',       name: 'Millionaire',         desc: 'Earn 1,000,000 total score' },
  { id: 'slices_5k',      name: 'Blade Addict',        desc: 'Slice 5,000 objects total' },
  // Special
  { id: 'no_damage',      name: 'Untouchable Run',     desc: 'Complete Classic Hard without losing a life' },
  { id: 'speed_master',   name: 'Speed Master',        desc: 'Slice 10 objects in 3 seconds' },
  // Custom Challenge
  { id: 'challenge_create', name: 'Challenge Maker',    desc: 'Create a custom challenge' },
  { id: 'challenge_play',   name: 'Challenger',         desc: 'Play a custom challenge' },
  { id: 'challenge_3',      name: 'Challenge Addict',   desc: 'Play 3 different challenges' },
  // History
  { id: 'history_10',       name: 'Historian',           desc: 'Complete 10 games (tracked in history)' },
  { id: 'history_50',       name: 'Chronicler',          desc: 'Complete 50 games (tracked in history)' },
  // Combo announcements
  { id: 'combo_godlike',    name: 'GODLIKE',             desc: 'Trigger a GODLIKE combo announcement' },
  // Accuracy
  { id: 'accuracy_90_10',   name: 'Eagle Eye',           desc: 'Finish 10 games with 90%+ accuracy' },
  // Difficulty
  { id: 'hard_all_modes',   name: 'Hardened',            desc: 'Complete every mode on Hard' },
  // Replay & arena
  { id: 'replay_5',         name: 'Flashback',           desc: 'Trigger replay with 5+ slices in final 5s' },
  { id: 'all_themes_play',  name: 'World Traveler',      desc: 'Play a game in every arena theme' },
  { id: 'slice_10k',        name: 'Ten Thousand Cuts',   desc: 'Slice 10,000 objects total' },
  // Round 10
  { id: 'skin_20',          name: 'Arsenal',             desc: 'Unlock 20 blade skins' },
  { id: 'theme_10',         name: 'Dimension Hopper',    desc: 'Play in all 10 arena themes' },
  { id: 'score_200k',       name: 'Score Legend',        desc: 'Score 200,000 in a single game' },
  { id: 'endless_w100',     name: 'Century',             desc: 'Reach wave 100 in Endless' },
  { id: 'daily_streak_14',  name: 'Two Weeks',           desc: '14-day Daily Challenge streak' },
  // Blitz
  { id: 'blitz_5k',         name: 'Blitz Master',        desc: 'Score 5K in Blitz mode' },
  { id: 'blitz_10k',        name: 'Blitz Legend',        desc: 'Score 10K in Blitz mode' },
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
    xp: number; level: number;
    crystalsShattered: number; modifiersUsed: string[];
    bestEndlessWave: number;
    bossesDefeated: number; chargesUsed: number; quickPlays: number;
    prestige: number; prestigeMultiplier: number;
    dailyStreak: number; lastDailyDate: string;
    seasonWins: number; seasonBestStage: number;
  };
  achievements: string[];
  leaderboard: LeaderboardEntry[];
  settings: { masterVol: number; sfxVol: number; musicVol: number; themeIdx: number; skinIdx: number; screenShake: boolean };
  stars: Record<string, number>; // "mode_difficulty" -> 1|2|3
  history: GameHistoryEntry[];
  savedChallenges: ChallengeConfig[];
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    career: { games: 0, totalSlices: 0, bestScore: 0, totalScore: 0, bestCombo: 0, totalBombs: 0, totalMisses: 0, totalShots: 0, playTimeMs: 0, modesPlayed: [], themesUsed: [], xp: 0, level: 1, crystalsShattered: 0, modifiersUsed: [], bestEndlessWave: 0, bossesDefeated: 0, chargesUsed: 0, quickPlays: 0, prestige: 0, prestigeMultiplier: 1, dailyStreak: 0, lastDailyDate: '', seasonWins: 0, seasonBestStage: 0 },
    achievements: [],
    leaderboard: [],
    settings: { masterVol: 100, sfxVol: 100, musicVol: 100, themeIdx: 0, skinIdx: 0, screenShake: true },
    stars: {},
    history: [],
    savedChallenges: [],
  };
}

function saveSave(data: SaveData): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// Challenge code encoding/decoding
function encodeChallenge(cfg: ChallengeConfig): string {
  const modeIdx = ['classic','zen','timeAttack','survival','frenzy','daily','precision','endless','blitz'].indexOf(cfg.mode);
  const diffIdx = ['easy','medium','hard'].indexOf(cfg.difficulty);
  const modBits = ['bigObjects','speedDemon','noBombs','mirror','oneLife','tinyObjects','chaos'].reduce(
    (bits: number, mod: string, i: number) => bits | ((cfg.modifiers.includes(mod as Modifier) ? 1 : 0) << i), 0
  );
  const data = [modeIdx, diffIdx, modBits, cfg.themeIdx, cfg.skinIdx, ...cfg.name.split('').map(c => c.charCodeAt(0))];
  return btoa(String.fromCharCode(...data)).replace(/=+$/, '');
}

function decodeChallenge(code: string): ChallengeConfig | null {
  try {
    const padded = code + '='.repeat((4 - code.length % 4) % 4);
    const bytes = atob(padded).split('').map(c => c.charCodeAt(0));
    if (bytes.length < 5) return null;
    const modes: GameMode[] = ['classic','zen','timeAttack','survival','frenzy','daily','precision','endless','blitz'];
    const diffs: Difficulty[] = ['easy','medium','hard'];
    const allMods: Modifier[] = ['bigObjects','speedDemon','noBombs','mirror','oneLife','tinyObjects','chaos'];
    const modeIdx = bytes[0]; const diffIdx = bytes[1]; const modBits = bytes[2];
    if (modeIdx >= modes.length || diffIdx >= diffs.length) return null;
    const mods = allMods.filter((_m, i) => (modBits >> i) & 1);
    const name = bytes.slice(5).map(b => String.fromCharCode(b)).join('') || 'Custom';
    return { mode: modes[modeIdx], difficulty: diffs[diffIdx], modifiers: mods, themeIdx: Math.min(bytes[3], 7), skinIdx: Math.min(bytes[4], 15), name };
  } catch { return null; }
}

const COMBO_ANNOUNCEMENTS: { threshold: number; text: string; color: string }[] = [
  { threshold: 3, text: 'NICE!', color: '#00ffff' },
  { threshold: 5, text: 'AWESOME!', color: '#00ff80' },
  { threshold: 8, text: 'INCREDIBLE!', color: '#ff00ff' },
  { threshold: 10, text: 'GODLIKE!', color: '#ffd700' },
];

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

  shieldPickup() {
    if (!this.ctx) return;
    this.playSfx(550, 'sine', 0.2, 0.25);
    this.playSfx(660, 'triangle', 0.15, 0.2);
    this.playSfx(880, 'sine', 0.1, 0.15);
  }

  magnetPickup() {
    if (!this.ctx) return;
    this.playSfx(330, 'triangle', 0.3, 0.2);
    this.playSfx(440, 'sine', 0.25, 0.15);
  }

  doublePickup() {
    if (!this.ctx) return;
    this.playSfx(880, 'sine', 0.15, 0.25);
    this.playSfx(1100, 'sine', 0.1, 0.2);
    this.playSfx(1320, 'triangle', 0.08, 0.15);
  }

  shieldBlock() {
    if (!this.ctx) return;
    this.playSfx(400, 'square', 0.15, 0.3, false);
    this.playSfx(600, 'sine', 0.3, 0.2);
  }

  levelUp() {
    if (!this.ctx) return;
    const notes = [440, 550, 660, 880, 1100];
    notes.forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.3, 0.25, false), i * 100));
  }

  waveStart() {
    if (!this.ctx) return;
    this.playSfx(330, 'triangle', 0.15, 0.15, false);
    this.playSfx(440, 'triangle', 0.1, 0.1, false);
  }

  bossAppear() {
    if (!this.ctx) return;
    this.playSfx(110, 'sawtooth', 0.5, 0.3);
    this.playSfx(82, 'triangle', 0.6, 0.2);
    setTimeout(() => this.playSfx(165, 'sawtooth', 0.3, 0.2), 200);
  }

  bossHit() {
    if (!this.ctx) return;
    this.playSfx(200, 'triangle', 0.1, 0.2);
    this.playSfx(300, 'sine', 0.15, 0.15);
  }

  bossDefeat() {
    if (!this.ctx) return;
    const notes = [220, 330, 440, 550, 660, 880, 1100, 1320];
    notes.forEach((f, i) => setTimeout(() => this.playSfx(f, 'sine', 0.25, 0.2, false), i * 80));
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

  comboAnnounce(threshold: number) {
    if (!this.ctx) return;
    // Rising pitch based on combo level
    const baseFreq = 400 + threshold * 80;
    this.playSfx(baseFreq, 'sawtooth', 0.15, 0.25, false);
    setTimeout(() => this.playSfx(baseFreq * 1.5, 'square', 0.1, 0.2, false), 80);
    if (threshold >= 8) setTimeout(() => this.playSfx(baseFreq * 2, 'sine', 0.2, 0.15, false), 160);
  }

  countdownTick() {
    this.playSfx(440, 'sine', 0.1, 0.2, false);
  }

  countdownGo() {
    this.playSfx(880, 'sine', 0.2, 0.3, false);
    this.playSfx(1100, 'triangle', 0.15, 0.2, false);
  }

  chargeLoop(level: number) {
    if (!this.ctx) return;
    const freq = 200 + level * 600;
    this.playSfx(freq, 'sine', 0.08, 0.1 + level * 0.1, false);
  }

  chargeRelease() {
    if (!this.ctx) return;
    this.playSfx(300, 'sawtooth', 0.3, 0.4);
    this.playSfx(600, 'sine', 0.2, 0.3);
    this.playSfx(900, 'triangle', 0.15, 0.2);
    this.playSfx(1200, 'sine', 0.1, 0.15);
  }

  typeCombo(count: number) {
    if (!this.ctx) return;
    const base = 550 + count * 100;
    this.playSfx(base, 'sine', 0.15, 0.2, false);
    this.playSfx(base * 1.25, 'triangle', 0.1, 0.15, false);
  }

  gameStart() {
    const notes = [440, 550, 660, 880];
    notes.forEach((f, i) => setTimeout(() => this.playSfx(f, 'triangle', 0.15, 0.2, false), i * 80));
  }

  gameOver() {
    const notes = [660, 550, 440, 330];
    notes.forEach((f, i) => setTimeout(() => this.playSfx(f, 'triangle', 0.2, 0.2, false), i * 120));
  }

  startDrone(themeIndex = 0) {
    if (!this.ctx || !this.musicGain) return;
    this.stopDrone();
    const t = this.ctx.currentTime;

    // --- Procedural Synthwave Music Engine ---
    // Arena-specific tuning
    const THEME_MUSIC: { bass: number; arpNotes: number[]; padNotes: number[]; bpm: number; filterQ: number }[] = [
      { bass: 55, arpNotes: [110, 138.59, 164.81, 220, 164.81, 138.59, 110, 82.41, 130.81, 164.81, 196, 261.63, 196, 164.81, 130.81, 98], padNotes: [130.81, 164.81, 196, 261.63], bpm: 128, filterQ: 5 }, // Neon Holodeck — C major
      { bass: 58.27, arpNotes: [116.54, 138.59, 174.61, 233.08, 174.61, 138.59, 116.54, 87.31, 146.83, 174.61, 220, 293.66, 220, 174.61, 146.83, 110], padNotes: [146.83, 174.61, 220, 293.66], bpm: 136, filterQ: 7 }, // Crimson Arena — D minor
      { bass: 49, arpNotes: [98, 123.47, 146.83, 196, 146.83, 123.47, 98, 73.42, 123.47, 146.83, 196, 246.94, 196, 146.83, 123.47, 73.42], padNotes: [123.47, 146.83, 196, 246.94], bpm: 120, filterQ: 4 }, // Toxic Neon — G minor
      { bass: 61.74, arpNotes: [123.47, 155.56, 185, 246.94, 185, 155.56, 123.47, 92.5, 146.83, 185, 220, 277.18, 220, 185, 146.83, 110], padNotes: [123.47, 155.56, 185, 246.94], bpm: 132, filterQ: 6 }, // Ultra Violet — Eb major
      { bass: 65.41, arpNotes: [130.81, 164.81, 196, 261.63, 196, 164.81, 130.81, 98, 146.83, 196, 246.94, 329.63, 246.94, 196, 146.83, 98], padNotes: [130.81, 196, 261.63, 329.63], bpm: 140, filterQ: 8 }, // Solar Blaze — C power (fifths)
      { bass: 51.91, arpNotes: [103.83, 130.81, 155.56, 207.65, 155.56, 130.81, 103.83, 77.78, 130.81, 155.56, 207.65, 261.63, 207.65, 155.56, 130.81, 77.78], padNotes: [103.83, 130.81, 155.56, 207.65], bpm: 116, filterQ: 3 }, // Frozen Grid — Ab major (slow, crystalline)
      { bass: 61.74, arpNotes: [123.47, 146.83, 185, 246.94, 185, 146.83, 123.47, 92.5, 155.56, 185, 246.94, 311.13, 246.94, 185, 155.56, 92.5], padNotes: [123.47, 146.83, 185, 246.94], bpm: 144, filterQ: 9 }, // Blood Moon — Eb minor (aggressive)
      { bass: 55, arpNotes: [110, 146.83, 164.81, 220, 164.81, 146.83, 110, 82.41, 146.83, 196, 220, 293.66, 220, 196, 146.83, 82.41], padNotes: [110, 146.83, 196, 261.63], bpm: 124, filterQ: 4 }, // Ghost Matrix — Am (ethereal)
      { bass: 46.25, arpNotes: [92.5, 116.54, 138.59, 185, 138.59, 116.54, 92.5, 69.3, 116.54, 138.59, 185, 246.94, 185, 138.59, 116.54, 69.3], padNotes: [92.5, 116.54, 138.59, 185], bpm: 112, filterQ: 3 }, // Deep Ocean — Bb minor (deep)
      { bass: 73.42, arpNotes: [146.83, 185, 220, 293.66, 220, 185, 146.83, 110, 185, 220, 293.66, 369.99, 293.66, 220, 185, 110], padNotes: [146.83, 220, 293.66, 369.99], bpm: 138, filterQ: 7 }, // Neon Sunset — D major (warm)
    ];
    const tm = THEME_MUSIC[themeIndex % THEME_MUSIC.length];

    // Bass drone
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
      return osc;
    };
    makeOsc(tm.bass, 'sine', 0.06);
    makeOsc(tm.bass * 1.5, 'triangle', 0.04);

    // Arpeggiator - synthwave-style repeating pattern
    const arpNotes = tm.arpNotes;
    const arpOsc = this.ctx.createOscillator();
    arpOsc.type = 'sawtooth';
    const arpFilter = this.ctx.createBiquadFilter();
    arpFilter.type = 'lowpass';
    arpFilter.frequency.value = 800;
    arpFilter.Q.value = tm.filterQ;
    const arpGain = this.ctx.createGain();
    arpGain.gain.value = 0.04;
    arpOsc.connect(arpFilter);
    arpFilter.connect(arpGain);
    arpGain.connect(this.musicGain);

    // Schedule arpeggio pattern (loops every 4 bars)
    const bpm = tm.bpm;
    const stepDur = 60 / bpm / 4; // 16th notes
    const patternLen = arpNotes.length;
    const totalBars = 64; // pre-schedule 64 repetitions
    for (let rep = 0; rep < totalBars; rep++) {
      for (let i = 0; i < patternLen; i++) {
        const noteTime = t + (rep * patternLen + i) * stepDur;
        arpOsc.frequency.setValueAtTime(arpNotes[i], noteTime);
        arpGain.gain.setValueAtTime(0.04, noteTime);
        arpGain.gain.setValueAtTime(0.01, noteTime + stepDur * 0.8);
      }
    }
    arpOsc.start(t);
    this.droneOscs.push(arpOsc);

    // Pad chord - warm ambient pad (arena-specific)
    const padNotes = tm.padNotes;
    padNotes.forEach(freq => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = this.ctx!.createGain();
      g.gain.value = 0.015;
      const lp = this.ctx!.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.musicGain!);
      osc.start(t);
      this.droneOscs.push(osc);
    });

    // Kick drum pattern
    const kickInterval = 60 / bpm; // quarter notes
    for (let i = 0; i < totalBars * 4; i++) {
      const kickTime = t + i * kickInterval;
      this.scheduleKick(kickTime);
    }

    // Hi-hat pattern (offbeats)
    for (let i = 0; i < totalBars * 8; i++) {
      const hhTime = t + i * (kickInterval / 2) + kickInterval / 4;
      this.scheduleHihat(hhTime);
    }

    // LFO for filter sweep
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoG = this.ctx.createGain();
    lfoG.gain.value = 300;
    lfo.connect(lfoG);
    lfoG.connect(arpFilter.frequency);
    lfo.start(t);
    this.droneOscs.push(lfo);

    if (!this.musicTriggered) {
      this.musicTriggered = true;
    }
  }

  private musicTriggered = false;

  private scheduleKick(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private scheduleHihat(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.03), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.035, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    noise.connect(hp);
    hp.connect(g);
    g.connect(this.musicGain);
    noise.start(time);
    noise.stop(time + 0.05);
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

  // Power-up state
  let shieldActive = false;
  let shieldTimer = 0;
  let magnetActive = false;
  let magnetTimer = 0;
  let magnetRadius = 1.5;
  let doublePointsActive = false;
  let doublePointsTimer = 0;
  let shieldsCollected = 0;
  let magnetsCollected = 0;
  let doublesCollected = 0;
  let totalPowerups = 0;
  let usedPowerups = false; // tracks if any power-up was used this game

  // XP/Level system
  const XP_PER_LEVEL: number[] = [];
  for (let i = 0; i < 50; i++) XP_PER_LEVEL.push(Math.floor(100 + i * 50 + i * i * 5));
  let sessionXP = 0;
  let levelUpTimer = 0;
  let levelUpText = '';

  // Wave announcement
  let waveAnnounceTimer = 0;
  let waveAnnounceName = '';
  let wavePerfect = true; // did we slice every object in the current wave?
  let waveSliced = 0;
  let waveTotal = 0;

  // Boss system
  let bossActive = false;
  let bossHP = 0;
  let bossMaxHP = 0;
  let bossObj: FlyingObj | null = null;
  let bossLivesAtStart = 0;

  // Combo color escalation
  const COMBO_COLORS = ['#ff00ff', '#ff44aa', '#ff8800', '#ffcc00', '#ffff00', '#00ffff', '#00ff80', '#88ff00', '#ffffff', '#ffd700'];

  // Challenge modifier state
  let activeModifiers: Set<Modifier> = new Set();
  let crystalsThisGame = 0;

  // Charge attack state
  let chargeLevel = 0;         // 0 to 1
  let chargeActive = false;    // is player holding charge
  let chargeReady = false;     // charge fully loaded
  const CHARGE_TIME = 1.5;     // seconds to full charge
  const CHARGE_RADIUS = 1.2;   // AOE radius
  let chargesThisGame = 0;

  // Type combo state — slice same type in sequence for bonus
  let lastSlicedType: ObjType | null = null;
  let typeComboCount = 0;
  let bestTypeCombo = 0;

  // Screen shake state
  let shakeIntensity = 0;
  let shakeTimer = 0;
  const cameraOrigPos = new Vector3(0, 1.6, 0);

  // Quick play counter
  let isQuickPlay = false;

  // Star rating thresholds per mode
  const STAR_THRESHOLDS: Record<GameMode, Record<Difficulty, [number, number, number]>> = {
    classic:    { easy: [2000, 5000, 10000], medium: [3000, 8000, 15000], hard: [5000, 12000, 25000] },
    zen:        { easy: [1000, 3000, 8000],  medium: [2000, 5000, 12000], hard: [3000, 8000, 20000] },
    timeAttack: { easy: [2000, 5000, 10000], medium: [3000, 8000, 16000], hard: [5000, 12000, 25000] },
    survival:   { easy: [1500, 4000, 8000],  medium: [2500, 6000, 12000], hard: [4000, 10000, 20000] },
    frenzy:     { easy: [1500, 4000, 8000],  medium: [2000, 5000, 10000], hard: [3000, 8000, 15000] },
    daily:      { easy: [2000, 5000, 10000], medium: [3000, 8000, 15000], hard: [5000, 12000, 25000] },
    precision:  { easy: [1000, 3000, 6000],  medium: [2000, 5000, 10000], hard: [3000, 8000, 16000] },
    endless:    { easy: [3000, 8000, 20000], medium: [5000, 15000, 40000], hard: [8000, 25000, 60000] },
    blitz:      { easy: [2000, 5000, 10000], medium: [3000, 8000, 15000], hard: [5000, 12000, 25000] },
  };

  // Season Mode — fight through 8 AI "opponents" with increasing difficulty
  const SEASON_OPPONENTS = [
    { name: 'ROOKIE BOT',       difficulty: 'easy' as Difficulty, waves: 5,  bombRate: 0.06, speedMult: 0.8, title: 'Stage 1' },
    { name: 'CIRCUIT SLASHER',  difficulty: 'easy' as Difficulty, waves: 6,  bombRate: 0.10, speedMult: 0.9, title: 'Stage 2' },
    { name: 'NEON PHANTOM',     difficulty: 'medium' as Difficulty, waves: 7,  bombRate: 0.12, speedMult: 1.0, title: 'Stage 3' },
    { name: 'BLADE DANCER',     difficulty: 'medium' as Difficulty, waves: 8,  bombRate: 0.14, speedMult: 1.1, title: 'Stage 4' },
    { name: 'GRID REAPER',      difficulty: 'medium' as Difficulty, waves: 9,  bombRate: 0.16, speedMult: 1.2, title: 'Stage 5' },
    { name: 'VOID HUNTER',      difficulty: 'hard' as Difficulty, waves: 10, bombRate: 0.18, speedMult: 1.3, title: 'Stage 6' },
    { name: 'QUANTUM EDGE',     difficulty: 'hard' as Difficulty, waves: 12, bombRate: 0.20, speedMult: 1.4, title: 'Stage 7' },
    { name: 'OMEGA SLICER',     difficulty: 'hard' as Difficulty, waves: 15, bombRate: 0.22, speedMult: 1.5, title: 'FINALS' },
  ];
  let seasonStage = 0;
  let inSeasonMode = false;
  let inChallengeMode = false;
  let activeChallenge: ChallengeConfig | null = null;
  let challengesPlayed = 0;
  let historyPage = 0;
  let comboAnnounceLast = 0; // last announced combo threshold
  let lastComboAnnounceTime = 0;

  // Instant replay — capture last 5 seconds of slice events
  interface ReplayEvent {
    time: number;
    pos: Vector3;
    type: ObjType;
    comboAt: number;
    score: number;
  }
  const replayBuffer: ReplayEvent[] = [];
  const REPLAY_WINDOW = 5; // seconds to keep
  let replayActive = false;
  let replayStartTime = 0;
  let replayEvents: ReplayEvent[] = [];
  let replayMarkers: Mesh[] = [];

  const MODIFIER_DESCS: Record<Modifier, string> = {
    bigObjects: 'Objects are 2x larger',
    speedDemon: 'Objects move 50% faster',
    noBombs: 'No bombs spawn',
    mirror: 'Objects spawn from above',
    oneLife: 'One life only',
    tinyObjects: 'Objects are half size',
    chaos: 'All modifiers active!',
  };

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
      case 'shield':  geo = new TorusGeometry(0.09, 0.04, 8, 12); break;
      case 'magnet':  geo = new ConeGeometry(0.08, 0.2, 4); break;
      case 'doublePoints': geo = new OctahedronGeometry(0.1); break;
      case 'crystal': geo = new IcosahedronGeometry(0.14); break;
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
  const objTypes: ObjType[] = ['cube', 'sphere', 'diamond', 'star', 'bomb', 'freeze', 'shield', 'magnet', 'doublePoints', 'crystal'];
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
      active: false, age: 0, hitsLeft: 1, spawnAge: 0,
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
    const speedMod = (activeModifiers.has('speedDemon') || activeModifiers.has('chaos')) ? 1.5 : 1.0;
    const mirrorMode = activeModifiers.has('mirror') || activeModifiers.has('chaos');
    if (mirrorMode) {
      // Spawn from above, fall down
      obj.group.position.set(x, 3.5, z);
      const vy = -(2 + r() * 1.5) * diffMult * speedMod;
      const vx = (r() - 0.5) * 2.5 * speedMod;
      const vz = (r() - 0.5) * 0.6;
      obj.velocity.set(vx, vy, vz);
    } else {
      const vy = (4.5 + r() * 2.5) * diffMult * speedMod;
      const vx = (r() - 0.5) * 2.5 * speedMod;
      const vz = (r() - 0.5) * 0.6;
      obj.velocity.set(vx, vy, vz);
    }
    obj.angVel.set((r() - 0.5) * 4, (r() - 0.5) * 4, (r() - 0.5) * 4);
    obj.group.visible = true;
    // Spawn animation — start at scale 0 and pop up
    obj.spawnAge = 0;
    // Size modifiers
    const sizeMod = (activeModifiers.has('bigObjects') || activeModifiers.has('chaos')) ? 2.0 :
                    (activeModifiers.has('tinyObjects')) ? 0.5 : 1.0;
    obj.group.scale.setScalar(sizeMod);
    obj.radius = OBJ_CONFIGS[type].radius * sizeMod;
    // Crystal multi-hit
    obj.hitsLeft = type === 'crystal' ? 3 : 1;
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
    if (e.code === 'Space' && gameState === 'playing' && !chargeActive) {
      chargeActive = true;
      chargeLevel = 0;
      chargeReady = false;
    }
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (e.code === 'Space' && gameState === 'playing' && chargeActive) {
      chargeActive = false;
      if (chargeLevel >= 0.5) {
        // Execute charge attack at browser blade position
        const pos = browserBlade.visible ? currTipBrowser.clone() : new Vector3(0, 1.5, -1.8);
        executeChargeAttack(pos);
      }
      chargeLevel = 0;
      chargeReady = false;
    }
  });

  // ---- UI Panel System ----
  interface PanelRef {
    entity: any;
    doc: UIKitDocument | null;
  }

  const panels: Record<string, PanelRef> = {};

  function createWorldPanel(config: string, maxW: number, maxH: number, pos: [number, number, number]): PanelRef {
    const entity = world.createTransformEntity(undefined, { persistent: true });
    entity.object3D!.position.set(...pos);
    entity.addComponent(PanelUI, { config, maxWidth: maxW, maxHeight: maxH });
    entity.object3D!.visible = false;
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
    entity.object3D!.visible = false;
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
  panels.modifiers     = createWorldPanel('/ui/modifiers.json', 0.8, 1.2, [0, 1.5, -2.5]);
  panels.season        = createWorldPanel('/ui/season.json', 0.8, 1.4, [0, 1.5, -2.5]);
  panels.tutorial      = createWorldPanel('/ui/tutorial.json', 0.7, 1.0, [0, 1.5, -2.5]);
  panels.challenge     = createWorldPanel('/ui/challenge.json', 0.8, 1.3, [0, 1.5, -2.5]);
  panels.history       = createWorldPanel('/ui/history.json', 0.9, 1.4, [0, 1.5, -2.5]);
  panels.hud           = createFollowerPanel('/ui/hud.json', 0.35, 0.2, [0.3, -0.15, -0.5]);
  panels.combo         = createFollowerPanel('/ui/combo.json', 0.15, 0.08, [-0.25, 0, -0.5]);
  panels.toast         = createFollowerPanel('/ui/toast.json', 0.3, 0.06, [0, 0.15, -0.5]);
  panels.countdown     = createFollowerPanel('/ui/countdown.json', 0.2, 0.15, [0, 0, -0.6]);
  panels.powerup       = createFollowerPanel('/ui/powerup.json', 0.25, 0.06, [-0.25, -0.12, -0.5]);
  panels.xpbar         = createFollowerPanel('/ui/xpbar.json', 0.2, 0.05, [0.25, 0.12, -0.5]);
  panels.wave          = createFollowerPanel('/ui/wave.json', 0.3, 0.12, [0, 0.05, -0.6]);
  panels.levelup       = createFollowerPanel('/ui/levelup.json', 0.25, 0.1, [0, 0.08, -0.55]);

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
    bindClick(titleDoc, 'btn-quickplay', () => {
      audio.buttonClick();
      const modes: GameMode[] = ['classic', 'survival', 'timeAttack', 'frenzy', 'endless', 'blitz'];
      const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
      gameMode = modes[Math.floor(Math.random() * modes.length)];
      difficulty = diffs[Math.floor(Math.random() * diffs.length)];
      isQuickPlay = true;
      startCountdown();
    });
    bindClick(titleDoc, 'btn-scores', () => { audio.buttonClick(); updateLeaderboard(); switchState('leaderboard'); });
    bindClick(titleDoc, 'btn-achievements', () => { audio.buttonClick(); achPage = 0; updateAchievements(); switchState('achievements'); });
    bindClick(titleDoc, 'btn-stats', () => { audio.buttonClick(); updateStats(); switchState('stats'); });
    bindClick(titleDoc, 'btn-skins', () => { audio.buttonClick(); updateSkins(); switchState('skins'); });
    bindClick(titleDoc, 'btn-settings', () => { audio.buttonClick(); updateSettingsUI(); switchState('settings'); });
    bindClick(titleDoc, 'btn-help', () => { audio.buttonClick(); switchState('help'); });
    bindClick(titleDoc, 'btn-challenge', () => { audio.buttonClick(); updateChallengeUI(); switchState('challenge'); });
    bindClick(titleDoc, 'btn-history', () => { audio.buttonClick(); historyPage = 0; updateHistoryUI(); switchState('history'); });

    // Mode select
    const modeDoc = getDoc('modeSelect');
    const modes: [string, GameMode][] = [['btn-classic','classic'],['btn-zen','zen'],['btn-timeattack','timeAttack'],['btn-survival','survival'],['btn-frenzy','frenzy'],['btn-daily','daily'],['btn-precision','precision'],['btn-endless','endless'],['btn-blitz','blitz']];
    modes.forEach(([id, mode]) => {
      bindClick(modeDoc, id, () => { audio.buttonClick(); gameMode = mode; switchState('difficulty'); });
    });
    bindClick(modeDoc, 'btn-modifiers', () => { audio.buttonClick(); updateModifiersUI(); switchState('modifiers' as any); });
    bindClick(modeDoc, 'btn-back-mode', () => { audio.buttonClick(); switchState('title'); });

    // Season mode
    bindClick(modeDoc, 'btn-season', () => { audio.buttonClick(); updateSeasonUI(); switchState('season' as any); });
    const seasonDoc = getDoc('season');
    bindClick(seasonDoc, 'btn-season-fight', () => {
      audio.buttonClick();
      if (seasonStage < SEASON_OPPONENTS.length) {
        const opp = SEASON_OPPONENTS[seasonStage];
        gameMode = 'classic';
        difficulty = opp.difficulty;
        inSeasonMode = true;
        startCountdown();
      }
    });
    bindClick(seasonDoc, 'btn-back-season', () => { audio.buttonClick(); switchState('modeSelect'); });

    // Tutorial
    const tutDoc = getDoc('tutorial');
    bindClick(tutDoc, 'btn-tut-play', () => {
      audio.buttonClick();
      tutorialSeen = true;
      gameMode = 'zen';
      difficulty = 'easy';
      startCountdown();
    });
    bindClick(tutDoc, 'btn-tut-skip', () => {
      audio.buttonClick();
      tutorialSeen = true;
      switchState('title');
    });

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
    bindClick(setDoc, 'shake-toggle', () => { save.settings.screenShake = !save.settings.screenShake; updateSettingsUI(); saveSave(save); });
    bindClick(setDoc, 'btn-prestige', () => {
      if (canPrestige()) {
        audio.buttonClick();
        doPrestige();
        updateSettingsUI();
      }
    });
    bindClick(setDoc, 'btn-back-settings', () => { audio.buttonClick(); saveSave(save); switchState('title'); });

    // Help
    bindClick(getDoc('help'), 'btn-back-help', () => { audio.buttonClick(); switchState('title'); });

    // Challenge
    const chDoc = getDoc('challenge');
    bindClick(chDoc, 'btn-back-challenge', () => { audio.buttonClick(); switchState('title'); });
    bindClick(chDoc, 'btn-ch-create', () => {
      audio.buttonClick();
      const cfg = createCurrentChallenge();
      if (!save.savedChallenges) save.savedChallenges = [];
      save.savedChallenges.push(cfg);
      save.savedChallenges = save.savedChallenges.slice(-5); // keep last 5
      checkAchievementSilent('challenge_create');
      saveSave(save);
      updateChallengeUI();
      showToast('Challenge Saved!');
      const code = encodeChallenge(cfg);
      setText(chDoc, 'ch-code', code);
    });
    // Bind challenge slot play buttons
    for (let ci = 1; ci <= 5; ci++) {
      const idx = ci - 1;
      bindClick(chDoc, `btn-ch-play-${ci}`, () => {
        audio.buttonClick();
        const challenges = save.savedChallenges || [];
        if (idx < challenges.length) {
          applyChallengeConfig(challenges[idx]);
        }
      });
    }
    bindClick(chDoc, 'btn-ch-random', () => {
      audio.buttonClick();
      const modes: GameMode[] = ['classic','zen','timeAttack','survival','frenzy','precision','endless'];
      const diffs: Difficulty[] = ['easy','medium','hard'];
      const allMods: Modifier[] = ['bigObjects','speedDemon','noBombs','mirror','oneLife','tinyObjects','chaos'];
      const randMods = allMods.filter(() => Math.random() < 0.3);
      const cfg: ChallengeConfig = {
        mode: modes[Math.floor(Math.random() * modes.length)],
        difficulty: diffs[Math.floor(Math.random() * diffs.length)],
        modifiers: randMods,
        themeIdx: Math.floor(Math.random() * THEMES.length),
        skinIdx: Math.floor(Math.random() * BLADE_SKINS.length),
        name: 'Random Challenge',
      };
      applyChallengeConfig(cfg);
    });

    // History
    const histDoc = getDoc('history');
    bindClick(histDoc, 'btn-back-history', () => { audio.buttonClick(); switchState('title'); });
    bindClick(histDoc, 'btn-hist-prev', () => { audio.buttonClick(); if (historyPage > 0) { historyPage--; updateHistoryUI(); } });
    bindClick(histDoc, 'btn-hist-next', () => {
      audio.buttonClick();
      const maxPage = Math.max(0, Math.ceil((save.history || []).length / 8) - 1);
      if (historyPage < maxPage) { historyPage++; updateHistoryUI(); }
    });

    // Skins
    const skinDoc = getDoc('skins');
    for (let i = 1; i <= 16; i++) {
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

    // Modifiers
    const modDoc = getDoc('modifiers');
    const allMods: Modifier[] = ['bigObjects', 'speedDemon', 'noBombs', 'mirror', 'oneLife', 'tinyObjects', 'chaos'];
    allMods.forEach((mod, i) => {
      bindClick(modDoc, `mod-${i + 1}-toggle`, () => {
        audio.buttonClick();
        if (mod === 'chaos') {
          // Chaos toggles ALL modifiers
          if (activeModifiers.has('chaos')) {
            activeModifiers.clear();
          } else {
            activeModifiers.clear();
            activeModifiers.add('chaos');
          }
        } else {
          activeModifiers.delete('chaos'); // disable chaos if individual toggled
          if (activeModifiers.has(mod)) activeModifiers.delete(mod);
          else activeModifiers.add(mod);
          // Mutually exclusive: big + tiny
          if (mod === 'bigObjects' && activeModifiers.has('tinyObjects')) activeModifiers.delete('tinyObjects');
          if (mod === 'tinyObjects' && activeModifiers.has('bigObjects')) activeModifiers.delete('bigObjects');
        }
        updateModifiersUI();
      });
    });
    bindClick(modDoc, 'btn-back-mod', () => { audio.buttonClick(); switchState('modeSelect'); });
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
      case 7: return s.modesPlayed.length >= 8;
      case 8: return s.level >= 10;
      case 9: return s.level >= 25;
      case 10: return s.level >= 40;
      case 11: return s.level >= 50;
      case 12: return (s.bossesDefeated || 0) >= 25;
      case 13: return (s.crystalsShattered || 0) >= 100;
      case 14: return save.achievements.includes('survival_180');
      case 15: return s.totalScore >= 50000;
      case 16: return (s.prestige || 0) >= 1; // Nebula — Prestige I
      case 17: return (s.bestEndlessWave || 0) >= 25; // Glacier — Endless w25
      case 18: return (s.seasonWins || 0) >= 1; // Berserker — Season win
      case 19: return save.achievements.includes('accuracy_100'); // Hologram — 100% accuracy
      default: return false;
    }
  }

  // ---- UI Update Functions ----
  function updateHUD() {
    const doc = getDoc('hud');
    if (!doc) return;
    const modeNames: Record<GameMode, string> = { classic: 'CLASSIC', zen: 'ZEN', timeAttack: 'TIME ATTACK', survival: 'SURVIVAL', frenzy: 'FRENZY', daily: 'DAILY', precision: 'PRECISION', endless: 'ENDLESS', blitz: 'BLITZ' };
    setText(doc, 'hud-mode', modeNames[gameMode]);
    setText(doc, 'hud-score', score.toString());
    setText(doc, 'hud-combo', `x${combo + 1}`);
    setText(doc, 'hud-lives', lives >= 0 ? lives.toString() : '--');
    if (gameMode === 'timeAttack' || gameMode === 'frenzy' || gameMode === 'blitz') {
      setText(doc, 'hud-time', Math.max(0, Math.ceil(gameTimer)).toString() + 's');
    } else if (gameMode === 'survival') {
      setText(doc, 'hud-time', Math.floor(gameTime).toString() + 's');
    } else {
      setText(doc, 'hud-time', '--');
    }
    setText(doc, 'hud-slices', sliceCount.toString());
    setText(doc, 'hud-best', `x${bestCombo + 1}`);
    setText(doc, 'hud-streak', sliceStreak.toString());
    // Charge indicator
    if (chargeActive && chargeLevel > 0) {
      const bar = Math.round(chargeLevel * 10);
      setText(doc, 'hud-charge', '[' + '|'.repeat(bar) + '.'.repeat(10 - bar) + ']');
    } else {
      setText(doc, 'hud-charge', '');
    }
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

  // XP/Level helpers
  function xpForLevel(lv: number): number {
    return XP_PER_LEVEL[Math.min(lv - 1, XP_PER_LEVEL.length - 1)];
  }

  function addXP(amount: number) {
    sessionXP += amount;
    save.career.xp += amount;
    // Check for level up
    while (save.career.level < 50 && save.career.xp >= xpForLevel(save.career.level)) {
      save.career.xp -= xpForLevel(save.career.level);
      save.career.level++;
      levelUpTimer = 2.5;
      levelUpText = `Level ${save.career.level}`;
      audio.levelUp();
      showToast(`LEVEL UP! Level ${save.career.level}`);
      // Level achievements
      if (save.career.level >= 5) checkAchievementSilent('level_5');
      if (save.career.level >= 10) checkAchievementSilent('level_10');
      if (save.career.level >= 25) checkAchievementSilent('level_25');
      if (save.career.level >= 50) checkAchievementSilent('level_50');
    }
    updateXPBar();
  }

  function checkAchievementSilent(id: string) {
    if (!save.achievements.includes(id)) {
      save.achievements.push(id);
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (ach) {
        showToast(`${ach.name}!`);
        audio.achievement();
      }
    }
  }

  function updateXPBar() {
    const doc = getDoc('xpbar');
    if (!doc) return;
    setText(doc, 'xp-level', `LV ${save.career.level}`);
    const needed = xpForLevel(save.career.level);
    setText(doc, 'xp-progress', `${save.career.xp}/${needed} XP`);
  }

  function updatePowerupHUD() {
    const doc = getDoc('powerup');
    if (!doc) return;
    let active = false;
    if (shieldActive) {
      setText(doc, 'powerup-icon', 'O');
      setText(doc, 'powerup-name', 'SHIELD');
      setText(doc, 'powerup-timer', `${Math.ceil(shieldTimer)}s`);
      active = true;
    } else if (magnetActive) {
      setText(doc, 'powerup-icon', 'M');
      setText(doc, 'powerup-name', 'MAGNET');
      setText(doc, 'powerup-timer', `${Math.ceil(magnetTimer)}s`);
      active = true;
    } else if (doublePointsActive) {
      setText(doc, 'powerup-icon', '2x');
      setText(doc, 'powerup-name', 'DOUBLE');
      setText(doc, 'powerup-timer', `${Math.ceil(doublePointsTimer)}s`);
      active = true;
    } else if (freezeTimer > 0) {
      setText(doc, 'powerup-icon', '*');
      setText(doc, 'powerup-name', 'FREEZE');
      setText(doc, 'powerup-timer', `${Math.ceil(freezeTimer)}s`);
      active = true;
    }
    panels.powerup.entity.object3D.visible = gameState === 'playing' && active;
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
    setText(doc, 'stat-level', s.level.toString());
    setText(doc, 'stat-xp', s.xp.toString());
    setText(doc, 'stat-crystals', (s.crystalsShattered || 0).toString());
    setText(doc, 'stat-endless', (s.bestEndlessWave || 0).toString());
    setText(doc, 'stat-bosses', (s.bossesDefeated || 0).toString());
    setText(doc, 'stat-charges', (s.chargesUsed || 0).toString());
    setText(doc, 'stat-stars', getTotalStars().toString());
    setText(doc, 'stat-prestige', (s.prestige || 0).toString());
    setText(doc, 'stat-season-wins', (s.seasonWins || 0).toString());
    setText(doc, 'stat-daily-streak', (s.dailyStreak || 0).toString());
  }

  function updateModifiersUI() {
    const doc = getDoc('modifiers');
    if (!doc) return;
    const allMods: Modifier[] = ['bigObjects', 'speedDemon', 'noBombs', 'mirror', 'oneLife', 'tinyObjects', 'chaos'];
    allMods.forEach((mod, i) => {
      const on = activeModifiers.has(mod);
      setText(doc, `mod-${i + 1}-name`, mod === 'bigObjects' ? 'BIG OBJECTS' :
        mod === 'speedDemon' ? 'SPEED DEMON' : mod === 'noBombs' ? 'NO BOMBS' :
        mod === 'mirror' ? 'MIRROR' : mod === 'oneLife' ? 'ONE LIFE' :
        mod === 'tinyObjects' ? 'TINY OBJECTS' : 'CHAOS');
      setText(doc, `mod-${i + 1}-status`, on ? '[ON]' : '[OFF]');
      setText(doc, `mod-${i + 1}-desc`, MODIFIER_DESCS[mod]);
    });
    const count = activeModifiers.size;
    setText(doc, 'mod-count', count > 0 ? `${count} active` : 'None active');
  }

  // Screen shake
  function triggerShake(intensity: number, duration: number) {
    if (!save.settings.screenShake) return;
    shakeIntensity = intensity;
    shakeTimer = duration;
  }

  function updateScreenShake(dt: number) {
    if (shakeTimer <= 0) return;
    shakeTimer -= dt;
    const t = shakeTimer > 0 ? shakeIntensity * (shakeTimer / 0.3) : 0;
    const camera = (world as any).render?.camera;
    if (camera) {
      camera.position.x = cameraOrigPos.x + (Math.random() - 0.5) * t * 0.05;
      camera.position.y = cameraOrigPos.y + (Math.random() - 0.5) * t * 0.03;
    }
    if (shakeTimer <= 0) {
      if (camera) {
        camera.position.x = cameraOrigPos.x;
        camera.position.y = cameraOrigPos.y;
      }
    }
  }

  // Star rating
  function calculateStars(mode: GameMode, diff: Difficulty, finalScore: number): number {
    const thresholds = STAR_THRESHOLDS[mode]?.[diff];
    if (!thresholds) return 0;
    if (finalScore >= thresholds[2]) return 3;
    if (finalScore >= thresholds[1]) return 2;
    if (finalScore >= thresholds[0]) return 1;
    return 0;
  }

  function getTotalStars(): number {
    return Object.values(save.stars).reduce((sum, s) => sum + s, 0);
  }

  // Type combo helper
  function handleTypeCombo(type: ObjType) {
    if (type === lastSlicedType) {
      typeComboCount++;
      if (typeComboCount > bestTypeCombo) bestTypeCombo = typeComboCount;
      if (typeComboCount >= 3) {
        const bonus = typeComboCount * 100;
        score += bonus;
        showToast(`TYPE COMBO x${typeComboCount}! +${bonus}`);
        audio.typeCombo(typeComboCount);
        if (typeComboCount >= 3) checkAchievementSilent('type_combo_3');
        if (typeComboCount >= 5) checkAchievementSilent('type_combo_5');
      }
    } else {
      lastSlicedType = type;
      typeComboCount = 1;
    }
  }

  // Charge attack AOE
  function executeChargeAttack(pos: Vector3) {
    chargesThisGame++;
    save.career.chargesUsed = (save.career.chargesUsed || 0) + 1;
    audio.chargeRelease();
    spawnParticles(pos, 30, bladeSkin().glow, 6);
    triggerShake(1.0, 0.3);

    let slicedCount = 0;
    for (const obj of objPool) {
      if (!obj.active) continue;
      const dist = obj.group.position.distanceTo(pos);
      if (dist <= CHARGE_RADIUS) {
        handleSlice(obj);
        slicedCount++;
      }
    }
    if (slicedCount > 0) {
      showToast(`CHARGE! ${slicedCount} SLICED!`);
      addXP(slicedCount * 15);
    }
    if (chargesThisGame === 1) checkAchievementSilent('charge_first');
    if (save.career.chargesUsed >= 5) checkAchievementSilent('charge_5');
    if (slicedCount >= 3) checkAchievementSilent('charge_aoe_3');
  }

  // Prestige system — reset level for permanent score multiplier
  function canPrestige(): boolean {
    return save.career.level >= 50;
  }

  function doPrestige() {
    if (!canPrestige()) return;
    save.career.prestige = (save.career.prestige || 0) + 1;
    save.career.level = 1;
    save.career.xp = 0;
    save.career.prestigeMultiplier = 1 + save.career.prestige * 0.1; // +10% per prestige
    if (save.career.prestige === 1) checkAchievementSilent('prestige_1');
    if (save.career.prestige >= 3) checkAchievementSilent('prestige_3');
    saveSave(save);
    showToast(`PRESTIGE ${save.career.prestige}! +${save.career.prestige * 10}% SCORE`);
    audio.levelUp();
    updateStats();
  }

  // Daily streak
  function updateDailyStreak() {
    const today = new Date().toISOString().split('T')[0];
    const last = save.career.lastDailyDate || '';
    if (last === today) return; // already played today

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (last === yesterday) {
      save.career.dailyStreak = (save.career.dailyStreak || 0) + 1;
    } else {
      save.career.dailyStreak = 1;
    }
    save.career.lastDailyDate = today;
    if (save.career.dailyStreak >= 3) checkAchievementSilent('daily_streak_3');
    if (save.career.dailyStreak >= 7) checkAchievementSilent('daily_streak_7');
    showToast(`DAILY STREAK: ${save.career.dailyStreak}`);
    saveSave(save);
  }

  // Season mode boss types — different behaviors
  type BossType = 'orbiter' | 'charger' | 'splitter';
  const BOSS_TYPES: { type: BossType; color: string; emissive: string; hp: number; desc: string }[] = [
    { type: 'orbiter', color: '#ffd700', emissive: '#ffaa00', hp: 1.0, desc: 'Orbits in circles' },
    { type: 'charger', color: '#ff4444', emissive: '#cc2222', hp: 0.8, desc: 'Charges toward player' },
    { type: 'splitter', color: '#44ff88', emissive: '#22cc44', hp: 1.3, desc: 'Splits into mini-bosses' },
  ];
  let currentBossType: BossType = 'orbiter';

  // Spawn formations — objects launch in patterns
  type Formation = 'random' | 'line' | 'vShape' | 'circle' | 'cross' | 'shower';
  const FORMATIONS: Formation[] = ['random', 'line', 'vShape', 'circle', 'cross', 'shower'];

  function spawnFormation(formation: Formation, count: number, rng?: () => number) {
    const r = rng || Math.random;
    switch (formation) {
      case 'line': {
        const baseX = -1;
        const step = 2 / Math.max(count - 1, 1);
        for (let i = 0; i < count; i++) {
          setTimeout(() => {
            if (gameState !== 'playing') return;
            const type = getObjTypeForWave(r);
            const obj = getPoolObj(type);
            if (!obj) return;
            obj.active = true; obj.age = 0;
            const x = baseX + i * step;
            obj.group.position.set(x, -0.5, -1.8 - r() * 0.3);
            const diffMult = difficulty === 'easy' ? 0.8 : difficulty === 'hard' ? 1.3 : 1.0;
            obj.velocity.set(0, (5 + r()) * diffMult, 0);
            obj.angVel.set((r()-0.5)*4, (r()-0.5)*4, (r()-0.5)*4);
            obj.group.visible = true;
            obj.group.scale.setScalar(activeModifiers.has('bigObjects') ? 2 : activeModifiers.has('tinyObjects') ? 0.5 : 1);
            obj.radius = OBJ_CONFIGS[type].radius * obj.group.scale.x;
            obj.hitsLeft = type === 'crystal' ? 3 : 1;
            obj.innerMesh.material = new MeshStandardMaterial({ color: OBJ_CONFIGS[type].color, emissive: OBJ_CONFIGS[type].emissive, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.3 });
            totalSpawned++;
            audio.launch();
          }, i * 80);
        }
        break;
      }
      case 'vShape': {
        const mid = Math.floor(count / 2);
        for (let i = 0; i < count; i++) {
          const delay = Math.abs(i - mid) * 120;
          setTimeout(() => {
            if (gameState !== 'playing') return;
            const type = getObjTypeForWave(r);
            launchObj(type, r);
          }, delay);
        }
        break;
      }
      case 'circle': {
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          setTimeout(() => {
            if (gameState !== 'playing') return;
            const type = getObjTypeForWave(r);
            const obj = getPoolObj(type);
            if (!obj) return;
            obj.active = true; obj.age = 0;
            const x = Math.cos(angle) * 1;
            const z = -1.8 + Math.sin(angle) * 0.3;
            obj.group.position.set(x, -0.5, z);
            const diffMult = difficulty === 'easy' ? 0.8 : difficulty === 'hard' ? 1.3 : 1.0;
            obj.velocity.set(Math.cos(angle) * 0.5, (5 + r()) * diffMult, 0);
            obj.angVel.set((r()-0.5)*4, (r()-0.5)*4, (r()-0.5)*4);
            obj.group.visible = true;
            obj.group.scale.setScalar(activeModifiers.has('bigObjects') ? 2 : activeModifiers.has('tinyObjects') ? 0.5 : 1);
            obj.radius = OBJ_CONFIGS[type].radius * obj.group.scale.x;
            obj.hitsLeft = type === 'crystal' ? 3 : 1;
            obj.innerMesh.material = new MeshStandardMaterial({ color: OBJ_CONFIGS[type].color, emissive: OBJ_CONFIGS[type].emissive, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.3 });
            totalSpawned++;
            audio.launch();
          }, i * 100);
        }
        break;
      }
      case 'cross': {
        // Two lines: horizontal and vertical offset timing
        const half = Math.floor(count / 2);
        for (let i = 0; i < half; i++) {
          setTimeout(() => { if (gameState === 'playing') launchObj(getObjTypeForWave(r), r); }, i * 100);
        }
        setTimeout(() => {
          for (let i = 0; i < count - half; i++) {
            setTimeout(() => { if (gameState === 'playing') launchObj(getObjTypeForWave(r), r); }, i * 100);
          }
        }, 400);
        break;
      }
      case 'shower': {
        // All at once from wide spread
        for (let i = 0; i < count; i++) {
          setTimeout(() => { if (gameState === 'playing') launchObj(getObjTypeForWave(r), r); }, r() * 200);
        }
        break;
      }
      default:
        spawnWave(count, rng);
    }
  }

  function getRandomFormation(wave: number): Formation {
    if (wave <= 2) return 'random'; // First waves are simple
    if (wave % 5 === 0) return 'circle'; // Every 5th wave is a circle
    return FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)];
  }

  // Tutorial state
  let tutorialStep = 0;
  let tutorialSeen = false;
  let currentFormation: Formation = 'random';

  function checkTutorial(): boolean {
    if (save.career.games > 0 || tutorialSeen) return false;
    return true;
  }

  function updateSkins() {
    const doc = getDoc('skins');
    if (!doc) return;
    for (let i = 1; i <= 16; i++) {
      const idx = i - 1;
      const unlocked = isSkinUnlocked(idx);
      const equipped = skinIdx === idx;
      setText(doc, `skin-${i}-name`, BLADE_SKINS[idx]?.name || '');
      setText(doc, `skin-${i}-status`, equipped ? 'EQUIPPED' : unlocked ? 'Available' : `Locked: ${BLADE_SKINS[idx]?.unlock || ''}`);
    }
  }

  function updateSettingsUI() {
    const doc = getDoc('settings');
    if (!doc) return;
    setText(doc, 'vol-master', save.settings.masterVol.toString());
    setText(doc, 'vol-sfx', save.settings.sfxVol.toString());
    setText(doc, 'vol-music', save.settings.musicVol.toString());
    setText(doc, 'theme-name', THEMES[themeIdx].name);
    setText(doc, 'shake-status', save.settings.screenShake ? 'ON' : 'OFF');
    const p = save.career.prestige || 0;
    setText(doc, 'prestige-status', canPrestige() ? `PRESTIGE ${p} → ${p + 1}` : `LV ${save.career.level}/50`);
  }

  function updateSeasonUI() {
    const doc = getDoc('season');
    if (!doc) return;
    for (let i = 1; i <= 8; i++) {
      const opp = SEASON_OPPONENTS[i - 1];
      setText(doc, `opp-${i}-stage`, opp.title);
      setText(doc, `opp-${i}-name`, opp.name);
      if (i - 1 < seasonStage) {
        setText(doc, `opp-${i}-status`, 'CLEARED');
      } else if (i - 1 === seasonStage) {
        setText(doc, `opp-${i}-status`, 'NEXT');
      } else {
        setText(doc, `opp-${i}-status`, '--');
      }
    }
    setText(doc, 'season-subtitle', seasonStage >= 8 ? 'SEASON COMPLETE!' : `STAGE ${seasonStage + 1}/8`);
  }

  // ---- Challenge UI ----
  function updateChallengeUI() {
    const doc = getDoc('challenge');
    if (!doc) return;
    // Show saved challenges
    const challenges = save.savedChallenges || [];
    for (let i = 0; i < 5; i++) {
      if (i < challenges.length) {
        const c = challenges[i];
        const modStr = c.modifiers.length > 0 ? c.modifiers.join('+') : 'none';
        setText(doc, `ch-${i + 1}-name`, c.name);
        setText(doc, `ch-${i + 1}-info`, `${c.mode} / ${c.difficulty} / ${modStr}`);
      } else {
        setText(doc, `ch-${i + 1}-name`, '---');
        setText(doc, `ch-${i + 1}-info`, '');
      }
    }
    setText(doc, 'ch-code', '');
  }

  function applyChallengeConfig(cfg: ChallengeConfig) {
    gameMode = cfg.mode;
    difficulty = cfg.difficulty;
    activeModifiers.clear();
    cfg.modifiers.forEach(m => activeModifiers.add(m));
    themeIdx = cfg.themeIdx;
    skinIdx = cfg.skinIdx;
    applyTheme();
    inChallengeMode = true;
    activeChallenge = cfg;
    startCountdown();
  }

  function createCurrentChallenge(): ChallengeConfig {
    return {
      mode: gameMode || 'classic',
      difficulty: difficulty || 'medium',
      modifiers: Array.from(activeModifiers) as Modifier[],
      themeIdx,
      skinIdx,
      name: `Challenge ${(save.savedChallenges || []).length + 1}`,
    };
  }

  // ---- History UI ----
  function updateHistoryUI() {
    const doc = getDoc('history');
    if (!doc) return;
    const history = save.history || [];
    const pageSize = 8;
    const maxPage = Math.max(0, Math.ceil(history.length / pageSize) - 1);
    historyPage = Math.min(historyPage, maxPage);
    const start = historyPage * pageSize;
    const page = history.slice(start, start + pageSize);
    for (let i = 0; i < pageSize; i++) {
      if (i < page.length) {
        const h = page[i];
        const d = new Date(h.date);
        const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
        setText(doc, `hist-${i + 1}-mode`, h.mode);
        setText(doc, `hist-${i + 1}-score`, h.score.toLocaleString());
        setText(doc, `hist-${i + 1}-acc`, `${h.accuracy}%`);
        setText(doc, `hist-${i + 1}-combo`, `x${h.bestCombo + 1}`);
        setText(doc, `hist-${i + 1}-stars`, '★'.repeat(h.stars) + '☆'.repeat(3 - h.stars));
        setText(doc, `hist-${i + 1}-date`, dateStr);
      } else {
        setText(doc, `hist-${i + 1}-mode`, '');
        setText(doc, `hist-${i + 1}-score`, '');
        setText(doc, `hist-${i + 1}-acc`, '');
        setText(doc, `hist-${i + 1}-combo`, '');
        setText(doc, `hist-${i + 1}-stars`, '');
        setText(doc, `hist-${i + 1}-date`, '');
      }
    }
    setText(doc, 'hist-page', `${historyPage + 1}/${maxPage + 1}`);
    setText(doc, 'hist-total', `${history.length} games`);
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
    setText(doc, 'go-xp', `+${sessionXP} XP`);
    setText(doc, 'go-level', `LV ${save.career.level}`);
    // Star rating
    const stars = calculateStars(gameMode, difficulty, score);
    const starStr = stars > 0 ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '☆☆☆';
    setText(doc, 'go-stars', starStr);
    // Streak
    setText(doc, 'go-streak', sliceStreak.toString());
    // Type combo
    setText(doc, 'go-typecombo', bestTypeCombo >= 3 ? `x${bestTypeCombo}` : '--');
    // Replay summary
    setText(doc, 'go-replay', replayBuffer.length > 0 ? `Last ${REPLAY_WINDOW}s: ${replayBuffer.length} slices` : '');
    // Start instant replay visualization
    startReplay();
  }

  function startReplay() {
    stopReplay();
    if (replayBuffer.length === 0) return;
    replayActive = true;
    replayEvents = [...replayBuffer];
    replayStartTime = totalTime;
    // Create marker meshes for replay
    replayEvents.forEach(ev => {
      const geo = new SphereGeometry(0.05, 8, 8);
      const mat = new MeshBasicMaterial({ color: OBJ_CONFIGS[ev.type]?.color || '#ffffff', transparent: true, opacity: 0, blending: AdditiveBlending });
      const mesh = new Mesh(geo, mat);
      mesh.position.copy(ev.pos);
      mesh.visible = false;
      world.scene.add(mesh);
      replayMarkers.push(mesh);
    });
  }

  function stopReplay() {
    replayActive = false;
    replayMarkers.forEach(m => { world.scene.remove(m); m.geometry.dispose(); (m.material as MeshBasicMaterial).dispose(); });
    replayMarkers = [];
    replayEvents = [];
  }

  function updateReplay(dt: number) {
    if (!replayActive || replayEvents.length === 0) return;
    const elapsed = totalTime - replayStartTime;
    const replayDuration = REPLAY_WINDOW + 1; // replay over REPLAY_WINDOW + 1s
    if (elapsed > replayDuration) {
      // Loop replay
      replayStartTime = totalTime;
      replayMarkers.forEach(m => { m.visible = false; (m.material as MeshBasicMaterial).opacity = 0; });
      return;
    }
    const timeBase = replayEvents[0].time;
    const timeScale = REPLAY_WINDOW / replayDuration;
    for (let i = 0; i < replayEvents.length; i++) {
      const ev = replayEvents[i];
      const eventTime = (ev.time - timeBase) / timeScale;
      const marker = replayMarkers[i];
      if (elapsed >= eventTime) {
        marker.visible = true;
        const age = elapsed - eventTime;
        const fade = Math.max(0, 1 - age / 1.5);
        (marker.material as MeshBasicMaterial).opacity = fade * 0.8;
        marker.scale.setScalar(1 + age * 2);
      }
    }
  }

  // ---- State Management ----
  function switchState(state: GameState) {
    prevState = gameState;
    gameState = state;
    hideAllPanels();
    switch (state) {
      case 'title': showPanel('title'); stopReplay(); break;
      case 'modeSelect': showPanel('modeSelect'); break;
      case 'difficulty': showPanel('difficulty'); break;
      case 'playing':
        showPanel('hud');
        showPanel('xpbar');
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
      case 'modifiers': showPanel('modifiers'); break;
      case 'season': showPanel('season'); break;
      case 'tutorial': showPanel('tutorial'); break;
      case 'challenge': showPanel('challenge'); break;
      case 'history': updateHistoryUI(); showPanel('history'); break;
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
    stopReplay();
    replayBuffer.length = 0;
    score = 0;
    lives = (gameMode === 'zen' || gameMode === 'timeAttack' || gameMode === 'frenzy' || gameMode === 'blitz') ? -1 :
            (activeModifiers.has('oneLife')) ? 1 : 3;
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
    sessionXP = 0;
    comboAnnounceLast = 0;

    // Reset power-ups
    shieldActive = false; shieldTimer = 0;
    magnetActive = false; magnetTimer = 0;
    doublePointsActive = false; doublePointsTimer = 0;
    shieldsCollected = 0; magnetsCollected = 0; doublesCollected = 0;
    totalPowerups = 0; usedPowerups = false;
    crystalsThisGame = 0;
    chargesThisGame = 0;
    chargeLevel = 0; chargeActive = false; chargeReady = false;
    lastSlicedType = null; typeComboCount = 0; bestTypeCombo = 0;
    shakeIntensity = 0; shakeTimer = 0;

    // Season mode adjustments
    if (inSeasonMode && seasonStage < SEASON_OPPONENTS.length) {
      const opp = SEASON_OPPONENTS[seasonStage];
      // Apply season-specific wave count — override normal wave count
      // Theme matches opponent flavor
      themeIdx = seasonStage % THEMES.length;
      applyTheme();
    }

    // Reset boss
    bossActive = false; bossHP = 0; bossObj = null;

    // Reset wave tracking
    wavePerfect = true; waveSliced = 0; waveTotal = 0;

    if (gameMode === 'timeAttack') gameTimer = 60;
    else if (gameMode === 'frenzy') gameTimer = 30;
    else if (gameMode === 'blitz') gameTimer = 45;
    else if (gameMode === 'precision') { gameTimer = 0; lives = 3; }
    else gameTimer = 0;

    if (gameMode === 'daily') dailyRng = mulberry32(dateSeed());
    else dailyRng = null;

    // Clear active objects
    objPool.forEach(o => { o.active = false; o.group.visible = false; });
    slicedHalves.forEach(h => world.scene.remove(h.mesh));
    slicedHalves.length = 0;

    audio.startDrone(themeIdx);
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

    // Modifier tracking
    if (activeModifiers.size > 0) {
      checkAchievementSilent('mod_complete');
      activeModifiers.forEach(mod => {
        if (!save.career.modifiersUsed.includes(mod)) save.career.modifiersUsed.push(mod);
      });
      if (save.career.modifiersUsed.length >= 7) checkAchievementSilent('mod_all');
      if (activeModifiers.has('chaos') && score >= 10000) checkAchievementSilent('chaos_10k');
      if (activeModifiers.has('oneLife') && gameMode === 'classic' && lives > 0) checkAchievementSilent('onelife_win');
    }
    // Endless score check
    if (gameMode === 'endless' && score >= 100000) checkAchievementSilent('endless_100k');
    // Music achievement
    if (save.settings.musicVol > 0) checkAchievementSilent('play_music');

    // Star rating
    const stars = calculateStars(gameMode, difficulty, score);
    const starKey = `${gameMode}_${difficulty}`;
    if (stars > (save.stars[starKey] || 0)) {
      save.stars[starKey] = stars;
      if (stars > 0) checkAchievementSilent('star_first');
      if (getTotalStars() >= 10) checkAchievementSilent('stars_10');
      // Check all 3-star
      const allModes: GameMode[] = ['classic', 'zen', 'timeAttack', 'survival', 'frenzy', 'daily', 'precision', 'endless'];
      const allDiffs: Difficulty[] = ['easy', 'medium', 'hard'];
      let allThreeStars = true;
      for (const m of allModes) {
        for (const d of allDiffs) {
          if ((save.stars[`${m}_${d}`] || 0) < 3) { allThreeStars = false; break; }
        }
        if (!allThreeStars) break;
      }
      if (allThreeStars) checkAchievementSilent('stars_all');
    }

    // Quick play tracking
    if (isQuickPlay) {
      save.career.quickPlays = (save.career.quickPlays || 0) + 1;
      if (save.career.quickPlays >= 3) checkAchievementSilent('quick_play_3');
      isQuickPlay = false;
    }

    // Season mode tracking
    if (inSeasonMode) {
      // Win condition: survived all waves (lives > 0)
      if (lives > 0 && gameMode === 'classic') {
        // Season win!
        seasonStage++;
        if (seasonStage > (save.career.seasonBestStage || 0)) {
          save.career.seasonBestStage = seasonStage;
        }
        if (seasonStage >= 4) checkAchievementSilent('season_stage_4');
        if (seasonStage >= 8) {
          checkAchievementSilent('season_stage_8');
          checkAchievementSilent('season_win');
          save.career.seasonWins = (save.career.seasonWins || 0) + 1;
          showToast('SEASON CHAMPION!');
          seasonStage = 0; // Reset for next season
        } else {
          showToast(`STAGE ${seasonStage} CLEARED!`);
        }
      } else {
        // Lost — season resets
        showToast('SEASON OVER');
        seasonStage = 0;
      }
      inSeasonMode = false;
    }

    // Daily challenge streak
    if (gameMode === 'daily') {
      updateDailyStreak();
    }

    // Apply prestige multiplier to final score
    const prestigeMult = save.career.prestigeMultiplier || 1;
    if (prestigeMult > 1) {
      const bonus = Math.floor(score * (prestigeMult - 1));
      save.career.totalScore += bonus;
      // Already added regular score above
    }

    // Record game history
    const histEntry: GameHistoryEntry = {
      mode: inSeasonMode ? `season-${seasonStage}` : gameMode,
      difficulty,
      score,
      slices: sliceCount,
      accuracy: totalSpawned > 0 ? Math.round((sliceCount / totalSpawned) * 100) : 0,
      bestCombo,
      stars: calculateStars(gameMode, difficulty, score),
      duration: Math.round(gameTime),
      modifiers: Array.from(activeModifiers),
      date: new Date().toISOString(),
    };
    if (!save.history) save.history = [];
    save.history.unshift(histEntry);
    save.history = save.history.slice(0, 50); // keep last 50
    // History achievements
    if (save.history.length >= 10) checkAchievementSilent('history_10');
    if (save.history.length >= 50) checkAchievementSilent('history_50');
    // Accuracy achievement: 10 games with 90%+ accuracy
    const highAccGames = save.history.filter(h => h.accuracy >= 90).length;
    if (highAccGames >= 10) checkAchievementSilent('accuracy_90_10');
    // Hard all modes achievement
    const hardModes = new Set(save.history.filter(h => h.difficulty === 'hard' && h.stars > 0).map(h => h.mode));
    const allBaseModes: GameMode[] = ['classic','zen','timeAttack','survival','frenzy','precision','endless','blitz'];
    if (allBaseModes.every(m => hardModes.has(m))) checkAchievementSilent('hard_all_modes');
    // Challenge tracking
    if (inChallengeMode) {
      challengesPlayed++;
      checkAchievementSilent('challenge_play');
      if (challengesPlayed >= 3) checkAchievementSilent('challenge_3');
      inChallengeMode = false;
      activeChallenge = null;
    }

    // Replay achievement
    if (replayBuffer.length >= 5) checkAchievementSilent('replay_5');
    // Arena theme tracking
    const currentThemeName = THEMES[themeIdx].name;
    if (!save.career.themesUsed.includes(currentThemeName)) {
      save.career.themesUsed.push(currentThemeName);
    }
    if (save.career.themesUsed.length >= THEMES.length) checkAchievementSilent('all_themes_play');
    if (save.career.themesUsed.length >= 10) checkAchievementSilent('theme_10');
    // Total slices milestone
    if (save.career.totalSlices >= 10000) checkAchievementSilent('slice_10k');
    // Score milestones
    if (score >= 200000) checkAchievementSilent('score_200k');
    // Endless wave milestone
    if (gameMode === 'endless' && waveNum >= 100) checkAchievementSilent('endless_w100');
    // Daily streak
    if (save.career.dailyStreak >= 14) checkAchievementSilent('daily_streak_14');

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
        if (id !== 'skin_unlock') {
          for (let i = 1; i < BLADE_SKINS.length; i++) {
            if (isSkinUnlocked(i) && !save.achievements.includes('skin_unlock')) {
              tryUnlock('skin_unlock');
              break;
            }
          }
        }
        // Check all skins
        if (id !== 'all_skins') {
          let allUnlocked = true;
          for (let i = 0; i < BLADE_SKINS.length; i++) {
            if (!isSkinUnlocked(i)) { allUnlocked = false; break; }
          }
          if (allUnlocked) tryUnlock('all_skins');
        }
      }
    };

    const s = save.career;
    // Slice milestones
    if (s.totalSlices >= 1) tryUnlock('first_slice');
    if (s.totalSlices >= 10) tryUnlock('ten_slices');
    if (s.totalSlices >= 50) tryUnlock('fifty_slices');
    if (s.totalSlices >= 100) tryUnlock('hundred_slices');
    if (s.totalSlices >= 500) tryUnlock('five_hundred');
    if (s.totalSlices >= 1000) tryUnlock('thousand_slices');
    // Combo
    if (bestCombo >= 2) tryUnlock('combo_x3');
    if (bestCombo >= 4) tryUnlock('combo_x5');
    if (bestCombo >= 7) tryUnlock('combo_x8');
    if (bestCombo >= 9) tryUnlock('combo_x10');
    // Score
    if (score >= 1000) tryUnlock('score_1k');
    if (score >= 5000) tryUnlock('score_5k');
    if (score >= 10000) tryUnlock('score_10k');
    if (score >= 25000) tryUnlock('score_25k');
    if (score >= 50000) tryUnlock('score_50k');
    if (score >= 100000) tryUnlock('score_100k');
    // Accuracy
    if (sliceStreak >= 10) tryUnlock('no_miss_10');
    if (sliceStreak >= 25) tryUnlock('no_miss_25');
    if (sliceStreak >= 50) tryUnlock('no_miss_50');
    const acc = totalSpawned > 0 ? sliceCount / totalSpawned : 0;
    if (acc >= 0.8 && totalSpawned >= 10) tryUnlock('accuracy_80');
    if (acc >= 0.95 && totalSpawned >= 20) tryUnlock('accuracy_95');
    if (acc >= 1.0 && totalSpawned >= 20) tryUnlock('accuracy_100');
    // Bomb/special
    if (bombsDodged >= 10) tryUnlock('bomb_dodge');
    if (freezeCount >= 5) tryUnlock('freeze_5');
    if (shieldsCollected >= 3) tryUnlock('shield_3');
    if (magnetsCollected >= 3) tryUnlock('magnet_3');
    if (doublesCollected >= 5) tryUnlock('double_5');
    if (totalPowerups >= 10) tryUnlock('powerup_10');
    if (!usedPowerups && score >= 5000 && totalSpawned >= 10) tryUnlock('no_powerups');
    // Games played
    if (s.games >= 10) tryUnlock('games_10');
    if (s.games >= 50) tryUnlock('games_50');
    if (s.games >= 100) tryUnlock('games_100');
    // Mode mastery
    if (gameMode === 'classic' && lives > 0 && waveNum >= (difficulty === 'easy' ? 8 : difficulty === 'hard' ? 15 : 10)) tryUnlock('classic_win');
    if (gameMode === 'classic' && lives > 0 && waveNum >= 10 && bombsHit === 0) tryUnlock('no_bomb_classic');
    if (gameMode === 'classic' && lives === 1) tryUnlock('comeback');
    if (gameMode === 'survival' && gameTime >= 60) tryUnlock('survival_60');
    if (gameMode === 'survival' && gameTime >= 120) tryUnlock('survival_120');
    if (gameMode === 'survival' && gameTime >= 180) tryUnlock('survival_180');
    if (gameMode === 'frenzy' && score >= 1000) tryUnlock('frenzy_1k');
    if (gameMode === 'frenzy' && score >= 5000) tryUnlock('frenzy_5k');
    if (gameMode === 'blitz' && score >= 5000) tryUnlock('blitz_5k');
    if (gameMode === 'blitz' && score >= 10000) tryUnlock('blitz_10k');
    if (gameMode === 'daily') tryUnlock('daily_done');
    if (gameMode === 'zen' && sliceCount >= 100) tryUnlock('zen_100');
    if (gameMode === 'timeAttack' && score >= 5000) tryUnlock('timeattack_5k');
    if (s.modesPlayed.length >= 8) tryUnlock('all_modes');
    // Theme explorer
    if (s.themesUsed.length >= THEMES.length) tryUnlock('theme_explorer');
    // Score totals
    if (s.totalScore >= 50000) tryUnlock('total_50k');
    if (s.totalScore >= 100000) tryUnlock('total_100k');
    if (s.totalScore >= 500000) tryUnlock('total_500k');
    // Time played
    if (s.playTimeMs >= 3600000) tryUnlock('play_1h');
    if (s.playTimeMs >= 18000000) tryUnlock('play_5h');
    // Level
    if (s.level >= 5) tryUnlock('level_5');
    if (s.level >= 10) tryUnlock('level_10');
    if (s.level >= 25) tryUnlock('level_25');
    if (s.level >= 50) tryUnlock('level_50');
    // Score totals extended
    if (s.totalScore >= 1000000) tryUnlock('total_1m');
    if (s.totalSlices >= 5000) tryUnlock('slices_5k');
    // No damage run
    if (gameMode === 'classic' && difficulty === 'hard' && lives === 3 && bombsHit === 0 && waveNum >= 15) tryUnlock('no_damage');
    // Formation achievements  
    if (wavePerfect && waveTotal > 0 && waveSliced === waveTotal) {
      if (currentFormation === 'circle') tryUnlock('form_circle');
      if (currentFormation === 'line') tryUnlock('form_line');
    }
    // Speed slicing
    if (slicesInWindow.length >= 10) {
      const windowSlices = slicesInWindow.filter(t => gameTime - t <= 3);
      if (windowSlices.length >= 10) tryUnlock('speed_master');
    }
  }


  // ---- Slice Detection ----
  let dualSliceFrame = 0; // count simultaneous slices in a frame for dual_slice achievement

  function handleSlice(obj: FlyingObj) {
    if (!obj.active) return;

    // Boss object — takes multiple hits
    if (obj === bossObj && bossActive) {
      bossHP--;
      audio.bossHit();
      spawnParticles(obj.group.position.clone(), 10, '#ffd700', 3);
      // Flash the boss
      (obj.innerMesh.material as any).emissiveIntensity = 3;
      setTimeout(() => { if (obj.innerMesh.material) (obj.innerMesh.material as any).emissiveIntensity = 0.8; }, 100);
      if (bossHP <= 0) {
        // Boss defeated!
        bossActive = false;
        bossObj = null;
        obj.active = false;
        obj.group.visible = false;
        const bossPoints = 2000 * (combo + 1);
        score += doublePointsActive ? bossPoints * 2 : bossPoints;
        sliceCount++;
        save.career.bossesDefeated = (save.career.bossesDefeated || 0) + 1;
        audio.bossDefeat();
        triggerShake(2.0, 0.5);
        spawnParticles(obj.group.position.clone(), 40, '#ffd700', 6);
        createSliceHalves(obj, new Vector3(0, 1, 0));
        showToast('BOSS DEFEATED! +' + bossPoints);
        if (!save.achievements.includes('boss_kill')) {
          save.achievements.push('boss_kill');
          showToast('Boss Slayer!');
          audio.achievement();
        }
        if (lives === bossLivesAtStart && !save.achievements.includes('boss_no_hit')) {
          save.achievements.push('boss_no_hit');
          showToast('Untouched!');
          audio.achievement();
        }
        if ((save.career.bossesDefeated || 0) >= 5) checkAchievementSilent('boss_5');
        if ((save.career.bossesDefeated || 0) >= 25) checkAchievementSilent('boss_25');
        addXP(200);
      }
      return;
    }

    // Crystal multi-hit check
    if (obj.type === 'crystal' && obj.hitsLeft > 1) {
      obj.hitsLeft--;
      audio.bossHit();
      spawnParticles(obj.group.position.clone(), 8, OBJ_CONFIGS.crystal.color, 3);
      // Flash and shrink slightly
      (obj.innerMesh.material as any).emissiveIntensity = 3;
      setTimeout(() => { if (obj.innerMesh.material) (obj.innerMesh.material as any).emissiveIntensity = 0.8; }, 100);
      const shrink = 0.8 + obj.hitsLeft * 0.1;
      obj.group.scale.multiplyScalar(shrink / obj.group.scale.x || 1);
      showToast(`CRYSTAL ${3 - obj.hitsLeft}/3`);
      combo = Math.min(combo + 1, MAX_COMBO - 1);
      lastSliceTime = gameTime;
      updateComboDisplay();
      return;
    }
    // Crystal final hit
    if (obj.type === 'crystal') {
      crystalsThisGame++;
      save.career.crystalsShattered = (save.career.crystalsShattered || 0) + 1;
      if (save.career.crystalsShattered === 1) checkAchievementSilent('crystal_first');
      if (save.career.crystalsShattered >= 10) checkAchievementSilent('crystal_10');
      if (save.career.crystalsShattered >= 50) checkAchievementSilent('crystal_50');
      addXP(50);
    }

    obj.active = false;
    obj.group.visible = false;

    if (obj.type === 'bomb') {
      // Shield absorbs bomb
      if (shieldActive) {
        shieldActive = false;
        shieldTimer = 0;
        audio.shieldBlock();
        spawnParticles(obj.group.position.clone(), 15, '#00ff80', 4);
        showToast('SHIELD BLOCKED!');
        bombsDodged++;
        createSliceHalves(obj, new Vector3(0, 1, 0));
        return;
      }
      // Bomb hit!
      bombsHit++;
      score = Math.max(0, score + obj.points);
      if (lives > 0) lives--;
      audio.bombHit();
      triggerShake(1.5, 0.4);
      spawnParticles(obj.group.position.clone(), 20, OBJ_CONFIGS.bomb.color, 5);
      createSliceHalves(obj, new Vector3(0, 1, 0));
      showToast('BOMB!');
      if (lives === 0 && (gameMode === 'classic' || gameMode === 'survival' || gameMode === 'precision')) {
        endGame();
      }
      sliceStreak = 0;
      wavePerfect = false;
      return;
    }

    // Power-up handling
    if (obj.type === 'freeze') {
      freezeTimer = 5;
      freezeCount++;
      totalPowerups++;
      usedPowerups = true;
      audio.freeze();
    } else if (obj.type === 'shield') {
      shieldActive = true;
      shieldTimer = 15;
      shieldsCollected++;
      totalPowerups++;
      usedPowerups = true;
      audio.shieldPickup();
      showToast('SHIELD ACTIVE!');
    } else if (obj.type === 'magnet') {
      magnetActive = true;
      magnetTimer = 8;
      magnetsCollected++;
      totalPowerups++;
      usedPowerups = true;
      audio.magnetPickup();
      showToast('MAGNET ACTIVE!');
    } else if (obj.type === 'doublePoints') {
      doublePointsActive = true;
      doublePointsTimer = 8;
      doublesCollected++;
      totalPowerups++;
      usedPowerups = true;
      audio.doublePickup();
      showToast('DOUBLE POINTS!');
    }

    let points = obj.points * (combo + 1);
    if (doublePointsActive && obj.type !== 'doublePoints') points *= 2;
    score += points;
    sliceCount++;
    sliceStreak++;
    waveSliced++;

    // Combo
    lastSliceTime = gameTime;
    combo = Math.min(combo + 1, MAX_COMBO - 1);
    if (combo > bestCombo) bestCombo = combo;

    // Combo announcements
    for (const ann of COMBO_ANNOUNCEMENTS) {
      if (combo >= ann.threshold && comboAnnounceLast < ann.threshold) {
        showToast(ann.text, 1.5);
        audio.comboAnnounce(ann.threshold);
        comboAnnounceLast = ann.threshold;
        if (ann.threshold === 10) checkAchievementSilent('combo_godlike');
      }
    }

    // XP
    const xpGain = Math.floor(obj.points / 10) + combo;
    addXP(xpGain);

    // Type combo tracking
    if (['cube', 'sphere', 'diamond', 'star'].includes(obj.type)) {
      handleTypeCombo(obj.type);
    }

    // Record replay event
    replayBuffer.push({ time: gameTime, pos: obj.group.position.clone(), type: obj.type, comboAt: combo, score });
    // Trim old events
    while (replayBuffer.length > 0 && replayBuffer[0].time < gameTime - REPLAY_WINDOW) replayBuffer.shift();

    // Streak achievements
    if (sliceStreak >= 20) checkAchievementSilent('streak_20');
    if (sliceStreak >= 50) checkAchievementSilent('streak_50');

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
    // Triple slice (3 in 1 second)
    const recentSlices = slicesInWindow.filter(t => now - t <= 1);
    if (recentSlices.length >= 3 && !save.achievements.includes('triple_slice')) {
      save.achievements.push('triple_slice');
      showToast('Triple Threat!');
      audio.achievement();
    }

    // Dual slice tracking
    dualSliceFrame++;

    updateComboDisplay();
    updateHUD();
    updatePowerupHUD();
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
    const hasBombs = gameMode !== 'zen' && gameMode !== 'frenzy' &&
                     !activeModifiers.has('noBombs') && !activeModifiers.has('chaos');
    const bombChance = difficulty === 'easy' ? 0.08 : difficulty === 'hard' ? 0.2 : 0.13;
    const freezeChance = 0.06;
    const shieldChance = 0.04;
    const magnetChance = 0.04;
    const doubleChance = 0.04;
    const crystalChance = 0.05;

    let cumChance = 0;
    if (hasBombs) { cumChance += bombChance; if (r < cumChance) return 'bomb'; }
    cumChance += freezeChance; if (r < cumChance) return 'freeze';
    cumChance += shieldChance; if (r < cumChance) return 'shield';
    cumChance += magnetChance; if (r < cumChance) return 'magnet';
    cumChance += doubleChance; if (r < cumChance) return 'doublePoints';
    cumChance += crystalChance; if (r < cumChance) return 'crystal';

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
    const SPAWN_ANIM_DUR = 0.15; // seconds for pop-in animation

    for (const obj of objPool) {
      if (!obj.active) continue;
      obj.age += effectiveDt;
      obj.spawnAge += effectiveDt;

      // Spawn pop-in animation
      if (obj.spawnAge < SPAWN_ANIM_DUR) {
        const t = obj.spawnAge / SPAWN_ANIM_DUR;
        // Elastic ease-out: overshoot then settle
        const elastic = 1 + Math.sin(t * Math.PI) * 0.3;
        const baseScale = (activeModifiers.has('bigObjects') || activeModifiers.has('chaos')) ? 2.0 :
                          (activeModifiers.has('tinyObjects')) ? 0.5 : 1.0;
        obj.group.scale.setScalar(baseScale * t * elastic);
      }

      // Apply gravity
      obj.velocity.y += GRAVITY * effectiveDt;
      obj.group.position.addScaledVector(obj.velocity, effectiveDt);

      // Rotate
      obj.group.rotation.x += obj.angVel.x * effectiveDt;
      obj.group.rotation.y += obj.angVel.y * effectiveDt;
      obj.group.rotation.z += obj.angVel.z * effectiveDt;

      // Pulsing glow
      (obj.glowMesh.material as MeshBasicMaterial).opacity = 0.1 + Math.sin(gameTime * 4) * 0.05;

      // Object trail particles — emit particles behind flying objects
      if (obj.age > 0.15 && Math.random() < 0.15) {
        const trailColor = OBJ_CONFIGS[obj.type]?.color || '#ffffff';
        spawnParticles(obj.group.position.clone(), 1, trailColor, 0.5);
      }

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

    if (gameState !== 'playing') {
      // Update replay visualization on game over screen
      if (gameState === 'gameOver') updateReplay(dt);
      return;
    }

    // Game time
    const effectiveDt = freezeTimer > 0 ? dt * 0.3 : dt;
    gameTime += effectiveDt;

    // Freeze timer
    if (freezeTimer > 0) {
      freezeTimer -= dt; // real-time countdown
    }

    // Power-up timers
    if (shieldActive) {
      shieldTimer -= dt;
      if (shieldTimer <= 0) { shieldActive = false; shieldTimer = 0; }
    }
    if (magnetActive) {
      magnetTimer -= dt;
      if (magnetTimer <= 0) { magnetActive = false; magnetTimer = 0; }
    }
    if (doublePointsActive) {
      doublePointsTimer -= dt;
      if (doublePointsTimer <= 0) { doublePointsActive = false; doublePointsTimer = 0; }
    }
    updatePowerupHUD();

    // Level up display
    if (levelUpTimer > 0) {
      levelUpTimer -= dt;
      const doc = getDoc('levelup');
      setText(doc, 'levelup-text', levelUpText);
      panels.levelup.entity.object3D.visible = true;
      if (levelUpTimer <= 0) hidePanel('levelup');
    }

    // Wave announcement timer
    if (waveAnnounceTimer > 0) {
      waveAnnounceTimer -= dt;
      if (waveAnnounceTimer <= 0) hidePanel('wave');
    }

    // Magnet effect — pull nearby objects toward blade
    if (magnetActive) {
      const bladePos = tipBrowserValid ? currTipBrowser.clone() :
                       tipRightValid ? currTipRight.clone() :
                       new Vector3(0, 1.5, -1.8);
      for (const obj of objPool) {
        if (!obj.active || obj.type === 'bomb') continue;
        const dist = obj.group.position.distanceTo(bladePos);
        if (dist < magnetRadius && dist > 0.1) {
          const pullDir = new Vector3().subVectors(bladePos, obj.group.position).normalize();
          obj.velocity.addScaledVector(pullDir, 8 * dt);
        }
      }
    }

    // Boss behavior based on type
    if (bossActive && bossObj) {
      switch (currentBossType) {
        case 'orbiter':
          bossObj.group.position.y = 1.8 + Math.sin(gameTime * 1.5) * 0.15;
          bossObj.group.position.x = Math.sin(gameTime * 0.8) * 0.5;
          break;
        case 'charger':
          // Periodically charge toward player position then retreat
          const chargePhase = Math.sin(gameTime * 0.6);
          bossObj.group.position.z = -2.5 + chargePhase * 0.8;
          bossObj.group.position.y = 1.6 + Math.sin(gameTime * 2) * 0.1;
          bossObj.group.position.x = Math.sin(gameTime * 1.2) * 0.3;
          break;
        case 'splitter':
          bossObj.group.position.y = 2.0 + Math.sin(gameTime * 1) * 0.2;
          bossObj.group.position.x = Math.cos(gameTime * 0.5) * 0.6;
          break;
      }
      bossObj.velocity.set(0, 0, 0); // override gravity for boss
    }

    // Combo decay
    if (combo > 0 && gameTime - lastSliceTime > COMBO_DECAY_TIME) {
      combo = 0;
      comboAnnounceLast = 0;
      updateComboDisplay();
    }

    // Combo visual feedback — blade glow and lighting intensity
    const comboFactor = combo / MAX_COMBO; // 0 to 1
    if (comboFactor > 0) {
      const comboColor = COMBO_COLORS[Math.min(combo, COMBO_COLORS.length - 1)];
      // Pulse blade glow
      const pulseRate = 2 + combo * 0.5;
      const pulseIntensity = 0.3 + comboFactor * 0.7;
      const pulse = pulseIntensity * (0.7 + Math.sin(gameTime * pulseRate) * 0.3);
      [bladeRight, bladeLeft, browserBlade].forEach(blade => {
        blade.children.forEach(c => {
          if ((c as any).material?.blending === AdditiveBlending) {
            (c as any).material.opacity = pulse;
          }
        });
      });
      // Tint accent lights
      accentLight1.intensity = 2 + comboFactor * 3;
      accentLight2.intensity = 1.5 + comboFactor * 2;
    } else {
      accentLight1.intensity = 2;
      accentLight2.intensity = 1.5;
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

    // Blitz speed increase (faster ramp than survival)
    if (gameMode === 'blitz') {
      survivalSpeedMult = 1 + gameTime / 15 * 0.8; // +80% every 15s
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

    // Screen shake
    updateScreenShake(dt);

    // Charge attack
    if (chargeActive) {
      chargeLevel = Math.min(chargeLevel + dt / CHARGE_TIME, 1);
      if (chargeLevel >= 1 && !chargeReady) {
        chargeReady = true;
        showToast('CHARGE READY!');
      }
      if (chargeLevel > 0.1 && Math.random() < 0.3) {
        audio.chargeLoop(chargeLevel);
      }
    }

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
        const seasonWaves = inSeasonMode && seasonStage < SEASON_OPPONENTS.length ? SEASON_OPPONENTS[seasonStage].waves : 0;
        const maxWaves = seasonWaves > 0 ? seasonWaves :
                         difficulty === 'easy' ? 8 : difficulty === 'hard' ? 15 : 10;
        if (waveNum >= maxWaves) {
          const activeCount = objPool.filter(o => o.active).length;
          if (activeCount === 0 && slicedHalves.length === 0) endGame();
          return;
        }
        if (!waveActive && waveTimer >= getWaveDelay()) {
          waveActive = true;
          waveTimer = 0;
          waveNum++;
          wavePerfect = true;
          waveSliced = 0;
          const size = getWaveSize(waveNum);
          waveTotal = size;

          // Boss wave every 5 waves
          if (waveNum % 5 === 0 && waveNum > 0) {
            showWaveAnnouncement(`BOSS WAVE ${waveNum}`, 'DEFEAT THE BOSS!');
            setTimeout(() => spawnBoss(), 1500);
          } else {
            const formation = getRandomFormation(waveNum);
            currentFormation = formation;
            showWaveAnnouncement(`WAVE ${waveNum}`, getWaveFlavorText(waveNum));
            setTimeout(() => spawnFormation(formation, size, dailyRng || undefined), 1200);
          }
        }
        if (waveActive) {
          const activeCount = objPool.filter(o => o.active && o !== bossObj).length;
          if (activeCount === 0 && !bossActive) {
            // Check perfect wave
            if (wavePerfect && waveSliced === waveTotal && waveTotal > 0) {
              if (!save.achievements.includes('full_wave')) {
                save.achievements.push('full_wave');
                showToast('Perfect Wave!');
                audio.achievement();
              }
              score += 500; // Perfect wave bonus
              showToast('PERFECT WAVE! +500');
            }
            waveActive = false;
            waveTimer = 0;
          }
        }
        break;
      }

      case 'zen': {
        if (waveTimer >= (difficulty === 'easy' ? 1.5 : difficulty === 'hard' ? 0.6 : 1.0)) {
          waveTimer = 0;
          const count = 1 + Math.floor(rng() * 2);
          for (let i = 0; i < count; i++) {
            const types: ObjType[] = ['cube', 'sphere', 'diamond', 'star', 'freeze', 'shield', 'magnet', 'doublePoints'];
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
          showWaveAnnouncement(`WAVE ${waveNum}`, '');
          setTimeout(() => spawnWave(size, dailyRng!), 1200);
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

      case 'precision': {
        // Only score for specific target objects (glowing golden), penalty for wrong slices
        if (waveNum >= 12) {
          const activeCount = objPool.filter(o => o.active).length;
          if (activeCount === 0 && slicedHalves.length === 0) {
            if (!save.achievements.includes('precision_win')) {
              save.achievements.push('precision_win');
              showToast('Precision Expert!');
              audio.achievement();
            }
            endGame();
          }
          return;
        }
        if (!waveActive && waveTimer >= getWaveDelay()) {
          waveActive = true;
          waveTimer = 0;
          waveNum++;
          const size = 2 + Math.floor(waveNum / 3);
          showWaveAnnouncement(`WAVE ${waveNum}`, 'SLICE THE TARGETS!');
          setTimeout(() => spawnWave(size), 1200);
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

      case 'endless': {
        // Never-ending waves, progressively harder
        if (!waveActive && waveTimer >= Math.max(0.6, getWaveDelay() - waveNum * 0.05)) {
          waveActive = true;
          waveTimer = 0;
          waveNum++;
          wavePerfect = true;
          waveSliced = 0;
          const baseSize = getWaveSize(waveNum);
          const scaledSize = Math.min(baseSize + Math.floor(waveNum / 5), 12);
          waveTotal = scaledSize;

          // Boss every 10 waves in endless
          if (waveNum % 10 === 0) {
            showWaveAnnouncement(`BOSS WAVE ${waveNum}`, `BOSS HP: ${5 + Math.floor(waveNum / 5)}`);
            setTimeout(() => spawnBoss(), 1500);
          } else if (waveNum % 5 === 0) {
            // Bonus wave every 5 waves — all high-value + crystals
            showWaveAnnouncement(`BONUS WAVE ${waveNum}`, 'HIGH VALUE TARGETS!');
            setTimeout(() => {
              const bonusTypes: ObjType[] = ['star', 'diamond', 'crystal', 'doublePoints'];
              for (let i = 0; i < scaledSize; i++) {
                setTimeout(() => {
                  if (gameState !== 'playing') return;
                  launchObj(bonusTypes[Math.floor(Math.random() * bonusTypes.length)]);
                }, i * 150);
              }
            }, 1200);
          } else {
            const flavorTexts = ['GET READY', 'INCOMING!', 'HERE THEY COME', 'STAY SHARP',
              'FASTER!', 'RELENTLESS!', 'NO STOPPING!', 'ENDURE!', 'INFINITE!', 'ETERNAL!'];
            showWaveAnnouncement(`WAVE ${waveNum}`, flavorTexts[Math.min(waveNum - 1, flavorTexts.length - 1)]);
            const endlessFormation = getRandomFormation(waveNum);
            setTimeout(() => spawnFormation(endlessFormation, scaledSize), 1200);
          }

          // Achievements
          if (waveNum >= 10) checkAchievementSilent('endless_w10');
          if (waveNum >= 25) checkAchievementSilent('endless_w25');
          if (waveNum >= 50) checkAchievementSilent('endless_w50');
          if (waveNum > save.career.bestEndlessWave) save.career.bestEndlessWave = waveNum;
        }
        if (waveActive) {
          const activeCount = objPool.filter(o => o.active && o !== bossObj).length;
          if (activeCount === 0 && !bossActive) {
            // Perfect wave bonus
            if (wavePerfect && waveSliced === waveTotal && waveTotal > 0) {
              score += 500;
              showToast('PERFECT WAVE! +500');
            }
            waveActive = false;
            waveTimer = 0;
          }
        }
        break;
      }
    }
  }

  // Wave announcement helpers
  function showWaveAnnouncement(title: string, sub: string) {
    waveAnnounceTimer = 2.0;
    waveAnnounceName = title;
    const doc = getDoc('wave');
    setText(doc, 'wave-text', title);
    setText(doc, 'wave-sub', sub);
    showPanel('wave');
    audio.waveStart();
  }

  function getWaveFlavorText(wave: number): string {
    const texts = ['GET READY', 'INCOMING!', 'HERE THEY COME', 'STAY SHARP', 'FASTER!', 'HOLD STEADY', 'ALMOST THERE', 'FINAL PUSH', 'MAXIMUM VELOCITY', 'SHOW NO MERCY'];
    return texts[Math.min(wave - 1, texts.length - 1)];
  }

  // Boss spawning
  function spawnBoss() {
    const obj = getPoolObj('star');
    if (!obj) return;
    obj.active = true;
    obj.age = 0;

    // Choose boss type based on wave number
    const bossTypes: BossType[] = ['orbiter', 'charger', 'splitter'];
    currentBossType = bossTypes[waveNum % 3];
    const bossInfo = BOSS_TYPES.find(b => b.type === currentBossType) || BOSS_TYPES[0];

    // Boss position
    obj.group.position.set(0, 1.8, -2.5);
    obj.velocity.set(0, 0, 0);
    obj.angVel.set(0, 0.8, 0.3);
    obj.group.visible = true;
    obj.group.scale.setScalar(3);
    obj.radius = 0.35;

    // Boss material based on type
    obj.innerMesh.material = new MeshStandardMaterial({
      color: bossInfo.color, emissive: bossInfo.emissive,
      emissiveIntensity: 1.5, metalness: 0.9, roughness: 0.1,
    });
    (obj.glowMesh.material as MeshBasicMaterial).color.set(bossInfo.color);
    (obj.glowMesh.material as MeshBasicMaterial).opacity = 0.3;

    const baseHP = difficulty === 'easy' ? 5 : difficulty === 'hard' ? 12 : 8;
    const seasonMult = inSeasonMode && seasonStage < SEASON_OPPONENTS.length ? SEASON_OPPONENTS[seasonStage].speedMult : 1;
    bossActive = true;
    bossHP = Math.round(baseHP * bossInfo.hp * seasonMult);
    bossMaxHP = bossHP;
    bossObj = obj;
    bossLivesAtStart = lives;
    audio.bossAppear();
    const typeLabel = currentBossType.toUpperCase();
    showToast(`${typeLabel} BOSS! ${bossHP} HITS`);
  }

  function handleXRInput() {
    try {
      const rightGamepad = (world as any).input?.xr?.gamepads?.right;
      if (rightGamepad) {
        // Squeeze to charge
        if (rightGamepad.getButtonDown?.(InputComponent.Squeeze)) {
          if (gameState === 'playing' && !chargeActive) {
            chargeActive = true;
            chargeLevel = 0;
            chargeReady = false;
          }
        }
        if (rightGamepad.getButtonUp?.(InputComponent.Squeeze)) {
          if (gameState === 'playing' && chargeActive) {
            chargeActive = false;
            if (chargeLevel >= 0.5) {
              executeChargeAttack(currTipRight.clone());
            }
            chargeLevel = 0;
            chargeReady = false;
          }
        }
        if (rightGamepad.getButtonDown?.(InputComponent.A_Button)) {
          // A button - could be used for special actions
        }
      }
      const leftGamepad = (world as any).input?.xr?.gamepads?.left;
      if (leftGamepad) {
        if (leftGamepad.getButtonDown?.(InputComponent.A_Button)) {
          handlePause();
        }
        // Left squeeze also charges
        if (leftGamepad.getButtonDown?.(InputComponent.Squeeze)) {
          if (gameState === 'playing' && !chargeActive) {
            chargeActive = true;
            chargeLevel = 0;
            chargeReady = false;
          }
        }
        if (leftGamepad.getButtonUp?.(InputComponent.Squeeze)) {
          if (gameState === 'playing' && chargeActive) {
            chargeActive = false;
            if (chargeLevel >= 0.5) {
              executeChargeAttack(currTipLeft.clone());
            }
            chargeLevel = 0;
            chargeReady = false;
          }
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
  if (checkTutorial()) {
    switchState('tutorial' as GameState);
  } else {
    switchState('title');
  }
}

// ============================================================
// ENTRY POINT
// ============================================================
main().catch(console.error);
