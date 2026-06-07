# Neon Slicer VR

A neon holodeck VR slicing game built with [IWSDK](https://iwsdk.dev) 0.4.1. Slice flying wireframe objects with dual energy blades in an immersive cyberpunk arena.

## 🎮 Play

**[Play Now](https://ellyz2426.github.io/neon-slicer/)** — Works in browser and VR headsets.

## Features

### Core Gameplay
- **Dual Energy Blades** — Swing VR controllers or mouse to slice neon wireframe objects
- **Speed-based Slice Detection** — Line-sphere intersection with velocity threshold
- **Split Effect** — Sliced objects split into two halves with physics drift/rotation/fade
- **Combo System** — Build combos x1-x10 with rapid slicing (1.8s decay)
- **10 Object Types** — Cube, sphere, diamond, star, bomb, freeze, shield, magnet, double points, crystal

### Game Modes (8)
| Mode | Description |
|------|-------------|
| **Classic** | Wave-based with bosses every 5 waves, 3 lives |
| **Zen** | No bombs, no pressure, relax and slice |
| **Time Attack** | 60 seconds to maximize score |
| **Survival** | Rising difficulty, 3 lives |
| **Frenzy** | 30-second rapid fire, no bombs |
| **Daily Challenge** | Seeded PRNG — same puzzle for everyone today |
| **Precision** | Slice only marked targets, 12 waves |
| **Endless** | Infinite waves with bonus rounds and bosses every 10 waves |

### Challenge Modifiers (7)
Toggle mutators from the mode select menu:
- **Big Objects** — 2x size
- **Speed Demon** — 50% faster
- **No Bombs** — Safe slicing
- **Mirror** — Objects spawn from above
- **One Life** — Single life only
- **Tiny Objects** — Half size
- **Chaos** — All modifiers at once!

### Power-Up System
- **Freeze** (blue knot) — Slow time for 5 seconds
- **Shield** (green ring) — Absorbs one bomb hit
- **Magnet** (yellow cone) — Pulls nearby objects toward blade
- **Double Points** (purple gem) — 2x scoring for 8 seconds

### Crystal Objects
Multi-hit crystal objects require 3 hits to shatter, yielding 500 base points and bonus XP.

### Boss Battles
- Classic mode: appear every 5 waves
- Endless mode: appear every 10 waves
- Large golden objects requiring 5-12 hits based on difficulty
- Hover/orbit movement patterns

### Progression
- **XP/Level System** — 50 levels with persistent XP
- **76+ Achievements** — Slicing milestones, combos, modes, bosses, crystals, modifiers
- **12 Blade Skins** — Unlock via milestones and levels
- **8 Arena Themes** — Neon Holodeck, Crimson Arena, Toxic Neon, Ultra Violet, Solar Blaze, Frozen Grid, Blood Moon, Ghost Matrix
- **Career Stats** — 14 tracked statistics
- **Top 20 Leaderboard** with persistent localStorage

### Audio
- **Procedural Synthwave Music** — 128 BPM arpeggiator, kick/hi-hat pattern, pad chords, filter sweep LFO
- **30+ Sound Effects** — Slicing, combos, bombs, power-ups, bosses, UI
- **Per-channel Volume Control** — Master, SFX, and Music

### Visuals
- Holodeck wireframe environment with grid floor/ceiling
- 14 floating wireframe decorations with bob/rotate animation
- 40 ambient particles with drift
- Blade trail effects (line-based additive blending)
- Particle system (150 pool, burst on slice)
- Fog and themed lighting

## Controls

### Browser
- **Mouse** — Aim blade, swing through objects
- **ESC** — Pause
- **R** — Rematch (game over screen)

### VR
- **Swing Controllers** — Slice with dual energy blades
- **Trigger** — Menu interaction (PanelUI laser pointer)
- **B Button** — Pause

## Tech Stack

- **IWSDK 0.4.1** — Immersive Web SDK
- **Dual Runtime** — XR + browser fallback
- **20 PanelUI Templates** — Zero HTML DOM overlays
- **PanelUI/Follower/ScreenSpace** — Spatial UI system
- **Procedural Audio** — Web Audio API synthesis
- **localStorage** — Persistent save data

## Development

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
```

Built by [Kit](https://github.com/ellyz2426) as part of the IWSDK daily build pipeline.
