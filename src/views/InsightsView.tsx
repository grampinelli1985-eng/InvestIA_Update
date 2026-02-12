import { Sparkles, AlertTriangle, Lightbulb, CheckCircle2, TrendingUp, ShieldCheck, DollarSign, BarChart3, ArrowRight } from 'lucide-react';
import { Card } from '../components/Card';
import { usePortfolioStore } from '../store/portfolioStore';
import { useNavigationStore } from '../store/navigationStore';
import { useState, useEffect } from 'react';
import { aiService, AIInsight, AISuggestedStep, AppView } from '../services/aiService';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart,
    Bar,
    XAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

export const InsightsView = () => {
    const { assets } = usePortfolioStore();
    const { setCurrentView } = useNavigationStore();
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [steps, setSteps] = useState<AISuggestedStep[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showRebalanceDetails, setShowRebalanceDetails] = useState(false);
    const [rebalanceData, setRebalanceData] = useState<{ winners: any[], laggards: any[] }>({ winners: [], laggards: [] });
    const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');

    const categoryLabels: Record<string, string> = {
        'TODOS': 'Todos',
        'ACAO': 'Ações',
        'STOCK': 'Stocks/US',
        'FII': 'FIIs',
        'ETF': 'ETFs',
        'BDR': 'BDRs',
        'CRYPTO': 'Cripto'
    };

    const availableCategories = ['TODOS', ...Array.from(new Set(assets.map((a: any) => a.type)))] as string[];

    // Atualiza os dados de rebalanceamento quando a categoria muda
    useEffect(() => {
        const filteredAssets = selectedCategory === 'TODOS'
            ? assets
            : assets.filter((a: any) => a.type === selectedCategory);

        const winnerAssets = filteredAssets
            .filter((a: any) => (a.profitPercent || 0) >= 30)
            .sort((a: any, b: any) => (b.profitPercent || 0) - (a.profitPercent || 0));

        const winners = winnerAssets.map((a: any) => {
            const total = a.totalValue || 0;
            const sugestaoVenda = total * 0.2;
            return {
                name: a.ticker,
                investido: a.totalInvested || 0,
                lucro: (a.totalValue || 0) - (a.totalInvested || 0),
                total,
                percent: a.profitPercent || 0,
                sugestaoVenda
            };
        });

        const laggardAssets = filteredAssets.filter((a: any) => (a.profitPercent || 0) < 5);
        const laggards = laggardAssets.map((a: any) => {
            const percentualAporte = laggardAssets.length > 0 ? (100 / laggardAssets.length) : 0;
            return {
                name: a.ticker,
                investido: a.totalInvested || 0,
                lucro: (a.totalValue || 0) - (a.totalInvested || 0),
                total: a.totalValue || 0,
                percent: a.profitPercent || 0,
                percentualAporte
            };
        });

        setRebalanceData({ winners, laggards });
    }, [selectedCategory, assets, showRebalanceDetails]);

    useEffect(() => {
        const runAIAnalysis = async () => {
            setIsAnalyzing(true);
            const [insightsData, stepsData] = await Promise.all([
                aiService.analyzePortfolio(assets),
                aiService.getSuggestedSteps(assets)
            ]);
            setInsights(insightsData);
            setSteps(stepsData);
            setIsAnalyzing(false);
        };
        runAIAnalysis();
    }, [assets]);

    const getStepIcon = (iconName: string) => {
        switch (iconName) {
            case 'chart': return <BarChart3 className="text-blue-400" size={20} />;
            case 'money': return <DollarSign className="text-emerald-400" size={20} />;
            case 'trend': return <TrendingUp className="text-purple-400" size={20} />;
            case 'shield': return <ShieldCheck className="text-amber-400" size={20} />;
            default: return <Lightbulb className="text-blue-400" size={20} />;
        }
    };

    const handleAction = (insight: AIInsight) => {
        if (insight.title === 'Oportunidade de Rebalanceamento') {
            setShowRebalanceDetails(true);
            return;
        }

        if (insight.targetView) {
            setCurrentView(insight.targetView);
        }
    };

    const handleStepAction = (targetView?: AppView) => {
        if (targetView) {
            setCurrentView(targetView);
        }
    };

    return (
        <main className="w-full mx-auto px-6 py-8">
            <section className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                    <Sparkles className="text-amber-500 dark:text-amber-400" size={32} />
                    <h1 className="text-3xl font-bold tracking-tight">Insights de IA</h1>
                </div>
                <p className="text-[var(--text-secondary)]">Análise profunda da sua estratégia de investimentos processada por nossos modelos.</p>
            </section>

            {isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-24 grayscale opacity-50">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full" />
                        <div className="absolute top-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="mt-6 text-slate-400 font-medium animate-pulse tracking-wide uppercase text-xs">Consultando oráculo financeiro...</p>
                </div>
            )}

            {!isAnalyzing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {insights.length > 0 ? insights.map((insight, idx) => (
                        <Card
                            key={idx}
                            delay={idx * 0.1}
                            className="relative overflow-hidden group border border-[var(--border-subtle)] bg-[var(--card-bg)] shadow-sm"
                            style={{
                                borderLeft: `6px solid ${insight.type === 'WARNING' ? '#ef4444' :
                                    insight.type === 'SUCCESS' ? '#10b981' : '#3b82f6'
                                    }`
                            }}
                        >
                            <div className="flex items-start gap-6 pb-4">
                                <div className={`p-4 rounded-2xl ${insight.type === 'WARNING' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                                    insight.type === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                        'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    }`}>
                                    {insight.type === 'WARNING' ? <AlertTriangle size={24} /> : insight.type === 'SUCCESS' ? <CheckCircle2 size={24} /> : <Lightbulb size={24} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${insight.type === 'WARNING' ? 'text-rose-600 dark:text-rose-400' :
                                            insight.type === 'SUCCESS' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                                            }`}>
                                            {insight.type === 'WARNING' ? 'Atenção Crítica' : insight.type === 'SUCCESS' ? 'Otimização' : 'Sugestão Profissional'}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-[var(--text-secondary)] opacity-30 mr-1" />
                                            <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-tighter">IA Insight</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {insight.title}
                                    </h3>
                                    <p className="text-[var(--text-secondary)] leading-relaxed text-sm">
                                        {insight.message}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                                <button
                                    onClick={() => handleAction(insight)}
                                    className="flex items-center gap-2 text-xs font-black text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity bg-blue-500/5 px-4 py-2.5 rounded-xl group/btn"
                                >
                                    APLICAR ESTRATÉGIA
                                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                                <div className="flex gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/20" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/30" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60" />
                                </div>
                            </div>
                        </Card>
                    )) : (
                        <Card className="col-span-full py-24 text-center flex flex-col items-center gap-4 bg-white/[0.01] border-dashed border-white/10">
                            <div className="p-6 bg-slate-800/50 rounded-full mb-2">
                                <Lightbulb size={48} className="text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Análise em Espera</h3>
                            <p className="text-slate-500 max-w-sm mb-6">
                                Sua carteira ainda não possui dados suficientes para gerar insights avançados. Adicione mais de 3 ativos para começar a análise profissional.
                            </p>
                            <button
                                onClick={() => setCurrentView('transactions')}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
                            >
                                Adicionar Primeros Ativos
                            </button>
                        </Card>
                    )}
                </div>
            )}

            {/* Modal Rebalanceamento */}
            <AnimatePresence>
                {showRebalanceDetails && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                            onClick={() => setShowRebalanceDetails(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-6xl glass border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="flex items-center justify-between p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-deep)]">
                                <div>
                                    <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter brand-font">Plano de Rebalanceamento</h2>
                                    <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase mt-1 tracking-widest opacity-70">Análise de Realização de Lucro e Alocação Estratégica</p>
                                </div>
                                <button
                                    onClick={() => setShowRebalanceDetails(false)}
                                    className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-slate-400"
                                >
                                    <ArrowRight className="rotate-180" size={24} />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10 bg-[var(--bg-deep)]/50">
                                {/* Category Filter Bar */}
                                <div className="flex flex-wrap items-center gap-3 p-2 bg-white/5 rounded-3xl border border-white/10">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-4">Filtrar por:</span>
                                    {availableCategories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            {categoryLabels[cat] || cat}
                                        </button>
                                    ))}
                                </div>

                                {/* Winners & Laggards Grid */}
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                                    {/* Winners Column */}
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                                                    <TrendingUp size={18} />
                                                </div>
                                                <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-primary)]">Vendedores (Lucro {'>'} 30%)</h3>
                                            </div>
                                            <span className="text-[10px] font-bold text-[var(--text-secondary)]">{rebalanceData.winners.length} Ativos</span>
                                        </div>

                                        <div className="glass-card p-6 rounded-3xl border border-[var(--border-subtle)] shadow-sm h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={rebalanceData.winners}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 'bold' }} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-subtle)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                        itemStyle={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 'bold' }}
                                                        formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                                                    />
                                                    <Bar dataKey="investido" name="Investido" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                                                    <Bar dataKey="lucro" name="Lucro" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {rebalanceData.winners.map((item, i) => (
                                                <div key={i} className="flex flex-col gap-2 p-4 bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl hover:border-emerald-500/30 transition-all shadow-sm group">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-black text-[var(--text-primary)]">{item.name}</span>
                                                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/10">+{item.percent.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <span className="text-[9px] text-[var(--text-secondary)] uppercase font-black tracking-widest opacity-60">Sugestão: </span>
                                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-tight">
                                                            Vender {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.sugestaoVenda)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Laggards Column */}
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                                                    <AlertTriangle size={18} />
                                                </div>
                                                <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-primary)]">Oportunidades (Atrasados)</h3>
                                            </div>
                                            <span className="text-[10px] font-bold text-[var(--text-secondary)]">{rebalanceData.laggards.length} Ativos</span>
                                        </div>

                                        <div className="glass-card p-6 rounded-3xl border border-[var(--border-subtle)] shadow-sm h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={rebalanceData.laggards}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 'bold' }} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-subtle)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                        itemStyle={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 'bold' }}
                                                        formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                                                    />
                                                    <Bar dataKey="investido" name="Investido" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                                                    <Bar dataKey="lucro" name="Prejuízo" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {rebalanceData.laggards.length > 0 ? rebalanceData.laggards.map((item, i) => (
                                                <div key={i} className="flex flex-col gap-2 p-4 bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl hover:border-blue-500/30 transition-all shadow-sm group">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-black text-[var(--text-primary)]">{item.name}</span>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${item.percent < 0
                                                            ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/10'
                                                            : 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/10'}`}>
                                                            {item.percent.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <span className="text-[9px] text-[var(--text-secondary)] uppercase font-black tracking-widest opacity-60">Sugestão: </span>
                                                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-tight">Aportar {item.percentualAporte.toFixed(0)}% da Liquidez</span>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="col-span-2 text-center py-10 opacity-30 text-xs font-bold uppercase tracking-widest border border-dashed border-white/10 rounded-3xl">
                                                    Nenhum atrasado detectado
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-[var(--border-subtle)] flex gap-4 bg-[var(--bg-deep)]">
                                <button
                                    onClick={() => setShowRebalanceDetails(false)}
                                    className="flex-1 py-4 rounded-2xl border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold hover:bg-[var(--border-subtle)] transition-all"
                                >
                                    VOLTAR
                                </button>
                                <button
                                    onClick={() => setCurrentView('transactions')}
                                    className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                                >
                                    Ir para Lançamentos
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <section className="mt-20">
                <div className="flex flex-col gap-1 mb-8">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Próximos Passos Sugeridos</h2>
                    <p className="text-sm text-[var(--text-secondary)]">Ações recomendadas pela IA com base no seu perfil atual de risco e alocação.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {steps.map((step: any) => (
                        <div
                            key={step.id}
                            onClick={() => handleStepAction(step.targetView)}
                            className="p-6 rounded-[2rem] bg-[var(--card-bg)] border border-[var(--border-subtle)] hover:border-blue-500/30 dark:hover:bg-blue-500/[0.02] transition-all group cursor-pointer relative overflow-hidden shadow-sm"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                {getStepIcon(step.icon)}
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                                {getStepIcon(step.icon)}
                            </div>
                            <h4 className="font-bold text-[var(--text-primary)] mb-2 text-lg">{step.title}</h4>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">{step.description}</p>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 group-hover:text-blue-400 transition-colors uppercase tracking-widest">
                                {step.actionLabel} <ArrowRight size={14} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
};
