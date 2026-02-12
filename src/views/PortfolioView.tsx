import { Search, RefreshCcw, BarChart3, ChevronUp, ChevronDown, PieChart } from 'lucide-react';
import { Card } from '../components/Card';
import { usePortfolioStore } from '../store/portfolioStore';
import { useState, useMemo } from 'react';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine,
    Cell
} from 'recharts';

type SortKey = 'ticker' | 'type' | 'quantity' | 'averagePrice' | 'currentPrice' | 'totalInvested' | 'totalValue' | 'profitPercent';

export const PortfolioView = () => {
    const assets = usePortfolioStore(state => state.assets);
    const refreshPrices = usePortfolioStore(state => state.refreshPrices);
    const isLoadingPrices = usePortfolioStore(state => state.isLoadingPrices);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<string>('ALL');
    const [periodFilter, setPeriodFilter] = useState('ALL'); // '6M', '1Y', 'ALL'
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'desc' | 'asc' }>({ key: 'totalValue', direction: 'desc' });

    // Prices are refreshed globally on app mount (App.tsx)

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredAssets = useMemo(() => {
        let result = assets.filter((asset: any) => {
            const matchesSearch = asset.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
                asset.type.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = selectedType === 'ALL' || asset.type === selectedType;
            return matchesSearch && matchesType;
        });

        if (sortConfig) {
            result.sort((a: any, b: any) => {
                const aValue = (a as any)[sortConfig.key];
                const bValue = (b as any)[sortConfig.key];

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [assets, searchTerm, sortConfig, selectedType]);

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (!sortConfig || sortConfig.key !== column) return null;
        return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="ml-1 inline" /> : <ChevronDown size={14} className="ml-1 inline" />;
    };

    // Processar dados para o gráfico de barras mensais
    const chartData = useMemo(() => {
        const monthlyData: Record<string, { month: string, invested: number, result: number, sortKey: string }> = {};

        sortedAndFilteredAssets.forEach((asset: any) => {
            (asset.transactions || []).forEach((tx: any) => {
                const date = new Date(tx.date);
                let monthName = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
                let sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (monthName === 'Invalid Date' || isNaN(date.getTime())) {
                    monthName = 'TOTAL';
                    sortKey = '9999-99';
                }

                if (!monthlyData[sortKey]) {
                    monthlyData[sortKey] = { month: monthName, invested: 0, result: 0, sortKey };
                }

                const invested = tx.quantity * tx.price;
                monthlyData[sortKey].invested += invested;

                if (asset.currentPrice && asset.currentPrice > 0) {
                    const currentVal = tx.quantity * asset.currentPrice;
                    monthlyData[sortKey].result += (currentVal - invested);
                }
            });
        });

        let sorted = Object.values(monthlyData).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        if (periodFilter === '6M') {
            sorted = sorted.slice(-6);
        } else if (periodFilter === '1Y') {
            sorted = sorted.slice(-12);
        }

        return sorted;
    }, [sortedAndFilteredAssets, periodFilter]);

    return (
        <main className="w-full mx-auto px-6 py-8">
            <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Análise de Carteira</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Visão consolidada para tomadas de decisão estratégicas.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => refreshPrices("Portfolio_UI_Refresh")}
                        disabled={isLoadingPrices}
                        className={`flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-2xl font-semibold transition-all active:scale-95 ${isLoadingPrices ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <RefreshCcw size={20} className={isLoadingPrices ? 'animate-spin' : ''} />
                        {isLoadingPrices ? 'Atualizando...' : 'Atualizar Preços'}
                    </button>
                </div>
            </section>

            {/* Gráfico de Aportes e Resultados */}
            <Card className="mb-10 p-6" delay={0.1}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <BarChart3 className="text-blue-400" size={24} />
                        Evolução por Mês de Aporte
                    </h2>
                    <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
                        {[
                            { id: '6M', label: '6 Meses' },
                            { id: '1Y', label: '1 Ano' },
                            { id: 'ALL', label: 'Tudo' }
                        ].map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setPeriodFilter(p.id)}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${periodFilter === p.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }}
                            />
                            <YAxis
                                hide
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 8 }}
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                                itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}
                                labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                                formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                            <Bar
                                name="Aporte (Investido)"
                                dataKey="invested"
                                stackId="a"
                                fill="#3b82f6"
                                radius={[0, 0, 0, 0]}
                                barSize={40}
                            />
                            <Bar
                                name="Resultado (Lucro/Prej)"
                                dataKey="result"
                                stackId="a"
                                radius={[6, 6, 0, 0]}
                                barSize={40}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.result >= 0 ? '#10b981' : '#f43f5e'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card className="mb-10 min-h-[500px]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Pesquisar ativos na carteira..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm text-[var(--text-primary)]"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        {[
                            { id: 'ALL', label: 'Todos' },
                            { id: 'ACAO', label: 'Ações' },
                            { id: 'STOCK', label: 'Stocks' },
                            { id: 'FII', label: 'FIIs' },
                            { id: 'BDR', label: 'BDRs' },
                            { id: 'ETF', label: 'ETFs' }
                        ].map(type => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`px-4 py-2 text-xs font-black rounded-xl transition-all border whitespace-nowrap ${selectedType === type.id
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar -mx-6 px-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="text-[var(--text-secondary)] text-xs sticky top-0 bg-[var(--bg-deep)] z-20">
                                    <th onClick={() => handleSort('ticker')} className="pb-4 font-black uppercase tracking-[0.1em] cursor-pointer hover:text-blue-500 transition-colors bg-[var(--bg-deep)] border-b border-[var(--border-subtle)]">
                                        Ativo <SortIcon column="ticker" />
                                    </th>
                                    <th onClick={() => handleSort('type')} className="pb-4 font-black uppercase tracking-[0.1em] cursor-pointer hover:text-blue-500 transition-colors bg-[var(--bg-deep)] border-b border-[var(--border-subtle)]">
                                        Tipo <SortIcon column="type" />
                                    </th>
                                    <th onClick={() => handleSort('quantity')} className="pb-4 font-black uppercase tracking-[0.1em] text-right cursor-pointer hover:text-blue-500 transition-colors bg-[var(--bg-deep)] border-b border-[var(--border-subtle)]">
                                        Qtd <SortIcon column="quantity" />
                                    </th>
                                    <th onClick={() => handleSort('averagePrice')} className="pb-4 font-black uppercase tracking-[0.1em] text-right cursor-pointer hover:text-blue-500 transition-colors bg-[var(--bg-deep)] border-b border-[var(--border-subtle)]">
                                        P. Médio <SortIcon column="averagePrice" />
                                    </th>
                                    <th onClick={() => handleSort('currentPrice')} className="pb-4 font-black uppercase tracking-[0.1em] text-right cursor-pointer hover:text-blue-500 transition-colors bg-[var(--bg-deep)] border-b border-[var(--border-subtle)]">
                                        Cotação <SortIcon column="currentPrice" />
                                    </th>
                                    <th onClick={() => handleSort('totalInvested')} className="pb-4 font-black uppercase tracking-[0.1em] text-right cursor-pointer hover:text-blue-500 transition-colors bg-[var(--bg-deep)] border-b border-[var(--border-subtle)]">
                                        Investido <SortIcon column="totalInvested" />
                                    </th>
                                    <th onClick={() => handleSort('totalValue')} className="pb-4 font-black uppercase tracking-[0.1em] text-right cursor-pointer hover:text-blue-500 transition-colors bg-[var(--bg-deep)] border-b border-[var(--border-subtle)]">
                                        V. Atual <SortIcon column="totalValue" />
                                    </th>
                                    <th onClick={() => handleSort('profitPercent')} className="pb-4 font-black uppercase tracking-[0.1em] text-right cursor-pointer hover:text-blue-500 transition-colors bg-[var(--bg-deep)] border-b border-[var(--border-subtle)]">
                                        Retorno <SortIcon column="profitPercent" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {sortedAndFilteredAssets.length > 0 ? sortedAndFilteredAssets.map((asset: any) => (
                                    <tr key={asset.ticker} className="group hover:bg-white/[0.02] transition-colors border-b border-[var(--border-subtle)] last:border-0">
                                        <td className="py-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-lg text-[var(--text-primary)] group-hover:text-blue-500 transition-colors uppercase tracking-tighter">{asset.ticker}</span>
                                            </div>
                                        </td>
                                        <td className="py-6">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase border ${asset.type === 'ACAO' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' :
                                                asset.type === 'FII' ? 'bg-blue-500/5 text-blue-400 border-blue-500/20' :
                                                    'bg-slate-500/5 text-slate-400 border-slate-500/20'
                                                }`}>
                                                {asset.type === 'ACAO' ? 'Ação' :
                                                    asset.type === 'STOCK' ? 'Stock' :
                                                        asset.type === 'FII' ? 'FII' :
                                                            asset.type === 'BDR' ? 'BDR' :
                                                                asset.type === 'ETF' ? 'ETF' : asset.type}
                                            </span>
                                        </td>
                                        <td className="py-5 text-right font-mono text-slate-300">
                                            {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 }).format(asset.quantity)}
                                        </td>
                                        <td className="py-6 text-right font-mono text-slate-400 italic">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(asset.averagePrice)}
                                        </td>
                                        <td className="py-6 text-right font-mono text-[var(--text-primary)] font-black text-base">
                                            {(asset.currentPrice && asset.currentPrice > 0)
                                                ? (
                                                    <div className="flex flex-col items-end">
                                                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(asset.currentPrice)}</span>
                                                        {asset.type === 'STOCK' && asset.originalCurrentPrice > 0 && (
                                                            <div className="flex items-center gap-1 mt-1 opacity-80">
                                                                <span className="text-[10px] text-blue-300 font-bold">
                                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(asset.originalCurrentPrice)}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {asset.changePercent !== undefined && (
                                                            <span className={`text-[9px] font-black ${asset.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                {asset.changePercent > 0 ? '▲' : '▼'} {Math.abs(asset.changePercent).toFixed(2)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                                : '--'}
                                        </td>
                                        <td className="py-6 text-right font-mono text-slate-400">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(asset.totalInvested)}
                                        </td>
                                        <td className="py-6 text-right font-mono text-blue-400 font-black">
                                            <div className="flex flex-col items-end">
                                                <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(asset.totalValue || (asset.quantity * (asset.currentPrice || 0)))}</span>
                                                {asset.type === 'STOCK' && asset.originalCurrentPrice > 0 && (
                                                    <span className="text-[10px] text-blue-300/70 font-bold mt-1">
                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(asset.quantity * asset.originalCurrentPrice)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-6 text-right font-mono">
                                            <div className={`flex flex-col items-end gap-0.5 ${(asset.profitPercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                <span className="font-black text-sm">{(asset.profitPercent || 0) > 0 ? '+' : ''}{(asset.profitPercent || 0).toFixed(2)}%</span>
                                                <span className="text-[10px] font-bold opacity-70">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((asset.totalValue || 0) - asset.totalInvested)}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-4 opacity-30">
                                                <PieChart size={48} />
                                                <p className="font-medium text-lg">Sua carteira está vazia. Vá em "Lançamentos" para começar.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </main>
    );
};
