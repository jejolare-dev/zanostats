type Kline = [
    number,   // open time
    string,   // open
    string,   // high
    string,   // low
    string,   // close
    string,   // volume (base asset)
    number,   // close time
    string    // quote asset volume (USDT)
];

interface SimpleStats {
    price: number;
    changePercent: number;
    volume: number;
}

export function getStats(klines: Kline[]): SimpleStats {
    if (!klines.length) return {
        price: 0,
        changePercent: 0,
        volume: 0
    }

    const price = parseFloat(klines[klines.length - 1][4]);

    const openPrice = parseFloat(klines[0][1]);

    const changePercent = ((price - openPrice) / openPrice) * 100;

    const volume = klines.reduce((sum, k) => sum + parseFloat(k[7]), 0);

    return {
        price,
        changePercent,
        volume
    };
}

export async function fetchMexcData(term: 'day' | 'month' | 'year', symbol: string): Promise<SimpleStats> {


    const startTime = (() => {
        const now = Date.now();
        let startTime = 0;

        switch (term) {
            case "day":
                startTime = now - 24 * 60 * 60 * 1000;
                break;
            case "month":
                startTime = now - 30 * 24 * 60 * 60 * 1000;
                break;
            case "year":
                startTime = now - 365 * 24 * 60 * 60 * 1000;
                break;
            default:
                throw new Error("Invalid term for fetching Zano data");
        }

        return startTime;
    })();

    console.log(`https://api.mexc.com/api/v3/klines?symbol=${symbol}&interval=1d&startTime=${startTime}&endTime=${+new Date()}`);
    

    const response = await fetch(
        `https://api.mexc.com/api/v3/klines?symbol=${symbol}&interval=1d&startTime=${startTime}&endTime=${+new Date()}`
    );

    
    if (!response.ok) {
        console.error(response);
        throw new Error("Failed to fetch data from MEXC");
    }

    const data = await response.json();
    const klines: Kline[] = data;


    return getStats(klines);

}