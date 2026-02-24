import React, { useState } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import { aiService, RadarAsset } from '../services/aiService';
import { X, Target } from 'lucide-react';
import {
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    ComposedChart,
    Line,
    Label
} from 'recharts';
import { marketService } from '../services/marketService';

export const RadarView: React.FC = () => {

    const assets = usePortfolioStore(state => state.assets);
    const refreshPrices = usePortfolioStore(state => state.refreshPrices);
    const isLoadingPrices = usePortfolioStore(state => state.isLoadingPrices);

    const [opportunities, setOpportunities] = useState<RadarAsset[]>([]);
    const [isProcessingAI, setIsProcessingAI] = useState(false);

    const [selectedAsset, setSelectedAsset] = useState<RadarAsset | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [isLoadingChart, setIsLoadingChart] = useState(false);

    const isAnyLoading = Boolean(isLoadingPrices || isProcessingAI);

    // =============================
    // FETCH OPORTUNIDADES (BLINDADO)
    // =============================
    const fetchOpps = async (force = false) => {
        if (isAnyLoading) return;
        if (assets.length === 0) return;

        setIsProcessingAI(true);

        try {
            if (force) {
                await refreshPrices("Radar_AI_Force");
            }

            const currentAssets = usePortfolioStore.getState().assets;

            if (!currentAssets || currentAssets.length === 0) {
                setOpportunities([]);
                return;
            }

            const data = await aiService.getTopOpportunities(currentAssets);
            setOpportunities(Array.isArray(data) ? data : []);

        } catch (e) {
            console.error("[RadarView] Erro ao processar radar:", e);
        } finally {
            setIsProcessingAI(false);
        }
    };


    // =============================
    // CLICK DO ATIVO → PROJEÇÃO
    // =============================
    const handleAssetClick = async (asset: RadarAsset) => {

        setSelectedAsset(asset);
        setIsLoadingChart(true);

        try {
            const history = await marketService.fetchHistoricalData(asset.symbol, '3mo');

            const data = history.map((h: any) => ({
                date: h.date,
                value: h.price,
                projected: null as number | null
            }));

            const lastPrice = asset.currentPrice;
            const targetPrice = asset.justPrice > 0 ? asset.justPrice : lastPrice;

            const selicTrimestral = 0.1325 / 4;

            const roe = asset.fundamentals.roe || 0;
            const pe = asset.fundamentals.pe || 0;
            const pvp = asset.fundamentals.pvp || 1;
            const dy = asset.fundamentals.dy || 0;

            const gapToFairValue = ((targetPrice - lastPrice) / lastPrice);

            let qualityScore = 0;

            if (asset.isFII) {
                const pvpScore = pvp < 0.85 ? 1 : pvp < 1 ? 0.7 : pvp < 1.1 ? 0.4 : 0.2;
                const dyScore = dy > 10 ? 1 : dy > 8 ? 0.7 : dy > 6 ? 0.5 : 0.3;
                qualityScore = (pvpScore * 0.6 + dyScore * 0.4);
            } else {
                const roeScore = roe > 20 ? 1 : roe > 15 ? 0.8 : roe > 10 ? 0.6 : roe > 5 ? 0.4 : 0.2;
                const peScore = pe > 0 && pe < 8 ? 1 : pe < 12 ? 0.8 : pe < 18 ? 0.6 : pe < 25 ? 0.4 : 0.2;
                const pvpScore = pvp < 1.5 ? 1 : pvp < 2.5 ? 0.7 : pvp < 4 ? 0.4 : 0.2;
                qualityScore = (roeScore * 0.4 + peScore * 0.35 + pvpScore * 0.25);
            }

            const direction = gapToFairValue >= 0 ? 1 : -1;
            const maxConvergence = 0.12;
            const convergenceFactor = Math.min(Math.abs(gapToFairValue) * 0.15, maxConvergence);
            const qualityAdjustedConvergence = convergenceFactor * (0.5 + qualityScore * 0.5);

            const baseReturn = selicTrimestral * qualityScore * 0.5;
            let projectedReturn90d = baseReturn + (direction * qualityAdjustedConvergence);

            const MAX_UPSIDE = 0.15;
            const MAX_DOWNSIDE = -0.10;

            projectedReturn90d = Math.max(MAX_DOWNSIDE, Math.min(MAX_UPSIDE, projectedReturn90d));

            if (gapToFairValue < -0.15) {
                projectedReturn90d = Math.min(projectedReturn90d, 0.02);
            }

            const dailyRate = Math.pow(1 + projectedReturn90d, 1 / 90) - 1;

            const today = new Date();

            data.push({
                date: today.toISOString().split('T')[0],
                value: lastPrice,
                projected: lastPrice
            });

            for (let week = 1; week <= 13; week++) {
                const futureDate = new Date(today);
                futureDate.setDate(futureDate.getDate() + (week * 7));

                const projectedPrice = lastPrice * Math.pow(1 + dailyRate, week * 7);

                data.push({
                    date: futureDate.toISOString().split('T')[0],
                    value: null,
                    projected: projectedPrice
                });
            }

            setChartData(data);

        } catch (error) {
            console.error("Erro ao carregar gráfico", error);
        } finally {
            setIsLoadingChart(false);
        }
    };

    const todayIndex = chartData.findIndex(d => d.projected !== null);
    const refDate =
        todayIndex >= 0
            ? chartData[todayIndex]?.date
            : chartData[chartData.length - 1]?.date;

    // =============================
    // AUXILIARES
    // =============================
    const getBadgeColor = (rec: string) => {
        switch (rec) {
            case 'COMPRA FORTE': return 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-lg shadow-emerald-500/20';
            case 'COMPRA': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
            case 'MANTER': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
            case 'ATENÇÃO': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 animate-pulse';
            default: return 'bg-[var(--border-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
        }
    };

    const grouped = opportunities.reduce((acc: any, op) => {
        const cat = op.category || 'Outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(op);
        return acc;
    }, {});

    // Sincroniza automaticamente se houver ativos mas nenhuma análise
    React.useEffect(() => {
        if (assets.length > 0 && opportunities.length === 0 && !isProcessingAI) {
            fetchOpps();
        }
    }, [assets.length, opportunities.length]);

    // =============================
    // RENDER
    // =============================
    return (
        <main className="p-8 min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)]">

            <div className="flex justify-between items-center mb-10 p-8 bg-[var(--card-bg)] rounded-[2rem] border border-[var(--border-subtle)] shadow-sm">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter brand-font">Radar InvestIA</h2>
                    <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase mt-1 tracking-widest opacity-60">
                        Análise de {assets.length} ativos
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => fetchOpps(true)}
                        disabled={isAnyLoading}
                        className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg
                            ${isAnyLoading
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95 shadow-blue-600/20'}`}
                    >
                        {isAnyLoading ? 'Sincronizando...' : 'Sincronizar Inteligência'}
                    </button>
                </div>
            </div>

            {opportunities.length === 0 && !isProcessingAI ? (
                <div className="text-center py-24 border-2 border-dashed border-[var(--border-subtle)] rounded-[3rem] opacity-50">
                    <p className="text-[var(--text-secondary)] font-black uppercase tracking-widest text-[10px]">
                        {assets.length === 0 ? 'Adicione ativos na sua carteira primeiro.' : 'Nenhum dado processado. Clique em Sincronizar Inteligência.'}
                    </p>
                </div>
            ) : isProcessingAI ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 animate-pulse">
                        IA Analisando Oportunidades...
                    </p>
                </div>
            ) : (
                <div className="space-y-12">
                    {Object.entries(grouped).map(([category, items]: any) => (
                        <div key={category} className="space-y-6">
                            <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.4em] pl-4 border-l-4 border-blue-500">
                                {category}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {items.map((op: RadarAsset, i: number) => (
                                    <div key={i} onClick={() => handleAssetClick(op)} className="p-7 rounded-[2.5rem] bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-col shadow-sm hover:shadow-xl hover:border-blue-500/20 transition-all group relative overflow-hidden cursor-pointer active:scale-[0.98]">
                                        <div className="flex justify-between items-start mb-6">
                                            <span className="text-2xl font-black text-[var(--text-primary)] group-hover:text-blue-600 transition-colors uppercase">{op.symbol}</span>
                                            <span className={`px-3 py-1 rounded-lg text-[8px] font-black border uppercase tracking-[0.15em] ${getBadgeColor(op.recommendation)}`}>
                                                {op.recommendation}
                                            </span>
                                        </div>

                                        <div className={`p-4 rounded-2xl mb-6 text-[10px] font-black border uppercase tracking-tight ${op.recommendation === 'ATENÇÃO'
                                            ? 'bg-red-500/5 text-red-500 border-red-500/10'
                                            : op.priceGap > 0 ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' : 'bg-slate-500/5 text-[var(--text-secondary)] border-[var(--border-subtle)]'
                                            }`}>
                                            {op.recommendation === 'ATENÇÃO'
                                                ? `⚠️ ALTA PROBABILIDADE DE QUEDA`
                                                : op.priceGap > 0 ? `🎯 Desconto de ${op.priceGap.toFixed(1)}%` : `📊 Preço de Mercado`}
                                        </div>

                                        <p className="text-[12px] text-[var(--text-secondary)] italic mb-6 leading-relaxed antialiased font-medium">
                                            "{op.justification}"
                                        </p>

                                        <div className="grid grid-cols-3 gap-2 mt-auto">
                                            <div className="p-3 bg-white/5 rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center justify-center">
                                                <span className="block text-[7px] text-[var(--text-secondary)] font-black uppercase mb-1 tracking-tighter opacity-70">
                                                    {op.isFII ? 'Yield' : 'P/L'}
                                                </span>
                                                <span className="text-[11px] font-black">
                                                    {op.isFII
                                                        ? (op.fundamentals.dy !== undefined ? `${op.fundamentals.dy.toFixed(1)}%` : '--')
                                                        : (op.fundamentals.pe !== undefined ? op.fundamentals.pe.toFixed(1) : '--')}
                                                </span>
                                            </div>
                                            <div className="p-3 bg-white/5 rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center justify-center">
                                                <span className="block text-[7px] text-[var(--text-secondary)] font-black uppercase mb-1 tracking-tighter opacity-70">P/VP</span>
                                                <span className="text-[11px] font-black">{op.fundamentals.pvp?.toFixed(2) || '--'}</span>
                                            </div>
                                            <div className="p-3 bg-white/5 rounded-2xl border border-[var(--border-subtle)] flex flex-col items-center justify-center">
                                                <span className="block text-[7px] text-[var(--text-secondary)] font-black uppercase mb-1 tracking-tighter opacity-70">ROE</span>
                                                <span className={`text-[11px] font-black ${(op.fundamentals.roe ?? 0) > 15 ? 'text-emerald-500' : ''}`}>
                                                    {(() => {
                                                        const val = op.fundamentals.roe;
                                                        return (val !== undefined && val !== null) ? `${val.toFixed(1)}%` : '--';
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedAsset && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedAsset(null)} />
                    <div className="relative w-full max-w-5xl bg-[var(--card-bg)] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-[var(--border-subtle)] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                                    <Target size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter brand-font">Projeção {selectedAsset.symbol}</h2>
                                    <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">
                                        Projeção Fundamentalista (90 dias)
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedAsset(null)} className="p-2 hover:bg-white/5 rounded-full text-[var(--text-secondary)] transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-[var(--bg-deep)]">
                            {isLoadingChart ? (
                                <div className="h-[400px] flex flex-col items-center justify-center gap-4 opacity-50">
                                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-sm font-bold uppercase tracking-widest text-slate-500 animate-pulse">Calculando Projeções...</p>
                                </div>
                            ) : (
                                <div className="h-[450px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                            <defs>
                                                <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                                tickFormatter={(val) => {
                                                    const d = new Date(val);
                                                    return isNaN(d.getTime()) ? val : d.toLocaleDateString('pt-BR', { month: 'short' });
                                                }}
                                            />
                                            <YAxis
                                                domain={['auto', 'auto']}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                                tickFormatter={(val) => `R$ ${val.toFixed(0)}`}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}
                                                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Cotação']}
                                            />

                                            <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorHistory)" name="Histórico Real" />

                                            <ReferenceLine x={refDate} stroke="#f59e0b" strokeDasharray="3 3">
                                                <Label value="HOJE" position="top" fill="#f59e0b" fontSize={10} fontWeight="black" />
                                            </ReferenceLine>

                                            <Line type="monotone" dataKey="projected" stroke="#10b981" strokeWidth={3} dot={false} strokeDasharray="5 5" name="Projeção IA" />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6 mt-8">
                                <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Ponto de Partida</h4>
                                    <p className="text-2xl font-black">R$ {selectedAsset.currentPrice.toFixed(2)}</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Alvo Projetado (90d)</h4>
                                    <p className="text-2xl font-black text-emerald-500">
                                        R$ {chartData[chartData.length - 1]?.projected?.toFixed(2) || '--'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};
