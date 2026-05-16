import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../../data/constants";
import { ART_ASSETS } from "../../game/assets/assetManifest";
import { projectIslandPoint } from "../../game/sceneLayout";
import type { GameState } from "../../game/state/gameTypes";
import { getRaindropsPerClick } from "../../game/systems/weatherSystem";
import { isSunPrismActive } from "../../game/systems/growthSystem";

interface RefObject<T> {
  current: T;
}

interface SceneCallbacks {
  onRainHitCrop: (plotId: string, moisture: number, water: number) => void;
  onRainCollected: (water: number) => void;
  onRainHitGround: (water: number) => void;
  onHarvestCrop: (plotId: string) => void;
}

export interface PhaserSceneBridge {
  gameStateRef: RefObject<GameState>;
  callbacksRef: RefObject<SceneCallbacks>;
}

interface GridCell {
  id: string;
  column: number;
  row: number;
  point: Phaser.Math.Vector2;
}

interface CloudView {
  id: string;
  sprite: Phaser.GameObjects.Image;
  waterAmount: number;
  maxWater: number;
  driftSpeed: number;
  pulseTime: number;
}

interface RaindropView {
  drop: Phaser.GameObjects.Ellipse;
  vy: number;
}

interface CropView {
  plotId: string;
  cell: GridCell;
  plotImage: Phaser.GameObjects.Image;
  cropImage: Phaser.GameObjects.Image;
  progressBack: Phaser.GameObjects.Rectangle;
  progressFill: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Ellipse;
  hitFlash: Phaser.GameObjects.Ellipse;
  zone: Phaser.GameObjects.Zone;
  feedbackTime: number;
}

interface MachineViews {
  collector: Phaser.GameObjects.Image;
  collectorFlash: Phaser.GameObjects.Ellipse;
  windmillBase: Phaser.GameObjects.Image;
  windmillBlades: Phaser.GameObjects.Image;
  prism: Phaser.GameObjects.Image;
  prismBeam: Phaser.GameObjects.Triangle;
  prismGlow: Phaser.GameObjects.Ellipse;
}

const GRID_COLUMNS = 5;
const GRID_ROWS = 4;

const CROP_CELL_IDS = {
  "crop-1": "cell-1-2",
  "crop-2": "cell-2-1",
  "crop-3": "cell-3-2",
} as const;

const MACHINE_CELL_IDS = {
  collector: "cell-4-2",
  windmill: "cell-1-0",
  sunPrism: "cell-3-1",
} as const;

/**
 * Phaser renderer for the lightweight 2.5D grid island.
 */
export class CloudIslandScene extends Phaser.Scene {
  private readonly bridge: PhaserSceneBridge;
  private gridCells = new Map<string, GridCell>();
  private clouds: CloudView[] = [];
  private raindrops: RaindropView[] = [];
  private cropViews: CropView[] = [];
  private machines: MachineViews | null = null;

  constructor(bridge: PhaserSceneBridge) {
    super("CloudIslandScene");
    this.bridge = bridge;
  }

  /**
   * Loads the existing pixel-art assets through stable manifest keys.
   */
  preload() {
    for (const [assetKey, assetPath] of Object.entries(ART_ASSETS)) {
      this.load.image(assetKey, assetPath);
    }
  }

  /**
   * Creates a fixed grid-based island scene.
   */
  create() {
    this.createSky();
    this.createGridCells();
    this.createIsland();
    this.createGridOverlay();
    this.createCrops();
    this.machines = this.createMachines();
    this.createClouds();
  }

  /**
   * Synchronizes render objects from React-owned state.
   */
  update(_time: number, deltaMs: number) {
    const deltaSeconds = deltaMs / 1000;
    const gameState = this.bridge.gameStateRef.current;

    this.updateClouds(gameState, deltaSeconds);
    this.updateCrops(gameState, deltaSeconds);
    this.updateMachines(gameState, deltaSeconds);
    this.updateRaindrops(gameState, deltaSeconds);
  }

