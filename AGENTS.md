# AGENTS.md

## Project

Project name: **Cloud Island / 云上小岛**

This is a small browser-based 2D incremental / idle prototype. Earlier pseudo-2.5D and pixel-grid island explorations have been archived. The current renewed direction is a lightweight 2D floating-island presentation that keeps the idle loop easy to read and easy to play.

The player manages a floating island by clicking clouds to make rain, growing crops, harvesting resources, and building simple weather machines. The v0.1 goal is a short playable loop where the island progresses from manual cloud-clicking to a first semi-automated weather cycle within about 10 minutes.

Core phrase:

> Not farming crops, but growing weather.

---

## Current Priority

Build **v0.1 greybox** only.

The v0.1 win condition is:

> A player can click clouds, create rain, grow crops, harvest resources, buy upgrades, unlock rain collector / windmill / sun prism, save progress, and feel the island becoming more alive and semi-automated.

Do not optimize for final commercial quality yet. Prioritize a small playable vertical slice.

---

## Tech Stack

Original v0.1 stack:

- Vite
- React
- TypeScript
- PixiJS
- CSS
- localStorage

Do not change the tech stack without explicit user approval.

Current repository note:

- A Phaser rendering experiment exists from the archived pseudo-2.5D route.
- The next implementation round must explicitly decide whether to return to PixiJS or keep Phaser for a simpler 2D scene.
- Do not continue Phaser pseudo-2.5D grid work unless the user explicitly reopens that route.

Responsibilities:

- PixiJS: animated island scene, clouds, rain, crops, machines, particles.
- React / HTML / CSS: resource bar, upgrade panel, machine panel, buttons, tooltips, status toasts.
- TypeScript: game state, resource math, upgrades, tick loop, save/load.
- localStorage: simple v0.1 local save.

Do not introduce Redux, backend services, physics engines, ECS frameworks, 3D engines, networking, authentication, or large new libraries unless explicitly requested.

---

## Hard Scope Boundaries

v0.1 must not include:

- Story or narrative quests.
- NPCs or dialogue.
- Combat.
- Enemies.
- Cards.
- Roguelike mechanics.
- AI-generated content.
- Multiplayer.
- Login/account systems.
- Real 3D or real 2.5D/isometric gameplay systems.
- Isometric tile maps, free building placement, pathfinding, camera rotation, or arbitrary depth-sorting systems.
- WASD character control.
- Complex offline progression.
- Prestige/reset layers.
- Multi-island progression.
- Large tech trees.
- Weather disasters.
- Marketplace/economy simulation.

If a proposed change does not directly improve the cloud → rain → crop → upgrade → weather-machine loop, do not implement it.

---

## Visual Direction

The visual tone should be:

- clean
- soft
- bright
- airy
- rounded
- cozy but not childish

Preferred colors:

- sky blue: `#BFE7FF`
- cloud white: `#F7FBFF`
- soft gold: `#FFD978`
- fresh green: `#A9D98E`
- island soil: `#D6B98C`
- water blue: `#73C7FF`
- UI blue-grey: `#35556A`

Avoid:

- dark horror style
- grotesque visuals
- cyberpunk
- Cthulhu motifs
- high-saturation neon
- realistic heavy painting
- gloomy atmosphere

This project should feel like a fresh-air recovery project, not like Blackborder.

### View Strategy

Current direction:

- Use a lightweight 2D floating-island presentation.
- Keep crop plots and weather machines on fixed, authored 2D positions.
- Keep interactions as direct clicks on clouds, crops, and UI buttons.
- Keep the scene readable as a light idle game, not a dense construction game.

Archived visual direction:

- Pixel-art pseudo-2.5D floating island.
- Island-plane projection coordinates.
- Grid-based island placement.
- Phaser pseudo-2.5D grid island experiment.

This archived route should not be continued by default. It created too much layout, asset-angle, and engine complexity for the current v0.1 goal.

Still prohibited unless explicitly approved:

- 3D engines.
- Isometric tile maps.
- Free building placement.
- Object rotation or camera rotation.
- Pathfinding.
- Complex occlusion/depth systems for arbitrary objects.
- Multiple buildable islands.

The intended strategy is:

```text
Visual: clean lightweight 2D floating weather island
Logic: simple 2D coordinates + fixed authored anchors
UI: React / HTML / CSS
Gameplay: idle / incremental loop
```

---

## Asset Rules

Use a mixed asset strategy:

1. Prefer Pixi Graphics for simple dynamic objects:
   - raindrops
   - particles
   - ripples
   - light beams
   - hitbox/debug shapes

2. Use simple SVG assets for recognizable static objects:
   - clouds
   - island base
   - crop stages
   - rain collector
   - windmill
   - sun prism

