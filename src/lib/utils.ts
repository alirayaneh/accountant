import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Product, ExchangeRate, ProductCost, Currency } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateTotalCostInToman(costs: ProductCost[], rates: ExchangeRate[]): number {
  if (!costs || !Array.isArray(costs)) return 0;
  return costs.reduce((total, cost) => {
    const amount = Number(cost.amount) || 0;
    if (cost.currency === 'TOMAN') {
      return total + amount;
    }
    const rateInfo = rates.find(r => r.currency === cost.currency);
    const rate = rateInfo ? Number(rateInfo.rate) : 1;
    return total + (amount * rate);
  }, 0);
};

export function calculateSellingPrice(product: Product, rates: ExchangeRate[]): number {
  const totalCost = calculateTotalCostInToman(product.costs, rates);
  const profitMargin = Number(product.profitMargin) || 0;
  const profit = totalCost * (profitMargin / 100);
  return Math.round(totalCost + profit);
}

export function getEffectiveProductPrice(product: Product, rates: ExchangeRate[]): number {
  const hasForeignCost = product.costs?.some(c => c.currency !== 'TOMAN');
  if (!hasForeignCost) return product.price;
  return calculateSellingPrice(product, rates);
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  TOMAN: 'تومان',
  USD: '$',
  AED: 'درهم',
  CNY: '¥',
};
