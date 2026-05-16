import type { Resources } from "../state/gameTypes";

/**
 * Adds resources and keeps every value non-negative.
 */
export function addResources(resources: Resources, delta: Partial<Resources>): Resources {
  return {
    water: Math.max(0, resources.water + (delta.water ?? 0)),
    cloudCotton: Math.max(0, resources.cloudCotton + (delta.cloudCotton ?? 0)),
    sunlight: Math.max(0, resources.sunlight + (delta.sunlight ?? 0)),
  };
}

/**
 * Subtracts resources and clamps values to zero.
 */
export function subtractResources(resources: Resources, cost: Partial<Resources>): Resources {
  return addResources(resources, {
    water: -(cost.water ?? 0),
    cloudCotton: -(cost.cloudCotton ?? 0),
    sunlight: -(cost.sunlight ?? 0),
  });
}
