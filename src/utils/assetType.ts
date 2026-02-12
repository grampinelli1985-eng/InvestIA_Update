export function isBrazilianTicker(ticker: string) {
    return /^[A-Z]{4}\d{1,2}$/.test(ticker) || ticker.endsWith('11');
}

export function isFII(ticker: string) {
    return ticker.endsWith('11');
}
