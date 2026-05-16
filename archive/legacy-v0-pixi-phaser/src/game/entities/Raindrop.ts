export interface RaindropModel {
  id: string;
  x: number;
  y: number;
  vy: number;
  value: number;
  radius: number;
  target?: "crop" | "collector" | "ground";
}
