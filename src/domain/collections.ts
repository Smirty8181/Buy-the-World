export type AssetCollection = {
  id: string;
  name: string;
  description: string;
  reward: number;
  assetIds: string[];
  icon: string;
};

export const assetCollections: AssetCollection[] = [
  {
    id: "first-home",
    name: "Первый адрес",
    description: "Комната, студия и квартира с видом.",
    reward: 1_000,
    assetIds: ["real-estate-1", "real-estate-2", "real-estate-3"],
    icon: "⌂",
  },
  {
    id: "city-mobility",
    name: "Город на колёсах",
    description: "Велосипед, самокат и мотоцикл.",
    reward: 7_500,
    assetIds: ["transport-1", "transport-2", "transport-3"],
    icon: "↗",
  },
  {
    id: "first-orbit",
    name: "Первые на орбите",
    description: "Спутник, метеосеть и многоразовая ракета.",
    reward: 2_000_000_000,
    assetIds: ["space-1", "space-2", "space-3"],
    icon: "✧",
  },
];
