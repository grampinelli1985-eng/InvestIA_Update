// Imports removidos por não serem utilizados no momento

const BRAPI_TOKEN = 'fb3mwjLZkFFyEij5jUU2DB';

export interface FundamentalAnalysis {
    pe?: number;
    pvp?: number;
    roe?: number;
    dy?: number;
    netMargin?: number;
}

const getCache = () => {
    if (!(window as any).__FUND_CACHE__) (window as any).__FUND_CACHE__ = {};
    return (window as any).__FUND_CACHE__;
};

export async function fetchFundamentals(ticker: string): Promise<FundamentalAnalysis> {
    if (!ticker) return {};
    const symbol = ticker.toUpperCase().replace('.SA', '').trim();
    const cache = getCache();

    if (cache[symbol]) return cache[symbol];

    try {
        // Adicionamos um sinal de timeout para não travar o Radar se a API demorar
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(
            `https://brapi.dev/api/quote/${symbol}?token=${BRAPI_TOKEN}&modules=fundamental`,
            { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (response.status === 401) {
            console.error("Erro 401: Token da BRAPI inválido ou expirado.");
            return {};
        }

        const data = await response.json();
        const asset = data?.results?.[0];

        if (!asset) return {};

        // Mapeamento extra para garantir que pegamos os dados independente de onde venham no JSON
        const result = {
            pe: asset.fundamental?.priceEarnings ?? asset.priceEarnings ?? undefined,
            pvp: asset.fundamental?.priceToBook ?? asset.priceToBook ?? undefined,
            roe: asset.fundamental?.returnOnEquity ? asset.fundamental.returnOnEquity * 100 : undefined
        };

        // Salva no cache apenas se tiver dados úteis
        if (result.pvp !== undefined || result.pe !== undefined) {
            cache[symbol] = result;
        }

        return result;
    } catch (e) {
        console.warn(`Não foi possível carregar fundamentos para ${symbol}`);
        return {};
    }
}