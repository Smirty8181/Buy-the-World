export type MarketInstrument = {
  id: string;
  name: string;
  description: string;
  sector: string;
  basePrice: number;
  dailyTrend: number;
  volatility: number;
  phase: number;
  icon: string;
};

export const marketInstruments: MarketInstrument[] = [
  {
    id: "world-index",
    name: "Индекс всего мира",
    description: "Доли крупнейших компаний и устойчивый долгосрочный рост.",
    sector: "Диверсифицированный фонд",
    basePrice: 1_000,
    dailyTrend: 0.0015,
    volatility: 0.035,
    phase: 1,
    icon: "◉",
  },
  {
    id: "technology-fund",
    name: "Технологический фонд",
    description: "Выше потенциальный рост, но сильнее колебания цены.",
    sector: "Технологии",
    basePrice: 2_500,
    dailyTrend: 0.0021,
    volatility: 0.085,
    phase: 3,
    icon: "⌘",
  },
  {
    id: "gold-reserve",
    name: "Золотой резерв",
    description: "Спокойнее рынка: защитный актив на случай турбулентности.",
    sector: "Сырьё и металлы",
    basePrice: 5_000,
    dailyTrend: 0.0007,
    volatility: 0.022,
    phase: 5,
    icon: "✦",
  },
];

export function getMarketPrice(
  instrument: MarketInstrument,
  gameDay: number,
): number {
  const startingWave = Math.sin(instrument.phase * 0.53);
  const currentWave = Math.sin((gameDay + instrument.phase) * 0.53);
  const marketChange =
    instrument.dailyTrend * gameDay +
    instrument.volatility * (currentWave - startingWave);
  return Math.max(1, Math.round(instrument.basePrice * (1 + marketChange)));
}
