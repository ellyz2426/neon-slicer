# Neon Slicer VR

A holodeck VR slicing game built with [IWSDK](https://iwsdk.dev) 0.4.1. Slice flying neon wireframe objects with dual energy blades in an immersive neon-lit arena.

**[Play Now →](https://ellyz2426.github.io/neon-slicer/)**

## Features

### Core Gameplay
- **Dual energy blade system** — VR controller tracking or browser mouse aim
- **10 object types**: Cube (100), Sphere (150), Diamond (200), Star (300), Bomb (-500), Freeze, Shield, Magnet, Double Points, Crystal (500, 3-hit)
- **Speed-based slice detection** — line-sphere intersection physics
- **Object split effects** — sliced halves with physics drift, rotation, and fade
- **150-particle pool** with burst effects on every slice
- **Object trail particles** — color-matched particles trail flying objects
- **Blade trail rendering** — additive-blended line trails following blade tips
- **Blade charge attack** — hold to charge, release for AOE burst slicing all objects in radius
- **Type combo system** — slice 3+ same object type in a row for escalating bonus
- **Combo announcements** — NICE! / AWESOME! / INCREDIBLE! / GODLIKE! with SFX
- **Spawn pop-in animation** — elastic ease-out scale effect on object spawn
- **Explosion VFX** — multi-layered particle bursts and light flash on bomb hits
- **Wave completion celebration** — gold/cyan particle bursts on perfect waves

### Game Modes (11 total)
| Mode | Description |
|------|-------------|
| **Classic** | Wave-based with boss fights, 3 lives |
| **Zen** | No bombs, no pressure, just slice |
| **Time Attack** | 60 seconds, maximize your score |
| **Survival** | Rising difficulty, 3 lives |
| **Frenzy** | 30s rapid fire, no bombs |
| **Daily Challenge** | Same seeded puzzle for everyone today |
| **Precision** | Slice only marked targets, 3 lives |
| **Endless** | Infinite waves, how far can you go? |
| **Blitz** | 45s rapid-fire, speed builds aggressively |
| **Season** | 8 AI opponents in bracket progression |
| **Quick Play** | Random mode + difficulty |

### Progression & Meta
- **XP/Level system** — 50 levels with persistent XP
- **Prestige** — reset at Lv50 for permanent +10% score multiplier
- **Star ratings** — 1-3 stars per mode/difficulty based on score thresholds
- **119 achievements** across slicing, combos, modes, bosses, challenges, and more
- **Season Mode** — 8 AI opponents (Rookie Bot → Omega Slicer) with bracket progression
- **Daily Challenge streak** — track consecutive daily completions
- **Career stats** — 20+ tracked metrics (games, slices, accuracy, play time, bosses, etc.)
- **Game History** — paginated log of last 50 games with scores, accuracy, combos, stars

### Custom Challenges
- **Challenge Creator** — save current game settings as a custom challenge (5 slots)
- **Shareable codes** — base64-encoded challenge configs
- **Random Challenge** — one-click randomized mode/difficulty/modifiers/theme/skin

### Instant Replay
- Captures last 5 seconds of slice events during gameplay
- Visualized on game over screen with animated markers
- Looping playback with fade and scale effects

### Visual & Audio
- **10 arena themes**: Neon Holodeck, Crimson Arena, Toxic Neon, Ultra Violet, Solar Blaze, Frozen Grid, Blood Moon, Ghost Matrix, Deep Ocean, Neon Sunset
- **20 blade skins** with level-gated, achievement-gated, and prestige-gated unlocks
- **Arena-specific synthwave music** — each theme has unique bass/arp/pad notes, BPM, and filter Q
- **Procedural SFX** — 30+ effects including slice, bomb, power-up, boss, combo announcements
- **Holodeck environment** — grid floor/ceiling, floating decorations, ambient particles
- **Screen shake** — toggleable camera shake on impacts and boss defeats
- **Combo visual feedback** — blade glow and environment lighting scales with combo level

### Challenge Modifiers (7)
| Modifier | Effect |
|----------|--------|
| Big Objects | 2x larger objects |
| Speed Demon | 50% faster velocity |
| No Bombs | Bombs don't spawn |
| Mirror | Objects spawn from above |
| One Life | Single life only |
| Tiny Objects | 0.5x object size |
| Chaos | All modifiers active |

### Bosses
- Appear every 5 waves (Classic) or 10 waves (Endless)
- 3 types: **Orbiter** (circular), **Charger** (z-axis lunges), **Splitter** (wider orbit)
- Multi-hit mechanics (5-12 hits) with visual feedback

### Power-ups
- **Freeze** — slow time for 5 seconds
- **Shield** — blocks one bomb hit
- **Magnet** — pulls nearby non-bomb objects toward blade
- **Double Points** — 2x scoring for duration

### Spawn Formations (6)
Random, Line, V-Shape, Circle, Cross, Shower — cycle through as waves progress

### Controls
| Platform | Control |
|----------|---------|
| **VR** | Swing controllers to slice, B to pause, Squeeze to charge |
| **Browser** | Mouse aim + click to slice, WASD to move, Space to charge, P to pause |

### Technical
- **IWSDK 0.4.1** dual-runtime (VR + browser)
- **24 PanelUI templates** (`.uikitml` → spatial panels, zero HTML DOM)
- **Follower HUDs** for score, combo, toast, countdown, power-ups, XP bar, wave announcements
- **localStorage** persistence for all career data, achievements, settings, history
- **Procedural audio** — Web Audio API synthesis, no external audio files
- **Tutorial system** — auto-triggers for first-time players

## Build

```bash
npm install
npm run build   # compiles uikitml + vite build
npm run dev     # dev server with hot reload
```

## License

Built with [IWSDK](https://iwsdk.dev) — Meta's WebXR development framework.
