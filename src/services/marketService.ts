const BRAPI_TOKEN = import.meta.env.VITE_BRAPI_TOKEN || 'fb3mwjLZkFFyEij5jUU2DB';

export const marketService = {
    fetchQuotes: async (tickers: string[]) => {
        if (!tickers.length) return {};

        // Separa tickers BR (adiciona .SA se necessário) de US/Outros
        const symbols = tickers.map(t => {
            const upper = t.toUpperCase().trim();
            if (upper.includes('.') || upper.length < 3) return upper;
            if (/\d/.test(upper)) return `${upper}.SA`;
            return upper;
        });

        const CHUNK_SIZE = 20;
        const resultsMap: any = {};

        for (let i = 0; i < symbols.length; i += CHUNK_SIZE) {
            const chunk = symbols.slice(i, i + CHUNK_SIZE);
            try {
                const res = await fetch(`https://brapi.dev/api/quote/${chunk.join(',')}?modules=fundamental,summaryDetail,defaultKeyStatistics,financialData&token=${BRAPI_TOKEN}`);
                if (!res.ok) continue;

                const data = await res.json();
                data.results?.forEach((r: any) => {
                    const originalTicker = r.symbol.replace('.SA', '');

                    // Função de Busca Profunda (Deep Scan)
                    const deepSearch = (obj: any, targets: string[]): any => {
                        if (!obj || typeof obj !== 'object') return undefined;
                        for (const target of targets) {
                            if (obj[target] !== undefined && obj[target] !== null && obj[target] !== 0) {
                                return obj[target];
                            }
                        }
                        for (const key in obj) {
                            if (typeof obj[key] === 'object') {
                                const found = deepSearch(obj[key], targets);
                                if (found !== undefined) return found;
                            }
                        }
                        return undefined;
                    };

                    // Mapeamento via Deep Scan para máxima resiliência
                    const rawPe = deepSearch(r, ['priceEarnings', 'forwardPE', 'trailingPE']);
                    const rawPb = deepSearch(r, ['priceToBook', 'pvp', 'priceToBookValue']);
                    const rawDy = deepSearch(r, ['dividendYield', 'yield', 'yieldPercent']);
                    const rawRoe = deepSearch(r, ['returnOnEquity', 'roe', 'return_on_equity', 'returnOnEquityTrailing12Months']);

                    const pe = rawPe !== undefined ? Number(rawPe) : undefined;
                    const pb = rawPb !== undefined ? Number(rawPb) : undefined;

                    const dy = (() => {
                        if (rawDy === undefined || rawDy === null) return undefined;
                        const num = Number(rawDy);
                        if (isNaN(num) || num === 0) return undefined;
                        // Converte decimal para percentual
                        return (Math.abs(num) < 1) ? num * 100 : num;
                    })();

                    const roe = (() => {
                        if (rawRoe === undefined || rawRoe === null) return undefined;
                        const num = Number(rawRoe);
                        if (isNaN(num) || num === 0) return undefined;
                        // Converte decimal para percentual
                        return (Math.abs(num) <= 2) ? num * 100 : num;
                    })();

                    // Debug para FIIs e Stocks em produção
                    const isSpecial = /\d/.test(originalTicker) && originalTicker.endsWith('11') || !/\d/.test(originalTicker);
                    if (isSpecial || originalTicker === 'ITSA4' || originalTicker === 'PINE4') {
                        console.log(`[Brapi RESILIENT DEBUG] ${originalTicker}:`, { pe, pb, dy, roe, rawDy, rawRoe });
                    }

                    resultsMap[originalTicker] = {
                        price: r.regularMarketPrice,
                        changePercent: r.regularMarketChangePercent,
                        updatedAt: r.regularMarketTime,
                        pe,
                        pb,
                        dy,
                        roe
                    };
                });
            } catch (e) {
                console.error("Erro na API Brapi (chunk):", e);
            }
        }

        return resultsMap;
    },
    fetchHistoricalData: async (ticker: string, range = '1y') => {
        // Detectar se é ação americana (apenas letras, sem números)
        const isUSStock = /^[A-Z]+$/.test(ticker.toUpperCase()) && !ticker.includes('.');

        // Tenta usar o ticker com .SA se for numérico (ação BR padrão)
        const symbol = /\d/.test(ticker) && !ticker.includes('.') ? `${ticker}.SA` : ticker;

        try {
            // Buscar cotação do dólar se for ação americana
            let usdBrlRate = 1;
            if (isUSStock) {
                try {
                    const fxRes = await fetch(`https://brapi.dev/api/quote/USDBRL=X?token=${BRAPI_TOKEN}`);
                    if (fxRes.ok) {
                        const fxData = await fxRes.json();
                        usdBrlRate = fxData.results?.[0]?.regularMarketPrice || 5.8; // Fallback
                    }
                } catch {
                    usdBrlRate = 5.8; // Fallback para taxa aproximada
                }
            }

            const res = await fetch(`https://brapi.dev/api/quote/${symbol}?range=${range}&interval=1d&token=${BRAPI_TOKEN}`);
            if (!res.ok) return [];
            const data = await res.json();
            const results = data.results?.[0];
            if (!results || !results.historicalDataPrice) return [];

            return results.historicalDataPrice.map((h: any) => ({
                date: new Date(h.date * 1000).toISOString().split('T')[0],
                price: isUSStock ? h.close * usdBrlRate : h.close // Converte para BRL se for US Stock
            }));
        } catch (e) {
            console.error("Erro ao buscar histórico:", e);
            return [];
        }
    }
};