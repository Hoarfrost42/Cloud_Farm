export const ART_ASSETS = {
  islandBase: "/assets/art/png/island/island_base_pixel_01.png",
  cloudOne: "/assets/art/png/cloud/cloud_pixel_01.png",
  cloudTwo: "/assets/art/png/cloud/cloud_pixel_02.png",
  cloudBank: "/assets/art/png/cloud/cloud_bank_pixel_01.png",
  plotDry: "/assets/art/png/crop/plot_dry_pixel_01.png",
  plotWet: "/assets/art/png/crop/plot_wet_pixel_01.png",
  plotReady: "/assets/art/png/crop/plot_ready_pixel_01.png",
  cropStageZero: "/assets/art/png/crop/crop_plant_stage_0_pixel_01.png",
  cropStageOne: "/assets/art/png/crop/crop_plant_stage_1_pixel_01.png",
  cropStageTwo: "/assets/art/png/crop/crop_plant_stage_2_pixel_01.png",
  cropStageThree: "/assets/art/png/crop/crop_plant_stage_3_pixel_01.png",
  rainCollector: "/assets/art/png/machine/rain_collector_pixel_01.png",
  windmillBase: "/assets/art/png/machine/windmill_base_pixel_01.png",
  windmillBlades: "/assets/art/png/machine/windmill_blades_pixel_01.png",
  sunPrism: "/assets/art/png/machine/sun_prism_pixel_01.png",
} as const;

export type ArtAssetKey = keyof typeof ART_ASSETS;
