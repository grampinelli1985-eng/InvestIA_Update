export interface MacroHistory {
    date: string;
    value: number;
}

export interface HeatMapAsset {
    symbol: string;
    change: number;
    name?: string;
}

export interface MacroData {
    name: string;
    value: number | string;
    suffix: string;
    updatedAt: string;
    history?: MacroHistory[];
    change24h?: string;
    direction?: 'up' | 'down';
    trendText?: string;
    trendType?: 'up' | 'down' | 'neutral';
}

const BRAPI_TOKEN = import.meta.env.VITE_BRAPI_TOKEN || 'fb3mwjLZkFFyEij5jUU2DB';

export const macroService = {
    fetchMainIndicators: async (): Promise<MacroData[]> => {
        try {
            const results: MacroData[] = [];

            // Busca indicadores macro reais via Brapi v2
            try {
                const [selicRes, cdiRes, ipcaRes] = await Promise.all([
                    fetch(`https://brapi.dev/api/v2/macro/selic?token=${BRAPI_TOKEN}`).then(r => r.json()),
                    fetch(`https://brapi.dev/api/v2/macro/cdi?token=${BRAPI_TOKEN}`).then(r => r.json()),
                    fetch(`https://brapi.dev/api/v2/macro/ipca?token=${BRAPI_TOKEN}`).then(r => r.json())
                ]);

                const lastSelic = selicRes.selic?.[selicRes.selic.length - 1];
                const lastCdi = cdiRes.cdi?.[cdiRes.cdi.length - 1];
                const lastIpca = ipcaRes.ipca?.[ipcaRes.ipca.length - 1];

                if (lastSelic) results.push({ name: 'SELIC', value: parseFloat(lastSelic.value), suffix: '% a.a.', updatedAt: lastSelic.date });
                else results.push({ name: 'SELIC', value: 15.00, suffix: '% a.a.', updatedAt: new Date().toISOString() });

                if (lastCdi) results.push({ name: 'CDI', value: parseFloat(lastCdi.value), suffix: '% a.a.', updatedAt: lastCdi.date });
                else results.push({ name: 'CDI', value: 14.90, suffix: '% a.a.', updatedAt: new Date().toISOString() });

                if (lastIpca) results.push({ name: 'IPCA', value: parseFloat(lastIpca.value), suffix: '% 12m', updatedAt: lastIpca.date });
                else results.push({ name: 'IPCA', value: 4.44, suffix: '% 12m', updatedAt: new Date().toISOString() });
            } catch (e) {
                console.warn("Erro ao buscar macros reais, usando fallback.", e);
                results.push({ name: 'SELIC', value: 15.00, suffix: '% a.a.', updatedAt: new Date().toISOString() });
                results.push({ name: 'CDI', value: 14.90, suffix: '% a.a.', updatedAt: new Date().toISOString() });
                results.push({ name: 'IPCA', value: 4.44, suffix: '% 12m', updatedAt: new Date().toISOString() });
            }

            const mapping = [
                { ticker: '^BVSP', name: 'IBOVESPA', suffix: ' pts' },
                { ticker: '^GSPC', name: 'S&P 500', suffix: '' },
                { ticker: '^IXIC', name: 'Nasdaq', suffix: '' },
                { ticker: 'BTC-USD', name: 'Bitcoin', suffix: ' USD' },
                { ticker: 'USDBRL=X', name: 'Dólar', suffix: '' }
            ];

            const tickerList = mapping.map(m => m.ticker).join(',');
            const url = `https://brapi.dev/api/quote/${tickerList}?range=1y&interval=1d&token=${BRAPI_TOKEN}`;

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Erro ao buscar indicadores: ${response.status}`);

                const data = await response.json();
                mapping.forEach(m => {
                    const item = data.results?.find((r: any) => r.symbol === m.ticker);
                    if (item) {
                        const historyMap = new Map();

                        (item.historicalDataPrice || [])
                            .filter((h: any) => h.close && h.close > 0)
                            .forEach((h: any) => {
                                const dateStr = new Date(h.date * 1000).toISOString().split('T')[0];
                                historyMap.set(dateStr, h.close);
                            });

                        const todayStr = new Date().toISOString().split('T')[0];
                        if (item.regularMarketPrice) {
                            historyMap.set(todayStr, item.regularMarketPrice);
                        }

                        const history = Array.from(historyMap.entries())
                            .map(([date, value]) => ({ date, value }))
                            .sort((a, b) => a.date.localeCompare(b.date));

                        let trendText = "Lateralizado";
                        let trendType: 'up' | 'down' | 'neutral' = 'neutral';
                        if (history.length >= 2) {
                            const first = history[0].value;
                            const last = history[history.length - 1].value;
                            if (first > 0) {
                                const diff = ((last - first) / first) * 100;
                                if (diff > 0.5) { trendText = `Tendência de Alta (+${diff.toFixed(1)}%)`; trendType = 'up'; }
                                else if (diff < -0.5) { trendText = `Tendência de Baixa (${diff.toFixed(1)}%)`; trendType = 'down'; }
                            }
                        }

                        results.push({
                            name: m.name,
                            value: item.regularMarketPrice || 0,
                            suffix: m.suffix,
                            updatedAt: new Date().toISOString(),
                            change24h: item.regularMarketChangePercent ? `${item.regularMarketChangePercent.toFixed(2)}%` : '0.00%',
                            direction: (item.regularMarketChangePercent || 0) >= 0 ? 'up' : 'down',
                            history,
                            trendText,
                            trendType
                        });
                    }
                });
            } catch (e) {
                console.error("Erro ao carregar indicadores de mercado:", e);
            }
            return results;
        } catch (error) {
            console.error("Erro fatal no fetchMainIndicators:", error);
            return [];
        }
    },

    fetchGlobalHeatMap: async (): Promise<Record<string, HeatMapAsset[]>> => {
        const sectors = {
            "Tecnologia": ["AAPL", "MSFT", "NVDA", "GOOGL", "META"],
            "Finanças": ["JPM", "V", "MA", "BAC", "GS"],
            "Consumo": ["AMZN", "TSLA", "WMT", "KO", "PEP"],
            "Saúde": ["PFE", "JNJ", "UNH", "LLY", "ABBV"]
        };

        const allTickers = Object.values(sectors).flat().join(',');
        try {
            const response = await fetch(`https://brapi.dev/api/quote/${allTickers}?token=${BRAPI_TOKEN}`);
            if (!response.ok) throw new Error(`Heatmap error: ${response.status}`);

            const data = await response.json();
            const result: Record<string, HeatMapAsset[]> = {};

            Object.entries(sectors).forEach(([sector, tickers]) => {
                result[sector] = tickers.map(ticker => {
                    const item = data.results?.find((r: any) => r.symbol === ticker);
                    return {
                        symbol: ticker,
                        change: item?.regularMarketChangePercent || 0,
                        name: item?.shortName || ticker
                    };
                });
            });

            return result;
        } catch (error) {
            console.error("Erro ao buscar heatmap global:", error);
            return {};
        }
    }
};
