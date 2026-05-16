const UPGRADE_COSTS = {
  clickRainPower: [{ water: 3 }, { water: 8 }, { water: 18, cloudCotton: 2 }],
  cloudCapacity: [
    { water: 5, cloudCotton: 1 },
    { water: 12, cloudCotton: 4 },
    { water: 24, cloudCotton: 8 },
  ],
  cropGrowthSpeed: [
    { water: 5, cloudCotton: 1 },
    { water: 14, cloudCotton: 4 },
    { water: 30, cloudCotton: 10 },
  ],
  waterStorage: [{ water: 6 }, { water: 14, cloudCotton: 3 }, { water: 28, cloudCotton: 8 }],
};

const MACHINE_COSTS = {
  rainCollector: [
    { water: 12, cloudCotton: 4 },
    { water: 24, cloudCotton: 8 },
    { water: 45, cloudCotton: 14 },
  ],
  windmill: [
    { cloudCotton: 16, sunlight: 3 },
    { cloudCotton: 30, sunlight: 7 },
    { cloudCotton: 52, sunlight: 12 },
  ],
  sunPrism: [
    { cloudCotton: 24, sunlight: 6 },
    { cloudCotton: 42, sunlight: 11 },
    { cloudCotton: 68, sunlight: 18 },
  ],
};

const checkpoints = new Set([60, 180, 300, 420, 600]);
const state = {
  resources: { water: 0, cloudCotton: 0, sunlight: 0 },
  upgrades: {
    cloudCapacity: 1,
    clickRainPower: 1,
    cropGrowthSpeed: 1,
    waterStorage: 1,
    rainCollectorEfficiency: 0,
    windmillPower: 0,
    sunPrismPower: 0,
  },
  unlocks: { rainCollector: false, windmill: false, sunPrism: false },
  crops: [
    { growth: 0, moisture: 0, ready: false },
    { growth: 0, moisture: 0, ready: false },
    { growth: 0, moisture: 0, ready: false },
  ],
  nextCropIndex: 0,
  events: [],
};

for (let second = 1; second <= 600; second += 1) {
  if (second % 2 === 0) {
    clickCloud(second);
  }

  tickCrops(second);
  buyAvailableItems(second);

  if (checkpoints.has(second)) {
    printCheckpoint(second);
  }
}

if (state.events.length > 0) {
  console.log("\nKey events:");
  for (const event of state.events) {
    console.log(`- ${formatTime(event.second)} ${event.text}`);
  }
}

function clickCloud(second) {
  const dropCount = 2 + state.upgrades.clickRainPower;

  for (let drop = 0; drop < dropCount; drop += 1) {
    const collectorDrop = state.unlocks.rainCollector && drop === dropCount - 1;
    if (collectorDrop) {
      addResources({ water: waterGain(0.75 + state.upgrades.rainCollectorEfficiency * 0.35) });
      continue;
    }

    const cropHit =
      drop === 0 ||
      (state.unlocks.windmill && drop === 1 && second % 4 === 0) ||
      (state.unlocks.sunPrism && drop === 1 && second % 10 < 3);

    if (!cropHit) {
      addResources({ water: waterGain(0.15) });
      continue;
    }

    const crop = state.crops[state.nextCropIndex % state.crops.length];
    state.nextCropIndex += 1;

    if (crop.ready) {
      addResources({ water: waterGain(0.15) });
      continue;
    }

    crop.moisture += 10;
    addResources({ water: waterGain(0.12) });
  }

  if (state.unlocks.windmill && second % 6 === 0) {
    const bonusDrop = state.crops[state.nextCropIndex % state.crops.length];
    state.nextCropIndex += 1;
    if (!bonusDrop.ready) {
      bonusDrop.moisture += 10;
      addResources({ water: waterGain(0.12) });
    }
  }
}