3. Avoid PNG unless explicitly needed during normal gameplay implementation.

Image generation and PNG art passes are allowed only when the user explicitly requests an Art Pass. Do not mix image generation into gameplay, bug-fix, polish, or balance tasks.

Future 2D Art Pass direction:

- Prefer simple 2D split assets over one full-screen illustration.
- Generate game assets first, not full concept scenes: island, clouds, crop stages, weather machines, and effect references.
- Avoid returning to pseudo-2.5D pixel grid asset boards unless explicitly requested.
- Use transparent-background sprites or simple SVG assets.
- Keep programmatic drawing for raindrops, particles, ripples, light beams, hit feedback, and other dynamic effects.
- Keep every critical object backed by a programmatic fallback.

Expected static asset directory:

```text
public/
  assets/
    art/
      cloud/
      island/
      crop/
      machine/
      fx/
    manifest.json
```

SVG rules:

- Use simple shapes where possible.
- Keep files small and readable.
- Use clear `viewBox` values.
- Do not embed external images.
- Do not embed fonts.
- Do not use complex filters unless necessary.
- Do not generate many assets ahead of the current phase.

Asset names must be lowercase snake_case, for example:

```text
cloud_01.svg
crop_stage_0.svg
windmill_blades.svg
sun_prism.svg
```

Do not use names like `image1.png`, `final_final.svg`, Chinese filenames, or filenames with spaces.

Each critical visual object should have a programmatic fallback so the game still runs if an asset fails to load.

---

## Development Phases

Follow these phases in order. Do not skip ahead unless the user explicitly approves.

### Phase 0 — Project Scaffold

Goal:

- Initialize Vite + React + TypeScript.
- Add PixiJS.
- Create the recommended folder structure.
- Show a Pixi canvas.
- Show a React resource bar with water, cloudCotton, sunlight.

Do not add gameplay yet.

### Phase 1 — Cloud and Rain

Goal:

- Add drifting clouds.
- Clicking a cloud creates falling raindrops.
- Clouds have clear click feedback.
- Raindrops fall and disappear or splash.

### Phase 2 — Crop Growth

Goal:

- Add 3 crop plots.
- Rain hitting crop plots increases growth.
- Crops have visible growth stages.
- Mature crops can be harvested for cloudCotton and sunlight.

### Phase 3 — Upgrade System

Goal:

- Add basic upgrades.
- Upgrade buttons show level, effect, cost, and disabled state.
- Upgrades affect cloud capacity, click rain power, crop growth speed, or water collection.

### Phase 4 — Rain Collector

Goal:

- Add unlockable rain collector.
- Rain hitting collector grants water.
- Collector has visible feedback.

### Phase 5 — Windmill

Goal:

- Add unlockable windmill.
- Windmill visually spins.
- Windmill makes clouds easier to use by slowing them near the island or increasing their stay time.

### Phase 6 — Sun Prism

Goal:

- Add unlockable sun prism.
- It periodically emits light.
- Crops grow faster while prism effect is active.

### Phase 7 — Save and 10-Minute Tuning

Goal:

- Add localStorage save/load.
- Add reset save button.
- Add basic status toasts.
- Tune values so a player can reach first semi-automation in about 10 minutes.

---

## Recommended Project Structure

Use this structure unless there is a good reason to simplify:

```text
src/
  main.tsx
  App.tsx

  game/
    GameCanvas.tsx
    createPixiApp.ts
    gameLoop.ts

    assets/
      assetManifest.ts
      loadAssets.ts

    entities/
      Cloud.ts
      Raindrop.ts
      CropPlot.ts
      Machine.ts

    systems/
      weatherSystem.ts
      growthSystem.ts
      resourceSystem.ts
      upgradeSystem.ts
      saveSystem.ts

    state/
      gameState.ts
      gameTypes.ts

  ui/
    ResourceBar.tsx
    UpgradePanel.tsx
    MachinePanel.tsx
    StatusToast.tsx

  data/
    constants.ts
    upgrades.ts
    machines.ts
    crops.ts

  styles/
    global.css
    app.css
```

Keep the architecture simple. Do not over-engineer.

---

## State Rules

Long-term game economy state should live in TypeScript state, not inside Pixi display objects.

Minimum v0.1 state:

```ts
interface Resources {
  water: number;
  cloudCotton: number;
  sunlight: number;
}

interface UpgradeLevels {
  cloudCapacity: number;
  clickRainPower: number;
  cropGrowthSpeed: number;
  waterStorage: number;
  rainCollectorEfficiency: number;
  windmillPower: number;
  sunPrismPower: number;
}

interface Unlocks {
  rainCollector: boolean;
  windmill: boolean;
  sunPrism: boolean;
  autoHarvest: boolean;
}
```

Rules:

