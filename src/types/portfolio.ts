export type AssetType = 'STOCK' | 'FII' | 'ETF' | 'BDR' | 'ACAO' | 'CRYPTO';

export interface Transaction {
    id: string;
    ticker: string;
    type: 'BUY'; // Initial focus on BUY for average price
    quantity: number;
    price: number;
    date: string;
}

export interface Asset {
    ticker: string;
    type: AssetType;
    quantity: number;
    averagePrice: number;
    totalInvested: number;
    currentPrice: number;    // Added for real-time tracking
    profitPercent: number;  // Added for real-time tracking
    totalValue: number;     // Added for real-time tracking (market value)
    pe?: number;            // P/L
    pb?: number;            // P/VP
    roe?: number;           // ROE
    marketCap?: number;     // Valor de Mercado
    netMargin?: number;     // Margem Líquida
    transactions: Transaction[];
}

export interface Portfolio {
    assets: Asset[];
    totalValue: number;
}
