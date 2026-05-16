import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { Container, Graphics, Sprite, Text } from "pixi.js";
import type { Application, Texture } from "pixi.js";
import type { CropPlotModel } from "./entities/CropPlot";
import type { CloudModel } from "./entities/Cloud";
import type { RaindropModel } from "./entities/Raindrop";
import {
  createPixiApp,
  drawFallbackCloud,
  drawFallbackRaindrop,
  drawFallbackSplash,
  drawScaffoldScene,
} from "./createPixiApp";
import { loadArtAssets } from "./assets/loadAssets";
import type { LoadedArtAssets } from "./assets/loadAssets";
import { startGameLoop } from "./gameLoop";
import { getRaindropsPerClick } from "./systems/weatherSystem";
import { isSunPrismActive } from "./systems/growthSystem";
import { GAME_HEIGHT, GAME_WIDTH } from "../data/constants";
import { SCENE_LAYOUT } from "./sceneLayout";
import type { GameState } from "./state/gameTypes";

const CLOUD_EDGE_MARGIN = SCENE_LAYOUT.clouds.edgeMargin;
const COLLECTOR_POSITION = SCENE_LAYOUT.machines.collector;
const WINDMILL_POSITION = SCENE_LAYOUT.machines.windmill;
const SUN_PRISM_POSITION = SCENE_LAYOUT.machines.sunPrism;

interface GameCanvasProps {
  gameState: GameState;
  onRainHitCrop: (plotId: string, moisture: number, water: number) => void;
  onRainCollected: (water: number) => void;
  onRainHitGround: (water: number) => void;
  onHarvestCrop: (plotId: string) => void;
}

interface RenderedCloud {
  model: CloudModel;
  view: Container;
  windFeedback: number;
}

interface RenderedRaindrop {
  model: RaindropModel;
  view: Graphics;
}

interface RenderedSplash {
  life: number;
  view: Graphics;
}

interface RenderedCropPlot {
  plotId: string;
  view: Container;
  base: Graphics;
  plotSprite: Sprite | null;
  plotTextures: [Texture, Texture, Texture] | null;
  wetOverlay: Graphics;
  crop: Graphics;
  cropSprite: Sprite | null;
  cropTextures: [Texture, Texture, Texture, Texture] | null;
  progressBack: Graphics;
  progressFill: Graphics;
  progressFlash: Graphics;
  readyGlow: Graphics;
  feedback: number;
  flash: number;
  readyPulse: number;
}

interface RenderedMachines {
  layer: Container;
  collector: Container;
  collectorFlash: Graphics;
  windmill: Container;
  windmillBlades: Graphics | Sprite;
  sunPrism: Container;
  sunPrismBeam: Graphics;
  sunPrismGlow: Graphics;
  sunPrismBody: Graphics | Sprite;
  windLines: Graphics;
  islandLight: Graphics;
}

interface RenderedFloatText {
  life: number;
  view: Text;
}

/**
 * Mounts the PixiJS playfield into React without owning economy state.
 */
export function GameCanvas({
  gameState,
  onRainHitCrop,
  onRainCollected,
  onRainHitGround,
  onHarvestCrop,
}: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameStateRef = useRef(gameState);
  const callbacksRef = useRef({ onRainHitCrop, onRainCollected, onRainHitGround, onHarvestCrop });

  gameStateRef.current = gameState;
  callbacksRef.current = { onRainHitCrop, onRainCollected, onRainHitGround, onHarvestCrop };

  useEffect(() => {
    let pixiApp: Application | null = null;
    let stopLoop: (() => void) | null = null;
    let cancelled = false;

    async function mountPixiApp() {
      if (!hostRef.current) {
        return;
      }

      const app = await createPixiApp(hostRef.current);
      if (cancelled) {
        app.destroy(true);
        return;
      }

      pixiApp = app;
      const artAssets = await loadArtAssets();
      if (cancelled) {
        app.destroy(true);
        return;
      }

      drawScaffoldScene(app, artAssets);
      stopLoop = startPhaseTwoScene(app, gameStateRef, callbacksRef, artAssets);
    }

    void mountPixiApp();

    return () => {
      cancelled = true;
      stopLoop?.();
      pixiApp?.destroy(true);
    };
  }, []);

  return <div ref={hostRef} className="pixi-host" />;
}

