export interface TradeAssetStats {
    name: string;
    ticker: string;
    current_tvl: string;
    current_price: string;
    change_24h_percent: string;
    volume_24h: string;
    market_cap: string;
    period_data: {
        price_change_percent: string;
        volume: string;
    }
}

export interface TradeAssetStatsResponse {
    success: boolean;
    data: TradeAssetStats;
}

export interface TradeGeneralStats {
    largest_tvl: {
        asset_id: string;
        tvl: string;
        ticker: string;
    };
    total_tvl: string;
    period_data: {
        active_tokens: string;
        most_traded: {
            asset_id: string;
            volume: string;
        };
        total_volume: string;
    };
}

export interface TradeGeneralStatsResponse {
    success: boolean;
    data: TradeGeneralStats;
}