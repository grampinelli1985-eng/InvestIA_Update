const BRAPI_TOKEN = import.meta.env.VITE_BRAPI_TOKEN || '';

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
                const res = await fetch(`https://brapi.dev/api/quote/${chunk.join(',')}?modules=fundamental,summaryDetail,defaultKeyStatistics&token=${BRAPI_TOKEN}`);
                if (!res.ok) continue;

                const data = await res.json();
                data.results?.forEach((r: any) => {
                    const originalTicker = r.symbol.replace('.SA', '');

                    // Estratégia de Fallback para dados fundamentais explorando múltiplos módulos
                    const f = r.fundamental || r.fundamentals?.[0] || {};
                    const sd = r.summaryDetail || {};
                    const ks = r.defaultKeyStatistics || {};

                    resultsMap[originalTicker] = {
                        price: r.regularMarketPrice,
                        changePercent: r.regularMarketChangePercent,
                        updatedAt: r.regularMarketTime,
                        pe: f.priceEarnings ?? r.priceEarnings ?? ks.forwardPE,
                        pb: f.priceToBook ?? r.pvp ?? ks.priceToBook,
                        dy: f.dividendYield ?? r.dividendYield ?? sd.dividendYield ?? ks.yield,
                        roe: f.returnOnEquity ? f.returnOnEquity * 100 : (r.roe || f.roe)
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