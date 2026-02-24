import { marketService } from './marketService';
// Removido o isBrazilianTicker daqui se não for usar para mais nada

export async function enrichAsset(asset: any) {
    const ticker = asset.symbol?.toUpperCase();
    if (!ticker) return asset;

    const quotes = await marketService.fetchQuotes([ticker]);
    const quote = quotes[ticker];

    return {
        symbol: ticker,
        price: quote?.price || asset.regularMarketPrice,
        pl: quote?.pe ?? asset.priceEarningsRatio ?? null,
        roe: quote?.roe ?? null,
        pvp: quote?.pb ?? null,
        netMargin: asset.netMargin ?? null
    };
}