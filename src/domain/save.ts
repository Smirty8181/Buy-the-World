import { OFFLINE_CAP_MS, getOfflineReport } from "./economy";
import type {
  Asset,
  CapitalSnapshot,
  GamePreferences,
  InvestmentHolding,
  NewsStory,
  OfflineReport,
  SaveState,
  Transaction,
} from "./types";

export const SAVE_KEY = "buy-the-world-save";
export const BACKUP_SAVE_KEY = `${SAVE_KEY}-recovery`;

const defaultPreferences: GamePreferences = {
  theme: "gold",
  compactCards: false,
  soundEnabled: false,
};

function isGamePreferences(entry: unknown): entry is GamePreferences {
  if (!entry || typeof entry !== "object") return false;
  const preferences = entry as Partial<GamePreferences>;
  return (
    ["gold", "emerald", "violet"].includes(preferences.theme ?? "") &&
    typeof preferences.compactCards === "boolean" &&
    typeof preferences.soundEnabled === "boolean"
  );
}

export function createSave(now = Date.now()): SaveState {
  return {
    version: 4,
    balance: 1_000,
    holdings: {},
    investments: {},
    favorites: [],
    wishlist: [],
    transactions: [],
    news: [],
    achievements: [],
    collections: [],
    capitalHistory: [],
    incomeHistory: [],
    gameTimeMs: 0,
    preferences: { ...defaultPreferences },
    savedAt: now,
  };
}

function hasValidSaveFields(
  save: Omit<Partial<SaveState>, "version">,
): boolean {
  const isStringList = (entry: unknown): entry is string[] =>
    Array.isArray(entry) && entry.every((value) => typeof value === "string");
  const isCapitalSnapshot = (entry: unknown): entry is CapitalSnapshot => {
    if (!entry || typeof entry !== "object") return false;
    const snapshot = entry as Partial<CapitalSnapshot>;
    return (
      typeof snapshot.createdAt === "number" &&
      Number.isFinite(snapshot.createdAt) &&
      typeof snapshot.value === "number" &&
      Number.isFinite(snapshot.value) &&
      snapshot.value >= 0
    );
  };
  const isInvestmentHolding = (
    entry: unknown,
  ): entry is InvestmentHolding => {
    if (!entry || typeof entry !== "object") return false;
    const investment = entry as Partial<InvestmentHolding>;
    return (
      typeof investment.quantity === "number" &&
      Number.isInteger(investment.quantity) &&
      investment.quantity > 0 &&
      typeof investment.averagePrice === "number" &&
      Number.isFinite(investment.averagePrice) &&
      investment.averagePrice > 0
    );
  };
  const isTransaction = (entry: unknown): entry is Transaction => {
    if (!entry || typeof entry !== "object") return false;
    const transaction = entry as Partial<Transaction>;
    return (
      typeof transaction.id === "string" &&
      typeof transaction.assetId === "string" &&
      typeof transaction.name === "string" &&
      [
        "purchase",
        "sale",
        "upgrade",
        "investment-purchase",
        "investment-sale",
      ].includes(transaction.type ?? "") &&
      typeof transaction.amount === "number" &&
      Number.isFinite(transaction.amount) &&
      transaction.amount >= 0 &&
      typeof transaction.createdAt === "number" &&
      Number.isFinite(transaction.createdAt)
    );
  };
  const isNewsStory = (entry: unknown): entry is NewsStory => {
    if (!entry || typeof entry !== "object") return false;
    const story = entry as Partial<NewsStory>;
    return (
      typeof story.id === "string" &&
      typeof story.title === "string" &&
      typeof story.description === "string" &&
      typeof story.createdAt === "number" &&
      Number.isFinite(story.createdAt) &&
      (story.categoryId === undefined ||
        (typeof story.categoryId === "string" &&
          typeof story.incomeMultiplier === "number" &&
          Number.isFinite(story.incomeMultiplier) &&
          typeof story.expiresAt === "number" &&
          Number.isFinite(story.expiresAt)))
    );
  };
  const hasValidHoldings =
    typeof save.holdings === "object" &&
    save.holdings !== null &&
    Object.values(save.holdings).every(
      (holding) =>
        Boolean(holding) &&
        Number.isInteger(holding.quantity) &&
        holding.quantity > 0 &&
        Number.isInteger(holding.level) &&
        holding.level >= 0 &&
        holding.level <= 5,
    );
  const hasValidInvestments =
    save.investments === undefined ||
    (typeof save.investments === "object" &&
      save.investments !== null &&
      Object.values(save.investments).every(isInvestmentHolding));
  return (
    typeof save.balance === "number" &&
    Number.isFinite(save.balance) &&
    save.balance >= 0 &&
    hasValidHoldings &&
    hasValidInvestments &&
    isStringList(save.favorites) &&
    isStringList(save.wishlist) &&
    Array.isArray(save.transactions) &&
    save.transactions.every(isTransaction) &&
    Array.isArray(save.news) &&
    save.news.every(isNewsStory) &&
    isStringList(save.achievements) &&
    (save.collections === undefined || isStringList(save.collections)) &&
    (save.capitalHistory === undefined ||
      (Array.isArray(save.capitalHistory) &&
        save.capitalHistory.every(isCapitalSnapshot))) &&
    (save.incomeHistory === undefined ||
      (Array.isArray(save.incomeHistory) &&
        save.incomeHistory.length <= 60 &&
        save.incomeHistory.every(
          (income) => typeof income === "number" && Number.isFinite(income),
        ))) &&
    (save.preferences === undefined || isGamePreferences(save.preferences)) &&
    (save.gameTimeMs === undefined ||
      (typeof save.gameTimeMs === "number" &&
        Number.isFinite(save.gameTimeMs) &&
        save.gameTimeMs >= 0)) &&
    typeof save.savedAt === "number" &&
    Number.isFinite(save.savedAt) &&
    save.savedAt >= 0
  );
}

