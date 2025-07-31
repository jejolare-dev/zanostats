import { Request, Response } from "express";
import { fetchTradeAssetData } from "../utils/methods";

class AssetController {
    async getTokenStatsAllPeriods(req: Request, res: Response) {
        const { asset_id } = req.body;

        if (!asset_id) {
            return res.status(400).json({
                success: false,
                error: "asset_id is required",
            });
        }
        
        try {
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;
            const oneMonth = 30 * oneDay;
            const oneYear = 365 * oneDay;

            const [tokenDataDay, tokenDataMonth, tokenDataYear] = await Promise.all([
                fetchTradeAssetData({
                    asset_id,
                    from_timestamp: now - oneDay,
                    to_timestamp: now,
                }),
                fetchTradeAssetData({
                    asset_id,
                    from_timestamp: now - oneMonth,
                    to_timestamp: now,
                }),
                fetchTradeAssetData({
                    asset_id,
                    from_timestamp: now - oneYear,
                    to_timestamp: now,
                }),
            ]);

            if (!tokenDataDay || !tokenDataMonth || !tokenDataYear) {
                return res.status(404).json({
                    success: false,
                    error: "Token data not found",
                });
            }

            const result = {
                asset_id,
                tvl: tokenDataDay.current_tvl,
                price: tokenDataDay.current_price,
                name: tokenDataDay.name,
                market_cap: tokenDataDay.market_cap,
                current_supply: tokenDataDay.current_supply,
                ticker: tokenDataDay.ticker,
                type: null,
                periodData: {
                    day: {
                        change: tokenDataDay.period_data.price_change_percent,
                        volume: tokenDataDay.period_data.volume,
                    },
                    month: {
                        change: tokenDataMonth.period_data.price_change_percent,
                        volume: tokenDataMonth.period_data.volume,
                    },
                    year: {
                        change: tokenDataYear.period_data.price_change_percent,
                        volume: tokenDataYear.period_data.volume,
                    },
                },
            };

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            console.error("getTokenStatsAllPeriods error:", error);
            return res.status(500).json({
                success: false,
                error: error.message || "Internal server error",
            });
        }
    }
}

export const assetController = new AssetController();
