import { describe, expect, it } from "vitest";
import { formatCurrency } from "./currency";

describe("форматирование рублёвых сумм", () => {
  it("показывает суммы с символом рубля без копеек", () => {
    expect(formatCurrency(1_234)).toBe("1 234 ₽");
    expect(formatCurrency(0)).toBe("0 ₽");
  });

  it("сокращает крупные суммы, сохраняя рублёвый знак", () => {
    expect(formatCurrency(1_000_000)).toContain("₽");
    expect(formatCurrency(1_000_000)).toContain("млн");
  });
});
