import { RESOURCE_KEYS, RESOURCE_LABELS } from "./constants.ts";
import type { ResourceCost, ResourceMap } from "./types.ts";

const SCIENTIFIC_THRESHOLD = 1000000;

/**
 * Formats resource values for compact game UI display.
 */
export function formatNumber(value: number, exact = false) {
  if (exact) {
    return formatExactNumber(value);
  }

  if (Math.abs(value) >= SCIENTIFIC_THRESHOLD) {
    return formatScientific(value);
  }

  if (value >= 1000) {
    return Math.floor(value).toLocaleString("zh-CN");
  }

  return Math.round(value).toString();
}

/**
 * Formats per-second rates.
 */
export function formatRate(value: number, exact = false) {
  if (exact) {
    return formatExactNumber(value);
  }

  if (Math.abs(value) >= SCIENTIFIC_THRESHOLD) {
    return formatScientific(value);
  }

  if (value >= 1000) {
    return Math.round(value).toLocaleString("zh-CN");
  }

  if (value >= 1) {
    return Math.round(value).toString();
  }

  return value <= 0 ? "0" : value.toFixed(1);
}

/**
 * Formats cooldown durations with one decimal only when needed.
 */
export function formatCooldown(seconds: number, exact = false) {
  const safeSeconds = Math.max(0, seconds);
  if (exact) {
    return `${formatExactNumber(safeSeconds)}s`;
  }

  return `${safeSeconds % 1 === 0 ? safeSeconds.toFixed(0) : safeSeconds.toFixed(1)}s`;
}

/**
 * Formats a percent value without rate wording for upgrade rules.
 */
export function formatPercentValue(value: number, exact = false) {
  const percent = value * 100;
  if (exact) {
    return `${formatExactNumber(percent)}%`;
  }

  return `${formatHalfStep(percent)}%`;
}

/**
 * Formats next/current as a compact multiplier phrase.
 */
export function formatRatio(nextValue: number, currentValue: number, exact = false) {
  if (currentValue <= 0) {
    return formatMultiplier(nextValue > 0 ? nextValue : 1, exact);
  }

  return formatMultiplier(nextValue / currentValue, exact);
}

/**
 * Formats a small multiplier without noisy decimals.
 */
export function formatMultiplier(value: number, exact = false) {
  if (exact) {
    return formatExactNumber(value);
  }

  const nearestInteger = Math.round(value);
  const displayValue = Math.abs(value - nearestInteger) < 0.02 ? nearestInteger : value;
  return displayValue % 1 === 0
    ? displayValue.toFixed(0)
    : displayValue.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Formats a resource cost.
 */
export function formatCost(cost: ResourceCost, exact = false) {
  const parts = RESOURCE_KEYS
    .filter((resourceKey) => (cost[resourceKey] ?? 0) > 0)
    .map((resourceKey) => `${RESOURCE_LABELS[resourceKey].icon} ${formatNumber(cost[resourceKey] ?? 0, exact)}`);

  return parts.join("  ");
}

/**
 * Formats the missing part of a resource cost.
 */
export function formatMissingCost(resources: ResourceMap, cost: ResourceCost, exact = false) {
  const missingParts = RESOURCE_KEYS
    .map((resourceKey) => {
      const missing = (cost[resourceKey] ?? 0) - resources[resourceKey];
      return missing > 0 ? `${RESOURCE_LABELS[resourceKey].icon} ${formatNumber(missing, exact)}` : "";
    })
    .filter(Boolean);

  return missingParts.join("、");
}

/**
 * Shows a bounded decimal display for balance debugging.
 */
export function formatExactNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const absoluteValue = Math.abs(value);
  if (absoluteValue >= SCIENTIFIC_THRESHOLD || (absoluteValue > 0 && absoluteValue < 0.001)) {
    return formatScientific(value, 6);
  }

  return Number(value.toFixed(3)).toLocaleString("zh-CN", {
    maximumFractionDigits: 3,
  });
}

/**
 * Formats elapsed play time for balance testing.
 */
export function formatElapsedTime(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Keeps most displayed values integer-like, with .5 as the only common decimal.
 */
export function formatHalfStep(value: number) {
  const rounded = Math.round(value * 2) / 2;
  return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
}

/**
 * Formats large values with scientific notation to keep cards from overflowing.
 */
export function formatScientific(value: number, fractionDigits = 2) {
  return value
    .toExponential(fractionDigits)
    .replace("e+", "e")
    .replace(/\.0+e/, "e")
    .replace(/(\.\d*?)0+e/, "$1e");
}
