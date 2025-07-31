import Decimal from "decimal.js";
import { tokensWhitelist } from "../constants/config";
import { ICache } from "../types/types";
import { fetchTradeAssetData, fetchTradeGeneralData } from "../utils/methods";
import { fetchZanoMexcData } from "../utils/mexc";

interface InputDataItem {
    start: number;
    end: number;
}

type InputData = InputDataItem[];

class TradeModel {

    async getTradeTokensData() {

        
        const results: ICache["tradeStats"]["assets"] = [];

        const zanoDataDay = await fetchZanoMexcData("day");
        const zanoDataMonth = await fetchZanoMexcData("month");
        const zanoDataYear = await fetchZanoMexcData("year");

        if (!zanoDataDay || !zanoDataMonth || !zanoDataYear) {
            throw new Error("Failed to fetch Zano data from MEXC");
        }


        const totalCoins = await fetch('https://explorer.zano.org/api/get_total_coins').then(res => res.text());
        
        if (!parseInt(totalCoins)) {
            throw new Error("Failed to fetch total coins from Zano explorer");
        }

        // We need data in Zano (not USD) as frontend expects it for all other assets
        const Tvl = totalCoins;

        const MC = Tvl;
        

        results.push({
            asset_id: "ZANO",
            tvl: Tvl.toString(),
            price: zanoDataDay.price?.toString() || "0",
            name: "Zano",
            type: "Native coin",
            market_cap: MC.toString(),
            ticker: "ZANO",
            current_supply: "0",
            periodData: {
                day: {
                    change: zanoDataDay.changePercent?.toString() || "0",
                    volume: zanoDataDay.volume?.toString() || "0"
                },
                month: {
                    change: zanoDataMonth.changePercent?.toString() || "0",
                    volume: zanoDataMonth.volume?.toString() || "0"
                },
                year: {
                    change: zanoDataYear.changePercent?.toString() || "0",
                    volume: zanoDataYear.volume?.toString() || "0"
                }
            }
        });


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
                console.error(`Failed to fetch data for token`);
                continue;
            }

            results.push({
                asset_id: targetToken.asset_id,
                tvl: tokenDataDay.current_tvl,
                price: tokenDataDay.current_price,
                name: tokenDataDay.name,
                type: targetToken.type,
                market_cap: tokenDataDay.market_cap,
                current_supply: tokenDataDay.current_supply,
                ticker: tokenDataDay.ticker,
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

        // fetching Zano data from MEXC as we don't have it in Trade API

        return results;
    }

    async getTradeGeneralData() {
        const generalDataWeek = await fetchTradeGeneralData({
            from_timestamp: +new Date().getTime() - 7 * 24 * 60 * 60 * 1000,
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

        if (!generalDataWeek || !generalDataMonth || !generalDataYear) {
            throw new Error("Failed to fetch trade general data");
        }

        return {
            largest_tvl: {
                asset_id: generalDataWeek.largest_tvl.asset_id,
                tvl: generalDataWeek.largest_tvl.tvl,
            },
            total_tvl: generalDataWeek.total_tvl,

            period_data: {
                week: generalDataWeek.period_data,
                month: generalDataMonth.period_data,
                year: generalDataYear.period_data
            }
        };

    }

}
const tradeModel = new TradeModel();

export default tradeModel;
