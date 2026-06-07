# Neon Slicer VR

A holodeck-style VR slicing game built with [IWSDK](https://iwsdk.dev) (Immersive Web SDK). Slice flying neon wireframe objects with dual energy blades in a synthwave-lit arena.

**Play now:** [https://ellyz2426.github.io/neon-slicer/](https://ellyz2426.github.io/neon-slicer/)

## Features

### 12 Game Modes
- **Classic** — Wave-based, 3 lives, boss fights every 5 waves
- **Zen** — No bombs, no pressure, pure slicing flow
- **Time Attack** — 60 seconds, maximize your score
- **Survival** — Rising difficulty, 3 lives, how long can you last?
- **Frenzy** — 30s rapid fire, no bombs, just score
- **Daily Challenge** — Same seeded puzzle for everyone, daily streak tracking
- **Precision** — Slice only marked targets, 3 lives
- **Endless** — Infinite waves with boss fights, bonus rounds, progressive difficulty
- **Blitz** — 45s with aggressive speed ramp (+80% every 15s)
- **Duel** — 60s head-to-head vs AI scorer, outscore to win
- **Season** — Defeat 8 AI opponents (Rookie Bot → Omega Slicer) bracket progression
- **Custom Challenges** — Create, save, and share challenge configs with base64 codes

### 12 Object Types
- **Cube** (100pts) — Standard target
- **Sphere** (150pts) — Smaller, faster
- **Diamond** (200pts) — Medium difficulty
- **Star** (300pts) — High value
- **Bomb** (-500pts) — Avoid! Costs a life (shield absorbs)
- **Freeze** (50pts) — Triggers 5s slow-motion
- **Shield** (75pts) — Absorbs next bomb hit (15s duration)
- **Magnet** (75pts) — Pulls nearby objects toward blade (8s)
- **Double Points** (50pts) — 2x scoring for 8s
- **Crystal** (500pts) — Multi-hit (3 strikes to shatter)
- **Ghost** (400pts) — Phases in/out, only sliceable when visible
- **Time Bomb** (350pts) — 3s countdown, detonates if not sliced in time

### 12 Arena Themes with Unique Music
Neon Holodeck, Crimson Arena, Toxic Neon, Ultra Violet, Solar Blaze, Frozen Grid, Blood Moon, Ghost Matrix, Deep Ocean, Neon Sunset, Zen Garden, Neon Storm — each with distinct synthwave tuning (BPM, key, filter).

### 24 Blade Skins
Level-gated, achievement-gated, and stat-gated unlocks from Neon Cyan (default) through Storm (all 12 themes).

### 138+ Achievements
Slicing milestones, combo mastery, mode completion, boss battles, crystal collection, ghost hunting, time bomb defusing, duel victories, formation perfects, and more.

### Combat Systems
- **Combo System** — x1–x10, 1.8s decay, announcements (NICE/AWESOME/INCREDIBLE/GODLIKE)
- **Multi-Kill** — TRIPLE through HEXA KILL for rapid slices within 0.5s
- **Charge Attack** — Hold Space/Squeeze to charge AOE burst
- **Type Combos** — Same-type streak bonuses
- **Boss Battles** — 3 boss types (Orbiter, Charger, Splitter) with unique behaviors

### Progression
- **XP/Level System** — 50 levels with persistent progression
- **Prestige** — Reset level at 50 for permanent +10% score multiplier
- **Star Ratings** — 1–3 stars per mode/difficulty
- **Career Stats** — 20+ tracked statistics
- **Game History** — Last 50 games with detailed stats
- **Leaderboard** — Top 20 scores

### VR Features
- **Dual Energy Blades** — One per hand, tracks controller grip
- **Haptic Feedback** — Slice, bomb, boss, charge, multi-kill vibrations
- **XR Controller Input** — Swing to slice, Squeeze to charge, A/B for pause
- **PanelUI Spatial Interface** — All UI in 3D space, readable in VR
- **Follower HUDs** — Score, combo, toast, countdown follow your head

### Audio
- **Procedural Synthwave Engine** — Arena-specific BPM, key, filter tuning
- **30+ SFX** — All procedurally generated (no audio files)
- **Combo Announcements** — Rising pitch audio cues
- **Kick/Hi-Hat Pattern** — Full drum track
- **LFO Filter Sweep** — Dynamic arpeggiator modulation

### Visual Effects
- **Blade Trails** — Additive blending glow
- **Object Split Halves** — Physics drift with fade
- **Particle System** — 150 pool, burst on slice
- **Spawn Formations** — 7 patterns (random/line/V-shape/circle/cross/shower/spiral)
- **Combo Glow** — Blade and environment lighting scales with combo
- **Object Proximity Glow** — Objects brighten as they approach
- **Object Trail Particles** — Color-matched per type
- **Bomb Explosion VFX** — Multi-layered particles + light flash
- **Wave Celebration** — Gold/cyan particle burst on perfect waves
- **Screen Shake** — Bomb hits, boss defeats (toggleable)
- **Instant Replay** — Last 5s visualized on game over
- **Ghost Phasing** — Transparency cycling
- **TimeBomb Urgency** — Pulsing intensity as countdown nears zero

### Challenge Modifiers (7)
Big Objects, Speed Demon, No Bombs, Mirror, One Life, Tiny Objects, Chaos (all at once).

## Controls

### VR (Quest, Vision Pro, etc.)
- **Swing controllers** — Slice objects
- **Squeeze (either hand)** — Charge attack
- **A/X Button (left)** — Pause
- **Laser pointer** — Navigate menus

### Browser
- **Mouse** — Aim blade
- **Space** — Charge attack (hold and release)
- **Escape** — Pause
- **R** — Rematch (on game over)

## Tech Stack
- [IWSDK 0.4.1](https://iwsdk.dev) — Immersive Web SDK
- Three.js — 3D rendering
- PanelUI — Spatial UI system (24 `.uikitml` templates)
- Dual-runtime — Works in VR and browser
- Procedural audio — Web Audio API
- Zero external assets — Everything generated at runtime
