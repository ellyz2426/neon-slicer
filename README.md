# Neon Slicer VR

A holodeck-style VR fruit-ninja slicing game built with [IWSDK](https://iwsdk.dev) (Immersive Web SDK) 0.4.1. Dual energy blades, 12 object types, 12 game modes, and a fully enclosed neon holodeck arena.

🎮 **[Play Now](https://ellyz2426.github.io/neon-slicer/)**

## Features

### Core Gameplay
- **Dual Energy Blades** — Swing VR controllers or mouse to slice neon wireframe objects
- **Speed-Based Detection** — Line-sphere intersection with minimum velocity threshold
- **Object Split Physics** — Sliced objects split into two halves with drift, rotation, and fade
- **Charge Attack** — Hold Squeeze/Space to charge, release for AOE burst slicing all nearby objects

### Object Types (12)
| Type | Points | Special |
|------|--------|---------|
| Cube | 100 | Standard |
| Sphere | 150 | Standard |
| Diamond | 200 | Standard |
| Star | 300 | High value |
| Bomb | -500 | Lose a life, explosion VFX |
| Freeze | 50 | 5s slow-motion |
| Shield | 75 | Absorbs next bomb hit |
| Magnet | 75 | Pulls nearby objects |
| Double Points | 50 | 2x scoring for 8s |
| Crystal | 500 | Multi-hit (3 hits to shatter), shatter burst VFX |
| Ghost | 400 | Phases in/out, only sliceable when visible, ethereal dissolve |
| Time Bomb | 350 | 3s countdown, detonates if not sliced, defuse spark VFX |

### Game Modes (12)
1. **Classic** — Wave-based, 3 lives, boss every 5 waves
2. **Zen** — No bombs, no score, relaxation mode
3. **Time Attack** — 60s timed, maximum score
4. **Survival** — Escalating difficulty, 1 life
5. **Frenzy** — Rapid-fire, score-only objects
6. **Daily Challenge** — Seeded PRNG, 15 waves, streak tracking
7. **Precision** — Slice only marked targets, 12 waves
8. **Endless** — Infinite waves, bosses every 10, bonus rounds every 5
9. **Blitz** — 45s rapid-fire with aggressive speed ramp
10. **Duel** — 60s head-to-head vs AI scorer
11. **Season** — 8 AI opponents with bracket progression
12. **Custom Challenges** — Create with shareable base64 codes, 5 save slots

### Scoring Systems
- **Combo** — x1-x10 multiplier, 1.8s decay, finisher bonus on drop
- **Type Combo** — Slice 3+ same object type for escalating bonus
- **Multi-Kill** — TRIPLE through HEXA KILL for rapid slices within 0.5s
- **Accuracy Multiplier** — +10% per 10% accuracy above 50%
- **Prestige Multiplier** — Permanent +10% per prestige rank
- **Star Rating** — 1-3 stars per mode/difficulty based on score thresholds
- **Combo Finisher** — x50 bonus per combo level when combo decays (x3+)

### Progression
- **XP/Levels** — 50 levels with persistent XP
- **Prestige** — Reset at Level 50 for permanent score multiplier
- **153 Achievements** — Slicing, combo, score, accuracy, mode mastery, boss, weather, accessibility, and more
- **28 Blade Skins** — Unlocked via milestones, level gates, and challenges
- **Career Stats** — 20+ tracked fields including play time, best scores, season record
- **Game History** — Last 50 games with full stats, paginated

### Arena & Environment
- **14 Arena Themes** — Neon Holodeck, Crimson Arena, Toxic Neon, Ultra Violet, Solar Blaze, Frozen Grid, Blood Moon, Ghost Matrix, Deep Ocean, Neon Sunset, Zen Garden, Neon Storm, Cyber Forest, Void Abyss
- **Holodeck Enclosure** — Grid floor, ceiling, and side/back walls
- **Theme-Specific Weather** — Snowfall, embers, bubbles, lightning streaks, cherry blossoms, void orbs (toggleable)
- **Floating Decorations** — 14 wireframe objects with bob/spin animation
- **Holographic Rings** — 6 orbiting ring decorations per theme
- **40 Ambient Particles** — Drifting theme-colored particles
- **Procedural Synthwave Music** — 14 unique tunings (key, BPM, filter Q per theme)

### VR & Accessibility
- **Dual Runtime** — Full VR (controller tracking, haptic feedback) and browser (mouse + keyboard)
- **XR Haptic Feedback** — Slice, bomb, boss hit/defeat, charge, multi-kill vibrations
- **Colorblind Mode** — Distinct ring indicator count per object type
- **Weather FX Toggle** — Enable/disable weather particles
- **Screen Shake Toggle** — Camera shake on impacts

### UI System
- **24 PanelUI Templates** — Zero HTML DOM, all `.uikitml` spatial panels
- **Follower HUDs** — Score, combo, toast, countdown, power-up, XP bar, wave, level-up
- **World Panels** — Title, mode select, difficulty, pause, game over, leaderboard, achievements, settings, help, skins, stats, modifiers, season, tutorial, challenge, history
- **Instant Replay** — Last 5s visualized on game over with marker meshes

### Audio
- **30+ Procedural SFX** — Slice, combo, bomb, freeze, shield, magnet, boss, ghost, time bomb, charge, multi-kill, wave, countdown, achievement, level-up
- **Procedural Synthwave** — 128 BPM+ arpeggiator, kick/hi-hat drums, pad chords, filter sweep LFO
- **Volume Controls** — Master, SFX, Music with independent adjustment

## Controls

### VR
- **Swing Controllers** — Slice objects with energy blades
- **Squeeze** — Charge attack (hold to charge, release for AOE)
- **B/Y Button** — Pause
- **Laser Pointer** — Menu navigation

### Browser
- **Mouse** — Aim and swing blade
- **Space** — Charge attack
- **B** — Pause
- **Click** — Menu buttons

## Tech Stack
- IWSDK 0.4.1 (Three.js + ECS)
- TypeScript (~4,500 lines)
- PanelUI spatial UI system (24 templates)
- Vite build pipeline
- GitHub Pages deployment

## Build
```bash
npm install
npm run dev    # development server
npm run build  # production build
```

## License
Part of the IWSDK daily builds portfolio.
