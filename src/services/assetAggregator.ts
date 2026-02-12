import { fetchFundamentals } from './fundamentalService';
// Removido o isBrazilianTicker daqui se não for usar para mais nada

export async function enrichAsset(asset: any) {
    const ticker = asset.symbol?.toUpperCase();
    const price = asset.regularMarketPrice;

    // Buscamos os fundamentos para QUALQUER ativo (BR ou US)
    // O seu fundamentalService já trata a lógica de qual API usar internamente
    const fundamentals = await fetchFundamentals(ticker);

    return {
        symbol: ticker,
        price,
        // Fallback: Tenta pegar do asset original, se não tiver, pega da nossa busca de fundamentos
        pl: asset.priceEarningsRatio ?? fundamentals.pe ?? null,
        roe: fundamentals.roe ?? null,
        pvp: fundamentals.pvp ?? null,
        netMargin: fundamentals.netMargin ?? null // Adicionado para aproveitar o dado
    };
}