/**
 * Starts the Phase 1 cloud and rain interaction scene.
 */
function startPhaseTwoScene(
  app: Application,
  gameStateRef: MutableRefObject<GameState>,
  callbacksRef: MutableRefObject<{
    onRainHitCrop: (plotId: string, moisture: number, water: number) => void;
    onRainCollected: (water: number) => void;
    onRainHitGround: (water: number) => void;
    onHarvestCrop: (plotId: string) => void;
  }>,
  artAssets: LoadedArtAssets,
) {
  const clouds: RenderedCloud[] = [
    createCloud(
      "cloud-1",
      SCENE_LAYOUT.clouds.primary.x,
      SCENE_LAYOUT.clouds.primary.y,
      SCENE_LAYOUT.clouds.primary.driftSpeed,
      artAssets.cloudOne,
    ),
    createCloud(
      "cloud-2",
      SCENE_LAYOUT.clouds.secondary.x,
      SCENE_LAYOUT.clouds.secondary.y,
      SCENE_LAYOUT.clouds.secondary.driftSpeed,
      artAssets.cloudTwo,
    ),
  ];
  const raindrops: RenderedRaindrop[] = [];
  const splashes: RenderedSplash[] = [];
  const floatTexts: RenderedFloatText[] = [];
  const cropPlots = createCropPlots(gameStateRef.current.cropPlots, callbacksRef, gameStateRef, floatTexts, app, artAssets);
  const machines = createMachines(artAssets);
  app.stage.addChild(machines.layer);

  for (const cropPlot of cropPlots) {
    app.stage.addChild(cropPlot.view);
  }

  for (const cloud of clouds) {
    cloud.view.eventMode = "static";
    cloud.view.cursor = "pointer";
    cloud.view.on("pointertap", () => {
      const maxWater = getCloudMaxWater(gameStateRef.current);
      cloud.model.maxWater = maxWater;
      if (cloud.model.waterAmount <= 0) {
        return;
      }

      cloud.model.waterAmount = Math.max(0, cloud.model.waterAmount - 1);
      cloud.model.pulseTime = 0.24;
      spawnRaindrops(cloud, raindrops, app, gameStateRef.current);
    });
    app.stage.addChild(cloud.view);
  }

  return startGameLoop((deltaSeconds) => {
    updateClouds(clouds, gameStateRef.current, deltaSeconds);
    syncMachines(machines, gameStateRef.current, deltaSeconds);
    syncCropPlots(cropPlots, gameStateRef.current.cropPlots, deltaSeconds);
    updateRaindrops(
      raindrops,
      splashes,
      cropPlots,
      machines,
      app,
      gameStateRef.current,
      callbacksRef.current,
      deltaSeconds,
    );
    updateSplashes(splashes, deltaSeconds);
    updateFloatTexts(floatTexts, deltaSeconds);
    app.render();
  });
}

/**
 * Creates one procedural cloud view and its model.
 */
function createCloud(
  id: string,
  x: number,
  y: number,
  driftSpeed: number,
  texture?: Texture,
): RenderedCloud {
  const view = new Container();
  if (texture) {
    const cloudSprite = new Sprite(texture);
    cloudSprite.anchor.set(0.5);
    cloudSprite.scale.set(id === "cloud-1" ? 0.29 : 0.31);
    view.addChild(cloudSprite);
  } else {
    drawFallbackCloud(view);
  }
  view.position.set(x, y);

  return {
    view,
    windFeedback: 0,
    model: {
      id,
      x,
      y,
      waterAmount: 20,
      maxWater: 20,
      driftSpeed,
      scale: 1,
      cooldown: 0,
      pulseTime: 0,
    },
  };
}

/**
 * Updates cloud drift and click pulse animation.
 */
