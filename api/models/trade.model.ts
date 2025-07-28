import { tokensWhitelist } from "../constants/config";
import { ICache } from "../types/types";
import { fetchTradeAssetData, fetchTradeGeneralData } from "../utils/methods";

interface InputDataItem {
    start: number;
    end: number;
}

type InputData = InputDataItem[];

class TradeModel {

    async getTradeTokensData() {

        const results: ICache["tradeStats"]["assets"] = [];

        for (const targetToken of tokensWhitelist) {
            const tokenDataDay = await fetchTradeAssetData({
                asset_id: targetToken.asset_id,
                from_timestamp: +new Date().getTime() - 24 * 60 * 60 * 1000,
                to_timestamp: +new Date().getTime(),
            });

            const tokenDataMonth = await fetchTradeAssetData({
                asset_id: targetToken.asset_id,
                from_timestamp: +new Date().getTime() - 30 * 24 * 60 * 60 * 1000,
                to_timestamp: +new Date().getTime(),
            });

            const tokenDataYear = await fetchTradeAssetData({
                asset_id: targetToken.asset_id,
                from_timestamp: +new Date().getTime() - 365 * 24 * 60 * 60 * 1000,
                to_timestamp: +new Date().getTime(),
            });

            if (!tokenDataDay || !tokenDataMonth || !tokenDataYear) {
                console.error(`Failed to fetch data for token: ${targetToken.name}`);
                continue;
            }

            results.push({
                asset_id: targetToken.asset_id,
                tvl: tokenDataDay.current_tvl,
                price: tokenDataDay.current_price,
                name: targetToken.name,
                type: targetToken.type,
                market_cap: tokenDataDay.market_cap,
                periodData: {
                    day: {
                        change: tokenDataDay.period_data.price_change_percent,
                        volume: tokenDataDay.period_data.volume
                    },
                    month: {
                        change: tokenDataMonth.period_data.price_change_percent,
                        volume: tokenDataMonth.period_data.volume
                    },
                    year: {
                        change: tokenDataYear.period_data.price_change_percent,
                        volume: tokenDataYear.period_data.volume
                    }
                }
            });
        }

        return results;
    }

    async getTradeGeneralData() {
        const generalDataDay = await fetchTradeGeneralData({
            from_timestamp: +new Date().getTime() - 24 * 60 * 60 * 1000,
            to_timestamp: +new Date().getTime(),
        });

        const generalDataMonth = await fetchTradeGeneralData({
            from_timestamp: +new Date().getTime() - 30 * 24 * 60 * 60 * 1000,
            to_timestamp: +new Date().getTime(),
        });

        const generalDataYear = await fetchTradeGeneralData({
            from_timestamp: +new Date().getTime() - 365 * 24 * 60 * 60 * 1000,
            to_timestamp: +new Date().getTime(),
        });

        if (!generalDataDay || !generalDataMonth || !generalDataYear) {
            throw new Error("Failed to fetch trade general data");
        }

        return {
            largest_tvl: {
                asset_id: generalDataDay.largest_tvl.asset_id,
                tvl: generalDataDay.largest_tvl.tvl
            },
            total_tvl: generalDataDay.total_tvl,

            period_data: {
                day: generalDataDay.period_data,
                month: generalDataMonth.period_data,
                year: generalDataYear.period_data
            }
        };

    }

}
const tradeModel = new TradeModel();

export default tradeModel;
