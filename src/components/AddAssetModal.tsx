import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Card } from './Card';
import { AssetType } from '../types/portfolio';
import { usePortfolioStore } from '../store/portfolioStore';

interface AddAssetModalProps {
    onClose: () => void;
}

export const AddAssetModal = ({ onClose }: AddAssetModalProps) => {
    const addTransaction = usePortfolioStore((state) => state.addTransaction);

    const [ticker, setTicker] = useState('');
    const [type, setType] = useState<AssetType>('STOCK');
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticker || !quantity || !price) return;

        addTransaction(ticker.toUpperCase(), type, {
            type: 'BUY',
            quantity: Number(quantity),
            price: Number(price),
            date,
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

            <Card className="w-full max-w-md relative z-10 shadow-2xl border-white/20">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Adicionar Ativo</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Ticker</label>
                        <input
                            autoFocus
                            required
                            placeholder="Ex: PETR4, AAPL, KNRI11"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Tipo</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as AssetType)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none text-white"
                            >
                                <option value="ACAO" className="bg-slate-900">Ações (BR)</option>
                                <option value="STOCK" className="bg-slate-900">Stocks (US)</option>
                                <option value="FII" className="bg-slate-900">FIIs</option>
                                <option value="ETF" className="bg-slate-900">ETFs</option>
                                <option value="BDR" className="bg-slate-900">BDRs</option>
                                <option value="CRYPTO" className="bg-slate-900">Criptos</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Quantidade</label>
                            <input
                                required
                                type="number"
                                step="any"
                                placeholder="0"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Preço Unitário</label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Data</label>
                            <input
                                required
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 mt-4 active:scale-95"
                    >
                        Confirmar Operação
                    </button>
                </form>
            </Card>
        </div>
    );
};