function updateClouds(clouds: RenderedCloud[], gameState: GameState, deltaSeconds: number) {
  for (const cloud of clouds) {
    const driftFactor =
      gameState.unlocks.windmill && cloud.model.x >= 180 && cloud.model.x <= 620
        ? Math.max(0.3, 0.68 - gameState.upgrades.windmillPower * 0.08)
        : 1;
    cloud.model.x += cloud.model.driftSpeed * driftFactor * deltaSeconds;
    if (cloud.model.x > GAME_WIDTH + 120) {
      cloud.model.x = -120;
    }

    cloud.windFeedback = gameState.unlocks.windmill && driftFactor < 1 ? 0.22 : Math.max(0, cloud.windFeedback - deltaSeconds);
    cloud.model.pulseTime = Math.max(0, cloud.model.pulseTime - deltaSeconds);
    cloud.model.maxWater = getCloudMaxWater(gameState);
    cloud.model.waterAmount = Math.min(
      cloud.model.maxWater,
      cloud.model.waterAmount + deltaSeconds * 1.25,
    );
    const pulseProgress = cloud.model.pulseTime / 0.24;
    const squash = pulseProgress > 0 ? Math.sin(pulseProgress * Math.PI) : 0;
    const fullness = cloud.model.waterAmount / cloud.model.maxWater;
    const edgeFade = Math.min(
      1,
      Math.max(0, (cloud.model.x + CLOUD_EDGE_MARGIN) / 90),
      Math.max(0, (GAME_WIDTH + CLOUD_EDGE_MARGIN - cloud.model.x) / 90),
    );
    cloud.view.position.set(cloud.model.x, cloud.model.y);
    cloud.view.alpha = 0.15 + edgeFade * 0.85;
    cloud.view.scale.set(
      0.94 + fullness * 0.18 + squash * 0.08 + cloud.windFeedback * 0.08,
      0.94 + fullness * 0.18 - squash * 0.1,
    );
  }
}

/**
 * Spawns visible raindrops below a clicked cloud.
 */
function spawnRaindrops(
  cloud: RenderedCloud,
  raindrops: RenderedRaindrop[],
  app: Application,
  gameState: GameState,
) {
  const dropCount = getRaindropsPerClick(gameState);

  for (let index = 0; index < dropCount; index += 1) {
    const xOffset = (index - (dropCount - 1) / 2) * 14 + (Math.random() - 0.5) * 8;
    const model: RaindropModel = {
      id: `${cloud.model.id}-drop-${performance.now()}-${index}`,
      x: cloud.model.x + xOffset,
      y: cloud.model.y + 34 + Math.random() * 8,
      vy: 245 + Math.random() * 70,
      value: 1,
      radius: 4 + Math.random() * 1.5,
      target: "ground",
    };
    const view = drawFallbackRaindrop(model.radius);
    view.position.set(model.x, model.y);
    raindrops.push({ model, view });
    app.stage.addChild(view);
  }
}

/**
 * Advances raindrops and replaces ground hits with small splashes.
 */
function updateRaindrops(
  raindrops: RenderedRaindrop[],
  splashes: RenderedSplash[],
  cropViews: RenderedCropPlot[],
  machines: RenderedMachines,
  app: Application,
  gameState: GameState,
  callbacks: {
    onRainHitCrop: (plotId: string, moisture: number, water: number) => void;
    onRainCollected: (water: number) => void;
    onRainHitGround: (water: number) => void;
    onHarvestCrop: (plotId: string) => void;
  },
  deltaSeconds: number,
) {
  for (let index = raindrops.length - 1; index >= 0; index -= 1) {
    const drop = raindrops[index];
    drop.model.y += drop.model.vy * deltaSeconds;
    drop.view.position.set(drop.model.x, drop.model.y);

    const hitPlot = findHitCropPlot(drop.model, gameState.cropPlots);
    if (isRainCollectorHit(drop.model, gameState)) {
      const collectorGain = getWaterGain(gameState, 0.75 + gameState.upgrades.rainCollectorEfficiency * 0.35);
      callbacks.onRainCollected(collectorGain);
      machines.collectorFlash.alpha = 0.85;
      createSplash(drop.model.x, drop.model.y, splashes, app);
      app.stage.removeChild(drop.view);
      drop.view.destroy();
      raindrops.splice(index, 1);
      continue;
    }

    if (hitPlot) {
      callbacks.onRainHitCrop(hitPlot.id, 10, getWaterGain(gameState, 0.12));
      triggerCropHitFeedback(cropViews, hitPlot.id);
      createSplash(drop.model.x, drop.model.y, splashes, app);
      app.stage.removeChild(drop.view);
      drop.view.destroy();
      raindrops.splice(index, 1);
      continue;
    }

    if (drop.model.y >= GAME_HEIGHT - 118) {
      callbacks.onRainHitGround(getWaterGain(gameState, 0.15));
      createSplash(drop.model.x, GAME_HEIGHT - 118, splashes, app);
      app.stage.removeChild(drop.view);
      drop.view.destroy();
      raindrops.splice(index, 1);
    }
  }
}

