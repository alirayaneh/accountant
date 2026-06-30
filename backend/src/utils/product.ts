import { parseArrayField } from './json';
import { Product } from '../models';

export { parseArrayField } from './json';

export const calculateTotalCostInToman = (
    costs: unknown,
    rates: { currency: string; rate: number }[]
): number => {
    const parsedCosts = parseArrayField(costs) as { amount: number; currency: string }[];

    return parsedCosts.reduce((total, cost) => {
        const amount = Number(cost.amount) || 0;
        if (cost.currency === 'TOMAN') {
            return total + amount;
        }
        const rate = rates.find(r => r.currency === cost.currency);
        return total + amount * (rate?.rate || 0);
    }, 0);
};

export const calculateSellingPrice = (
    costs: unknown,
    profitMargin: number,
    rates: { currency: string; rate: number }[]
): number => {
    const totalCost = calculateTotalCostInToman(costs, rates);
    const margin = Number(profitMargin) || 0;
    const profit = totalCost * (margin / 100);
    return Math.round(totalCost + profit);
};

export const hasForeignCurrencyCosts = (costs: unknown): boolean => {
    const parsedCosts = parseArrayField(costs) as { currency: string }[];
    return parsedCosts.some(c => c.currency !== 'TOMAN');
};

export const recalculateProductPricesForUser = async (userId: string) => {
    const { ExchangeRate } = await import('../models');
    const rates = await ExchangeRate.findAll({ where: { userId } });
    const rateData = rates.map(r => ({ currency: r.currency, rate: r.rate }));

    const products = await Product.findAll({ where: { userId } });

    for (const product of products) {
        if (!hasForeignCurrencyCosts(product.costs)) {
            continue;
        }
        const newPrice = calculateSellingPrice(product.costs, product.profitMargin, rateData);
        await product.update({ price: newPrice });
    }
};
