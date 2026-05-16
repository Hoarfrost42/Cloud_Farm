import type { GameState } from "../state/gameTypes";

/**
 * Returns the number of raindrops created by one cloud click.
 */
export function getRaindropsPerClick(gameState: GameState) {
  return 2 + gameState.upgrades.clickRainPower;
}

/**
 * Returns a Phase 1 fallback raindrop count before upgrades are interactive.
 */
export function getScaffoldRaindropsPerClick() {
  return 4;
}