/**
 * Creates persistent machine views once and toggles them as unlocks change.
 */
function createMachines(artAssets: LoadedArtAssets): RenderedMachines {
  const layer = new Container();

  const collector = new Container();
  collector.position.set(COLLECTOR_POSITION.x, COLLECTOR_POSITION.y);
  collector.scale.set(0.96);
  const collectorFlash = new Graphics().circle(0, -5, 34).fill({ color: 0x73c7ff, alpha: 0.45 });
  collector.addChild(collectorFlash);
  if (artAssets.rainCollector) {
    const collectorSprite = new Sprite(artAssets.rainCollector);
    collectorSprite.anchor.set(0.5, 0.7);
    collectorSprite.scale.set(0.28);
    collector.addChild(collectorSprite);
  } else {
    const collectorWaterLevel = new Graphics().roundRect(-20, 3, 40, 11, 5).fill({ color: 0x73c7ff, alpha: 0.9 });
    collector.addChild(
      new Graphics().roundRect(-28, -8, 56, 25, 8).fill(0xf7fbff),
      collectorWaterLevel,
      new Graphics().roundRect(-31, -12, 62, 8, 4).fill(0x9ed9f4),
      new Graphics().circle(0, -18, 5).fill(0x73c7ff),
    );
  }

  const windmill = new Container();
  windmill.position.set(WINDMILL_POSITION.x, WINDMILL_POSITION.y);
  windmill.scale.set(0.88);
  let windmillBlades: Graphics | Sprite;
  if (artAssets.windmillBase && artAssets.windmillBlades) {
    const windmillBase = new Sprite(artAssets.windmillBase);
    windmillBase.anchor.set(0.5, 0.82);
    windmillBase.scale.set(0.27);
    windmillBlades = new Sprite(artAssets.windmillBlades);
    windmillBlades.anchor.set(0.5);
    windmillBlades.position.set(0, -52);
    windmillBlades.scale.set(0.18);
    windmill.addChild(windmillBase, windmillBlades);
  } else {
    windmillBlades = new Graphics()
      .roundRect(-4, -38, 8, 32, 4)
      .fill(0xf7fbff)
      .roundRect(-4, 6, 8, 32, 4)
      .fill(0xf7fbff)
      .roundRect(6, -4, 32, 8, 4)
      .fill(0xf7fbff)
      .roundRect(-38, -4, 32, 8, 4)
      .fill(0xf7fbff)
      .circle(0, 0, 7)
      .fill(0xffd978);
    windmill.addChild(
      new Graphics()
        .moveTo(-14, 52)
        .lineTo(0, -6)
        .lineTo(14, 52)
        .closePath()
        .fill(0x9ed9f4),
      windmillBlades,
      new Graphics().circle(0, 0, 4).fill(0x35556a),
    );
  }

  const sunPrism = new Container();
  sunPrism.position.set(SUN_PRISM_POSITION.x, SUN_PRISM_POSITION.y);
  const sunPrismBeam = new Graphics()
    .moveTo(0, -128)
    .lineTo(62, 18)
    .lineTo(-62, 18)
    .closePath()
    .fill({ color: 0xffd978, alpha: 0.18 });
  const sunPrismGlow = new Graphics().circle(0, -10, 42).fill({ color: 0xffd978, alpha: 0.16 });
  let sunPrismBody: Graphics | Sprite;
  if (artAssets.sunPrism) {
    sunPrismBody = new Sprite(artAssets.sunPrism);
    sunPrismBody.anchor.set(0.5, 0.78);
    sunPrismBody.scale.set(0.3);
    sunPrism.addChild(sunPrismBeam, sunPrismGlow, sunPrismBody);
  } else {
    sunPrismBody = new Graphics()
      .moveTo(0, -46)
      .lineTo(28, 8)
      .lineTo(-28, 8)
      .closePath()
      .fill(0xf7fbff)
      .stroke({ color: 0xffd978, width: 3, alpha: 0.58 });
    sunPrism.addChild(
      sunPrismBeam,
      sunPrismGlow,
      sunPrismBody,
      new Graphics().roundRect(-16, 8, 32, 12, 5).fill(0x9ed9f4),
    );
  }

  const windLines = new Graphics();
  const islandLight = new Graphics();

  layer.addChild(windLines, islandLight, collector, windmill, sunPrism);

  return {
    layer,
    collector,
    collectorFlash,
    windmill,
    windmillBlades,
    sunPrism,
    sunPrismBeam,
    sunPrismGlow,
    sunPrismBody,
    windLines,
    islandLight,
  };
}

