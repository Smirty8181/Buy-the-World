import type { Asset, Holding, NewsStory, OfflineReport } from "./types";

export const GAME_DAY_MS = 60_000;
export const OFFLINE_CAP_MS = 12 * 60 * 60 * 1_000;

export function getDailyProfit(
  holdings: Record<string, Holding>,
  catalog: Asset[],
  activeCategoryId?: string,
  activeMultiplier = 1,
): number {
  return catalog.reduce((profit, asset) => {
    const holding = holdings[asset.id];
    if (!holding) return profit;
    const upgradeMultiplier = 1 + holding.level * 0.25;
    const eventMultiplier =
      asset.categoryId === activeCategoryId ? activeMultiplier : 1;
    return (
      profit +
      (asset.dailyIncome * upgradeMultiplier * eventMultiplier -
        asset.dailyExpense) *
        holding.quantity
    );
  }, 0);
}

export function getPortfolioValue(
  holdings: Record<string, Holding>,
  catalog: Asset[],
): number {
  return catalog.reduce(
    (value, asset) => value + asset.price * (holdings[asset.id]?.quantity ?? 0),
    0,
  );
}

export function getOfflineReport(
  elapsedMs: number,
  holdings: Record<string, Holding>,
  catalog: Asset[],
  events: NewsStory[] = [],
  intervalEndAt = Date.now(),
): OfflineReport {
  const cappedElapsed = Math.min(Math.max(0, elapsedMs), OFFLINE_CAP_MS);
  const income = getIncomeForElapsed(
    cappedElapsed,
    holdings,
    catalog,
    events,
    intervalEndAt,
  );
  return {
    elapsedMs: cappedElapsed,
    grossIncome: Math.round(income.grossIncome),
    expenses: Math.round(income.expenses),
    netIncome: Math.round(income.grossIncome) - Math.round(income.expenses),
  };
}

export function getIncomeForElapsed(
  elapsedMs: number,
  holdings: Record<string, Holding>,
  catalog: Asset[],
  events: NewsStory[] = [],
  intervalEndAt = Date.now(),
): Pick<OfflineReport, "grossIncome" | "expenses" | "netIncome"> {
  const elapsed = Math.max(0, elapsedMs);
  const intervalStartAt = intervalEndAt - elapsed;
  let grossIncome = 0;
  let expenses = 0;
  for (const asset of catalog) {
    const holding = holdings[asset.id];
    if (!holding) continue;

    const incomeRate = asset.dailyIncome * (1 + holding.level * 0.25);
    grossIncome += incomeRate * holding.quantity * (elapsed / GAME_DAY_MS);
    expenses += asset.dailyExpense * holding.quantity * (elapsed / GAME_DAY_MS);

    for (const event of events) {
      if (
        event.categoryId !== asset.categoryId ||
        event.incomeMultiplier === undefined ||
        event.expiresAt === undefined
      ) {
        continue;
      }

      const eventElapsed = Math.max(
        0,
        Math.min(intervalEndAt, event.expiresAt) -
          Math.max(intervalStartAt, event.createdAt),
      );
      grossIncome +=
        (incomeRate *
          holding.quantity *
          ((event.incomeMultiplier - 1) * eventElapsed)) /
        GAME_DAY_MS;
    }
  }
  return { grossIncome, expenses, netIncome: grossIncome - expenses };
}

export function getPurchaseCost(asset: Asset, quantity: number): number {
  return asset.price * quantity;
}
