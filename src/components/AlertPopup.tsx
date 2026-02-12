import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ArrowRight } from 'lucide-react';
import { Card } from './Card';

export interface AlertNotification {
    id: string;
    ticker: string;
    target: number;
    currentPrice: number;
    type: 'COMPRA' | 'VENDA';
}

interface AlertPopupProps {
    notifications: AlertNotification[];
    onClose: (id: string) => void;
    onViewDetail: () => void;
}

export const AlertPopup: React.FC<AlertPopupProps> = ({ notifications, onClose, onViewDetail }) => {
    return (
        <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-4 pointer-events-none w-full max-w-sm">
            <AnimatePresence>
                {notifications.map((notif) => (
                    <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className="pointer-events-auto"
                    >
                        <Card className="!p-0 overflow-hidden border border-amber-500/30 shadow-2xl shadow-amber-500/10 bg-[var(--card-bg)]">
                            <div className="flex">
                                <div className={`w-2 ${notif.type === 'COMPRA' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <div className="flex-1 p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${notif.type === 'COMPRA' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                <Bell size={18} fill="currentColor" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-[var(--text-primary)] leading-none">{notif.ticker}</h4>
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Alerta Atingido</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onClose(notif.id)}
                                            className="p-1 hover:bg-white/5 rounded-lg transition-colors text-[var(--text-secondary)]"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div className="space-y-1 mb-4">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-[var(--text-secondary)] font-medium">Preço Atual</span>
                                            <span className="font-black text-[var(--text-primary)]">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(notif.currentPrice)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-[var(--text-secondary)] font-medium">Seu Alvo</span>
                                            <span className="font-bold text-amber-500">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(notif.target)}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            onViewDetail();
                                            onClose(notif.id);
                                        }}
                                        className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-all group border border-white/5"
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">Ver Detalhes do Monitor</span>
                                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