/**
 * Updates persistent machine visibility and animation from game state.
 */
function syncMachines(machines: RenderedMachines, gameState: GameState, deltaSeconds: number) {
  machines.collector.visible = gameState.unlocks.rainCollector;
  machines.windmill.visible = gameState.unlocks.windmill;
  machines.sunPrism.visible = gameState.unlocks.sunPrism;

  machines.collectorFlash.alpha = Math.max(0, machines.collectorFlash.alpha - deltaSeconds * 3.2);

  if (gameState.unlocks.windmill) {
    machines.windmillBlades.rotation =
      gameState.totalPlayTimeSeconds * (4.4 + gameState.upgrades.windmillPower * 1.2);
    drawWindLines(machines.windLines, gameState.totalPlayTimeSeconds);
  } else {
    machines.windLines.clear();
  }

  const prismActive = isSunPrismActive(gameState);
  machines.sunPrismBeam.visible = prismActive;
  machines.sunPrismGlow.visible = prismActive;
  machines.sunPrismBody.alpha = prismActive ? 1 : 0.78;
  machines.sunPrism.scale.set(prismActive ? 1.08 : 1);
  drawIslandLight(machines.islandLight, prismActive, gameState.totalPlayTimeSeconds);
}

/**
 * Draws subtle wind streaks while the windmill is affecting cloud movement.
 */
function drawWindLines(graphics: Graphics, timeSeconds: number) {
  const offset = (timeSeconds * 34) % 54;
  graphics.clear();

  for (let index = 0; index < 4; index += 1) {
    const y = 122 + index * 34;
    const x = 156 + ((offset + index * 22) % 80);
    graphics
      .moveTo(x, y)
      .bezierCurveTo(x + 32, y - 10, x + 72, y + 10, x + 112, y - 2)
      .stroke({ color: 0xf7fbff, width: 2, alpha: 0.34 });
  }
}

/**
 * Draws a warm island-level light wash while the sun prism is active.
 */
function drawIslandLight(graphics: Graphics, active: boolean, timeSeconds: number) {
  graphics.clear();

  if (!active) {
    return;
  }

  const pulseAlpha = 0.16 + Math.sin(timeSeconds * 5) * 0.04;
  graphics
    .ellipse(
      SCENE_LAYOUT.island.light.x,
      SCENE_LAYOUT.island.light.y,
      SCENE_LAYOUT.island.light.radiusX,
      SCENE_LAYOUT.island.light.radiusY,
    )
    .fill({ color: 0xffd978, alpha: pulseAlpha })
    .ellipse(SCENE_LAYOUT.island.light.x, SCENE_LAYOUT.island.light.y + 34, 190, 44)
    .fill({ color: 0xf7fbff, alpha: 0.1 });
}

/**
 * Checks whether a raindrop lands inside the active rain collector.
 */
function isRainCollectorHit(raindrop: RaindropModel, gameState: GameState) {
  if (!gameState.unlocks.rainCollector) {
    return false;
  }

  const collectorX = COLLECTOR_POSITION.x;
  const collectorY = COLLECTOR_POSITION.y;
  const hitHalfWidth = 42 + gameState.upgrades.rainCollectorEfficiency * 8;
  return (
    Math.abs(raindrop.x - collectorX) <= hitHalfWidth &&
    raindrop.y >= collectorY - 26 &&
    raindrop.y <= collectorY + 18
  );
}

/**
 * Returns the base cloud water capacity before upgrades.
 */
function getCloudBaseMaxWater() {
  return 20;
}

/**
 * Returns the current cloud water capacity from upgrades.
 */
