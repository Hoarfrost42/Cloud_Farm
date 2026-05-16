import { Assets } from "pixi.js";
import type { Texture } from "pixi.js";
import { ART_ASSETS } from "./assetManifest";
import type { ArtAssetKey } from "./assetManifest";

export type LoadedArtAssets = Partial<Record<ArtAssetKey, Texture>>;

/**
 * Loads static art assets declared in the v0.1 manifest.
 */
export async function loadArtAssets(): Promise<LoadedArtAssets> {
  const loadedAssets: LoadedArtAssets = {};

  for (const [assetKey, assetPath] of Object.entries(ART_ASSETS)) {
    try {
      loadedAssets[assetKey as ArtAssetKey] = (await Assets.load(assetPath)) as Texture;
    } catch {
      loadedAssets[assetKey as ArtAssetKey] = undefined;
    }
  }

  return loadedAssets;
}
