import { useState, useMemo } from 'react';
import {
    Trash2,
    Search,
    FileUp,
    Download,
    Plus,
    ArrowUpCircle,
    ArrowDownCircle,
    Calendar,
    Tag
} from 'lucide-react';
import { Card } from '../components/Card';
import { usePortfolioStore } from '../store/portfolioStore';
import { csvService } from '../services/csvService';
import { AddAssetModal } from '../components/AddAssetModal';
import { ImportAssetsModal } from '../components/ImportAssetsModal';
import { ConfirmModal } from '../components/ConfirmModal';

export const TransactionsView = () => {
    const assets = usePortfolioStore(state => state.assets);
    const removeTransaction = usePortfolioStore(state => state.removeTransaction);
    const clearPortfolio = usePortfolioStore(state => state.clearPortfolio);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<string>('ALL');
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'SINGLE' | 'CLEAR';
        data?: { ticker: string; id: string };
    }>({ isOpen: false, type: 'SINGLE' });

    const allTransactions = useMemo(() => {
        const txs = assets.flatMap((asset: any) =>
            (asset.transactions || []).map((tx: any) => ({
                ...tx,
                ticker: asset.ticker,
                assetType: asset.type
            }))
        );
        return txs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [assets]);

    const filteredTransactions = allTransactions.filter((tx: any) => {
        const matchesSearch = (tx.ticker || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tx.assetType || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = selectedType === 'ALL' || tx.assetType === selectedType;
        return matchesSearch && matchesType;
    });

    const types = [
        { id: 'ALL', label: 'Todos' },
        { id: 'ACAO', label: 'Ações' },
        { id: 'STOCK', label: 'Stocks' },
        { id: 'FII', label: 'FIIs' },
        { id: 'BDR', label: 'BDRs' },
        { id: 'ETF', label: 'ETFs' }
    ];

    return (
        <main className="w-full mx-auto px-6 py-8">
            {isAddModalOpen && <AddAssetModal onClose={() => setIsAddModalOpen(false)} />}
            {isImportModalOpen && <ImportAssetsModal onClose={() => setIsImportModalOpen(false)} />}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={() => {
                    if (confirmModal.type === 'SINGLE' && confirmModal.data) {
                        removeTransaction(confirmModal.data.ticker, confirmModal.data.id);
                    } else if (confirmModal.type === 'CLEAR') {
                        clearPortfolio();
                    }
                }}
                title={confirmModal.type === 'CLEAR' ? 'Limpar Carteira' : 'Remover Lançamento'}
                message={confirmModal.type === 'CLEAR'
                    ? 'Tem certeza que deseja excluir TODOS os ativos da sua carteira? Esta ação não pode ser desfeita.'
                    : `Deseja realmente remover este lançamento de ${confirmModal.data?.ticker}?`
                }
                confirmText={confirmModal.type === 'CLEAR' ? 'Limpar Tudo' : 'Remover'}
            />

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Lançamentos</h1>
                        <p className="text-[var(--text-secondary)] mt-1">Gerencie suas compras, vendas e histórico de transações.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 bg-[var(--card-bg)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] px-6 py-3 rounded-2xl font-semibold transition-all active:scale-95 shadow-sm"
                    >
                        <FileUp size={20} className="text-[var(--text-secondary)]" />
                        Importar CSV
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-3 rounded-2xl font-semibold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        <Plus size={20} />
                        Novo Lançamento
                    </button>
                </div>
            </header>

            <Card className="mb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por ticker ou tipo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm text-[var(--text-primary)]"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        {types.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`px-4 py-2 text-xs font-black rounded-xl transition-all border ${selectedType === type.id
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => csvService.downloadTemplate()}
                            className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-2xl text-[var(--text-secondary)] text-sm hover:bg-[var(--border-subtle)] transition-colors"
                        >
                            <Download size={18} />
                            Modelo CSV
                        </button>
                        <button
                            onClick={() => setConfirmModal({ isOpen: true, type: 'CLEAR' })}
                            className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-sm hover:bg-rose-500/20 transition-colors"
                        >
                            <Trash2 size={18} />
                            Limpar Tudo
                        </button>
                    </div>
                </div>

                <div className="max-h-[calc(100vh-420px)] overflow-y-auto custom-scrollbar -mx-6 px-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="text-[var(--text-secondary)] text-xs sticky top-0 bg-[var(--card-bg)] z-20">
                                    <th className="pb-4 font-black uppercase tracking-widest bg-[var(--card-bg)] border-b border-[var(--border-subtle)]"><Calendar size={14} className="inline mr-1" /> Data</th>
                                    <th className="pb-4 font-black uppercase tracking-widest bg-[var(--card-bg)] border-b border-[var(--border-subtle)]"><Tag size={14} className="inline mr-1" /> Ativo</th>
                                    <th className="pb-4 font-black uppercase tracking-widest bg-[var(--card-bg)] border-b border-[var(--border-subtle)]">Tipo</th>
                                    <th className="pb-4 font-black uppercase tracking-widest text-right bg-[var(--card-bg)] border-b border-[var(--border-subtle)]">Quantidade</th>
                                    <th className="pb-4 font-black uppercase tracking-widest text-right bg-[var(--card-bg)] border-b border-[var(--border-subtle)]">Preço Unit.</th>
                                    <th className="pb-4 font-black uppercase tracking-widest text-right bg-[var(--card-bg)] border-b border-[var(--border-subtle)]">Total</th>
                                    <th className="pb-4 font-black uppercase tracking-widest text-center bg-[var(--card-bg)] border-b border-[var(--border-subtle)]">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredTransactions.length > 0 ? filteredTransactions.map((tx: any) => (
                                    <tr key={tx.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="py-5 font-mono text-xs text-[var(--text-secondary)]">
                                            {new Date(tx.date).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[var(--text-primary)]">{tx.ticker}</span>
                                                <span className="text-[10px] text-[var(--text-secondary)] uppercase font-black tracking-widest opacity-60">
                                                    {tx.assetType === 'ACAO' ? 'Ação' :
                                                        tx.assetType === 'STOCK' ? 'Stock' :
                                                            tx.assetType === 'FII' ? 'FII' :
                                                                tx.assetType === 'BDR' ? 'BDR' :
                                                                    tx.assetType === 'ETF' ? 'ETF' : tx.assetType}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-5">
                                            {tx.type === 'BUY' ? (
                                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs tracking-tight">
                                                    <ArrowUpCircle size={14} />
                                                    COMPRA
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs tracking-tight">
                                                    <ArrowDownCircle size={14} />
                                                    VENDA
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-5 text-right font-mono text-[var(--text-secondary)] font-medium">
                                            {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 }).format(tx.quantity)}
                                        </td>
                                        <td className="py-5 text-right font-mono text-[var(--text-secondary)] font-medium">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.price)}
                                        </td>
                                        <td className="py-5 text-right font-mono text-[var(--text-primary)] font-bold">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.quantity * tx.price)}
                                        </td>
                                        <td className="py-5 text-center">
                                            <button
                                                onClick={() => setConfirmModal({
                                                    isOpen: true,
                                                    type: 'SINGLE',
                                                    data: { ticker: tx.ticker, id: tx.id }
                                                })}
                                                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-4 opacity-30">
                                                <Calendar size={48} />
                                                <p className="font-medium text-lg">Nenhum lançamento encontrado.</p>
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
