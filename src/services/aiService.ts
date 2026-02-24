export type AppView = 'dashboard' | 'transactions' | 'portfolio' | 'insights' | 'radar' | 'global' | 'precos' | 'rentabilidade';

export interface RadarAsset {
    symbol: string;
    category: string;
    recommendation: string;
    justification: string;
    fundamentals: {
        pe?: number;
        pvp?: number;
        roe?: number;
        dy?: number;
    };
    priceGap: number;
    isFII: boolean;
    currentPrice: number;
    justPrice: number;
    ceilingPrice: number;
}

export interface AIInsight {
    type: 'WARNING' | 'SUCCESS' | 'INFO';
    title: string;
    message: string;
    targetView?: AppView;
}

export interface AISuggestedStep {
    id: string;
    title: string;
    description: string;
    icon: 'chart' | 'money' | 'trend' | 'shield';
    actionLabel: string;
    targetView: AppView;
}

export const aiService = {
    analyzePortfolio: async (assets: any[]): Promise<AIInsight[]> => {
        const insights: AIInsight[] = [];
        if (!assets || assets.length === 0) return insights;

        const totalValue = assets.reduce((acc, a) => acc + (a.totalValue || 0), 0);
        if (totalValue === 0) return insights;

        const fiis = assets.filter(a => (a.ticker || "").toUpperCase().endsWith('11'));
        const fiisWeight = (fiis.reduce((acc, a) => acc + (a.totalValue || 0), 0) / totalValue) * 100;

        if (fiisWeight > 50) {
            insights.push({
                type: 'WARNING',
                title: 'Concentração em FIIs',
                message: `Sua carteira possui ${fiisWeight.toFixed(1)}% em FIIs. Considere diversificar em Ações ou Stocks para reduzir o risco setorial.`,
                targetView: 'portfolio'
            });
        }

        const winners = assets.filter(a => (a.profitPercent || 0) > 30);
        if (winners.length > 0) {
            insights.push({
                type: 'SUCCESS',
                title: 'Oportunidade de Rebalanceamento',
                message: `Você tem ${winners.length} ativos com lucro acima de 30%. Considere realizar parte do lucro para reequilibrar seus pesos.`,
                targetView: 'portfolio'
            });
        }

        return insights;
    },

    getSuggestedSteps: async (_assets: any[]): Promise<AISuggestedStep[]> => {
        const steps: AISuggestedStep[] = [
            {
                id: '1',
                title: 'Analise seu Radar',
                description: 'Existem novas oportunidades de compra baseadas no seu preço médio atual.',
                icon: 'trend',
                actionLabel: 'Ver Radar',
                targetView: 'radar'
            },
            {
                id: '2',
                title: 'Novos Lançamentos',
                description: 'Mantenha sua carteira em dia registrando suas últimas movimentações.',
                icon: 'money',
                actionLabel: 'Lançar Ativos',
                targetView: 'transactions'
            },
            {
                id: '3',
                title: 'Pulso do Mercado',
                description: 'Veja como os indicadores macro impactam seus ativos hoje.',
                icon: 'chart',
                actionLabel: 'Ver Global',
                targetView: 'global'
            }
        ];
        return steps;
    },

    getTopOpportunities: async (assets: any[]): Promise<RadarAsset[]> => {
        const list: RadarAsset[] = [];
        if (!assets) return list;

        for (const asset of assets) {
            const ticker = (asset.ticker || "").toUpperCase();
            if (!ticker) continue;

            // Melhoria na identificação de FII: checa se termina em 11 E não é explicitamente uma Ação/Unit/ETF/BDR
            // Ou se o tipo já estiver definido como 'FII' na carteira
            const isFII = asset.type === 'FII' || (ticker.endsWith('11') && !['STOCK', 'ETF', 'BDR', 'ACAO'].includes(asset.type));

            const avgPrice = Number(asset.averagePrice) || 0;
            const currentPrice = Number(asset.currentPrice) || 0;
            const gap = avgPrice > 0 ? ((avgPrice - currentPrice) / avgPrice) * 100 : 0;

            // O marketService já escala para percentual (0.05 -> 5%)
            const pvp = asset.pvp != null ? Number(asset.pvp) : undefined;
            const dy = asset.dy != null ? Number(asset.dy) : undefined;
            const pe = asset.pe != null ? Number(asset.pe) : undefined;
            const roe = asset.roe != null ? Number(asset.roe) : undefined;

            let justificationText = "";

            if (isFII) {
                if ((pvp ?? 0) > 0 && (pvp ?? 0) < 0.96) {
                    justificationText = `OPORTUNIDADE PATRIMONIAL: O P/VP de ${(pvp ?? 0).toFixed(2)} indica um desconto severo sobre os ativos físicos. Com DY de ${(dy ?? 0).toFixed(2)}%, a projeção é de ganho de capital na convergência para o valor justo.`;
                } else if ((dy ?? 0) > 11) {
                    justificationText = `FOCO EM RENDA: Ativo com excelente yield de ${(dy ?? 0).toFixed(2)}%. Embora o preço esteja próximo ao valor justo, é um ponto estratégico para dividendos.`;
                } else {
                    justificationText = `MANUTENÇÃO: FII negociado em patamares estáveis. Projeção de rendimentos constantes de ${(dy ?? 0).toFixed(2)}%.`;
                }
            } else {
                if ((roe ?? 0) > 18 && (pe ?? 0) < 13 && (pe ?? 0) > 0) {
                    justificationText = `ALTA QUALIDADE: Empresa eficiente com ROE de ${(roe ?? 0).toFixed(1)}%. O P/L de ${(pe ?? 0).toFixed(1)} revela que o mercado ainda não precificou todo o potencial.`;
                } else if (gap > 10) {
                    justificationText = `REVERSÃO À MÉDIA: O ativo apresenta um gap de ${gap.toFixed(1)}% contra seu preço médio. O ponto atual visa reduzir seu PM.`;
                } else if ((roe ?? 0) > 25) {
                    justificationText = `MÁQUINA DE COMPOSTAGEM: ROE excepcional de ${(roe ?? 0).toFixed(1)}%. Capacidade de reinvestimento projeta crescimento superior.`;
                } else {
                    justificationText = `MONITORAMENTO: P/L de ${(pe ?? 0).toFixed(1)} e ROE de ${(roe ?? 0).toFixed(1)}%. Ativo sólido, sem gatilhos imediatos de subvalorização.`;
                }
            }

            // 1. Preço Justo (Valor Intrínseco)
            let justPrice = 0;
            if (isFII) {
                // Para FIIs, o Preço Justo é o VPA (Valor Patrimonial por Ação)
                justPrice = (pvp ?? 0) > 0 ? (currentPrice / (pvp ?? 1)) : currentPrice;
            } else {
                // Fórmula de Benjamin Graham: VI = sqrt(22.5 * LPA * VPA)
                if ((pe ?? 0) > 0 && (pvp ?? 0) > 0) {
                    const grahamFactor = 22.5 / (pe! * pvp!);
                    justPrice = currentPrice * Math.sqrt(grahamFactor);
                } else {
                    justPrice = currentPrice * (1 + ((roe ?? 0) / 100));
                }
            }

            // 2. Preço Teto (Método Décio Bazin)
            const dpa = currentPrice * ((dy ?? 0) / 100);
            const ceilingPrice = (dy ?? 0) > 0 ? (dpa / 0.06) : 0;

            // 3. Margem de Segurança (Price Gap)
            const priceGap = justPrice > 0 ? ((justPrice - currentPrice) / justPrice) * 100 : 0;

            const recommendation = (() => {
                const isStrongBuyBase = (priceGap >= 20 || (isFII && (pvp ?? 1) <= 0.85) || (gap > 15 && priceGap > 0));
                if (priceGap > 50 && isStrongBuyBase) return 'COMPRA FORTE';
                if (priceGap >= 5 || (isFII && (pvp ?? 1) <= 0.95)) return 'COMPRA';
                if (priceGap >= -5) return 'MANTER';
                return 'ATENÇÃO';
            })();

            list.push({
                symbol: ticker,
                category: asset.type || (isFII ? 'FII' : 'Ação'),
                recommendation,
                justification: (() => {
                    switch (recommendation) {
                        case 'COMPRA FORTE':
                            return `OPORTUNIDADE MÁXIMA: Ativo descontado em ${priceGap.toFixed(1)}% do valor justo.${gap > 0 ? ` Chance de reduzir seu PM em ${gap.toFixed(1)}%.` : ''}`;
                        case 'COMPRA':
                            return `FAVORÁVEL: Margem de segurança de ${priceGap.toFixed(1)}%. Patamar aceitável para aportes graduais.`;
                        case 'MANTER':
                            return `LATERALIZADO: Cotação segue estável próxima ao preço justo.`;
                        case 'ATENÇÃO':
                            return `PERSPECTIVA DE BAIXA: Cotação ${Math.abs(priceGap).toFixed(1)}% acima do valor justo. Monitorar fundamentos para justificar queda.`;
                        default:
                            return justificationText;
                    }
                })(),
                fundamentals: { pe, pvp, roe, dy },
                priceGap: priceGap,
                isFII: isFII,
                currentPrice,
                justPrice,
                ceilingPrice
            });
        }
        return list.sort((a, b) => b.priceGap - a.priceGap);
    }
};