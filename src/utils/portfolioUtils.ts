import { Transaction } from '../types/portfolio';

/**
 * Funçao pura para calcular o preço médio ponderado de um ativo.
 * Ignora vendas (conforme requisitos iniciais focados em estoque/posição).
 */
export const calculateAveragePrice = (transactions: Transaction[]): {
    averagePrice: number;
    totalQuantity: number;
    totalInvested: number;
} => {
    if (transactions.length === 0) {
        return { averagePrice: 0, totalQuantity: 0, totalInvested: 0 };
    }

    const buyTransactions = transactions.filter(t => t.type === 'BUY');

    const totals = buyTransactions.reduce(
        (acc, transaction) => {
            acc.totalQuantity += transaction.quantity;
            acc.totalInvested += transaction.quantity * transaction.price;
            return acc;
        },
        { totalQuantity: 0, totalInvested: 0 }
    );

    const averagePrice = totals.totalQuantity > 0
        ? totals.totalInvested / totals.totalQuantity
        : 0;

    return {
        averagePrice,
        totalQuantity: totals.totalQuantity,
        totalInvested: totals.totalInvested
    };
};
