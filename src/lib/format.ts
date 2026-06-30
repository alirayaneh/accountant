export function formatToman(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(Math.round(value)) + ' تومان';
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('fa-IR', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value / 100);
}
