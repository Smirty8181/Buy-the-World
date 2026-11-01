import { afterEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { assets } from "../domain/catalog";
import { GAME_DAY_MS } from "../domain/economy";
import { getMarketPrice, marketInstruments } from "../domain/investments";
import { SAVE_KEY } from "../domain/save";
import { useGameStore } from "./game";

function createStorage(initial: Record<string, string> = {}) {
  const entries = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  };
}

describe("игровые действия", () => {
  afterEach(() => vi.unstubAllGlobals());

  function startGame(initialSave?: Record<string, string>) {
    vi.stubGlobal("window", { localStorage: createStorage(initialSave) });
    setActivePinia(createPinia());
    return useGameStore();
  }

  it("покупает актив, списывает деньги и выдаёт достижение", () => {
    const game = startGame();
    const firstAsset = assets[0];

    expect(game.buy(firstAsset.id)).toBe(true);
    expect(game.save.balance).toBe(1_000 - firstAsset.price);
    expect(game.save.holdings[firstAsset.id]?.quantity).toBe(1);
    expect(game.save.achievements).toContain("first-purchase");
    expect(game.save.transactions[0]?.type).toBe("purchase");
  });

  it("отклоняет покупку, если денег не хватает", () => {
    const game = startGame();
    const expensiveAsset = assets.find(
      (asset) => asset.price > game.save.balance,
    )!;

    expect(game.buy(expensiveAsset.id)).toBe(false);
    expect(game.save.balance).toBe(1_000);
    expect(game.save.holdings[expensiveAsset.id]).toBeUndefined();
  });

  it("улучшает доход и продаёт актив за часть стоимости", () => {
    const game = startGame();
    const firstAsset = assets[0];
    game.save.balance = 10_000;
    game.buy(firstAsset.id);
    const initialProfit = game.dailyProfit;

    expect(game.upgrade(firstAsset.id)).toBe(true);
    expect(game.save.holdings[firstAsset.id]?.level).toBe(1);
    expect(game.dailyProfit).toBeGreaterThan(initialProfit);
    expect(game.sell(firstAsset.id)).toBe(true);
    expect(game.save.holdings[firstAsset.id]).toBeUndefined();
    expect(game.save.transactions[0]?.type).toBe("sale");
  });

  it("покупает инвестиционные доли и учитывает их рыночную стоимость", () => {
    const game = startGame();
    const instrument = marketInstruments[0]!;
    game.save.balance = 10_000;
    const initialBalance = game.save.balance;
    const price = getMarketPrice(instrument, game.gameDay);

    expect(game.buyInvestment(instrument.id, 1)).toBe(true);
    expect(game.save.balance).toBe(initialBalance - price);
    expect(game.save.investments[instrument.id]).toEqual({
      quantity: 1,
      averagePrice: price,
    });
    expect(game.investmentsValue).toBe(price);
    expect(game.netWorth).toBe(initialBalance);
    expect(game.save.transactions[0]?.type).toBe("investment-purchase");

    expect(game.sellInvestment(instrument.id)).toBe(true);
    expect(game.save.investments[instrument.id]).toBeUndefined();
    expect(game.save.balance).toBe(initialBalance);
    expect(game.save.transactions[0]?.type).toBe("investment-sale");
  });

  it("выплачивает награду за коллекцию только один раз", () => {
    const game = startGame();
    const collectionAssets = assets.slice(0, 3);
    game.save.balance = 100_000;

    for (const asset of collectionAssets) {
      expect(game.buy(asset.id)).toBe(true);
    }

    expect(game.save.collections).toContain("first-home");
    const rewardBalance = game.save.balance;
    game.buy(collectionAssets[0]!.id);
    expect(game.save.balance).toBe(rewardBalance - collectionAssets[0]!.price);
    expect(game.save.collections.filter((id) => id === "first-home")).toHaveLength(1);
  });

  it("выдаёт доступную награду за коллекцию после миграции старого сохранения", () => {
    const savedAt = Date.now();
    const holdings = Object.fromEntries(
      assets.slice(0, 3).map((asset) => [
        asset.id,
        { quantity: 1, level: 0 },
      ]),
    );
    const game = startGame({
      [SAVE_KEY]: JSON.stringify({
        version: 3,
        balance: 100,
        holdings,
        favorites: [],
        wishlist: [],
        transactions: [],
        news: [],
        achievements: [],
        capitalHistory: [],
        gameTimeMs: 0,
        savedAt,
      }),
    });

    expect(game.save.balance).toBe(1_100);
    expect(game.save.collections).toContain("first-home");
    expect(JSON.parse(window.localStorage.getItem(SAVE_KEY)!).version).toBe(4);
  });

  it("сохраняет исторические снимки дохода", () => {
    const game = startGame();
    const startedAt = game.save.savedAt;

    game.tick(startedAt + 1_000);

    expect(game.save.incomeHistory).toEqual([game.dailyProfit]);
  });

  it("сохраняет реальные снимки капитала по игровым дням", () => {
    const game = startGame();
    const now = Date.now();

    game.tick(now);
    game.tick(now + GAME_DAY_MS);

    expect(game.save.capitalHistory).toHaveLength(2);
    expect(game.save.capitalHistory[0]?.value).toBe(1_000);
    expect(game.save.capitalHistory[1]?.value).toBe(1_000);
  });

  it("ведёт игровой день, время и день недели", () => {
    const game = startGame();
    const startingAt = game.save.savedAt;

    game.tick(startingAt);
    game.tick(startingAt + GAME_DAY_MS);

    expect(game.gameDay).toBe(2);
    expect(game.gameWeekday).toBe("Вторник");
    expect(game.gameClock).toBe("08:00");
    expect(game.dayProgress).toBe(0);
  });

  it("сохраняет пассивный прогресс не чаще одного раза в пять секунд", () => {
    const game = startGame();
    const storage = window.localStorage;
    const setItem = vi.spyOn(storage, "setItem");
    const startedAt = game.save.savedAt;

    game.tick(startedAt + 1_000);
    expect(setItem).not.toHaveBeenCalled();

    game.tick(startedAt + 5_000);
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("применяет активное кризисное событие к доходу бизнеса", () => {
    const game = startGame();
    const businessAsset = assets.find(
      (asset) => asset.categoryId === "business",
    )!;
    game.save.holdings[businessAsset.id] = { quantity: 1, level: 0 };
    game.save.news.push({
      id: "business-crisis",
      title: "Экономический кризис",
      description: "Доходы бизнеса просели.",
      createdAt: Date.now(),
      categoryId: "business",
      incomeMultiplier: 0.8,
      expiresAt: Date.now() + GAME_DAY_MS,
    });

    expect(game.dailyProfit).toBe(
      businessAsset.dailyIncome * 0.8 - businessAsset.dailyExpense,
    );
  });

  it("создаёт рыночные события по игровому расписанию после новостей о покупках", () => {
    const game = startGame();
    const startedAt = game.save.savedAt;

    game.tick(startedAt);
    game.save.balance = 10_000;
    game.buy(assets[0].id);
    const firstMarketEvent = game.save.news.find(
      (story) => story.categoryId && story.incomeMultiplier !== undefined,
    )!;
    game.tick(firstMarketEvent.createdAt + GAME_DAY_MS * 3 + 100);

    const marketEvents = game.save.news.filter(
      (story) => story.categoryId && story.incomeMultiplier !== undefined,
    );
    expect(marketEvents).toHaveLength(2);
  });

  it("оставляет активное рыночное событие после серии покупок", () => {
    const game = startGame();
    const startedAt = game.save.savedAt;
    game.tick(startedAt);
    const activeEventId = game.activeEvent?.id;
    game.save.balance = 100_000;

    for (let purchase = 0; purchase < 20; purchase += 1) {
      expect(game.buy(assets[0].id)).toBe(true);
    }

    expect(game.save.news).toHaveLength(12);
    expect(game.save.news.some((story) => story.id === activeEventId)).toBe(
      true,
    );
    expect(game.activeEvent?.id).toBe(activeEventId);
  });
});
