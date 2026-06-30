import { ExchangeRate } from '../models';

export const seedDefaultExchangeRates = async (userId: string) => {
    const defaults = [
        { currency: 'USD' as const, rate: 50000 },
        { currency: 'AED' as const, rate: 13600 },
        { currency: 'CNY' as const, rate: 7000 },
    ];

    for (const rate of defaults) {
        await ExchangeRate.findOrCreate({
            where: { userId, currency: rate.currency },
            defaults: { userId, ...rate },
        });
    }
};