function getCloudMaxWater(gameState: GameState) {
  return getCloudBaseMaxWater() + (gameState.upgrades.cloudCapacity - 1) * 10;
}

/**
 * Applies water collection upgrades to a raw rain gain.
 */
function getWaterGain(gameState: GameState, baseGain: number) {
  return Number((baseGain * gameState.upgrades.waterStorage).toFixed(2));
}

/**
 * Creates one splash feedback object at the given scene coordinate.
 */
function createSplash(x: number, y: number, splashes: RenderedSplash[], app: Application) {
      const splash = drawFallbackSplash();
      splash.position.set(x, y);
      splashes.push({ life: 0.28, view: splash });
      app.stage.addChild(splash);
}

/**
 * Fades short splash feedback objects.
 */
function updateSplashes(splashes: RenderedSplash[], deltaSeconds: number) {
  for (let index = splashes.length - 1; index >= 0; index -= 1) {
    const splash = splashes[index];
    splash.life -= deltaSeconds;
    splash.view.alpha = Math.max(0, splash.life / 0.28);
    splash.view.scale.set(1 + (1 - splash.view.alpha) * 0.8);

    if (splash.life <= 0) {
      splash.view.parent?.removeChild(splash.view);
      splash.view.destroy();
      splashes.splice(index, 1);
    }
  }
}

/**
 * Creates a short-lived resource reward label in the Pixi scene.
 */
function createResourceFloatText(
  text: string,
  x: number,
  y: number,
  floatTexts: RenderedFloatText[],
  app: Application,
) {
  const view = new Text({
    text,
    style: {
      fill: 0x35556a,
      fontFamily: "Arial",
      fontSize: 15,
      fontWeight: "700",
      stroke: { color: 0xf7fbff, width: 3 },
    },
  });

  view.anchor.set(0.5);
  view.position.set(x, y);
  floatTexts.push({ life: 1.05, view });
  app.stage.addChild(view);
}

/**
 * Floats reward labels upward and removes them after they fade.
 */
function updateFloatTexts(floatTexts: RenderedFloatText[], deltaSeconds: number) {
  for (let index = floatTexts.length - 1; index >= 0; index -= 1) {
    const floatText = floatTexts[index];
    floatText.life -= deltaSeconds;
    floatText.view.y -= 24 * deltaSeconds;
    floatText.view.alpha = Math.max(0, floatText.life / 1.05);
    floatText.view.scale.set(1 + (1 - floatText.view.alpha) * 0.12);

    if (floatText.life <= 0) {
      floatText.view.parent?.removeChild(floatText.view);
      floatText.view.destroy();
      floatTexts.splice(index, 1);
    }
  }
}

/**
 * Returns the generated crop sprite stages when all required textures loaded.
 */
function getCropTextures(artAssets: LoadedArtAssets): [Texture, Texture, Texture, Texture] | null {
  if (
    !artAssets.cropStageZero ||
    !artAssets.cropStageOne ||
    !artAssets.cropStageTwo ||
    !artAssets.cropStageThree
  ) {
    return null;
  }

  return [
    artAssets.cropStageZero,
    artAssets.cropStageOne,
    artAssets.cropStageTwo,
    artAssets.cropStageThree,
  ];
}

/**
 * Returns the generated plot tile textures when all required variants loaded.
 */
function getPlotTextures(artAssets: LoadedArtAssets): [Texture, Texture, Texture] | null {
  if (!artAssets.plotDry || !artAssets.plotWet || !artAssets.plotReady) {
    return null;
  }

  return [artAssets.plotDry, artAssets.plotWet, artAssets.plotReady];
}

/**
 * Selects the visible crop sprite stage from crop growth state.
 */
function getCropTextureFromRatio(
  cropTextures: [Texture, Texture, Texture, Texture],
  growthRatio: number,
  isReady: boolean,
) {
  if (isReady) {
    return cropTextures[3];
  }

  if (growthRatio < 0.28) {
    return cropTextures[0];
  }

  if (growthRatio < 0.68) {
    return cropTextures[1];
  }

  return cropTextures[2];
}

/**
 * Selects the plot tile sprite from moisture and ready state.
 */