function tickCrops(second) {
  const prismActive = state.unlocks.sunPrism && second % 10 < 3;
  const prismMultiplier = prismActive ? 1.5 + state.upgrades.sunPrismPower * 0.12 : 1;
  const growthRate = 8 * state.upgrades.cropGrowthSpeed * prismMultiplier;

  if (prismActive) {
    addResources({ sunlight: 0.025 * Math.max(1, state.upgrades.sunPrismPower) });
  }

  for (const crop of state.crops) {
    if (!crop.ready) {
      const consumed = Math.min(crop.moisture, growthRate);
      crop.moisture -= consumed;
      crop.growth = Math.min(100, crop.growth + consumed);
      crop.ready = crop.growth >= 100;
    }

    if (crop.ready) {
      addResources({ cloudCotton: 6, sunlight: 1.25 });
      crop.growth = 0;
      crop.moisture = 0;
      crop.ready = false;
    }
  }
}

function buyAvailableItems(second) {
  const machineOrder = [
    ["rainCollector", "rainCollectorEfficiency"],
    ["windmill", "windmillPower"],
    ["sunPrism", "sunPrismPower"],
  ];

  for (const [machineId, levelKey] of machineOrder) {
    const cost = MACHINE_COSTS[machineId][state.upgrades[levelKey]];
    if (cost && canAfford(cost)) {
      spend(cost);
      state.upgrades[levelKey] += 1;
      state.unlocks[machineId] = true;
      state.events.push({ second, text: `${machineId} unlocked/upgraded to Lv.${state.upgrades[levelKey]}` });
      return;
    }
  }

  const affordableUpgrade = Object.entries(UPGRADE_COSTS)
    .map(([id, costs]) => [id, costs[state.upgrades[id] - 1]])
    .filter(([, cost]) => cost && canAfford(cost))
    .sort(([, left], [, right]) => costWeight(left) - costWeight(right))[0];

  if (affordableUpgrade) {
    const [upgradeId, cost] = affordableUpgrade;
    spend(cost);
    state.upgrades[upgradeId] += 1;
    state.events.push({ second, text: `${upgradeId} upgraded to Lv.${state.upgrades[upgradeId]}` });
  }
}

function printCheckpoint(second) {
  const upgradeCount =
    state.upgrades.cloudCapacity +
    state.upgrades.clickRainPower +
    state.upgrades.cropGrowthSpeed +
    state.upgrades.waterStorage -
    4;
  const machineUnlocks = Object.entries(state.unlocks)
    .filter(([, unlocked]) => unlocked)
    .map(([machine]) => machine)
    .join(", ") || "none";

  console.log(
    `${formatTime(second)} | water=${state.resources.water.toFixed(1)} cloudCotton=${state.resources.cloudCotton.toFixed(
      1,
    )} sunlight=${state.resources.sunlight.toFixed(1)} | upgrades=${upgradeCount} | machines=${machineUnlocks}`,
  );
}

function addResources(delta) {
  state.resources.water = Math.max(0, state.resources.water + (delta.water ?? 0));
  state.resources.cloudCotton = Math.max(0, state.resources.cloudCotton + (delta.cloudCotton ?? 0));
  state.resources.sunlight = Math.max(0, state.resources.sunlight + (delta.sunlight ?? 0));
}

function spend(cost) {
  addResources({
    water: -(cost.water ?? 0),
    cloudCotton: -(cost.cloudCotton ?? 0),
    sunlight: -(cost.sunlight ?? 0),
  });
}

function canAfford(cost) {
  return (
    state.resources.water >= (cost.water ?? 0) &&
    state.resources.cloudCotton >= (cost.cloudCotton ?? 0) &&
    state.resources.sunlight >= (cost.sunlight ?? 0)
  );
}

function waterGain(baseGain) {
  return Number((baseGain * state.upgrades.waterStorage).toFixed(2));
}

function costWeight(cost) {
  return (cost.water ?? 0) + (cost.cloudCotton ?? 0) * 2 + (cost.sunlight ?? 0) * 4;
}

function formatTime(second) {
  return `${Math.floor(second / 60)}:${String(second % 60).padStart(2, "0")}`;
}
