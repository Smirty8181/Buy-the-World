import { describe, expect, it } from "vitest";
import { assets } from "./catalog";
import {
  GAME_DAY_MS,
  OFFLINE_CAP_MS,
  getDailyProfit,
  getIncomeForElapsed,
  getOfflineReport,
} from "./economy";

describe("игровая экономика", () => {
  it("считает прибыль с учётом расходов и улучшений", () => {
    const firstAsset = assets[0];
    expect(
      getDailyProfit({ [firstAsset.id]: { quantity: 2, level: 1 } }, assets),
    ).toBe(firstAsset.dailyIncome * 1.25 * 2 - firstAsset.dailyExpense * 2);
  });

  it("применяет событие только к выбранной категории", () => {
    const firstAsset = assets[0];
    const secondAsset = assets.find(
      (asset) => asset.categoryId !== firstAsset.categoryId,
    )!;
    const holdings = {
      [firstAsset.id]: { quantity: 1, level: 0 },
      [secondAsset.id]: { quantity: 1, level: 0 },
    };
    const ordinaryProfit = getDailyProfit(holdings, assets);
    const eventProfit = getDailyProfit(
      holdings,
      assets,
      firstAsset.categoryId,
      2,
    );
    expect(eventProfit - ordinaryProfit).toBe(firstAsset.dailyIncome);
  });

  it("снижает доход выбранной категории во время кризиса", () => {
    const businessAsset = assets.find(
      (asset) => asset.categoryId === "business",
    )!;
    const holdings = { [businessAsset.id]: { quantity: 1, level: 0 } };
    const ordinaryProfit = getDailyProfit(holdings, assets);
    const crisisProfit = getDailyProfit(
      holdings,
      assets,
      businessAsset.categoryId,
      0.8,
    );

    expect(crisisProfit).toBeLessThan(ordinaryProfit);
    expect(crisisProfit).toBe(
      businessAsset.dailyIncome * 0.8 - businessAsset.dailyExpense,
    );
  });

  it("ограничивает офлайн-доход двенадцатью часами", () => {
    const firstAsset = assets[0];
    const report = getOfflineReport(
      OFFLINE_CAP_MS * 2,
      { [firstAsset.id]: { quantity: 1, level: 0 } },
      assets,
    );
    expect(report.elapsedMs).toBe(OFFLINE_CAP_MS);
    expect(report.netIncome).toBe(
      Math.round(
        (firstAsset.dailyIncome - firstAsset.dailyExpense) *
          (OFFLINE_CAP_MS / GAME_DAY_MS),
      ),
    );
  });

  it("считает улучшения и событие только за ту часть интервала, когда оно активно", () => {
    const firstAsset = assets[0];
    const holdings = { [firstAsset.id]: { quantity: 1, level: 2 } };
    const intervalEndAt = 60_000;
    const income = getIncomeForElapsed(
      intervalEndAt,
      holdings,
      assets,
      [
        {
          id: "half-day-event",
          title: "Бум недвижимости",
          description: "Доход вырос.",
          createdAt: 30_000,
          expiresAt: 90_000,
          categoryId: firstAsset.categoryId,
          incomeMultiplier: 1.4,
        },
      ],
      intervalEndAt,
    );

    expect(income.grossIncome).toBe(firstAsset.dailyIncome * 1.8);
    expect(income.expenses).toBe(firstAsset.dailyExpense);
    expect(income.netIncome).toBe(
      firstAsset.dailyIncome * 1.8 - firstAsset.dailyExpense,
    );
  });

  it("начисляет кризисный бонус с точным учётом времени офлайн", () => {
    const businessAsset = assets.find(
      (asset) => asset.categoryId === "business",
    )!;
    const intervalEndAt = 60_000;
    const report = getOfflineReport(
      intervalEndAt,
      { [businessAsset.id]: { quantity: 1, level: 0 } },
      assets,
      [
        {
          id: "crisis-event",
          title: "Экономический кризис",
          description: "Доход снизился.",
          createdAt: 30_000,
          expiresAt: 90_000,
          categoryId: businessAsset.categoryId,
          incomeMultiplier: 0.8,
        },
      ],
      intervalEndAt,
    );

    expect(report.grossIncome).toBe(
      Math.round(businessAsset.dailyIncome * 0.9),
    );
    expect(report.netIncome).toBe(
      Math.round(businessAsset.dailyIncome * 0.9) -
        Math.round(businessAsset.dailyExpense),
    );
  });
});