  /**
   * Draws the calm sky and distant cloud layer.
   */
  private createSky() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xbfe7ff);
    this.add.circle(650, 78, 62, 0xffd978, 0.38);
    this.add.ellipse(90, 126, 150, 34, 0xf7fbff, 0.28);

    if (this.textures.exists("cloudBank")) {
      this.add.image(GAME_WIDTH / 2, 174, "cloudBank").setScale(0.62).setAlpha(0.62);
    }
  }

  /**
   * Builds the authored 5x4 island grid.
   */
  private createGridCells() {
    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let column = 0; column < GRID_COLUMNS; column += 1) {
        const u = Phaser.Math.Linear(-0.72, 0.72, column / (GRID_COLUMNS - 1));
        const v = Phaser.Math.Linear(-0.58, 0.56, row / (GRID_ROWS - 1));
        const point = projectIslandPoint({ u, v });
        const id = `cell-${column}-${row}`;
        this.gridCells.set(id, {
          id,
          column,
          row,
          point: new Phaser.Math.Vector2(point.x, point.y),
        });
      }
    }
  }

  /**
   * Adds the existing floating island asset.
   */
  private createIsland() {
    this.add.ellipse(392, 456, 520, 68, 0x6ea9c9, 0.18);
    this.add.image(384, 322, "islandBase").setScale(0.74);
  }

  /**
   * Draws a restrained grid so object placement reads as tile-based.
   */
  private createGridOverlay() {
    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0xf7fbff, 0.34);

    for (let row = 0; row < GRID_ROWS; row += 1) {
      const points = Array.from({ length: GRID_COLUMNS }, (_, column) =>
        this.requireCell(`cell-${column}-${row}`).point,
      );
      drawPolyline(graphics, points);
    }

    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const points = Array.from({ length: GRID_ROWS }, (_, row) =>
        this.requireCell(`cell-${column}-${row}`).point,
      );
      drawPolyline(graphics, points);
    }
  }

  /**
   * Places the three crop plots on fixed grid cells.
   */
  private createCrops() {
    const gameState = this.bridge.gameStateRef.current;

    this.cropViews = gameState.cropPlots.map((plot) => {
      const cell = this.requireCell(CROP_CELL_IDS[plot.id as keyof typeof CROP_CELL_IDS]);
      const plotImage = this.add.image(cell.point.x, cell.point.y, "plotDry").setScale(0.2);
      const cropImage = this.add
        .image(cell.point.x, cell.point.y - 18, "cropStageZero")
        .setOrigin(0.5, 1)
        .setScale(0.19);
      const progressBack = this.add
        .rectangle(cell.point.x, cell.point.y + 21, 62, 6, 0xf7fbff, 0.78)
        .setOrigin(0.5);
      const progressFill = this.add
        .rectangle(cell.point.x - 28, cell.point.y + 21, 0, 4, 0xa9d98e, 1)
        .setOrigin(0, 0.5);
      const glow = this.add
        .ellipse(cell.point.x, cell.point.y - 28, 62, 42, 0xffd978, 0)
        .setBlendMode(Phaser.BlendModes.ADD);
      const hitFlash = this.add
        .ellipse(cell.point.x, cell.point.y, 78, 42, 0x73c7ff, 0)
        .setBlendMode(Phaser.BlendModes.ADD);
      const zone = this.add.zone(cell.point.x, cell.point.y - 8, 82, 72).setInteractive({
        useHandCursor: true,
      });

      zone.on("pointerdown", () => {
        const currentPlot = this.bridge.gameStateRef.current.cropPlots.find(
          (candidate) => candidate.id === plot.id,
        );
        if (currentPlot?.isReady) {
          this.createFloatText("+6 云棉  +1 阳光", cell.point.x, cell.point.y - 64);
        }
        this.bridge.callbacksRef.current.onHarvestCrop(plot.id);
      });

      return {
        plotId: plot.id,
        cell,
        plotImage,
        cropImage,
        progressBack,
        progressFill,
        glow,
        hitFlash,
        zone,
        feedbackTime: 0,
      };
    });
  }

  /**
   * Creates the three v0.1 weather machine views on fixed edge cells.
   */
  private createMachines(): MachineViews {
    const collectorCell = this.requireCell(MACHINE_CELL_IDS.collector);
    const windmillCell = this.requireCell(MACHINE_CELL_IDS.windmill);
    const prismCell = this.requireCell(MACHINE_CELL_IDS.sunPrism);

    const collectorFlash = this.add
      .ellipse(collectorCell.point.x, collectorCell.point.y - 10, 76, 52, 0x73c7ff, 0)
      .setBlendMode(Phaser.BlendModes.ADD);
    const collector = this.add
      .image(collectorCell.point.x, collectorCell.point.y - 10, "rainCollector")
      .setOrigin(0.5, 0.72)
      .setScale(0.27);

    const windmillBase = this.add
      .image(windmillCell.point.x, windmillCell.point.y, "windmillBase")
      .setOrigin(0.5, 0.82)
      .setScale(0.26);
    const windmillBlades = this.add
      .image(windmillCell.point.x, windmillCell.point.y - 54, "windmillBlades")
      .setScale(0.18);

    const prismBeam = this.add
      .triangle(prismCell.point.x, prismCell.point.y - 38, 0, -92, 58, 32, -58, 32, 0xffd978, 0)
      .setBlendMode(Phaser.BlendModes.ADD);
    const prismGlow = this.add
      .ellipse(prismCell.point.x, prismCell.point.y - 22, 88, 62, 0xffd978, 0)
      .setBlendMode(Phaser.BlendModes.ADD);
    const prism = this.add
      .image(prismCell.point.x, prismCell.point.y, "sunPrism")
      .setOrigin(0.5, 0.78)
      .setScale(0.28);

    return {
      collector,
      collectorFlash,
      windmillBase,
      windmillBlades,
      prism,
      prismBeam,
      prismGlow,
    };
  }

  /**
   * Creates clickable drifting clouds.
   */
  private createClouds() {
    this.clouds = [
      this.createCloud("cloud-1", 128, 92, 22, "cloudOne"),
      this.createCloud("cloud-2", 560, 122, 15, "cloudTwo"),
    ];
  }

  /**
   * Creates one cloud sprite with click-to-rain behavior.
   */
  private createCloud(
    id: string,
    x: number,
    y: number,
    driftSpeed: number,
    textureKey: string,
  ): CloudView {
    const sprite = this.add.image(x, y, textureKey).setScale(id === "cloud-1" ? 0.29 : 0.31);
    sprite.setInteractive({ useHandCursor: true });
    const cloud: CloudView = {
      id,
      sprite,
      waterAmount: 20,
      maxWater: 20,
      driftSpeed,
      pulseTime: 0,
    };

    sprite.on("pointerdown", () => {
      cloud.maxWater = getCloudMaxWater(this.bridge.gameStateRef.current);
      if (cloud.waterAmount <= 0) {
        return;
      }

      cloud.waterAmount = Math.max(0, cloud.waterAmount - 1);
      cloud.pulseTime = 0.24;
      this.spawnRaindrops(cloud);
    });

    return cloud;
  }

  /**
   * Updates cloud drift, refilling, and click pulse.
   */
  private updateClouds(gameState: GameState, deltaSeconds: number) {
    for (const cloud of this.clouds) {
      const driftFactor =
        gameState.unlocks.windmill && cloud.sprite.x >= 180 && cloud.sprite.x <= 620
          ? Math.max(0.3, 0.68 - gameState.upgrades.windmillPower * 0.08)
          : 1;
      cloud.sprite.x += cloud.driftSpeed * driftFactor * deltaSeconds;
      if (cloud.sprite.x > GAME_WIDTH + 130) {
        cloud.sprite.x = -130;
      }

      cloud.maxWater = getCloudMaxWater(gameState);
      cloud.waterAmount = Math.min(cloud.maxWater, cloud.waterAmount + deltaSeconds * 1.25);
      cloud.pulseTime = Math.max(0, cloud.pulseTime - deltaSeconds);
      const pulse = cloud.pulseTime > 0 ? Math.sin((cloud.pulseTime / 0.24) * Math.PI) : 0;
      const fullness = cloud.waterAmount / cloud.maxWater;
      const edgeFade = Math.min(
        1,
        Math.max(0, (cloud.sprite.x + 210) / 90),
        Math.max(0, (GAME_WIDTH + 210 - cloud.sprite.x) / 90),
      );

      cloud.sprite.setAlpha(0.15 + edgeFade * 0.85);
      cloud.sprite.setScale(
        (cloud.id === "cloud-1" ? 0.29 : 0.31) * (0.98 + fullness * 0.12 + pulse * 0.08),
        (cloud.id === "cloud-1" ? 0.29 : 0.31) * (0.98 + fullness * 0.12 - pulse * 0.1),
      );
    }
  }

  /**
   * Spawns Phaser raindrops below a clicked cloud.
   */
  private spawnRaindrops(cloud: CloudView) {
    const dropCount = getRaindropsPerClick(this.bridge.gameStateRef.current);

    for (let index = 0; index < dropCount; index += 1) {
      const xOffset = (index - (dropCount - 1) / 2) * 14 + Phaser.Math.Between(-4, 4);
      const drop = this.add.ellipse(
        cloud.sprite.x + xOffset,
        cloud.sprite.y + 36 + Math.random() * 8,
        7,
        13,
        0x73c7ff,
        1,
      );
      this.raindrops.push({
        drop,
        vy: 245 + Math.random() * 70,
      });
    }
  }

  /**
   * Synchronizes crop sprites and progress from gameplay state.
   */
  private updateCrops(gameState: GameState, deltaSeconds: number) {
    for (const cropView of this.cropViews) {
      const plot = gameState.cropPlots.find((candidate) => candidate.id === cropView.plotId);
      if (!plot) {
        continue;
      }

      const growthRatio = Math.min(plot.growth / plot.growthRequired, 1);
      cropView.plotImage.setTexture(plot.isReady ? "plotReady" : plot.moisture > 0 ? "plotWet" : "plotDry");
      cropView.cropImage.setTexture(getCropTextureKey(growthRatio, plot.isReady));
      cropView.progressFill.displayWidth = 56 * growthRatio;
      cropView.progressFill.setFillStyle(plot.isReady ? 0xffd978 : 0xa9d98e, 1);
      cropView.glow.setAlpha(plot.isReady ? 0.16 + Math.sin(this.time.now / 180) * 0.05 : 0);

      cropView.feedbackTime = Math.max(0, cropView.feedbackTime - deltaSeconds);
      cropView.hitFlash.setAlpha(Math.min(cropView.feedbackTime / 0.22, 1) * 0.42);
      const bounce = cropView.feedbackTime > 0 ? Math.sin((cropView.feedbackTime / 0.18) * Math.PI) * 0.05 : 0;
      cropView.plotImage.setScale(0.2 + bounce);
      cropView.cropImage.setScale(0.19 + bounce);
    }
  }

  /**
   * Synchronizes machine visibility and looping feedback.
   */
  private updateMachines(gameState: GameState, deltaSeconds: number) {
    if (!this.machines) {
      return;
    }

    this.machines.collector.setVisible(gameState.unlocks.rainCollector);
    this.machines.collectorFlash.setVisible(gameState.unlocks.rainCollector);
    this.machines.windmillBase.setVisible(gameState.unlocks.windmill);
    this.machines.windmillBlades.setVisible(gameState.unlocks.windmill);
    this.machines.prism.setVisible(gameState.unlocks.sunPrism);

    this.machines.collectorFlash.setAlpha(Math.max(0, this.machines.collectorFlash.alpha - deltaSeconds * 3.2));
    if (gameState.unlocks.windmill) {
      this.machines.windmillBlades.rotation += deltaSeconds * (4.4 + gameState.upgrades.windmillPower * 1.2);
    }

    const prismActive = isSunPrismActive(gameState);
    this.machines.prismBeam.setVisible(gameState.unlocks.sunPrism && prismActive);
    this.machines.prismGlow.setVisible(gameState.unlocks.sunPrism && prismActive);
    this.machines.prismBeam.setAlpha(prismActive ? 0.18 : 0);
    this.machines.prismGlow.setAlpha(prismActive ? 0.2 : 0);
  }

  /**
   * Advances raindrops and dispatches hit callbacks to React.
   */
  private updateRaindrops(gameState: GameState, deltaSeconds: number) {
    for (let index = this.raindrops.length - 1; index >= 0; index -= 1) {
      const raindrop = this.raindrops[index];
      raindrop.drop.y += raindrop.vy * deltaSeconds;

      if (this.tryHitCollector(raindrop, gameState)) {
        this.removeRaindrop(index);
        continue;
      }

      const hitCrop = this.findHitCrop(raindrop, gameState);
      if (hitCrop) {
        this.bridge.callbacksRef.current.onRainHitCrop(hitCrop.plotId, 10, getWaterGain(gameState, 0.12));
        hitCrop.feedbackTime = 0.22;
        this.createSplash(raindrop.drop.x, raindrop.drop.y);
        this.removeRaindrop(index);
        continue;
      }

      if (raindrop.drop.y >= GAME_HEIGHT - 118) {
        this.bridge.callbacksRef.current.onRainHitGround(getWaterGain(gameState, 0.15));
        this.createSplash(raindrop.drop.x, GAME_HEIGHT - 118);
        this.removeRaindrop(index);
      }
    }
  }

  /**
   * Applies rain collector hit logic.
   */
  private tryHitCollector(raindrop: RaindropView, gameState: GameState) {
    if (!this.machines || !gameState.unlocks.rainCollector) {
      return false;
    }

    const collector = this.machines.collector;
    const hitHalfWidth = 42 + gameState.upgrades.rainCollectorEfficiency * 8;
    const didHit =
      Math.abs(raindrop.drop.x - collector.x) <= hitHalfWidth &&
      raindrop.drop.y >= collector.y - 40 &&
      raindrop.drop.y <= collector.y + 16;

    if (didHit) {
      this.bridge.callbacksRef.current.onRainCollected(
        getWaterGain(gameState, 0.75 + gameState.upgrades.rainCollectorEfficiency * 0.35),
      );
      this.machines.collectorFlash.setAlpha(0.85);
      this.createSplash(raindrop.drop.x, raindrop.drop.y);
    }

    return didHit;
  }

  /**
   * Finds a crop plot hit by a falling raindrop.
   */
  private findHitCrop(raindrop: RaindropView, gameState: GameState) {
    return this.cropViews.find((cropView) => {
      const plot = gameState.cropPlots.find((candidate) => candidate.id === cropView.plotId);
      if (!plot || plot.isReady) {
        return false;
      }

      return (
        Math.abs(raindrop.drop.x - cropView.cell.point.x) <= 50 &&
        raindrop.drop.y >= cropView.cell.point.y - 58 &&
        raindrop.drop.y <= cropView.cell.point.y + 22
      );
    });
  }

  /**
   * Removes a raindrop and destroys its Phaser object.
   */
  private removeRaindrop(index: number) {
    this.raindrops[index].drop.destroy();
    this.raindrops.splice(index, 1);
  }

  /**
   * Creates a short hit splash.
   */
  private createSplash(x: number, y: number) {
    const splash = this.add.circle(x, y, 8, 0x73c7ff, 0.32).setStrokeStyle(2, 0xf7fbff, 0.58);
    this.tweens.add({
      targets: splash,
      alpha: 0,
      scale: 1.8,
      duration: 260,
      onComplete: () => splash.destroy(),
    });
  }

  /**
   * Creates one short reward label.
   */
  private createFloatText(text: string, x: number, y: number) {
    const label = this.add
      .text(x, y, text, {
        color: "#35556a",
        fontFamily: "Arial",
        fontSize: "15px",
        fontStyle: "bold",
        stroke: "#f7fbff",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: label,
      y: y - 24,
      alpha: 0,
      duration: 1050,
      onComplete: () => label.destroy(),
    });
  }

  /**
   * Returns a grid cell or throws during development if the authored layout is invalid.
   */
  private requireCell(id: string) {
    const cell = this.gridCells.get(id);
    if (!cell) {
      throw new Error(`Missing island grid cell: ${id}`);
    }

    return cell;
  }
}

/**
 * Returns the crop texture key for a growth ratio.
 */
function getCropTextureKey(growthRatio: number, isReady: boolean) {
  if (isReady) {
    return "cropStageThree";
  }

  if (growthRatio < 0.28) {
    return "cropStageZero";
  }

  if (growthRatio < 0.68) {
    return "cropStageOne";
  }

  return "cropStageTwo";
}

/**
 * Draws a line through all given points.
 */
function drawPolyline(graphics: Phaser.GameObjects.Graphics, points: Phaser.Math.Vector2[]) {
  if (points.length === 0) {
    return;
  }

  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) {
    graphics.lineTo(point.x, point.y);
  }
  graphics.strokePath();
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
