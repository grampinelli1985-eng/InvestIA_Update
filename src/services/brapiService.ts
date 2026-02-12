const BRAPI_TOKEN = 'fb3mwjLZkFFyEij5jUU2DB';
const BASE_URL = 'https://brapi.dev/api';

export async function fetchQuotes(tickers: string[]) {
    if (!tickers.length) return [];

    // Dividimos os tickers em grupos de 20 para evitar limites da URL e da API
    const CHUNK_SIZE = 20;
    const chunks = [];
    for (let i = 0; i < tickers.length; i += CHUNK_SIZE) {
        chunks.push(tickers.slice(i, i + CHUNK_SIZE));
    }

    const allResults: any[] = [];

    for (const chunk of chunks) {
        const url = `${BASE_URL}/quote/${chunk.join(',')}?token=${BRAPI_TOKEN}`;
        try {
            const res = await fetch(url, {
                headers: { Accept: 'application/json' }
            });

            if (!res.ok) continue;

            const data = await res.json();
            if (data?.results) {
                allResults.push(...data.results);
            }
        } catch (error) {
            console.error("Erro ao buscar chunk de cotações:", error);
        }
    }

    return allResults;
}
