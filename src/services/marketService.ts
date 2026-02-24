const BRAPI_TOKEN = import.meta.env.VITE_BRAPI_TOKEN || 'fb3mwjLZkFFyEij5jUU2DB';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Normaliza tickers para o padrão BRAPI/Yahoo
 */
const normalizeTicker = (ticker: string): string => {
    const upper = ticker.toUpperCase().trim();

    // Casos especiais que não precisam de sufixo .SA
    if (
        upper.startsWith('^') || // Índices (^BVSP, ^GSPC)
        upper.includes('-') ||    // Crypto (BTC-USD)
        upper.includes('=') ||    // Moedas (USDBRL=X)
        upper.includes('.')       // Já tem ponto (AAPL.SA, etc)
    ) {
        return upper;
    }

    // Se tem número e não é um dos casos acima, assume ser BR (.SA)
    if (/\d/.test(upper)) return `${upper}.SA`;

    // US Stocks puras (AAPL, MSFT)
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
        const CHUNK_SIZE = 15;
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
                        await delay(2000);
                        attempt++;
                        continue;
                    }

                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

                    const data = await res.json();

                    data.results?.forEach((r: any) => {
                        const symbol = r.symbol;
                        // Tenta mapear de volta para o ticker original (sem .SA)
                        const cleanSymbol = symbol.replace('.SA', '');

                        // Busca Profunda para métricas
                        const deepFetch = (obj: any, keys: string[]): any => {
                            if (!obj || typeof obj !== 'object') return undefined;
                            for (const key of keys) {
                                if (obj[key] !== undefined && obj[key] !== null) return obj[key];
                            }
                            for (const k in obj) {
                                if (k === 'historicalDataPrice') continue;
                                const found = deepFetch(obj[k], keys);
                                if (found !== undefined) return found;
                            }
                            return undefined;
                        };

                        const rawPe = deepFetch(r, ['priceEarnings', 'forwardPE', 'trailingPE']);
                        const rawPb = deepFetch(r, ['priceToBook', 'pvp', 'priceToBookValue']);
                        const rawDy = deepFetch(r, ['dividendYield', 'yield', 'yieldPercent', 'dividendRate']);
                        const rawRoe = deepFetch(r, ['returnOnEquity', 'roe', 'returnOnEquityTrailing12Months']);

                        const pe = rawPe != null ? Number(rawPe) : undefined;
                        const pb = rawPb != null ? Number(rawPb) : undefined;

                        // Normalização unificada de Yield e ROE
                        const normalizePercent = (val: any) => {
                            if (val == null) return undefined;
                            const n = Number(val);
                            // Se o valor for decimal pequeno (ex: 0.05), converte para percentual (5%)
                            // A maioria das APIs retorna 0.05 para 5% ou 5 para 5%. 
                            // Assumimos que se for < 1 (e não zero), é decimal.
                            if (Math.abs(n) > 0 && Math.abs(n) < 1) return n * 100;
                            return n;
                        };

                        resultsMap[cleanSymbol] = {
                            symbol: symbol,
                            price: r.regularMarketPrice,
                            changePercent: r.regularMarketChangePercent,
                            updatedAt: r.regularMarketTime,
                            name: r.longName || r.shortName,
                            pe,
                            pb,
                            dy: normalizePercent(rawDy),
                            roe: normalizePercent(rawRoe)
                        };

                        // Também guarda com o símbolo original da API para garantir
                        resultsMap[symbol] = resultsMap[cleanSymbol];
                    });

                    success = true;
                } catch (e) {
                    attempt++;
                    if (attempt <= retries) await delay(1000 * attempt);
                    else console.error(`[MarketService] Falha final para chunk ${i}:`, e);
                }
            }
        }

        return resultsMap;
    },

    /**
     * Busca dados históricos com conversão de moeda
     */
    fetchHistoricalData: async (ticker: string, range = '1y'): Promise<{ date: string, price: number }[]> => {
        const symbol = normalizeTicker(ticker);
        const isUSStock = !symbol.endsWith('.SA') && !symbol.startsWith('^') && !symbol.includes('-') && !symbol.includes('=');

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