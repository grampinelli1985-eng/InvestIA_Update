import { useState, useMemo } from 'react';

import { Wallet, BarChart3, PieChart, Activity, TrendingUp, Filter, Search } from 'lucide-react';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { AddAssetModal } from '../components/AddAssetModal';
import { ImportAssetsModal } from '../components/ImportAssetsModal';

import { usePortfolioStore } from '../store/portfolioStore';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart as RePieChart,
    Pie,
    Cell
} from 'recharts';

const COLORS = ['#3f83f8', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

export const DashboardView = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [tickerFilter, setTickerFilter] = useState<string>('ALL');
    const assets = usePortfolioStore(state => state.assets);
    const isLoadingPrices = usePortfolioStore(state => state.isLoadingPrices);
    const [periodFilter, setPeriodFilter] = useState('ALL');

    const filteredAssets = useMemo(() => {
        return assets.filter((asset: any) => {
            const matchesType = typeFilter === 'ALL' || asset.type === typeFilter;
            const matchesTicker = tickerFilter === 'ALL' || asset.ticker === tickerFilter;
            return matchesType && matchesTicker;
        });
    }, [assets, typeFilter, tickerFilter]);

    const availableTickers = useMemo(() => {
        const tickers = assets
            .filter((asset: any) => typeFilter === 'ALL' || asset.type === typeFilter)
            .map((a: any) => a.ticker)
            .sort();
        return Array.from(new Set(tickers));
    }, [assets, typeFilter]);

    const totalInvested = useMemo(() => filteredAssets.reduce((acc: number, asset: any) => acc + (asset.totalInvested || 0), 0), [filteredAssets]);

    const totalMarketValue = useMemo(() => filteredAssets.reduce((acc: number, asset: any) => {
        const curPrice = asset.currentPrice || asset.averagePrice || 0;
        return acc + (Number(asset.quantity || 0) * curPrice);
    }, 0), [filteredAssets]);

    const totalProfit = totalMarketValue - totalInvested;
    const profitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;



    // Real data for evolution chart
    const evolutionData = useMemo(() => {
        if (filteredAssets.length === 0) return [];

        const monthlyTotals: Record<string, number> = {};

        filteredAssets.forEach((asset: any) => {
            (asset.transactions || []).forEach((tx: any) => {
                const date = new Date(tx.date);
                if (isNaN(date.getTime())) return;
                const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                // Valor do aporte + resultado proporcional atual (melhor aproximação sem histórico de preços)
                const invested = Number(tx.quantity || 0) * Number(tx.price || 0);
                const currentPrice = Number(asset.currentPrice || asset.averagePrice || 0);
                const result = (Number(tx.quantity || 0) * currentPrice) - invested;
                const totalValue = invested + result;

                monthlyTotals[sortKey] = (monthlyTotals[sortKey] || 0) + totalValue;
            });
        });

        const sortedKeys = Object.keys(monthlyTotals).sort();
        let cumulativeValue = 0;
        let dataList = sortedKeys.map(key => {
            const [year, month] = key.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            cumulativeValue += monthlyTotals[key];

            const monthShort = date.toLocaleString('pt-BR', { month: 'short' });
            const name = sortedKeys.length > 12 ? `${monthShort}/${year.slice(2)}` : monthShort;

            return {
                name,
                value: cumulativeValue,
                sortKey: key
            };
        });

        if (periodFilter === '1M') dataList = dataList.slice(-1);
        else if (periodFilter === '6M') dataList = dataList.slice(-6);
        else if (periodFilter === '1Y') dataList = dataList.slice(-12);

        return dataList;
    }, [filteredAssets, periodFilter]);

    // Allocation data (using Market Value)
    const allocationData = useMemo(() => {
        const data = filteredAssets.reduce((acc: any[], asset: any) => {
            const curPrice = asset.currentPrice || asset.averagePrice || 0;
            const value = Number(asset.quantity || 0) * curPrice;
            const typeLabel = asset.type === 'ACAO' ? 'Ações' :
                asset.type === 'STOCK' ? 'Stocks' :
                    asset.type === 'FII' ? 'FIIs' :
                        asset.type === 'BDR' ? 'BDRs' :
                            asset.type === 'ETF' ? 'ETFs' :
                                asset.type === 'CRYPTO' ? 'Criptos' : asset.type;

            const existing = acc.find(item => item.name === typeLabel);
            if (existing) {
                existing.value += value;
            } else {
                acc.push({ name: typeLabel, value });
            }
            return acc;
        }, []);

        // Sort by value descending
        return data.sort((a: any, b: any) => b.value - a.value);
    }, [filteredAssets]);

    const hasAssets = filteredAssets.length > 0;

    return (
        <main className="w-full mx-auto px-6 py-8">
            {isModalOpen && <AddAssetModal onClose={() => setIsModalOpen(false)} />}
            {isImportModalOpen && <ImportAssetsModal onClose={() => setIsImportModalOpen(false)} />}

            {/* Header Section */}
            <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">Investia Dashboard</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Sua carteira inteligente, automatizada por IA.</p>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-wrap items-center gap-4 glass p-4 rounded-3xl">
                    <div className="flex items-center gap-3">
                        <Filter size={18} className="text-blue-400" />
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setTickerFilter('ALL');
                            }}
                            className="bg-transparent text-sm font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer hover:text-blue-500 transition-colors"
                        >
                            <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Todos os Tipos</option>
                            <option value="ACAO" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Ações</option>
                            <option value="FII" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">FIIs</option>
                            <option value="BDR" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">BDRs</option>
                            <option value="ETF" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">ETFs</option>
                            <option value="STOCK" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Stocks</option>
                            <option value="CRYPTO" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Criptos</option>
                        </select>
                    </div>

                    <div className="w-px h-6 bg-white/10" />

                    <div className="flex items-center gap-3">
                        <Search size={18} className="text-emerald-400" />
                        <select
                            value={tickerFilter}
                            onChange={(e) => setTickerFilter(e.target.value)}
                            className="bg-transparent text-sm font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer hover:text-emerald-500 transition-colors"
                            disabled={availableTickers.length === 0}
                        >
                            <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Todos os Ativos</option>
                            {availableTickers.map((ticker: any) => (
                                <option key={ticker} value={ticker} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{ticker}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                <Card delay={0.1}>
                    <StatCard
                        label="Valor Investido"
                        value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInvested)}
                        icon={<Wallet size={24} className="text-blue-400" />}
                        subValue="Custo total de aquisição"
                    />
                </Card>

                <Card delay={0.2}>
                    <StatCard
                        label="Valor Total da Carteira"
                        value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMarketValue)}
                        icon={<PieChart size={24} className="text-emerald-400" />}
                        trend={profitPercent || 0}
                        subValue={isLoadingPrices ? 'Atualizando preços...' : `${assets.length} ativos ativos`}
                    />
                </Card>

                <Card delay={0.3}>
                    <StatCard
                        label="Resultado Total"
                        value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalProfit)}
                        icon={<TrendingUp size={24} className={(totalProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'} />}
                        subValue={(totalProfit || 0) >= 0 ? 'Lucro acumulado' : 'Prejuízo acumulado'}
                        trend={profitPercent || 0}
                    />
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                {/* Performance Chart */}
                <Card className="lg:col-span-2 min-h-[400px] flex flex-col" delay={0.5}>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Activity className="text-blue-400" size={20} />
                            Evolução Patrimonial
                        </h2>
                        <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
                            {['1M', '6M', '1Y', 'ALL'].map((period) => (
                                <button
                                    key={period}
                                    onClick={() => setPeriodFilter(period)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${period === periodFilter ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {period}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-[300px]">
                        {hasAssets ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={evolutionData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--card-bg)',
                                            borderRadius: '16px',
                                            border: '1px solid var(--border-subtle)',
                                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                        itemStyle={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 'bold' }}
                                        formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 border-2 border-dashed border-white/5 rounded-3xl">
                                <BarChart3 size={40} className="opacity-20" />
                                <p>Adicione ativos para ver sua evolução</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Assets Allocation */}
                <Card className="flex flex-col" delay={0.6}>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <PieChart className="text-emerald-400" size={20} />
                            Alocação
                        </h2>
                    </div>

                    <div className="flex-1 w-full min-h-[200px]">
                        {hasAssets ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                        data={allocationData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {allocationData.map((_entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--card-bg)',
                                            borderRadius: '16px',
                                            border: '1px solid var(--border-subtle)',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                        formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                                    />
                                </RePieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500 border-2 border-dashed border-white/5 rounded-3xl">
                                Nenhum dado
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 mt-6 overflow-y-auto max-h-[400px] custom-scrollbar">
                        {hasAssets ? allocationData.map((item: any, i: number) => (
                            <div key={item.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className="text-sm font-medium text-slate-300">{item.name}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold">{((item.value / totalMarketValue) * 100).toFixed(2)}%</div>
                                    <div className="text-[10px] text-slate-500">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-xs text-slate-500">Sua distribuição por tipos aparecerá aqui.</p>
                        )}
                    </div>
                </Card>
            </div>


        </main>
    );
};
