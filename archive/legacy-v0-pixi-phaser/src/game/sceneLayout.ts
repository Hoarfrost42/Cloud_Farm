import { GAME_HEIGHT, GAME_WIDTH } from "../data/constants";

interface StagePoint {
  x: number;
  y: number;
}

interface IslandPlanePoint {
  u: number;
  v: number;
}

const ISLAND_TOP_PLANE = {
  backLeft: { x: 230, y: 238 },
  backRight: { x: 560, y: 220 },
  frontRight: { x: 650, y: 350 },
  frontLeft: { x: 286, y: 382 },
} as const;

/**
 * Converts a design coordinate into a percentage for DOM debug overlays.
 */
export function toStagePercentX(x: number) {
  return `${(x / GAME_WIDTH) * 100}%`;
}

/**
 * Converts a design coordinate into a percentage for DOM debug overlays.
 */
export function toStagePercentY(y: number) {
  return `${(y / GAME_HEIGHT) * 100}%`;
}

/**
 * Projects an authored island-plane coordinate to the fixed Pixi stage.
 *
 * u = -1 is left, u = 1 is right.
 * v = -1 is back/top, v = 1 is front/bottom.
 */
export function projectIslandPoint(point: IslandPlanePoint): StagePoint {
  const horizontalRatio = (point.u + 1) / 2;
  const depthRatio = (point.v + 1) / 2;
  const back = interpolatePoint(
    ISLAND_TOP_PLANE.backLeft,
    ISLAND_TOP_PLANE.backRight,
    horizontalRatio,
  );
  const front = interpolatePoint(
    ISLAND_TOP_PLANE.frontLeft,
    ISLAND_TOP_PLANE.frontRight,
    horizontalRatio,
  );

  return interpolatePoint(back, front, depthRatio);
}

/**
 * Returns a linear interpolation between two stage coordinates.
 */
function interpolatePoint(start: StagePoint, end: StagePoint, ratio: number): StagePoint {
  return {
    x: Math.round(start.x + (end.x - start.x) * ratio),
    y: Math.round(start.y + (end.y - start.y) * ratio),
  };
}

const cropLeftFront = projectIslandPoint({ u: -0.48, v: 0.36 });
const cropCenterBack = projectIslandPoint({ u: 0, v: -0.16 });
const cropRightFront = projectIslandPoint({ u: 0.48, v: 0.36 });
const collectorRightFront = projectIslandPoint({ u: 0.78, v: 0.22 });
const windmillLeftBack = projectIslandPoint({ u: -0.72, v: -0.28 });
const sunPrismRightBack = projectIslandPoint({ u: 0.68, v: -0.34 });

/**
 * Shared authored anchors for the fixed 2D scene.
 *
 * The game remains a simple PixiJS 2D coordinate scene. These values only
 * centralize composition so the pixel-art pseudo-2.5D layout can be tuned
 * without scattering magic numbers across React and Pixi files.
 */
export const SCENE_LAYOUT = {
  clouds: {
    edgeMargin: 210,
    primary: { x: 150, y: 86, driftSpeed: 22 },
    secondary: { x: 540, y: 118, driftSpeed: 15 },
  },
  island: {
    sprite: { x: 384, y: 322, scale: 0.74 },
    shadow: { x: 384, y: 458, radiusX: 270, radiusY: 34 },
    light: { x: 416, y: 340, radiusX: 260, radiusY: 84 },
    topPlane: ISLAND_TOP_PLANE,
    topPlanePolygon: [
      ISLAND_TOP_PLANE.backLeft,
      ISLAND_TOP_PLANE.backRight,
      ISLAND_TOP_PLANE.frontRight,
      ISLAND_TOP_PLANE.frontLeft,
    ],
  },
  cropPlotAnchors: [
    { id: "crop-1", role: "left-front", plane: { u: -0.48, v: 0.36 }, ...cropLeftFront },
    { id: "crop-2", role: "center-back", plane: { u: 0, v: -0.16 }, ...cropCenterBack },
    { id: "crop-3", role: "right-front", plane: { u: 0.48, v: 0.36 }, ...cropRightFront },
  ],
  machines: {
    collector: {
      role: "right-front-edge",
      plane: { u: 0.78, v: 0.22 },
      ...collectorRightFront,
    },
    windmill: {
      role: "left-back-edge",
      plane: { u: -0.72, v: -0.28 },
      ...windmillLeftBack,
    },
    sunPrism: {
      role: "right-back-edge",
      plane: { u: 0.68, v: -0.34 },
      ...sunPrismRightBack,
    },
  },
  background: {
    sun: { x: 642, y: 82, radius: 62 },
    cloudBank: { x: GAME_WIDTH / 2, y: 174, scale: 0.62 },
  },
} as const;
