export type AssetCategory = {
  id: string;
  name: string;
  icon: string;
  image: string;
  unlockAt: number;
  assets: string[];
};

export type Asset = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  dailyIncome: number;
  dailyExpense: number;
  rarity: "Обычный" | "Редкий" | "Эпический" | "Легендарный";
};

export type Holding = {
  quantity: number;
  level: number;
};

export type InvestmentHolding = {
  quantity: number;
  averagePrice: number;
};

export type GamePreferences = {
  theme: "gold" | "emerald" | "violet";
  compactCards: boolean;
  soundEnabled: boolean;
};

export type Transaction = {
  id: string;
  assetId: string;
  name: string;
  type:
    | "purchase"
    | "sale"
    | "upgrade"
    | "investment-purchase"
    | "investment-sale";
  amount: number;
  createdAt: number;
};

export type NewsStory = {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  categoryId?: string;
  incomeMultiplier?: number;
  expiresAt?: number;
};

export type SaveState = {
  version: 4;
  balance: number;
  holdings: Record<string, Holding>;
  investments: Record<string, InvestmentHolding>;
  favorites: string[];
  wishlist: string[];
  transactions: Transaction[];
  news: NewsStory[];
  achievements: string[];
  collections: string[];
  capitalHistory: CapitalSnapshot[];
  incomeHistory: number[];
  gameTimeMs: number;
  preferences: GamePreferences;
  savedAt: number;
};

export type OfflineReport = {
  elapsedMs: number;
  grossIncome: number;
  expenses: number;
  netIncome: number;
};

export type CapitalSnapshot = {
  createdAt: number;
  value: number;
};
