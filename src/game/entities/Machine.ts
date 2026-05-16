export type MachineKind = "rainCollector" | "windmill" | "sunPrism";

export interface MachineModel {
  kind: MachineKind;
  x: number;
  y: number;
  level: number;
}
