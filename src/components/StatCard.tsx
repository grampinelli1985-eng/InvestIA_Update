import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string;
    subValue?: string;
    trend?: number;
    icon: React.ReactNode;
}

export const StatCard = ({ label, value, subValue, trend, icon }: StatCardProps) => {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-300">
                    {icon}
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 text-sm font-black px-3 py-1 rounded-xl border ${trend > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
                        trend < 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]' :
                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                        {trend > 0 ? <TrendingUp size={14} /> : trend < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                        {Math.abs(trend).toFixed(2)}%
                    </div>
                )}
            </div>
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">{label}</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</h3>
            {subValue && <span className="text-slate-400 dark:text-slate-500 text-xs mt-1">{subValue}</span>}
        </div>
    );
};