function isSaveState(value: unknown): value is SaveState {
  if (!value || typeof value !== "object") return false;
  const save = value as Partial<SaveState>;
  return (
    save.version === 4 &&
    hasValidSaveFields(save) &&
    Array.isArray(save.capitalHistory) &&
    Array.isArray(save.incomeHistory) &&
    typeof save.gameTimeMs === "number" &&
    isGamePreferences(save.preferences) &&
    Array.isArray(save.collections) &&
    typeof save.investments === "object" &&
    save.investments !== null
  );
}

function isLegacySave(value: unknown): value is Omit<
  SaveState,
  "version" | "capitalHistory" | "gameTimeMs"
> & {
  version: 1 | 2 | 3;
  capitalHistory?: CapitalSnapshot[];
  gameTimeMs?: number;
  incomeHistory?: number[];
  investments?: Record<string, InvestmentHolding>;
  collections?: string[];
  preferences?: GamePreferences;
} {
  if (!value || typeof value !== "object") return false;
  const save = value as Omit<Partial<SaveState>, "version"> & {
    version?: number;
  };
  return (
    (save.version === 1 || save.version === 2 || save.version === 3) &&
    hasValidSaveFields(save)
  );
}

function migrateSave(value: unknown): SaveState | null {
  if (isLegacySave(value)) {
    return {
      ...value,
      version: 4,
      capitalHistory: value.capitalHistory ?? [],
      gameTimeMs: value.gameTimeMs ?? 0,
      incomeHistory: value.incomeHistory ?? [],
      investments: value.investments ?? {},
      collections: value.collections ?? [],
      preferences: value.preferences ?? { ...defaultPreferences },
    };
  }
  return isSaveState(value) ? value : null;
}

export function loadSave(
  storage: Pick<Storage, "getItem" | "setItem">,
  catalog: Asset[],
  now = Date.now(),
): { save: SaveState; offlineReport: OfflineReport | null } {
  const savedText = storage.getItem(SAVE_KEY);
  if (!savedText) return { save: createSave(now), offlineReport: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(savedText);
  } catch (error) {
    if (!storage.getItem(BACKUP_SAVE_KEY)) {
      storage.setItem(BACKUP_SAVE_KEY, savedText);
    }
    throw new Error("Сохранение повреждено и сохранено в резервную копию.", {
      cause: error,
    });
  }
  const migratedSave = migrateSave(parsed);
  if (!migratedSave) {
    if (!storage.getItem(BACKUP_SAVE_KEY)) {
      storage.setItem(BACKUP_SAVE_KEY, savedText);
    }
    throw new Error(
      "Сохранение имеет неподдерживаемый формат и сохранено в резервную копию.",
    );
  }

  const elapsedMs = Math.max(
    0,
    Math.min(now - migratedSave.savedAt, OFFLINE_CAP_MS),
  );
  const offlineReport =
    elapsedMs >= 60_000
      ? getOfflineReport(
          elapsedMs,
          migratedSave.holdings,
          catalog,
          migratedSave.news,
          now,
        )
      : null;
  const save = {
    ...migratedSave,
    balance: Math.max(
      0,
      migratedSave.balance + (offlineReport?.netIncome ?? 0),
    ),
    gameTimeMs: migratedSave.gameTimeMs + elapsedMs,
    savedAt: now,
  };
  return { save, offlineReport };
}

export function persistSave(
  storage: Pick<Storage, "setItem">,
  save: SaveState,
): void {
  storage.setItem(SAVE_KEY, JSON.stringify(save));
}
