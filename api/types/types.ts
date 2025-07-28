export type CacheDataWithOffset<T> = {
    current: T;
    offset: T;
};

export type TimePeriodCacheData<T> = {
    year: CacheDataWithOffset<T>;
    day: CacheDataWithOffset<T>;
    month: CacheDataWithOffset<T>;
};

export type TimePeriods<T> = {
    year: T;
    day: T;
    month: T;
}

export interface ICache {
    zanoBured: Record<string, number>;
    avgNumOfTxsPerBlocks: TimePeriodCacheData<number[]> | {};
    avgBlocksSize: TimePeriodCacheData<number[]> | {};
    confirmedTxs: TimePeriodCacheData<number[]> | {};
    zanoPrice: {
        usd: number;
        usd_24h_change: number;
    };
    aliasesCount: Record<string, number>;
    assetsCount: Record<string, number>;
    stakingData: Record<string, number>;
    tradeStats: {
        assets: {
            asset_id: string;
            tvl: string;
            price: string;
            name: string;
            type: string;
            market_cap: string;

            periodData: TimePeriods<{
                change: string;
                volume: string;
            }>
        }[];

        general: {
            largest_tvl: {
                asset_id: string;
                tvl: string;
            }
            total_tvl: string;

            period_data: TimePeriods<{
                active_tokens: string;
                total_volume: string;
                most_traded: {
                    asset_id: string;
                    volume: string;
                }
            }>;
        }
    }
}