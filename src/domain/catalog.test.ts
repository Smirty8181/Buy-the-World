import { describe, expect, it } from "vitest";
import { assets, categories } from "./catalog";

describe("каталог активов", () => {
  it("содержит 12 категорий и 120 уникальных активов", () => {
    expect(categories).toHaveLength(12);
    expect(assets).toHaveLength(120);
    expect(new Set(assets.map((asset) => asset.id)).size).toBe(120);
    expect(categories.every((category) => category.assets.length === 10)).toBe(
      true,
    );
  });

  it("описывает цену, доход и содержание у каждого актива", () => {
    expect(
      assets.every(
        (asset) =>
          asset.price > 0 &&
          asset.dailyIncome > 0 &&
          asset.dailyExpense >= 0 &&
          asset.name.length > 0,
      ),
    ).toBe(true);
  });

  it("делает активы дороже, а доходность постепенно ниже", () => {
    const netIncomeRates = assets.map(
      (asset) => (asset.dailyIncome - asset.dailyExpense) / asset.price,
    );
    const earlyPaybackDays =
      assets[0].price / (assets[0].dailyIncome - assets[0].dailyExpense);
    const lateAsset = assets.at(-1)!;
    const latePaybackDays =
      lateAsset.price / (lateAsset.dailyIncome - lateAsset.dailyExpense);

    expect(
      assets.every(
        (asset, index) => index === 0 || asset.price > assets[index - 1].price,
      ),
    ).toBe(true);
    expect(netIncomeRates[0]).toBeGreaterThan(netIncomeRates[9]);
    expect(netIncomeRates[9]).toBeGreaterThan(netIncomeRates[10]);
    expect(netIncomeRates[10]).toBeGreaterThan(netIncomeRates.at(-1)!);
    expect(netIncomeRates.at(-1)).toBeGreaterThan(0);
    expect(earlyPaybackDays).toBeLessThan(5);
    expect(latePaybackDays).toBeGreaterThan(60);
  });
});
