import { useEffect, useRef, useState } from "react";
import type { Resources } from "../game/state/gameTypes";

interface ResourceBarProps {
  resources: Resources;
}

/**
 * Displays the three v0.1 resources owned by React state.
 */
export function ResourceBar({ resources }: ResourceBarProps) {
  const previousResourcesRef = useRef(resources);
  const [changedResources, setChangedResources] = useState<Partial<Record<keyof Resources, boolean>>>({});

  useEffect(() => {
    const previousResources = previousResourcesRef.current;
    const changed = {
      water: resources.water !== previousResources.water,
      cloudCotton: resources.cloudCotton !== previousResources.cloudCotton,
      sunlight: resources.sunlight !== previousResources.sunlight,
    };

    if (changed.water || changed.cloudCotton || changed.sunlight) {
      setChangedResources(changed);
      const timeoutId = window.setTimeout(() => setChangedResources({}), 260);
      previousResourcesRef.current = resources;
      return () => window.clearTimeout(timeoutId);
    }

    previousResourcesRef.current = resources;
  }, [resources]);

  return (
    <section className="resource-bar" aria-label="资源栏">
      <div className={changedResources.water ? "resource-pill resource-pill--changed" : "resource-pill"}>
        <span>水滴</span>
        <strong>{resources.water.toFixed(1)}</strong>
      </div>
      <div className={changedResources.cloudCotton ? "resource-pill resource-pill--changed" : "resource-pill"}>
        <span>云棉</span>
        <strong>{formatResource(resources.cloudCotton)}</strong>
      </div>
      <div className={changedResources.sunlight ? "resource-pill resource-pill--changed" : "resource-pill"}>
        <span>阳光</span>
        <strong>{formatResource(resources.sunlight)}</strong>
      </div>
    </section>
  );
}

/**
 * Keeps integer resources compact while preserving visible fractional gains.
 */
function formatResource(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
