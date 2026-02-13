import { useEffect, useState, useMemo } from 'react';
import { Globe, TrendingUp, TrendingDown, ArrowRight, BarChart3, Activity, LineChart as LucideLineChart, Sparkles } from 'lucide-react';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { macroService, MacroData } from '../services/macroService';
import { usePortfolioStore } from '../store/portfolioStore';
import { isFII } from '../utils/assetType';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

export const GlobalPulseView = () => {
    const [macros, setMacros] = useState<MacroData[]>([]);
    const [selectedIndicator, setSelectedIndicator] = useState('IBOVESPA');
    const [period, setPeriod] = useState('6M');
    const [showTrendInfo, setShowTrendInfo] = useState(false);
    const [selectedAnalysis, setSelectedAnalysis] = useState<null | { title: string, category: string, details: string, impact: string, keywords: string[] }>(null);
    const [viewRelated, setViewRelated] = useState(false);
    const [heatMapData, setHeatMapData] = useState<Record<string, { symbol: string, change: number, name?: string }[]>>({});
    const [isLoadingHeatMap, setIsLoadingHeatMap] = useState(true);

    const { assets } = usePortfolioStore();

    useEffect(() => {
        const loadData = async () => {
            const [indicators, heatMap] = await Promise.all([
                macroService.fetchMainIndicators(),
                macroService.fetchGlobalHeatMap()
            ]);
            setMacros(indicators);
            setHeatMapData(heatMap);
            setIsLoadingHeatMap(false);
        };
        loadData();
    }, []);

    const chartData = useMemo(() => {
        const item = macros.find(m => m.name === selectedIndicator);
        if (!item || !item.history) return [];

        const history = [...item.history];
        const now = new Date();
        const cutoff = new Date();

        if (period === '1M') cutoff.setMonth(now.getMonth() - 1);
        else if (period === '3M') cutoff.setMonth(now.getMonth() - 3);
        else if (period === '6M') cutoff.setMonth(now.getMonth() - 6);
        else if (period === 'ALL') cutoff.setFullYear(now.getFullYear() - 1);

        const filtered = history.filter(h => new Date(h.date + 'T12:00:00') >= cutoff);

        return filtered.map(h => ({
            name: h.date, // Usamos a data bruta para sorting e ticks
            formattedDate: h.date.split('-').reverse().slice(0, 2).join('/'), // ex: 04/02
            value: h.value
        }));
    }, [macros, selectedIndicator, period]);

    const currentInfo = macros.find(m => m.name === selectedIndicator);

    const marketList = useMemo(() => {
        return macros.filter(m => ['IBOVESPA', 'S&P 500', 'Nasdaq', 'Bitcoin', 'Dólar'].includes(m.name));
    }, [macros]);

    return (
        <main className="w-full mx-auto px-6 py-8">
            {/* Pop-up de Explicação da Tendência */}
            {showTrendInfo && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
                    onClick={() => setShowTrendInfo(false)}
                >
                    <Card
                        className="max-w-md w-full border border-white/10 shadow-2xl relative"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                                <Sparkles size={24} />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Análise de Tendência</h3>
                        </div>

                        <div className="space-y-6">
                            <p className="text-slate-400 font-medium leading-relaxed text-sm">
                                A tendência reflete o movimento macro do ativo, comparando o preço atual com o início do período do gráfico.
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-center gap-4 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                    <TrendingUp className="text-emerald-400" size={20} />
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Alta</p>
                                        <p className="text-xs text-slate-300 font-medium">Acima de <span className="text-white font-bold">+0.5%</span> no período</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                                    <TrendingDown className="text-rose-400" size={20} />
                                    <div>
                                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Baixa</p>
                                        <p className="text-xs text-slate-300 font-medium">Abaixo de <span className="text-white font-bold">-0.5%</span> no período</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                    <Activity className="text-amber-400" size={20} />
                                    <div>
                                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Lateral</p>
                                        <p className="text-xs text-slate-300 font-medium">Entre <span className="text-white font-bold">-0.5% e +0.5%</span></p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowTrendInfo(false)}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-500/20"
                            >
                                ENTENDI
                            </button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Pop-up de Detalhes da Análise Macro */}
            {selectedAnalysis && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl"
                    onClick={() => setSelectedAnalysis(null)}
                >
                    <Card
                        className="max-w-2xl w-full border border-white/10 shadow-3xl overflow-hidden"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                        {!viewRelated ? (
                            <>
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                                            <Activity size={20} />
                                        </div>
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{selectedAnalysis.category}</span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedAnalysis(null)}
                                        className="text-slate-500 hover:text-white transition-colors"
                                    >
                                        <ArrowRight size={20} className="rotate-180" />
                                    </button>
                                </div>

                                <h3 className="text-2xl font-black text-white leading-tight mb-6">
                                    {selectedAnalysis.title}
                                </h3>

                                <div className="space-y-8">
                                    <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5">
                                        <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                                            <Sparkles size={14} className="text-amber-400" />
                                            Resumo da Análise
                                        </h4>
                                        <p className="text-slate-300 leading-relaxed font-medium">
                                            {selectedAnalysis.details}
                                        </p>
                                    </div>

                                    <div className="p-6 bg-blue-600/10 rounded-3xl border border-blue-500/20">
                                        <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Impacto na Carteira</h4>
                                        <p className="text-slate-200 font-bold leading-relaxed">
                                            {selectedAnalysis.impact}
                                        </p>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setSelectedAnalysis(null)}
                                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all"
                                        >
                                            FECHAR
                                        </button>
                                        <button
                                            onClick={() => setViewRelated(true)}
                                            className="flex-2 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-500/20"
                                        >
                                            VER ATIVOS RELACIONADOS
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-8">
                                    <button
                                        onClick={() => setViewRelated(false)}
                                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-bold"
                                    >
                                        <ArrowRight size={16} className="rotate-180" />
                                        VOLTAR PARA ANÁLISE
                                    </button>
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Sua Carteira</span>
                                </div>

                                <h3 className="text-xl font-black text-white mb-2">Ativos em Alerta</h3>
                                <p className="text-slate-400 text-sm mb-6">Estes ativos no seu portfólio podem ser impactados pela notícia:</p>

                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 mb-8 custom-scrollbar">
                                    {assets.filter((asset: any) => {
                                        const tags = [...selectedAnalysis.keywords];
                                        const ticker = asset.ticker.toUpperCase();

                                        if (tags.includes('FII_PAPEL') && isFII(ticker)) return true;
                                        if (tags.includes('FINANCEIRO') && ['ITUB4', 'BBDC4', 'BBAS3', 'SANB11'].includes(ticker)) return true;
                                        if (tags.includes('ELETRICO') && ['ELET3', 'CPLE6', 'EGIE3', 'TRPL4'].includes(ticker)) return true;
                                        if (tags.includes('VAREJO') && ['MGLU3', 'AMER3', 'PETZ3', 'LREN3', 'BHIA3'].includes(ticker)) return true;

                                        if (tags.includes('EXPORTADORA')) {
                                            if (asset.type === 'STOCK' || asset.type === 'BDR') return true;
                                            if (['VALE3', 'PETR4', 'SUZB3', 'JBSS3', 'BRFS3', 'BEEF3'].includes(ticker)) return true;
                                        }

                                        return false;
                                    }).length > 0 ? (
                                        assets.filter((asset: any) => {
                                            const tags = [...selectedAnalysis.keywords];
                                            const ticker = asset.ticker.toUpperCase();
                                            if (tags.includes('FII_PAPEL') && isFII(ticker)) return true;
                                            if (tags.includes('FINANCEIRO') && ['ITUB4', 'BBDC4', 'BBAS3', 'SANB11'].includes(ticker)) return true;
                                            if (tags.includes('ELETRICO') && ['ELET3', 'CPLE6', 'EGIE3', 'TRPL4'].includes(ticker)) return true;
                                            if (tags.includes('VAREJO') && ['MGLU3', 'AMER3', 'PETZ3', 'LREN3', 'BHIA3'].includes(ticker)) return true;

                                            if (tags.includes('EXPORTADORA')) {
                                                if (asset.type === 'STOCK' || asset.type === 'BDR') return true;
                                                if (['VALE3', 'PETR4', 'SUZB3', 'JBSS3', 'BRFS3', 'BEEF3'].includes(ticker)) return true;
                                            }
                                            return false;
                                        }).map((asset: any) => (
                                            <div key={asset.ticker} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center font-black text-blue-400 text-xs">
                                                        {asset.ticker.slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-white">{asset.ticker}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{asset.type}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-white">R$ {asset.currentPrice.toFixed(2)}</p>
                                                    <p className={`text-[10px] font-black ${asset.profitPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {asset.profitPercent >= 0 ? '+' : ''}{asset.profitPercent.toFixed(2)}%
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 flex flex-col items-center justify-center text-center bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                                            <Activity size={32} className="text-slate-600 mb-4" />
                                            <p className="text-slate-400 font-medium text-sm">Nenhum ativo da sua carteira<br />foi identificado como sensível a esta análise.</p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setSelectedAnalysis(null)}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-500/20"
                                >
                                    ENTENDI
                                </button>
                            </>
                        )}
                    </Card>
                </div>
            )}

            <header className="mb-12">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                        <Globe size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Pulso Global</h1>
                        <p className="text-slate-400 font-medium">Fluxo de capital e indicadores macroeconômicos.</p>
                    </div>
                </div>
            </header>

            {/* Macro Indicators Section - SELIC, CDI, IPCA */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {macros.filter(m => ['SELIC', 'CDI', 'IPCA'].includes(m.name)).map((macro, idx) => (
                    <Card key={macro.name} delay={idx * 0.1}>
                        <StatCard
                            label={macro.name}
                            value={`${Number(macro.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${macro.suffix}`}
                            icon={macro.name === 'IPCA' ? <BarChart3 size={24} className="text-amber-400" /> : <Activity size={24} className="text-emerald-400" />}
                            subValue="Indicador oficial Brasil"
                        />
                    </Card>
                ))}
            </div>

            {/* Main Interactive Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <Card className="lg:col-span-2 flex flex-col min-h-[500px]" delay={0.3}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <LucideLineChart className="text-blue-400" size={20} />
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                                    {selectedIndicator}
                                </h2>
                            </div>
                            {currentInfo && (
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl font-black text-white">
                                            {selectedIndicator === 'Dólar' ? `R$ ${Number(currentInfo.value).toFixed(2)}` :
                                                selectedIndicator === 'Bitcoin' ? `$${Number(currentInfo.value).toLocaleString('en-US')}` :
                                                    new Intl.NumberFormat('pt-BR').format(Number(currentInfo.value))}
                                            <span className="text-sm font-medium text-slate-500 ml-1">{currentInfo.suffix}</span>
                                        </span>
                                        <span className={`px-2 py-1 rounded-lg text-xs font-black ${currentInfo.direction === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                            {currentInfo.change24h}
                                        </span>
                                    </div>
                                    <div
                                        className="flex items-center gap-2 mt-2 cursor-help group/trend relative"
                                        onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            setShowTrendInfo(true);
                                        }}
                                    >
                                        {(() => {
                                            if (chartData.length < 2) return null;
                                            const first = chartData[0].value;
                                            const last = chartData[chartData.length - 1].value;
                                            const diff = last && first ? ((last - first) / first) * 100 : 0;
                                            const trendType = diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'neutral';
                                            const trendLabel = trendType === 'up' ? 'Tendência de Alta' : trendType === 'down' ? 'Tendência de Baixa' : 'Lateralizado';

                                            return (
                                                <>
                                                    <Sparkles size={14} className={trendType === 'up' ? 'text-emerald-400' : trendType === 'down' ? 'text-rose-400' : 'text-amber-400'} />
                                                    <span className={`text-sm font-bold ${trendType === 'up' ? 'text-emerald-400' : trendType === 'down' ? 'text-rose-400' : 'text-amber-400 opacity-90'}`}>
                                                        {trendLabel} ({diff > 0 ? '+' : ''}{diff.toFixed(1)}%)
                                                    </span>
                                                </>
                                            );
                                        })()}
                                        <div className="opacity-0 group-hover/trend:opacity-100 transition-opacity absolute left-0 -bottom-6 bg-slate-800 text-[10px] text-slate-300 px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
                                            Variação calculada sobre o período de {period}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 self-end">
                                {['1M', '3M', '6M', 'ALL'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPeriod(p)}
                                        className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all ${period === p ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                    minTickGap={period === '1M' ? 10 : 30}
                                    tickFormatter={(val: string) => {
                                        const d = new Date(val + 'T12:00:00');
                                        return period === '1M'
                                            ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                                            : d.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
                                    }}
                                />
                                <YAxis domain={['auto', 'auto']} hide />
                                <Tooltip
                                    labelFormatter={(label: string) => {
                                        const d = new Date(label + 'T12:00:00');
                                        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                    }}
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                                    itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                                    formatter={(value: number) => {
                                        let formattedValue = '';
                                        if (selectedIndicator === 'Dólar') {
                                            formattedValue = `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                        } else if (selectedIndicator === 'Bitcoin') {
                                            formattedValue = `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
                                        } else {
                                            formattedValue = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);
                                        }
                                        return [formattedValue, 'Valor'];
                                    }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Market Selector Sidebar */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Selecione para Analisar</h4>
                    {marketList.map((m, idx) => (
                        <Card
                            key={m.name}
                            delay={idx * 0.05}
                            onClick={() => setSelectedIndicator(m.name)}
                            className={`cursor-pointer group transition-all border-l-4 ${selectedIndicator === m.name ? 'bg-blue-600/10 border-l-blue-500' : 'hover:bg-white/5 border-l-transparent'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-1">{m.name}</p>
                                    <h3 className="text-lg font-black text-white">
                                        {m.name === 'Bitcoin' ? `$${Number(m.value).toLocaleString('en-US')}` :
                                            m.name === 'Dólar' ? `R$ ${Number(m.value).toFixed(2)}` :
                                                new Intl.NumberFormat('pt-BR').format(Number(m.value))}
                                    </h3>
                                </div>
                                <div className={`flex flex-col items-end gap-1 font-black text-xs ${m.direction === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {m.direction === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    {m.change24h}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Seção de Análises Macroeconômicas Horizontal */}
            <div className="mb-12">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Análise Macroeconômica</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        {
                            title: `Com SELIC em ${macros.find(m => m.name === 'SELIC')?.value}%, investidores buscam prêmio de risco no mercado de capitais.`,
                            category: "Mercado Financeiro",
                            details: "A manutenção de taxas de juros elevadas pressiona o valuation de empresas de crescimento, mas cria oportunidades ímpares em ativos de renda fixa e ações de valor e qualidade que conseguem repassar custos financeiros.",
                            impact: "Aumento da atratividade para FIIs de Papel e ações do setor elétrico/bancário.",
                            keywords: ['FII_PAPEL', 'FINANCEIRO', 'ELETRICO']
                        },
                        {
                            title: "Inflação (IPCA) segue dentro da meta, abrindo espaço para discussões sobre política monetária.",
                            category: "Indicadores Brasil",
                            details: "O último relatório do IPCA demonstrou uma convergência dos núcleos de inflação para a meta central, sugerindo que o ciclo de aperto monetário pode estar chegando ao fim, o que historicamente precede ralis na bolsa de valores.",
                            impact: "Potencial valorização em ativos de Small Caps e Varejo no médio prazo.",
                            keywords: ['VAREJO']
                        },
                        {
                            title: "Cenário externo impacta volatilidade do Dólar no curto prazo.",
                            category: "Câmbio e Global",
                            details: "Tensões geopolíticas e incertezas sobre o ritmo de corte de juros pelo FED (EUA) têm gerado uma fuga de capital de países emergentes, pressionando o real. No entanto, o forte superávit comercial brasileiro atua como amortecedor.",
                            impact: "Proteção de carteira recomendada através de ativos dolarizados ou exportadoras brasileiras.",
                            keywords: ['EXPORTADORA']
                        }
                    ].map((analysis, i) => (
                        <Card
                            key={i}
                            delay={i * 0.1}
                            className="group cursor-pointer hover:bg-white/[0.03] border-white/5 transition-all flex flex-col justify-between"
                            onClick={() => {
                                setSelectedAnalysis(analysis);
                                setViewRelated(false);
                            }}
                        >
                            <div>
                                <p className="text-[10px] font-black text-blue-400 mb-3 uppercase tracking-widest">{analysis.category}</p>
                                <h5 className="font-bold text-slate-200 group-hover:text-white transition-colors leading-tight mb-4">
                                    {analysis.title}
                                </h5>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold group-hover:text-blue-400 transition-colors mt-4">
                                <span>VER DETALHES</span>
                                <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Mapa de Calor Global - Agora em Largura Total */}
            <div className="grid grid-cols-1 gap-8">
                <Card className="relative overflow-hidden flex flex-col p-8" delay={0.4}>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                                <Globe size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Mapa de Calor Global</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Performance das Big Techs e Blue Chips</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {isLoadingHeatMap && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                                Market Insights
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 flex-1">
                        {Object.entries(heatMapData).map(([sector, assets]) => (
                            <div key={sector} className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">{sector}</h4>
                                <div className="grid grid-cols-5 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                    {assets.map((asset) => (
                                        <div
                                            key={asset.symbol}
                                            className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all hover:scale-110 cursor-help group/heat relative ${asset.change > 2 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10' :
                                                asset.change > 0.5 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                                                    asset.change < -2 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20 shadow-lg shadow-rose-500/10' :
                                                        asset.change < -0.5 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' :
                                                            'bg-white/5 text-slate-400 border border-white/5'
                                                }`}
                                        >
                                            <span className="text-[9px] font-black">{asset.symbol}</span>
                                            <span className="text-[8px] font-bold opacity-80">{asset.change > 0 ? '+' : ''}{asset.change.toFixed(1)}%</span>

                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 group-hover/heat:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-2xl border border-white/10">
                                                <p className="font-black">{asset.name}</p>
                                                <p className="text-slate-400 uppercase">Variação: {asset.change.toFixed(2)}%</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[8px] font-black text-slate-600 uppercase tracking-widest pt-4 border-t border-white/5">
                        <div className="flex flex-wrap justify-center gap-4">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-rose-500/40" /> Baixa Forte</div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-rose-500/10" /> Baixa</div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-white/10" /> Estável</div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/10" /> Alta</div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40" /> Alta Forte</div>
                        </div>
                        <span>Cotações em Tempo Real (NASDAQ/NYSE) • Atualizado via Brapi API</span>
                    </div>
                </Card>
            </div>
        </main>
    );
};