function getPlotTextureFromState(plotTextures: [Texture, Texture, Texture], plot: CropPlotModel) {
  if (plot.isReady) {
    return plotTextures[2];
  }

  return plot.moisture > 0 ? plotTextures[1] : plotTextures[0];
}

/**
 * Creates clickable crop plot views.
 */
function createCropPlots(
  plots: CropPlotModel[],
  callbacksRef: MutableRefObject<{
    onHarvestCrop: (plotId: string) => void;
  }>,
  gameStateRef: MutableRefObject<GameState>,
  floatTexts: RenderedFloatText[],
  app: Application,
  artAssets: LoadedArtAssets,
) {
  return plots.map((plot) => {
    const view = new Container();
    const base = new Graphics().roundRect(-34, -8, 68, 20, 10).fill(0xd6b98c);
    const plotTextures = getPlotTextures(artAssets);
    const plotSprite = plotTextures ? new Sprite(plotTextures[0]) : null;
    if (plotSprite) {
      plotSprite.anchor.set(0.5, 0.54);
      plotSprite.scale.set(0.22);
      base.visible = false;
    }
    const wetOverlay = new Graphics();
    const crop = new Graphics();
    const cropTextures = getCropTextures(artAssets);
    const cropSprite = cropTextures ? new Sprite(cropTextures[0]) : null;
    if (cropSprite) {
      cropSprite.anchor.set(0.5, 1);
      cropSprite.position.set(0, -14);
      cropSprite.scale.set(0.2);
      crop.visible = false;
    }
    const progressBack = new Graphics().roundRect(-28, 15, 56, 6, 3).fill({ color: 0xf7fbff, alpha: 0.78 });
    const progressFill = new Graphics();
    const progressFlash = new Graphics();
    const readyGlow = new Graphics();
    view.position.set(plot.x, plot.y);
    view.eventMode = "static";
    view.cursor = "pointer";
    view.addChild(readyGlow, base);
    if (plotSprite) {
      view.addChild(plotSprite);
    }
    view.addChild(wetOverlay);
    if (cropSprite) {
      view.addChild(cropSprite);
    }
    view.addChild(crop, progressBack, progressFill, progressFlash);
    view.on("pointertap", () => {
      const currentPlot = gameStateRef.current.cropPlots.find((candidate) => candidate.id === plot.id);
      if (currentPlot?.isReady) {
        createResourceFloatText("+6 云棉  +1 阳光", plot.x, plot.y - 62, floatTexts, app);
      }
      callbacksRef.current.onHarvestCrop(plot.id);
    });
    return {
      plotId: plot.id,
      view,
      base,
      plotSprite,
      plotTextures,
      wetOverlay,
      crop,
      cropSprite,
      cropTextures,
      progressBack,
      progressFill,
      progressFlash,
      readyGlow,
      feedback: 0,
      flash: 0,
      readyPulse: 0,
    };
  });
}

/**
 * Updates persistent crop plot graphics from serializable game state.
 */
function syncCropPlots(
  cropViews: RenderedCropPlot[],
  plots: CropPlotModel[],
  deltaSeconds: number,
) {
  for (const cropView of cropViews) {
    const plot = plots.find((candidate) => candidate.id === cropView.plotId);
    if (!plot) {
      continue;
    }

    cropView.feedback = Math.max(0, cropView.feedback - deltaSeconds);
    cropView.flash = Math.max(0, cropView.flash - deltaSeconds);
    cropView.readyPulse += deltaSeconds;

    const baseScale = 1;
    const bounce = cropView.feedback > 0 ? Math.sin((cropView.feedback / 0.12) * Math.PI) * 0.08 : 0;
    const readyPulse = plot.isReady ? Math.sin(cropView.readyPulse * 5) * 0.045 : 0;
    cropView.view.scale.set(baseScale * (1 + bounce + readyPulse));

    drawWetOverlay(cropView.wetOverlay, plot, cropView.flash);
    if (cropView.plotSprite && cropView.plotTextures) {
      cropView.plotSprite.texture = getPlotTextureFromState(cropView.plotTextures, plot);
    }
    if (cropView.cropSprite && cropView.cropTextures) {
      cropView.cropSprite.texture = getCropTextureFromRatio(
        cropView.cropTextures,
        plot.growth / plot.growthRequired,
        plot.isReady,
      );
    } else {
      drawCropStage(cropView.crop, plot.growth / plot.growthRequired, plot.isReady);
    }
    drawCropProgress(cropView.progressFill, cropView.progressFlash, plot, cropView.flash);
    drawReadyGlow(cropView.readyGlow, plot.isReady, cropView.readyPulse);
  }
}

