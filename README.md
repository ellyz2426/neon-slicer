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
- **Blade trail rendering** — additive-blended line trails following blade tips

### Game Modes
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
| **Season** | 8 AI opponents in bracket progression |
| **Quick Play** | Random mode + difficulty |

### Combat Systems
- **Combo system** — x1 to x10 with 1.8s decay timer, escalating score multiplier
- **Charge attack** — hold Space/Squeeze to charge, release for AOE burst slicing all objects in radius
- **Type combos** — slice 3+ same object type in a row for bonus points
- **Boss battles** — 3 boss types (Orbiter, Charger, Splitter) with multi-hit mechanics
- **6 spawn formations** — Random, Line, V-Shape, Circle, Cross, Shower

### Power-Ups
- **Freeze** — slow time for 5 seconds
- **Shield** — absorb one bomb hit
- **Magnet** — pull nearby objects toward blade
- **Double Points** — 2x score for 8 seconds

### Progression
- **XP/Level system** — 50 levels with persistent XP tracking
- **Prestige** — at Level 50, reset for permanent +10% score multiplier
- **Star ratings** — 1-3 stars per mode/difficulty based on score thresholds
- **95+ achievements** across slicing, combo, score, accuracy, mode mastery, and more
- **16 blade skins** with various unlock criteria
- **Daily Challenge streak** tracking
- **Career stats** — 18+ tracked fields
- **Top 20 leaderboard**

### Season Mode
Fight through 8 AI opponents with progressive difficulty:
1. Rookie Bot → 2. Circuit Slasher → 3. Neon Phantom → 4. Blade Dancer
5. Grid Reaper → 6. Void Hunter → 7. Quantum Edge → 8. Omega Slicer

### Challenge Modifiers
Toggle mutators from the mode select screen:
- **Big Objects** — 2x size
- **Speed Demon** — 50% faster
- **No Bombs** — peace mode
- **Mirror** — objects fall from above
- **One Life** — single life, high stakes
- **Tiny Objects** — 0.5x size
- **Chaos** — all modifiers active simultaneously

### Audio
- **Procedural synthwave music engine** — 128 BPM arpeggiator, kick/hi-hat patterns, pad chords, filter sweep LFO
- **30+ procedural SFX** — unique sounds for every interaction
- **3-channel audio** — independent Master/SFX/Music volume controls

### Visual
- **8 arena themes** — Neon Holodeck, Crimson Arena, Toxic Neon, Ultra Violet, Solar Blaze, Frozen Grid, Blood Moon, Ghost Matrix
- **Combo visual feedback** — blade glow intensity and environment lighting scale with combo level
- **Screen shake** on bomb hits and boss defeats (toggleable)
- **Holodeck environment** — wireframe grid floor/ceiling, 14 floating decorations, 40 ambient particles

### UI
- **22 PanelUI spatial templates** — zero HTML DOM, fully XR-compatible
- **Follower HUDs** — score, combo, toast, countdown, power-up, XP bar, wave, level-up
- **Tutorial system** for first-time players

## Controls

### Browser
| Key | Action |
|-----|--------|
| Mouse | Aim blade |
| Space | Charge attack (hold + release) |
| Escape | Pause/Resume |
| R | Rematch (game over screen) |

### VR Controllers
| Input | Action |
|-------|--------|
| Swing | Slice objects with dual blades |
| Squeeze | Charge attack (hold + release) |
| Trigger | Menu select (laser pointer) |
| A/X Button (left) | Pause |

## Tech Stack
- **IWSDK 0.4.1** — Meta's WebXR development framework
- **Dual runtime** — VR headset + browser-first with `xr: { offer: 'once' }`
- **PanelUI** — `.uikitml` spatial UI compiled by `@iwsdk/vite-plugin-uikitml`
- **Follower + ScreenSpace** — head-tracked HUD panels
- **Web Audio API** — procedural synthesis, no audio file dependencies
- **localStorage** — persistent save data

## Development

```bash
npm install
npm run dev    # Development server
npm run build  # Production build
```

## License

Built with IWSDK. Part of the [ellyz2426](https://github.com/ellyz2426) VR game portfolio.
