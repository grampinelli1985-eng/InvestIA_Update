export function formatPercent(value?: number | null) {
    return typeof value === 'number'
        ? `${(value * 100).toFixed(2)}%`
        : '--';
}

export function formatNumber(value?: number | null) {
    return typeof value === 'number'
        ? value.toFixed(2)
        : '--';
}
