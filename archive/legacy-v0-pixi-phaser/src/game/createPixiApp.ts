import { Application, Container, Graphics, Sprite } from "pixi.js";
import { GAME_HEIGHT, GAME_WIDTH } from "../data/constants";
import type { LoadedArtAssets } from "./assets/loadAssets";
import { SCENE_LAYOUT } from "./sceneLayout";

/**
 * Creates and attaches the PixiJS application for the animated island scene.
 */
export async function createPixiApp(hostElement: HTMLElement) {
  const app = new Application();

  await app.init({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    preference: "canvas",
    backgroundColor: 0xbfe7ff,
    antialias: false,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  hostElement.appendChild(app.canvas);
  app.canvas.setAttribute("aria-label", "云上小岛 PixiJS 画布");
  return app;
}

/**
 * Draws the non-interactive Phase 0 greybox island scene.
 */
export function drawScaffoldScene(app: Application, artAssets: LoadedArtAssets = {}) {
  const { background, island } = SCENE_LAYOUT;
  const skyBand = new Graphics()
    .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    .fill(0xbfe7ff)
    .rect(0, 0, GAME_WIDTH, 190)
    .fill({ color: 0xf7fbff, alpha: 0.18 })
    .ellipse(96, 120, 78, 18)
    .fill({ color: 0xf7fbff, alpha: 0.3 })
    .ellipse(706, 158, 112, 24)
    .fill({ color: 0xf7fbff, alpha: 0.22 });

  const skyGlow = new Graphics()
    .circle(background.sun.x, background.sun.y, background.sun.radius)
    .fill({ color: 0xffd978, alpha: 0.45 });

  const backgroundClouds = artAssets.cloudBank ? new Sprite(artAssets.cloudBank) : null;
  if (backgroundClouds) {
    backgroundClouds.anchor.set(0.5);
    backgroundClouds.position.set(background.cloudBank.x, background.cloudBank.y);
    backgroundClouds.scale.set(background.cloudBank.scale);
    backgroundClouds.alpha = 0.62;
  }

  const islandShadow = new Graphics()
    .ellipse(island.shadow.x, island.shadow.y, island.shadow.radiusX, island.shadow.radiusY)
    .fill({ color: 0x6ea9c9, alpha: 0.2 });

  const islandBase = artAssets.islandBase ? new Sprite(artAssets.islandBase) : null;
  if (islandBase) {
    islandBase.anchor.set(0.5);
    islandBase.position.set(island.sprite.x, island.sprite.y);
    islandBase.scale.set(island.sprite.scale);
  }

  app.stage.addChild(skyBand, skyGlow);
  if (backgroundClouds) {
    app.stage.addChild(backgroundClouds);
  }
  app.stage.addChild(islandShadow);

  if (islandBase) {
    app.stage.addChild(islandBase);
  } else {
    const fallbackIslandBase = new Graphics()
      .ellipse(400, 342, 300, 104)
      .fill(0xa9d98e)
      .ellipse(400, 408, 240, 86)
      .fill(0xd6b98c);

    const emptyPlotLine = new Graphics()
      .roundRect(214, 316, 372, 60, 24)
      .stroke({ color: 0x8cc374, width: 3, alpha: 0.6 });

    app.stage.addChild(fallbackIslandBase, emptyPlotLine);
  }
  app.render();
}

/**
 * Draws a soft fallback cloud from procedural Pixi graphics.
 */
export function drawFallbackCloud(container: Container) {
  const cloud = new Graphics()
    .ellipse(-28, 4, 35, 19)
    .fill(0xf7fbff)
    .ellipse(0, -8, 38, 25)
    .fill(0xffffff)
    .ellipse(34, 2, 36, 20)
    .fill(0xf7fbff)
    .ellipse(-2, 15, 62, 17)
    .fill(0xecf8ff)
    .roundRect(-56, 3, 112, 30, 16)
    .fill(0xf7fbff);

  const shade = new Graphics()
    .ellipse(6, 25, 48, 6)
    .fill({ color: 0x9ed9f4, alpha: 0.22 });

  container.addChild(shade, cloud);
}

/**
 * Draws one procedural raindrop for Phase 1.
 */
export function drawFallbackRaindrop(radius: number) {
  return new Graphics()
    .ellipse(0, 0, radius * 0.7, radius * 1.25)
    .fill(0x73c7ff)
    .circle(-radius * 0.2, -radius * 0.35, radius * 0.22)
    .fill({ color: 0xf7fbff, alpha: 0.75 });
}

/**
 * Draws a small splash when a raindrop reaches the island area.
 */
export function drawFallbackSplash() {
  return new Graphics()
    .circle(0, 0, 5)
    .stroke({ color: 0x73c7ff, width: 2, alpha: 0.7 })
    .circle(0, 0, 10)
    .stroke({ color: 0xf7fbff, width: 1, alpha: 0.5 });
}
