export type FrameUpdate = (deltaSeconds: number) => void;

/**
 * Starts a requestAnimationFrame loop and returns a disposer.
 */
export function startGameLoop(onFrame: FrameUpdate) {
  let animationFrameId = 0;
  let previousTime = performance.now();
  let running = true;

  function tick(currentTime: number) {
    if (!running) {
      return;
    }

    const deltaSeconds = Math.min((currentTime - previousTime) / 1000, 0.05);
    previousTime = currentTime;
    onFrame(deltaSeconds);
    animationFrameId = requestAnimationFrame(tick);
  }

  animationFrameId = requestAnimationFrame(tick);

  return () => {
    running = false;
    cancelAnimationFrame(animationFrameId);
  };
}