- Do not scatter resources across React components.
- Do not let Pixi entities permanently own economy state.
- All resource changes should go through clear helper functions.
- State must be serializable for localStorage.

---

## Gameplay Feel Priorities

Visual and tactile feedback are more important than numerical complexity.

Must-have feedback:

- Clouds squash or pulse when clicked.
- Raindrops visibly fall.
- Raindrops hitting crops produce a small reaction.
- Crop growth visibly changes.
- Mature crops glow or pulse.
- Harvesting creates a small resource pop or particle.
- Machines appear on the island when unlocked.
- Windmill blades rotate.
- Sun prism emits periodic light.

If time is limited, improve feedback before adding more upgrades.

---

## Balance Targets

v0.1 only needs a 10-minute curve.

Target curve:

| Time | Target Experience |
|---|---|
| 0-1 min | Player clicks clouds and sees rain/crop response |
| 1-3 min | First crop harvest |
| 3-5 min | First upgrade purchased |
| 5-7 min | Rain collector unlocked or nearly unlocked |
| 7-9 min | Windmill or sun prism unlocked |
| 9-10 min | Island visibly begins partial automation |

Do not design for hours of gameplay yet.

---

## Incremental / Idle Lessons From 404

Recent experimentation in `F:\Who_Live_in_404` showed that not every theme should be forced into an incremental game. Room-assignment puzzle play became too UI-heavy and too dependent on manual settlement. Cloud Island should use those lessons, but not import that project's mechanics.

Core incremental rule:

```text
Numbers should move on their own.
The player should change the rate, automation, and bottlenecks.
```

For Cloud Island this means:

- Do not add a manual next-day, next-round, or tick-advance button.
- The main loop must keep running through automatic resource growth.
- Player actions should mostly click clouds, trigger weather, harvest, buy upgrades, and unlock automation.
- Unlocks should come from loop milestones, not arbitrary days.
- Always keep one clear next goal visible.
- Prefer improving feedback and pacing before adding another resource, machine, panel, or subsystem.

The 5x5 island may support placement and adjacency, but it must not become a puzzle-board optimization game. Spatial choices should remain simple modifiers for production and automation, such as a rain collector helping adjacent crops.

UI rule:

```text
The island shows what is happening.
Panels explain, buy, and summarize.
```

Do not let side panels carry all gameplay meaning while the island becomes decorative.

---

## Testing / Validation

When implementing a phase, validate:

- `npm run dev` launches.
- `npm run build` succeeds.
- TypeScript has no avoidable errors.
- The browser console has no major runtime errors.
- The current phase acceptance criteria are met.
- Previously completed phases still work.

For balance, add a simple simulation or debug readout if helpful, but do not build a complex testing framework in v0.1.

---

## Codex Workflow

Before implementing a requested change, respond with:

```text
Current SPEC:
Files to add:
Files to modify:
Explicitly not doing:
Acceptance checks:
```

Then implement only that scope.

After implementing, respond with:

```text
What changed:
How to run:
How to verify:
Known limitations:
```

Do not silently add extra features.

---

## Subagent Policy

Subagents may be used for review, planning, or testing.

Suggested subagents:

1. Gameplay Loop Reviewer
   - Checks whether the change improves the core loop and player feedback.

2. Implementation Architect
   - Checks code structure, state ownership, and React/Pixi separation.

3. Feel & Feedback Reviewer
   - Checks whether interactions feel clear and satisfying.

Only one agent may edit code. Do not let multiple agents edit the codebase in parallel.

---

## Harness Checklist

Before adding any new feature, answer:

```text
1. Does it serve the “grow weather” core concept?
2. Can the player feel it within the first 10 minutes?
3. Does it increase positive feedback rather than only complexity?
4. Does it require lots of new text? If yes, reject or defer.
5. Does it require a new resource type? If yes, defer unless approved.
6. Does it require a new UI panel? If yes, justify it.
7. Can it be expressed using the current state model?
8. Will it delay v0.1 completion? If yes, reject or defer.
9. Does it preserve automatic incremental growth rather than turning progress into manual round advancement?
10. Does it improve rate, automation, bottleneck clarity, or feedback within the first 10 minutes?
```

If a feature fails this checklist, do not implement it.

---

## Current Final Decision

Project:

```text
Cloud Island / 云上小岛
```

Platform:

```text
Browser game
```

Tech:

```text
Vite + React + TypeScript + PixiJS
```

View:

```text
current renewed direction: lightweight 2D floating island
archived exploration: pixel-art pseudo-2.5D / Phaser grid island
```

Core loop:

```text
Click cloud → rain falls → crops grow → harvest resources → buy upgrades → unlock weather machines → island becomes semi-automated
```

v0.1 success condition:

> The player reaches a visible first semi-automated weather loop within about 10 minutes.
