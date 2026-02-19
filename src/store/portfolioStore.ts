import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { marketService } from '../services/marketService';

export const usePortfolioStore = create<any>()(
    persist(
        (set, get) => ({
            assets: [],
            dividends: [],
            isLoadingPrices: false,
            lastRefresh: 0,

            refreshPrices: async (caller = "Desconhecido") => {
                const now = Date.now();
                const refreshId = Math.random().toString(36).substring(7);

                // 1. Verificação de Bloqueio (Debounce e Concorrência)
                if (get().isLoadingPrices) {
                    console.log(`[${refreshId}] Ignorado: Já existe sincronização em curso (${caller})`);
                    return;
                }

                const last = get().lastRefresh || 0;
                if (now - last < 10000) { // Reduzi para 10s para melhor UX
                    console.log(`[${refreshId}] Ignorado: Debounce 10s (${caller})`);
                    return;
                }

                console.log(`[${refreshId}] Iniciando sincronização (${caller})...`);
                set({ isLoadingPrices: true });

                // Proteção contra travamento eterno (30s timeout)
                const safetyTimeout = setTimeout(() => {
                    if (get().isLoadingPrices) {
                        console.warn(`[${refreshId}] Timeout atingido (30s). Resetando status para segurança.`);
                        set({ isLoadingPrices: false });
                    }
                }, 30000);

                try {
                    const { assets } = get();
                    if (!assets || assets.length === 0) {
                        set({ isLoadingPrices: false, lastRefresh: now });
                        return;
                    }

                    const tickers = assets.map((a: any) => a.ticker);
                    const hasStocks = assets.some((a: any) => a.type === 'STOCK');

                    if (hasStocks && !tickers.includes('USDBRL=X')) {
                        tickers.push('USDBRL=X');
                    }

                    const quotes = await marketService.fetchQuotes(tickers);
                    const dollarRate = quotes['USDBRL=X']?.price || 5.8; // Fallback mais atual

                    const updatedAssets = assets.map((asset: any) => {
                        const ticker = asset.ticker.toUpperCase();
                        // Tenta achar com e sem .SA para garantir o match
                        const quote = quotes[ticker] ||
                            quotes[ticker.replace('.SA', '')] ||
                            quotes[`${ticker}.SA`];

                        let currentPriceBRL = asset.currentPrice || 0;
                        let originalPrice = asset.originalCurrentPrice || 0;

                        if (quote?.price) {
                            originalPrice = Number(quote.price);
                            currentPriceBRL = asset.type === 'STOCK'
                                ? originalPrice * dollarRate
                                : originalPrice;
                        }

                        // Cálculos de Rentabilidade
                        const averagePrice = Number(asset.averagePrice) || 0;
                        const quantity = Number(asset.quantity) || 0;
                        const totalInvested = quantity * averagePrice;
                        const totalValue = quantity * currentPriceBRL;
                        const profitPercent = averagePrice > 0
                            ? ((currentPriceBRL - averagePrice) / averagePrice) * 100
                            : 0;

                        return {
                            ...asset,
                            currentPrice: currentPriceBRL,
                            originalCurrentPrice: originalPrice,
                            totalValue,
                            totalInvested,
                            profitPercent,
                            exchangeRate: asset.type === 'STOCK' ? dollarRate : undefined,
                            changePercent: quote?.changePercent ?? asset.changePercent,
                            updatedAt: quote?.updatedAt ?? asset.updatedAt,
                            // Restauração dos dados fundamentalistas para o Radar e Insights
                            pe: quote?.pe ?? asset.pe,
                            pvp: quote?.pb ?? asset.pvp ?? asset.pb,
                            dy: quote?.dy ?? asset.dy,
                            roe: quote?.roe ?? asset.roe
                        };
                    });

                    set({
                        assets: updatedAssets,
                        lastRefresh: Date.now()
                    });

                    console.log(`[${refreshId}] Sincronização finalizada com sucesso.`);
                } catch (error) {
                    console.error(`[${refreshId}] Erro brutal no refresh:`, error);
                } finally {
                    clearTimeout(safetyTimeout);
                    set({ isLoadingPrices: false });
                }
            },

            addTransaction: (ticker: string, type: string, transaction: any) => {
                const { assets } = get();
                const tickerUpper = ticker.toUpperCase();
                const existing = assets.find((a: any) => a.ticker === tickerUpper);
                const txWithId = { ...transaction, id: crypto.randomUUID() };

                if (existing) {
                    const newQuantity = Number(existing.quantity) + Number(transaction.quantity);
                    const newAveragePrice = newQuantity > 0
                        ? ((Number(existing.quantity) * Number(existing.averagePrice)) + (Number(transaction.quantity) * Number(transaction.price))) / newQuantity
                        : 0;

                    set({
                        assets: assets.map((a: any) => a.ticker === tickerUpper ?
                            {
                                ...a,
                                quantity: newQuantity,
                                averagePrice: newAveragePrice,
                                totalInvested: newQuantity * newAveragePrice,
                                transactions: [...(a.transactions || []), txWithId]
                            } : a)
                    });
                } else {
                    set({
                        assets: [...assets, {
                            ticker: tickerUpper,
                            type,
                            quantity: Number(transaction.quantity),
                            averagePrice: Number(transaction.price),
                            totalInvested: Number(transaction.quantity) * Number(transaction.price),
                            currentPrice: Number(transaction.price),
                            totalValue: Number(transaction.quantity) * Number(transaction.price),
                            transactions: [txWithId]
                        }]
                    });
                }
            },

            batchImportTransactions: (transactions: any[]) => {
                const { assets } = get();
                let updatedAssets = [...assets];

                transactions.forEach(tx => {
                    const tickerUpper = tx.ticker.toUpperCase();
                    const existingIndex = updatedAssets.findIndex((a: any) => a.ticker === tickerUpper);

                    // Estrutura limpa da transação (garante tipo 'BUY' se não especificado)
                    const txWithId = {
                        id: crypto.randomUUID(),
                        type: tx.type === 'BUY' || tx.type === 'SELL' ? tx.type : 'BUY',
                        quantity: Number(tx.quantity),
                        price: Number(tx.price),
                        date: tx.date
                    };

                    if (existingIndex >= 0) {
                        const existing = updatedAssets[existingIndex];
                        const newQuantity = Number(existing.quantity) + Number(tx.quantity);
                        const newAveragePrice = newQuantity > 0
                            ? ((Number(existing.quantity) * Number(existing.averagePrice)) + (Number(tx.quantity) * Number(tx.price))) / newQuantity
                            : 0;

                        updatedAssets[existingIndex] = {
                            ...existing,
                            quantity: newQuantity,
                            averagePrice: newAveragePrice,
                            totalInvested: newQuantity * newAveragePrice,
                            transactions: [...(existing.transactions || []), txWithId]
                        };
                    } else {
                        updatedAssets.push({
                            ticker: tickerUpper,
                            type: tx.assetType || tx.type, // assetType vindo do modal de importação
                            quantity: Number(tx.quantity),
                            averagePrice: Number(tx.price),
                            totalInvested: Number(tx.quantity) * Number(tx.price),
                            currentPrice: Number(tx.price),
                            totalValue: Number(tx.quantity) * Number(tx.price),
                            transactions: [txWithId]
                        });
                    }
                });

                set({ assets: updatedAssets });
                // Trigger price refresh after import to get real-time status
                setTimeout(() => get().refreshPrices("Store_Batch_Import"), 100);
            },

            removeTransaction: (ticker: string, transactionId: string) => {
                const { assets } = get();
                const tickerUpper = ticker.toUpperCase();

                const updatedAssets = assets.map((asset: any) => {
                    if (asset.ticker === tickerUpper) {
                        const remainingTransactions = asset.transactions.filter((tx: any) => tx.id !== transactionId);

                        if (remainingTransactions.length === 0) return null;

                        const newQuantity = remainingTransactions.reduce((acc: number, tx: any) => acc + Number(tx.quantity), 0);
                        const totalCost = remainingTransactions.reduce((acc: number, tx: any) => acc + (Number(tx.quantity) * Number(tx.price)), 0);
                        const newAveragePrice = newQuantity > 0 ? totalCost / newQuantity : 0;

                        return {
                            ...asset,
                            quantity: newQuantity,
                            averagePrice: newAveragePrice,
                            totalInvested: newQuantity * newAveragePrice,
                            transactions: remainingTransactions
                        };
                    }
                    return asset;
                }).filter(Boolean);

                set({ assets: updatedAssets });
            },

            batchImportDividends: (newDividends: any[]) => {
                const { dividends } = get();
                const processed = newDividends.map(d => ({
                    ...d,
                    id: crypto.randomUUID()
                }));
                set({ dividends: [...dividends, ...processed] });
            },

            resetDividends: () => set({ dividends: [] }),

            clearPortfolio: () => set({ assets: [], dividends: [] }),
        }),
        {
            name: 'investia-portfolio-storage',
            storage: createJSONStorage(() => localStorage),
            // Não persiste o estado de carregamento
            partialize: (state) => ({
                assets: state.assets,
                dividends: state.dividends,
                lastRefresh: state.lastRefresh
            }),
        }
    )
);