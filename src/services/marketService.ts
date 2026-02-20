const BRAPI_TOKEN = import.meta.env.VITE_BRAPI_TOKEN || 'fb3mwjLZkFFyEij5jUU2DB';

/**
 * Utilitário para delay (sleep)
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Normaliza tickers para o padrão BRAPI
 */
const normalizeTicker = (ticker: string): string => {
    const upper = ticker.toUpperCase().trim();
    if (upper.includes('.') || upper.length < 3 || upper === 'USDBRL=X') return upper;
    // Se tem número, assume ser BR (.SA)
    if (/\d/.test(upper)) return `${upper}.SA`;
    return upper;
};

export interface MarketData {
    price: number;
    changePercent: number;
    updatedAt: string;
    pe?: number;
    pb?: number;
    dy?: number;
    roe?: number;
    name?: string;
    symbol: string;
}

export const marketService = {
    /**
     * Busca cotações e dados fundamentalistas com retry e normalização
     */
    fetchQuotes: async (tickers: string[], retries = 2): Promise<Record<string, MarketData>> => {
        if (!tickers.length) return {};

        const symbols = [...new Set(tickers.map(normalizeTicker))];
        const CHUNK_SIZE = 15; // Reduzido para evitar URLs muito longas e rate limit
        const resultsMap: Record<string, MarketData> = {};

        for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
            const chunk = symbols.slice(i, i + CHUNK_SIZE);
            let attempt = 0;
            let success = false;

            while (attempt <= retries && !success) {
                try {
                    const url = `https://brapi.dev/api/quote/${chunk.join(',')}?modules=fundamental,summaryDetail,defaultKeyStatistics,financialData&token=${BRAPI_TOKEN}`;
                    const res = await fetch(url);

                    if (res.status === 429) {
                        console.warn(`[MarketService] Rate limit atingido. Aguardando 2s...`);
                        await delay(2000);
                        attempt++;
                        continue;
                    }

                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }

                    const data = await res.json();

                    data.results?.forEach((r: any) => {
                        const originalTicker = r.symbol.replace('.SA', '');

                        // Função de Busca Profunda para métricas
                        const deepFetch = (obj: any, keys: string[]): any => {
                            if (!obj || typeof obj !== 'object') return undefined;
                            for (const key of keys) {
                                if (obj[key] !== undefined && obj[key] !== null) return obj[key];
                            }
                            for (const k in obj) {
                                const found = deepFetch(obj[k], keys);
                                if (found !== undefined) return found;
                            }
                            return undefined;
                        };

                        const rawPe = deepFetch(r, ['priceEarnings', 'forwardPE', 'trailingPE']);
                        const rawPb = deepFetch(r, ['priceToBook', 'pvp', 'priceToBookValue']);
                        const rawDy = deepFetch(r, ['dividendYield', 'yield', 'yieldPercent']);
                        const rawRoe = deepFetch(r, ['returnOnEquity', 'roe', 'returnOnEquityTrailing12Months']);

                        const pe = rawPe != null ? Number(rawPe) : undefined;
                        const pb = rawPb != null ? Number(rawPb) : undefined;

                        // Normalização de Yield e ROE (decimal -> percentual)
                        const dy = (() => {
                            if (rawDy == null) return undefined;
                            const n = Number(rawDy);
                            return (Math.abs(n) < 1 && n !== 0) ? n * 100 : n;
                        })();

                        const roe = (() => {
                            if (rawRoe == null) return undefined;
                            const n = Number(rawRoe);
                            return (Math.abs(n) <= 2 && n !== 0) ? n * 100 : n;
                        })();

                        resultsMap[originalTicker] = {
                            symbol: r.symbol,
                            price: r.regularMarketPrice,
                            changePercent: r.regularMarketChangePercent,
                            updatedAt: r.regularMarketTime,
                            name: r.longName,
                            pe,
                            pb,
                            dy,
                            roe
                        };
                    });

                    success = true;
                } catch (e) {
                    attempt++;
                    console.error(`[MarketService] Falha na tentativa ${attempt} para chunk ${i}:`, e);
                    if (attempt <= retries) await delay(1000 * attempt);
                }
            }
        }

        return resultsMap;
    },

    /**
     * Busca dados históricos com conversão de moeda para US Stocks
     */
    fetchHistoricalData: async (ticker: string, range = '1y'): Promise<{ date: string, price: number }[]> => {
        const isUSStock = /^[A-Z]+$/.test(ticker.toUpperCase()) && ticker.length <= 5;
        const symbol = normalizeTicker(ticker);

        try {
            let usdBrlRate = 1;
            if (isUSStock) {
                const quotes = await marketService.fetchQuotes(['USDBRL=X'], 1);
                usdBrlRate = quotes['USDBRL=X']?.price || 5.8;
            }

            const url = `https://brapi.dev/api/quote/${symbol}?range=${range}&interval=1d&token=${BRAPI_TOKEN}`;
            const res = await fetch(url);
            if (!res.ok) return [];

            const data = await res.json();
            const result = data.results?.[0];
            if (!result?.historicalDataPrice) return [];

            return result.historicalDataPrice.map((h: any) => ({
                date: new Date(h.date * 1000).toISOString().split('T')[0],
                price: isUSStock ? h.close * usdBrlRate : h.close
            }));
        } catch (e) {
            console.error(`[MarketService] Erro ao buscar histórico para ${ticker}:`, e);
            return [];
        }
    }
};