import { LineChart, Bell, Sliders, RefreshCw } from 'lucide-react';
import { Card } from '../components/Card';
import { useState, useEffect } from 'react';
import { marketService } from '../services/marketService';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAlertStore } from '../store/alertStore';

export const PriceMonitorView = () => {
    const { assets } = usePortfolioStore();
    const {
        alerts,
        isAIMonitoringActive,
        addAlert,
        updateAlert,
        removeAlert,
        toggleAIMonitoring
    } = useAlertStore();

    const [quotes, setQuotes] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
    const [currentAlertIndex, setCurrentAlertIndex] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        ticker: '',
        target: '',
        type: 'COMPRA' as 'COMPRA' | 'VENDA'
    });

    useEffect(() => {
        const fetchMarketData = async () => {
            setIsLoading(true);
            const tickers = [...new Set([...alerts.map((a: any) => a.ticker), ...assets.map((a: any) => a.ticker)])];

            const hasUSStocks = tickers.some(t => /^[A-Z]+$/.test(t));
            if (hasUSStocks && !tickers.includes('USDBRL=X')) {
                tickers.push('USDBRL=X');
            }

            const data = await marketService.fetchQuotes(tickers);
            const dollarRate = data['USDBRL=X']?.price || 5.0;

            // Ajusta preços de US Stocks para BRL
            Object.keys(data).forEach(ticker => {
                if (/^[A-Z]+$/.test(ticker) && ticker !== 'USDBRL=X') {
                    data[ticker].price = data[ticker].price * dollarRate;
                }
            });

            setQuotes(data);
            setIsLoading(false);
        };
        fetchMarketData();
    }, [assets, alerts]);

    const calculateProgress = (a: any) => {
        const current = quotes[a.ticker]?.price;
        if (!current) return 0;

        if (a.type === 'COMPRA') {
            if (current <= a.target) return 100;
            return Math.max(0, Math.min(100, (a.target / current) * 100));
        } else {
            if (current >= a.target) return 100;
            return Math.max(0, Math.min(100, (current / a.target) * 100));
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const handleOpenModal = (mode: 'ADD' | 'EDIT', alert?: any, index?: number) => {
        setModalMode(mode);
        if (mode === 'EDIT' && alert) {
            setFormData({ ticker: alert.ticker, target: alert.target.toString(), type: alert.type });
            setCurrentAlertIndex(index ?? null);
        } else {
            setFormData({ ticker: '', target: '', type: 'COMPRA' });
            setCurrentAlertIndex(null);
        }
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const newAlert = {
            ticker: formData.ticker.toUpperCase().replace('.SA', '').trim(),
            target: parseFloat(formData.target.replace(',', '.')),
            type: formData.type
        };

        if (modalMode === 'EDIT' && currentAlertIndex !== null) {
            updateAlert(currentAlertIndex, newAlert);
        } else {
            addAlert(newAlert);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (index: number) => {
        removeAlert(index);
    };

    return (
        <main className="p-10">
            <header className="mb-12 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600 dark:text-amber-400">
                        <LineChart size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Monitor de Preços</h1>
                        <p className="text-[var(--text-secondary)] font-medium">Alertas inteligentes de entrada e saída para seus ativos.</p>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal('ADD')}
                    className="hidden md:flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-3 rounded-2xl font-black transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                >
                    <Bell size={18} fill="currentColor" />
                    NOVO ALERTA
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {alerts.map((a, idx) => {
                    const progress = calculateProgress(a);
                    const currentPrice = quotes[a.ticker]?.price;

                    return (
                        <Card key={a.ticker} delay={idx * 0.1} className="group border border-[var(--border-subtle)] bg-[var(--card-bg)] shadow-sm hover:shadow-lg transition-all">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center font-black text-[var(--text-primary)] relative">
                                        {a.ticker.substring(0, 1)}
                                        <div className={`absolute -bottom-1 -right-1 p-1 rounded-lg text-slate-950 ${progress === 100 ? 'bg-emerald-500 animate-bounce' : 'bg-amber-500'}`}>
                                            <Bell size={12} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-black text-[var(--text-primary)]">{a.ticker}</h3>
                                            {isLoading && <RefreshCw size={12} className="animate-spin text-[var(--text-secondary)]" />}
                                        </div>
                                        <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${a.type === 'COMPRA' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                            ALERTA DE {a.type}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Alvo</p>
                                    <p className="text-xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(a.target)}</p>
                                    <p className="text-[10px] text-[var(--text-secondary)] opacity-60 font-bold uppercase tracking-tighter">Atual: {currentPrice ? formatCurrency(currentPrice) : '---'}</p>
                                </div>
                            </div>

                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-[10px] font-black text-[var(--text-secondary)] uppercase">
                                    <span>Distância do Alvo</span>
                                    <span className={progress === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text-primary)]"}>
                                        {progress === 100 ? 'ALVO ATINGIDO' : `${progress.toFixed(0)}%`}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${progress === 100 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleOpenModal('EDIT', a, idx)}
                                    className="flex-1 py-3 bg-[var(--bg-deep)] hover:bg-[var(--border-subtle)] text-xs font-black text-[var(--text-secondary)] rounded-xl transition-all border border-[var(--border-subtle)]"
                                >
                                    EDITAR
                                </button>
                                <button
                                    onClick={() => handleDelete(idx)}
                                    className="flex-1 py-3 bg-[var(--bg-deep)] hover:bg-rose-500/10 text-xs font-black text-[var(--text-secondary)] hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-all border border-[var(--border-subtle)]"
                                >
                                    DESATIVAR
                                </button>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <Card className="border-2 border-dashed border-[var(--border-subtle)] bg-transparent py-20 text-center rounded-[3rem]">
                <Sliders size={48} className="mx-auto text-[var(--text-secondary)] opacity-20 mb-6" />
                <h3 className="text-2xl font-black text-[var(--text-primary)] mb-2 uppercase tracking-tighter brand-font">Configure Monitor Automático</h3>
                <p className="text-[var(--text-secondary)] max-w-sm mx-auto mb-10 text-sm font-medium">
                    Nossa IA pode monitorar variações de preço, volume e indicadores técnicos (RSI, Médias Móveis) para você.
                </p>
                <button
                    onClick={toggleAIMonitoring}
                    className={`px-10 py-4 font-black rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs ${isAIMonitoringActive
                        ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                        : 'bg-blue-600 text-white shadow-blue-600/20 hover:scale-105'
                        }`}
                >
                    {isAIMonitoringActive ? 'MONITORIA IA ATIVA' : 'ATIVAR MONITORIA IA'}
                </button>
            </Card>

            {/* Modal de Alerta */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <Card className="relative w-full max-w-md bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-2xl p-10 rounded-[2.5rem]">
                        <h2 className="text-2xl font-black text-[var(--text-primary)] mb-8 uppercase tracking-tighter brand-font">
                            {modalMode === 'ADD' ? 'Novo Alerta' : 'Editar Alerta'}
                        </h2>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase mb-2 tracking-widest opacity-70">Ticker do Ativo</label>
                                <input
                                    required
                                    className="w-full bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-bold outline-none focus:border-amber-500 transition-colors"
                                    placeholder="Ex: PETR4"
                                    value={formData.ticker}
                                    onChange={e => setFormData({ ...formData, ticker: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase mb-2 tracking-widest opacity-70">Preço Alvo</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-bold outline-none focus:border-amber-500 transition-colors"
                                    placeholder="0,00"
                                    value={formData.target}
                                    onChange={e => setFormData({ ...formData, target: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase mb-2 tracking-widest opacity-70">Tipo de Alerta</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'COMPRA' })}
                                        className={`py-3 rounded-xl font-black text-xs transition-all ${formData.type === 'COMPRA' ? 'bg-emerald-500 text-slate-950' : 'bg-[var(--bg-deep)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'}`}
                                    >
                                        COMPRA
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'VENDA' })}
                                        className={`py-3 rounded-xl font-black text-xs transition-all ${formData.type === 'VENDA' ? 'bg-rose-500 text-slate-950' : 'bg-[var(--bg-deep)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'}`}
                                    >
                                        VENDA
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 bg-[var(--bg-deep)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-black rounded-2xl transition-all uppercase tracking-widest text-[10px]"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 transition-all uppercase tracking-widest text-[10px]"
                                >
                                    SALVAR
                                </button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </main>
    );
};
