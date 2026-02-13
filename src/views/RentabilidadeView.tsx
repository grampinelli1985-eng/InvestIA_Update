import { useState, useMemo } from 'react';
import {
    TrendingUp,
    Download,
    FileUp,
    RotateCcw,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    Search
} from 'lucide-react';
import { Card } from '../components/Card';
import { usePortfolioStore } from '../store/portfolioStore';
import { csvService } from '../services/csvService';
import { ImportDividendsModal } from '../components/ImportDividendsModal';
import { ConfirmModal } from '../components/ConfirmModal';

export const RentabilidadeView = () => {
    const assets = usePortfolioStore(state => state.assets);
    const dividends = usePortfolioStore(state => state.dividends);
    const resetDividends = usePortfolioStore(state => state.resetDividends);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

    const profitabilityData = useMemo(() => {
        return assets.map((asset: any) => {
            const tickerDividends = dividends
                .filter((d: any) => d.ticker === asset.ticker)
                .reduce((acc: number, d: any) => acc + d.totalNet, 0);

            const totalInvested = asset.totalInvested || 0;
            const currentValue = asset.totalValue || 0;
            const totalGain = (currentValue + tickerDividends) - totalInvested;
            const roi = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

            return {
                ticker: asset.ticker,
                type: asset.type,
                totalInvested,
                currentValue,
                dividends: tickerDividends,
                totalGain,
                roi
            };
        }).sort((a: any, b: any) => b.roi - a.roi);
    }, [assets, dividends]);

    const filteredData = profitabilityData.filter((d: any) =>
        d.ticker.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totals = useMemo(() => {
        return profitabilityData.reduce((acc: any, d: any) => ({
            invested: acc.invested + d.totalInvested,
            current: acc.current + d.currentValue,
            dividends: acc.dividends + d.dividends,
            gain: acc.gain + d.totalGain
        }), { invested: 0, current: 0, dividends: 0, gain: 0 });
    }, [profitabilityData]);

    const totalRoi = totals.invested > 0 ? (totals.gain / totals.invested) * 100 : 0;

    return (
        <main className="w-full mx-auto px-6 py-8 animate-in fade-in duration-500">
            {isImportModalOpen && <ImportDividendsModal onClose={() => setIsImportModalOpen(false)} />}

            <ConfirmModal
                isOpen={isResetConfirmOpen}
                onClose={() => setIsResetConfirmOpen(false)}
                onConfirm={() => {
                    resetDividends();
                    setIsResetConfirmOpen(false);
                }}
                title="Resetar Dividendos"
                message="Tem certeza que deseja apagar todos os dividendos importados? Esta ação não pode ser desfeita e afetará o cálculo da rentabilidade."
                confirmText="Resetar Agora"
            />

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight brand-font">Rentabilidade</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Visão integrada de valorização e dividendos recebidos.</p>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 flex-nowrap overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                    <button
                        onClick={() => csvService.downloadDividendTemplate()}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[var(--card-bg)] hover:bg-white/10 border border-[var(--border-subtle)] px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 whitespace-nowrap"
                    >
                        <Download size={16} className="shrink-0" />
                        <span className="hidden xs:inline">Modelo CSV</span>
                        <span className="xs:hidden">Modelo</span>
                    </button>
                    <button
                        onClick={() => setIsResetConfirmOpen(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 whitespace-nowrap"
                    >
                        <RotateCcw size={16} className="shrink-0" />
                        <span className="hidden xs:inline">Resetar Dividendos</span>
                        <span className="xs:hidden">Resetar</span>
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex-[2] sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 active:scale-95 whitespace-nowrap"
                    >
                        <FileUp size={16} className="shrink-0" />
                        Importar Dividendos
                    </button>
                </div>
            </header>

            {/* Resumo de Rentabilidade Geral */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <Card className="border-l-4 border-blue-500">
                    <div className="flex items-center gap-4 mb-2 opacity-60">
                        <TrendingUp size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Total Investido</span>
                    </div>
                    <p className="text-2xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.invested)}</p>
                </Card>

                <Card className="border-l-4 border-emerald-500">
                    <div className="flex items-center gap-4 mb-2 opacity-60">
                        <DollarSign size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Total em Dividendos</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.dividends)}</p>
                </Card>

                <Card className="border-l-4 border-indigo-500">
                    <div className="flex items-center gap-4 mb-2 opacity-60">
                        <PieChart size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Valor Atual + Proventos</span>
                    </div>
                    <p className="text-2xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.current + totals.dividends)}</p>
                </Card>

                <Card className={`border-l-4 ${totals.gain >= 0 ? 'border-emerald-500' : 'border-rose-500'}`}>
                    <div className="flex items-center gap-4 mb-2 opacity-60">
                        {totals.gain >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">Resultado Total (ROI)</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-2xl font-black ${totals.gain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {totalRoi.toFixed(2)}%
                        </p>
                        <span className="text-xs opacity-60 font-medium">({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.gain)})</span>
                    </div>
                </Card>
            </div>

            {/* Tabela de Rentabilidade por Ativo */}
            <Card>
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold flex items-center gap-3">
                        Desempenho por Ativo
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded text-slate-500 font-black tracking-widest uppercase">
                            {filteredData.length} ativos
                        </span>
                    </h2>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Pesquisar ticker..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        />
                    </div>
                </div>

                <div className="max-h-[calc(100vh-420px)] overflow-y-auto custom-scrollbar -mx-6 px-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-[0.2em] sticky top-0 bg-[var(--card-bg)] z-30">
                                    <th className="pb-6 pl-4 border-b border-white/5 bg-[var(--card-bg)]">Ativo</th>
                                    <th className="pb-6 border-b border-white/5 text-right bg-[var(--card-bg)]">Valor Investido</th>
                                    <th className="pb-6 border-b border-white/5 text-right bg-[var(--card-bg)]">Valor Atual</th>
                                    <th className="pb-6 border-b border-white/5 text-right bg-[var(--card-bg)]">Dividendos</th>
                                    <th className="pb-6 border-b border-white/5 text-right bg-[var(--card-bg)]">Lucro/Prejuízo</th>
                                    <th className="pb-6 pr-4 border-b border-white/5 text-right bg-[var(--card-bg)]">Rentabilidade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredData.length > 0 ? filteredData.map((d: any) => (
                                    <tr key={d.ticker} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 pl-4">
                                            <div className="flex flex-col">
                                                <span className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">{d.ticker}</span>
                                                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{d.type}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-right font-mono text-xs text-slate-400">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.totalInvested)}
                                        </td>
                                        <td className="py-4 text-right font-mono text-xs text-slate-400">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.currentValue)}
                                        </td>
                                        <td className="py-4 text-right font-mono text-xs text-emerald-500 font-bold">
                                            {d.dividends > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.dividends) : '--'}
                                        </td>
                                        <td className={`py-4 text-right font-mono text-xs font-bold ${d.totalGain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.totalGain)}
                                        </td>
                                        <td className="py-4 pr-4 text-right">
                                            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-black border ${d.roi >= 0
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                                : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                                }`}>
                                                {d.roi >= 0 ? '+' : ''}{d.roi.toFixed(2)}%
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center opacity-30">
                                            <div className="flex flex-col items-center gap-4">
                                                <PieChart size={48} />
                                                <p className="font-bold uppercase tracking-widest text-sm">Nenhum dado para exibir</p>
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
