// Форматирование валюты
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Обработка периода
export function getPeriodDates(period: string): [Date, Date] {
  const now = new Date();
  switch (period) {
    case "day":
      return [new Date(now.getFullYear(), now.getMonth(), now.getDate()), new Date()];
    case "week":
      return [new Date(now.setDate(now.getDate() - 7)), new Date()];
    case "month":
      return [new Date(now.getFullYear(), now.getMonth(), 1), new Date()];
    default:
      return [new Date(0), new Date()];
    case "all":
      return [new Date(0), new Date()];
  }
}

