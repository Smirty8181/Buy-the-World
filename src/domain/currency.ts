const rubleFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});
const compactRubleFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
  notation: "compact",
  compactDisplay: "short",
});

export function formatCurrency(amount: number): string {
  return amount > 999_999
    ? compactRubleFormatter.format(amount)
    : rubleFormatter.format(amount);
}
