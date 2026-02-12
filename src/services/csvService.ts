import { AssetType } from '../types/portfolio';

export const CSV_HEADERS = [
    'Data Negociação',
    'Tipo Investimento',
    'Ativo',
    'Quantidade',
    'Vlr Cotação Compra',
    'Valor Investido'
];

export const DIVIDEND_HEADERS = [
    'Categoria',
    'Ativo',
    'Tipo',
    'Data Com',
    'Data Pagamento',
    'Valor do Dividendo',
    'Total',
    'Total Líquido'
];

export const csvService = {
    downloadTemplate: () => {
        // UTF-8 with BOM for Excel compatibility in Brazil
        const csvContent = '\uFEFF' + CSV_HEADERS.join(';') + '\n' +
            '27/12/2023;Ações;PETR4;3;37,22;111,66\n' +
            '15/12/2023;FIIs;VGIR11;5;9,69;48,45';

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'modelo_importacao_investia.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    downloadDividendTemplate: () => {
        const csvContent = '\uFEFF' + DIVIDEND_HEADERS.join(';') + '\n' +
            'PROVENTOS;PETR4;DIVIDENDO;01/01/2024;15/01/2024;0,50;50,00;50,00\n' +
            'PROVENTOS;VGIR11;RENDIMENTO;31/12/2023;10/01/2024;0,11;11,00;11,00';

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'modelo_dividendos_investia.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    parseCSV: (text: string): { ticker: string; type: AssetType; quantity: number; price: number; date: string }[] => {
        // Remove BOM if present
        const cleanText = text.replace(/^\uFEFF/, '');
        const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
        const results: any[] = [];

        if (lines.length < 2) return [];

        // Detect separator
        const firstLine = lines[0];
        const separator = firstLine.includes(';') ? ';' : (firstLine.includes(',') ? ',' : ';');

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            const columns = line.split(separator);

            if (columns.length < 5) continue;

            // Updated order: [0]Data, [1]Tipo, [2]Ativo, [3]Qtd, [4]Preço
            const [dateRaw, tipoRaw, ticker, quantityRaw, priceRaw] = columns;

            // Map Portuguese labels to AssetType
            let type: AssetType = 'STOCK';
            const tipo = tipoRaw.toUpperCase();
            if (tipo.includes('FII')) type = 'FII';
            else if (tipo.includes('ETF')) type = 'ETF';
            else if (tipo.includes('BDR')) type = 'BDR';
            else if (tipo.includes('AÇ') || tipo.includes('ACAO')) type = 'ACAO';
            else if (tipo.includes('STOCK')) type = 'STOCK';

            const cleanNumber = (val: string) => {
                if (!val) return 0;
                let cleaned = val.replace(/[^\d,\.-]/g, '');
                if (cleaned.includes(',')) {
                    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
                }
                return parseFloat(cleaned);
            };

            const parseCSVDate = (dateStr: string): string => {
                if (!dateStr) return new Date().toISOString().split('T')[0];
                if (dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        const day = parts[0].padStart(2, '0');
                        const month = parts[1].padStart(2, '0');
                        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                        return `${year}-${month}-${day}`;
                    }
                }
                const d = new Date(dateStr);
                return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            };

            const quantity = cleanNumber(quantityRaw);
            const price = cleanNumber(priceRaw);

            if (ticker && !isNaN(quantity) && quantity > 0 && !isNaN(price)) {
                results.push({
                    ticker: ticker.trim().toUpperCase(),
                    type,
                    quantity,
                    price,
                    date: parseCSVDate(dateRaw.trim())
                });
            }
        }

        return results;
    }
};