/**
 * Starts the local rain-hit feedback on one persistent crop view.
 */
function triggerCropHitFeedback(cropViews: RenderedCropPlot[], plotId: string) {
  const cropView = cropViews.find((candidate) => candidate.plotId === plotId);
  if (!cropView) {
    return;
  }

  cropView.feedback = 0.16;
  cropView.flash = 0.32;
}

/**
 * Draws the changing wet overlay on an existing graphics object.
 */
function drawWetOverlay(graphics: Graphics, plot: CropPlotModel, flash: number) {
  const wetAlpha = Math.min(plot.moisture / 50, 0.45);
  const flashAlpha = Math.min(flash / 0.32, 1) * 0.36;
  graphics
    .clear()
    .roundRect(-30, -6, 60, 14, 8)
    .fill({ color: 0x73c7ff, alpha: wetAlpha + flashAlpha })
    .roundRect(-38, -12, 76, 28, 12)
    .stroke({ color: 0x73c7ff, width: 2, alpha: flashAlpha });
}

/**
 * Draws the crop progress bar on existing graphics objects.
 */
function drawCropProgress(fill: Graphics, flash: Graphics, plot: CropPlotModel, flashTime: number) {
  const progressRatio = Math.min(plot.growth / plot.growthRequired, 1);
  const fillWidth = 52 * progressRatio;
  const flashAlpha = Math.min(flashTime / 0.32, 1) * 0.75;

  fill.clear();
  if (fillWidth > 0) {
    fill.roundRect(-26, 16, fillWidth, 4, 2).fill(plot.isReady ? 0xffd978 : 0xa9d98e);
  }
  flash.clear().roundRect(-30, 13, 60, 10, 5).stroke({ color: 0xf7fbff, width: 2, alpha: flashAlpha });
}

/**
 * Draws the crop-ready glow on an existing graphics object.
 */
function drawReadyGlow(graphics: Graphics, isReady: boolean, pulseTime: number) {
  graphics.clear();
  if (!isReady) {
    return;
  }

  const pulseAlpha = 0.3 + Math.sin(pulseTime * 5) * 0.12;
  graphics
    .circle(0, -34, 28)
    .fill({ color: 0xffd978, alpha: 0.13 })
    .circle(0, -34, 23)
    .stroke({ color: 0xffd978, width: 3, alpha: pulseAlpha });
}

/**
 * Draws the crop stage using simple readable shapes.
 */
function drawCropStage(crop: Graphics, growthRatio: number, isReady: boolean) {
  crop.clear();

  if (growthRatio < 0.28) {
    crop.circle(0, -12, 5).fill(0xa9d98e);
  } else if (growthRatio < 0.68) {
    crop
      .roundRect(-3, -30, 6, 24, 4)
      .fill(0x78b86e)
      .ellipse(-10, -20, 12, 6)
      .fill(0xa9d98e)
      .ellipse(10, -24, 12, 6)
      .fill(0xa9d98e);
  } else {
    crop
      .roundRect(-4, -42, 8, 36, 4)
      .fill(0x78b86e)
      .ellipse(-13, -30, 15, 8)
      .fill(0xa9d98e)
      .ellipse(13, -33, 15, 8)
      .fill(0xa9d98e)
      .circle(0, -45, 8)
      .fill(isReady ? 0xffd978 : 0xbde7a4);
  }

  if (isReady) {
    crop.circle(0, -45, 18).stroke({ color: 0xffd978, width: 3, alpha: 0.45 });
  }
}

/**
 * Finds a crop plot hit by the current raindrop position.
 */
function findHitCropPlot(raindrop: RaindropModel, plots: CropPlotModel[]) {
  return plots.find((plot) => {
    const withinX = Math.abs(raindrop.x - plot.x) <= 50;
    const withinY = raindrop.y >= plot.y - 58 && raindrop.y <= plot.y + 20;
    return withinX && withinY && !plot.isReady;
  });
}
