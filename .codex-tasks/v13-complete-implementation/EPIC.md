# v13 Complete Implementation

Goal: implement the v13 post-monsoon complete slice from the design document while preserving the v12 first-monsoon baseline as much as possible.

Scope:

- Add log-safe weather tracking and `bestWeatherExp`.
- Replace simple monsoon target growth with table-driven mainline milestones.
- Add cloud-core tree extensions, pressure, storm fronts, climate rewrites, climate laws, sky heart pulses.
- Keep UI text-based and functional.
- Extend simulation output to cover the full `1e308` route.

Out of scope:

- Visual/art pass.
- Phaser/Pixi restoration.
- Final balance polish.
- Complex animation.

Validation:

- `npm run typecheck`
- `npm run build`
- `npm run simulate:weather-strategies`

