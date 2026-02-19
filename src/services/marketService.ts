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
                const res = await fetch(`https://brapi.dev/api/quote/${chunk.join(',')}?modules=fundamental,summaryDetail,defaultKeyStatistics&token=${BRAPI_TOKEN}`);
                if (!res.ok) continue;

                const data = await res.json();
                data.results?.forEach((r: any) => {
                    const originalTicker = r.symbol.replace('.SA', '');

                    // Estratégia de Fallback para dados fundamentais explorando múltiplos módulos
                    const f = r.fundamental || r.fundamentals?.[0] || {};
                    const sd = r.summaryDetail || {};
                    const ks = r.defaultKeyStatistics || {};

                    // Mapeamento Robusto
                    const pe = f.priceEarnings ?? r.priceEarnings ?? ks.forwardPE ?? ks.trailingPE ?? r.priceEarnings;
                    const pb = f.priceToBook ?? r.pvp ?? ks.priceToBook ?? r.priceToBook;

                    // Dividend Yield
                    const rawDy = f.dividendYield ?? r.dividendYield ?? sd.dividendYield ?? ks.yield ?? ks.dividendYield;
                    const dy = (() => {
                        if (rawDy === undefined || rawDy === null) return undefined;
                        const num = Number(rawDy);
                        if (isNaN(num)) return undefined;
                        return (num !== 0 && Math.abs(num) < 1) ? num * 100 : num;
                    })();

                    const roe = (() => {
                        // Ordem de busca: fundamental, keyStatistics, summaryDetail, roots
                        // Brapi às vezes muda o local dependendo do ambiente/ticker
                        const raw = f.returnOnEquity ?? ks.returnOnEquity ?? sd.returnOnEquity ?? r.roe ?? f.roe ?? r.returnOnEquity;
                        if (raw === undefined || raw === null) return undefined;

                        const num = Number(raw);
                        if (isNaN(num)) return undefined;

                        // Se for um valor decimal (ex: 0.15), converte para percentual (15)
                        return (num !== 0 && Math.abs(num) <= 2) ? num * 100 : num;
                    })();

                    // Log para debug em produção (remover depois)
                    if (originalTicker === 'BRSR6' || originalTicker === 'PETR4') {
                        console.log(`[Brapi Debug] ${originalTicker}:`, { f_roe: f.returnOnEquity, ks_roe: ks.returnOnEquity, sd_roe: sd.returnOnEquity, r_roe: r.roe });
                    }

                    resultsMap[originalTicker] = {
                        price: r.regularMarketPrice,
                        changePercent: r.regularMarketChangePercent,
                        updatedAt: r.regularMarketTime,
                        pe: pe !== undefined ? Number(pe) : undefined,
                        pb: pb !== undefined ? Number(pb) : undefined,
                        dy: dy !== undefined ? Number(dy) : undefined,
                        roe: roe !== undefined ? Number(roe) : undefined
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