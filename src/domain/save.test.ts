import { describe, expect, it } from "vitest";
import { assets } from "./catalog";
import { OFFLINE_CAP_MS } from "./economy";
import { BACKUP_SAVE_KEY, loadSave, persistSave, SAVE_KEY } from "./save";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("локальное сохранение", () => {
  it("начинает новую игру с начальным капиталом", () => {
    const { save, offlineReport } = loadSave(createStorage(), assets, 100);
    expect(save.balance).toBe(1_000);
    expect(offlineReport).toBeNull();
  });

  it("начисляет офлайн-доход один раз и обновляет время сохранения", () => {
    const firstAsset = assets[0];
    const previousSave = {
      version: 1 as const,
      balance: 500,
      holdings: { [firstAsset.id]: { quantity: 1, level: 0 } },
      favorites: [],
      wishlist: [],
      transactions: [],
      news: [],
      achievements: [],
      savedAt: 0,
    };
    const storage = createStorage({ [SAVE_KEY]: JSON.stringify(previousSave) });
    const { save, offlineReport } = loadSave(storage, assets, 60_000);
    expect(save.balance).toBe(
      500 + firstAsset.dailyIncome - firstAsset.dailyExpense,
    );
    expect(offlineReport?.netIncome).toBe(
      firstAsset.dailyIncome - firstAsset.dailyExpense,
    );
    expect(save.gameTimeMs).toBe(60_000);
    persistSave(storage, save);
    expect(loadSave(storage, assets, 60_000).offlineReport).toBeNull();
  });

  it("учитывает активное событие и улучшение в офлайн-доходе", () => {
    const firstAsset = assets[0];
    const savedAt = 0;
    const previousSave = {
      version: 3,
      balance: 500,
      holdings: { [firstAsset.id]: { quantity: 1, level: 2 } },
      favorites: [],
      wishlist: [],
      transactions: [],
      news: [
        {
          id: "real-estate-boom",
          title: "Бум недвижимости",
          description: "Доход вырос.",
          createdAt: 0,
          categoryId: firstAsset.categoryId,
          incomeMultiplier: 1.5,
          expiresAt: 120_000,
        },
      ],
      achievements: [],
      capitalHistory: [],
      gameTimeMs: 0,
      savedAt,
    };

    const { save, offlineReport } = loadSave(
      createStorage({ [SAVE_KEY]: JSON.stringify(previousSave) }),
      assets,
      60_000,
    );

    expect(offlineReport?.grossIncome).toBe(
      Math.round(firstAsset.dailyIncome * 1.5 * 1.5),
    );
    expect(offlineReport?.netIncome).toBe(
      Math.round(firstAsset.dailyIncome * 1.5 * 1.5) - firstAsset.dailyExpense,
    );
    expect(offlineReport).not.toBeNull();
    expect(save.balance).toBe(500 + offlineReport!.netIncome);
  });

  it("ограничивает офлайн-календарь теми же двенадцатью часами", () => {
    const previousSave = {
      version: 3,
      balance: 500,
      holdings: {},
      favorites: [],
      wishlist: [],
      transactions: [],
      news: [],
      achievements: [],
      capitalHistory: [],
      gameTimeMs: 0,
      savedAt: 0,
    };

    const { save } = loadSave(
      createStorage({ [SAVE_KEY]: JSON.stringify(previousSave) }),
      assets,
      OFFLINE_CAP_MS * 2,
    );

    expect(save.gameTimeMs).toBe(OFFLINE_CAP_MS);
  });

  it("переносит сохранение первой версии в текущую схему", () => {
    const previousSave = {
      version: 1,
      balance: 900,
      holdings: {},
      favorites: [],
      wishlist: [],
      transactions: [],
      news: [],
      achievements: [],
      savedAt: 50,
    };

    const { save } = loadSave(
      createStorage({ [SAVE_KEY]: JSON.stringify(previousSave) }),
      assets,
      100,
    );

    expect(save.version).toBe(4);
    expect(save.balance).toBe(900);
    expect(save.capitalHistory).toEqual([]);
    expect(save.gameTimeMs).toBe(50);
  });

  it("сохраняет игровой календарь при миграции второй версии", () => {
    const previousSave = {
      version: 2,
      balance: 900,
      holdings: {},
      favorites: [],
      wishlist: [],
      transactions: [],
      news: [],
      achievements: [],
      capitalHistory: [{ createdAt: 20, value: 900 }],
      savedAt: 50,
    };

    const { save } = loadSave(
      createStorage({ [SAVE_KEY]: JSON.stringify(previousSave) }),
      assets,
      100,
    );

    expect(save.version).toBe(4);
    expect(save.capitalHistory).toEqual([{ createdAt: 20, value: 900 }]);
    expect(save.gameTimeMs).toBe(50);
  });

  it("добавляет инвестиции, коллекции и настройки к сохранению третьей версии", () => {
    const previousSave = {
      version: 3,
      balance: 900,
      holdings: {},
      favorites: [],
      wishlist: [],
      transactions: [],
      news: [],
      achievements: [],
      capitalHistory: [],
      gameTimeMs: 50,
      savedAt: 50,
    };

    const { save } = loadSave(
      createStorage({ [SAVE_KEY]: JSON.stringify(previousSave) }),
      assets,
      100,
    );

    expect(save.version).toBe(4);
    expect(save.investments).toEqual({});
    expect(save.collections).toEqual([]);
    expect(save.incomeHistory).toEqual([]);
    expect(save.preferences).toEqual({
      theme: "gold",
      compactCards: false,
      soundEnabled: false,
    });
  });

  it("сообщает об ошибке при повреждённом формате сохранения", () => {
    const storage = createStorage({ [SAVE_KEY]: "{broken" });
    expect(() => loadSave(storage, assets, 100)).toThrow();
    expect(storage.getItem(BACKUP_SAVE_KEY)).toBe("{broken");
  });

  it("отклоняет сохранение с недопустимым количеством активов", () => {
    const firstAsset = assets[0];
    const storage = createStorage({
      [SAVE_KEY]: JSON.stringify({
        version: 1,
        balance: 500,
        holdings: { [firstAsset.id]: { quantity: -2, level: 0 } },
        favorites: [],
        wishlist: [],
        transactions: [],
        news: [],
        achievements: [],
        savedAt: 0,
      }),
    });

    expect(() => loadSave(storage, assets, 100)).toThrow(
      "Сохранение имеет неподдерживаемый формат и сохранено в резервную копию.",
    );
  });
});
