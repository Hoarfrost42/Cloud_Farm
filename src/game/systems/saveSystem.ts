import type { GameState } from "../state/gameTypes";
import { createInitialGameState } from "../state/gameState";

const SAVE_KEY = "cloud-island-v0-1-save";

/**
 * Serializes game state for localStorage in later phases.
 */
export function serializeGameState(gameState: GameState) {
  return JSON.stringify({
    ...gameState,
    lastSaveAt: Date.now(),
  });
}

/**
 * Saves the current serializable state into localStorage.
 */
export function saveGameState(gameState: GameState) {
  localStorage.setItem(SAVE_KEY, serializeGameState(gameState));
}

/**
 * Loads a previous save and merges it over the current state shape.
 */
export function loadGameState(): GameState | null {
  const rawSave = localStorage.getItem(SAVE_KEY);
  if (!rawSave) {
    return null;
  }

  try {
    const parsedSave = JSON.parse(rawSave) as Partial<GameState>;
    const initialState = createInitialGameState();

    return {
      ...initialState,
      ...parsedSave,
      resources: {
        ...initialState.resources,
        ...parsedSave.resources,
      },
      upgrades: {
        ...initialState.upgrades,
        ...parsedSave.upgrades,
      },
      unlocks: {
        ...initialState.unlocks,
        ...parsedSave.unlocks,
      },
      cropPlots: initialState.cropPlots.map((initialPlot, index) => ({
        ...initialPlot,
        ...(parsedSave.cropPlots?.[index] ?? {}),
        x: initialPlot.x,
        y: initialPlot.y,
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Clears the v0.1 local save.
 */
export function clearSavedGameState() {
  localStorage.removeItem(SAVE_KEY);
}
