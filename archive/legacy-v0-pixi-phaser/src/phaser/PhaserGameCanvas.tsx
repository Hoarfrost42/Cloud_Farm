import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../data/constants";
import type { GameState } from "../game/state/gameTypes";
import { CloudIslandScene } from "./scenes/CloudIslandScene";
import type { PhaserSceneBridge } from "./scenes/CloudIslandScene";

interface PhaserGameCanvasProps {
  gameState: GameState;
  onRainHitCrop: (plotId: string, moisture: number, water: number) => void;
  onRainCollected: (water: number) => void;
  onRainHitGround: (water: number) => void;
  onHarvestCrop: (plotId: string) => void;
}

/**
 * Hosts the Phaser scene while keeping React as the game-state owner.
 */
export function PhaserGameCanvas({
  gameState,
  onRainHitCrop,
  onRainCollected,
  onRainHitGround,
  onHarvestCrop,
}: PhaserGameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameStateRef = useRef(gameState);
  const callbacksRef = useRef({
    onRainHitCrop,
    onRainCollected,
    onRainHitGround,
    onHarvestCrop,
  });

  gameStateRef.current = gameState;
  callbacksRef.current = {
    onRainHitCrop,
    onRainCollected,
    onRainHitGround,
    onHarvestCrop,
  };

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const bridge: PhaserSceneBridge = {
      gameStateRef,
      callbacksRef,
    };
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: "#bfe7ff",
      pixelArt: true,
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.NONE,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
      },
      scene: [new CloudIslandScene(bridge)],
    });

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={hostRef} className="phaser-host" />;
}
