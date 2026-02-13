import { useState, useRef } from 'react';
import { X, Upload, AlertCircle, CheckCircle2, FileUp } from 'lucide-react';
import { Card } from './Card';
import { AssetType } from '../types/portfolio';
import { usePortfolioStore } from '../store/portfolioStore';

interface ImportAssetsModalProps {
    onClose: () => void;
}

export const ImportAssetsModal = ({ onClose }: ImportAssetsModalProps) => {
    const batchImport = usePortfolioStore((state) => state.batchImportTransactions);
    const [preview, setPreview] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const mapType = (typeStr: string): AssetType => {
        const s = typeStr.toUpperCase();
        if (s.includes('FII')) return 'FII';
        if (s.includes('ETF')) return 'ETF';
        if (s.includes('BDR')) return 'BDR';
        if (s.includes('AÇ') || s.includes('AC')) return 'ACAO';
        return 'STOCK';
    };

    const parseCSVDate = (dateStr: string): string => {
        if (!dateStr) return new Date().toISOString().split('T')[0];

        // Handle DD/MM/YYYY
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                return `${year}-${month}-${day}`;
            }
        }

        // Handle YYYY-MM-DD or similar
        const d = new Date(dateStr + 'T12:00:00');
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }

        return new Date().toISOString().split('T')[0];
    };

    const processContent = (content: string) => {
        try {
            setError(null);
            const rows = content.split('\n').map(r => r.trim()).filter(r => r.length > 0);

            if (rows.length === 0) throw new Error('O arquivo está vazio.');

            // Detect delimiter (comma, semicolon, or tab)
            const firstRow = rows[0];
            let delimiter = ',';
            if (firstRow.includes(';')) delimiter = ';';
            else if (firstRow.includes('\t')) delimiter = '\t';

            // Skip header if detected
            const contentRows = (firstRow.toLowerCase().includes('ativo') || firstRow.toLowerCase().includes('tipo'))
                ? rows.slice(1)
                : rows;

            const parsed = contentRows.map((row, index) => {
                const cols = row.split(delimiter).map(c => c.trim().replace(/"/g, ''));

                if (cols.length < 5) {
                    throw new Error(`Linha ${index + 1} inválida.`);
                }

                // New Order: [0]Data, [1]Tipo, [2]Ativo, [3]Qtd, [4]Preço
                const date = parseCSVDate(cols[0]);
                const assetType = mapType(cols[1]);
                const ticker = cols[2].toUpperCase();

                const cleanNum = (val: string) => {
                    if (!val) return 0;
                    return parseFloat(val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
                };

                const quantity = cleanNum(cols[3]);
                const price = cleanNum(cols[4]);

                return { ticker, assetType, quantity, price, date, type: 'BUY' };
            });

            setPreview(parsed);
        } catch (err: any) {
            setError(err.message || 'Erro ao processar o arquivo. Verifique o formato CSV.');
            setPreview([]);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            processContent(content);
        };
        reader.readAsText(file);
    };

    const handleImport = () => {
        if (preview.length > 0) {
            batchImport(preview);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

            <Card className="w-full max-w-2xl relative z-10 shadow-2xl border-white/20">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <Upload size={20} />
                        </div>
                        <h2 className="text-xl font-bold">Importar Carteira (.csv)</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-3">
                        <AlertCircle className="text-blue-400 shrink-0" size={20} />
                        <div className="text-xs text-slate-400">
                            <p className="font-semibold text-slate-300 mb-1">Formato esperado do CSV:</p>
                            <p>Data Negociação; Tipo Investimento; Ativo; Quantidade; Vlr Cotação Compra; Valor Investido</p>
                            <p className="mt-1 opacity-60">Ex: 01/01/2024;Ação;PETR4;100;35,50;3550,00</p>
                        </div>
                    </div>

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="group flex flex-col items-center justify-center py-10 px-6 border-2 border-dashed border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-3xl cursor-pointer transition-all"
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".csv"
                            className="hidden"
                        />
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <FileUp className="text-blue-400" size={32} />
                        </div>
                        <p className="text-white font-semibold">
                            {fileName ? fileName : 'Clique para selecionar o arquivo .csv'}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">Arraste e solte o arquivo aqui (opcional)</p>
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-2">
                            <X size={16} /> {error}
                        </div>
                    )}

                    {preview.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-300">Resumo da Importação ({preview.length} ativos)</h3>
                                <CheckCircle2 size={16} className="text-emerald-400" />
                            </div>
                            <div className="max-h-40 overflow-y-auto rounded-xl border border-white/5 bg-white/2">
                                <table className="w-full text-left text-xs">
                                    <thead className="sticky top-0 bg-slate-900 text-slate-500">
                                        <tr>
                                            <th className="p-3">Ativo</th>
                                            <th className="p-3">Tipo</th>
                                            <th className="p-3 text-right">Qtd</th>
                                            <th className="p-3 text-right">Preço</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {preview.map((p, i) => (
                                            <tr key={i} className="text-slate-300">
                                                <td className="p-3 font-bold">{p.ticker}</td>
                                                <td className="p-3 opacity-60 text-[10px]">{p.assetType}</td>
                                                <td className="p-3 text-right font-mono">{p.quantity}</td>
                                                <td className="p-3 text-right font-mono text-emerald-400">R$ {p.price.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-4 rounded-2xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={preview.length === 0}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={20} />
                            Processar Importação
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
