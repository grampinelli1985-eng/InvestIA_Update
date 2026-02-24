import { marketService } from './marketService';

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

            // 1. Busca indicadores macro reais (SELIC, CDI, IPCA)
            try {
                const [selicRes, cdiRes, ipcaRes] = await Promise.all([
                    fetch(`https://brapi.dev/api/v2/macro/selic?token=${BRAPI_TOKEN}`).then(r => r.json()),
                    fetch(`https://brapi.dev/api/v2/macro/cdi?token=${BRAPI_TOKEN}`).then(r => r.json()),
                    fetch(`https://brapi.dev/api/v2/macro/ipca?token=${BRAPI_TOKEN}`).then(r => r.json())
                ]);

                const lastSelic = selicRes.selic?.[selicRes.selic.length - 1];
                const lastCdi = cdiRes.cdi?.[cdiRes.cdi.length - 1];
                const lastIpca = ipcaRes.ipca?.[ipcaRes.ipca.length - 1];

                // Fallbacks atualizados para o contexto de 2026 (Usuário indicou SELIC 15%)
                results.push({
                    name: 'SELIC',
                    value: lastSelic ? parseFloat(lastSelic.value) : 15.00,
                    suffix: '% a.a.',
                    updatedAt: lastSelic?.date || new Date().toISOString()
                });

                results.push({
                    name: 'CDI',
                    value: lastCdi ? parseFloat(lastCdi.value) : 14.90,
                    suffix: '% a.a.',
                    updatedAt: lastCdi?.date || new Date().toISOString()
                });

                results.push({
                    name: 'IPCA',
                    value: lastIpca ? parseFloat(lastIpca.value) : 4.44,
                    suffix: '% 12m',
                    updatedAt: lastIpca?.date || new Date().toISOString()
                });

            } catch (e) {
                console.warn("Erro ao buscar indicadores macro, usando fallbacks.", e);
                results.push({ name: 'SELIC', value: 15.00, suffix: '% a.a.', updatedAt: new Date().toISOString() });
                results.push({ name: 'CDI', value: 14.90, suffix: '% a.a.', updatedAt: new Date().toISOString() });
                results.push({ name: 'IPCA', value: 4.44, suffix: '% 12m', updatedAt: new Date().toISOString() });
            }

            // 2. Busca índices e moedas via MarketService
            const mapping = [
                { ticker: '^BVSP', name: 'IBOVESPA', suffix: ' pts' },
                { ticker: '^GSPC', name: 'S&P 500', suffix: '' },
                { ticker: '^IXIC', name: 'Nasdaq', suffix: '' },
                { ticker: 'BTC-USD', name: 'Bitcoin', suffix: ' USD' },
                { ticker: 'USDBRL=X', name: 'Dólar', suffix: '' }
            ];

            for (const m of mapping) {
                try {
                    const quotes = await marketService.fetchQuotes([m.ticker]);
                    const item = quotes[m.ticker];

                    if (item) {
                        const historyData = await marketService.fetchHistoricalData(m.ticker, '1y');

                        let trendText = "Lateralizado";
                        let trendType: 'up' | 'down' | 'neutral' = 'neutral';

                        if (historyData.length >= 2) {
                            const first = historyData[0].price;
                            const last = historyData[historyData.length - 1].price;
                            if (first > 0) {
                                const diff = ((last - first) / first) * 100;
                                if (diff > 0.5) { trendText = `Tendência de Alta (+${diff.toFixed(1)}%)`; trendType = 'up'; }
                                else if (diff < -0.5) { trendText = `Tendência de Baixa (${diff.toFixed(1)}%)`; trendType = 'down'; }
                            }
                        }

                        results.push({
                            name: m.name,
                            value: item.price || 0,
                            suffix: m.suffix,
                            updatedAt: item.updatedAt || new Date().toISOString(),
                            change24h: item.changePercent ? `${item.changePercent.toFixed(2)}%` : '0.00%',
                            direction: (item.changePercent || 0) >= 0 ? 'up' : 'down',
                            history: historyData.map(h => ({ date: h.date, value: h.price })),
                            trendText,
                            trendType
                        });
                    }
                } catch (e) {
                    console.error(`Erro ao carregar indicador ${m.name}:`, e);
                }
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

        try {
            const allTickers = Object.values(sectors).flat();
            const quotes = await marketService.fetchQuotes(allTickers);
            const result: Record<string, HeatMapAsset[]> = {};

            Object.entries(sectors).forEach(([sector, tickers]) => {
                result[sector] = tickers.map(ticker => {
                    const item = quotes[ticker];
                    return {
                        symbol: ticker,
                        change: item?.changePercent || 0,
                        name: item?.name || ticker
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
