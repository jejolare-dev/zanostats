import Decimal from "decimal.js";
import { tokensWhitelist } from "../constants/config";
import { ICache } from "../types/types";
import { fetchTradeAssetData, fetchTradeGeneralData, fetchTradeStatsInPeriod } from "../utils/methods";
import { fetchMexcData } from "../utils/mexc";
import { generateMonthsTimestamps, generateWeekTimestamps } from "../utils/utils";

class TradeModel {

    async getTradeTokensData() {

        const zanoData = await fetchMexcData("day", "ZANOUSDT");

        const results: ICache["tradeStats"]["assets"] = [];

        for (const targetToken of tokensWhitelist) {

            if (targetToken.mexc_pair) {
                console.log(`Fetching MEXC data for token: ${targetToken.asset_id}`);

                const dataDay = await fetchMexcData("day", targetToken.mexc_pair);
                const dataMonth = await fetchMexcData("month", targetToken.mexc_pair);
                const dataYear = await fetchMexcData("year", targetToken.mexc_pair);


                if (!dataDay || !dataMonth || !dataYear) {
                    throw new Error("Failed to fetch data from MEXC");
                }

                const tokenDataFromTrade = await fetchTradeAssetData({
                    asset_id: targetToken.asset_id,
                    from_timestamp: +new Date().getTime(),
                    to_timestamp: +new Date().getTime(),
                }).catch(() => null);


                const totalCoins = await (async () => {
                    if (targetToken.asset_id === "d6329b5b1f7c0805b5c345f4957554002a2f557845f64d7645dae0e051a6498a") {
                        const total = await fetch('https://explorer.zano.org/api/get_total_coins').then(res => res.text());

                        if (!parseInt(total)) {
                            throw new Error("Failed to fetch total coins from Zano explorer");
                        }

                        return total;
                    } else {
                        return tokenDataFromTrade?.current_supply || "0";
                    }
                })() || "0";

                const Tvl = (new Decimal(dataDay.price)
                    .mul(new Decimal(totalCoins)))
                    .div(new Decimal(zanoData.price))
                    .toString();
                const MC = Tvl;


                results.push({
                    asset_id: targetToken.asset_id,
                    tvl: Tvl.toString(),
                    // Frontend expects all data in Zano (not USD) it for all other assets   
                    price: new Decimal(dataDay.price).div(new Decimal(zanoData.price)).toString(),
                    name: tokenDataFromTrade?.name || "Zano",
                    type: targetToken.type,
                    market_cap: MC.toString(),
                    ticker: tokenDataFromTrade?.ticker || "ZANO",
                    current_supply: totalCoins,
                    periodData: {
                        day: {
                            change: dataDay.changePercent?.toString() || "0",
                            volume: new Decimal(dataDay.volume).div(new Decimal(zanoData.price)).toString()
                        },
                        month: {
                            change: dataMonth.changePercent?.toString() || "0",
                            volume: new Decimal(dataMonth.volume).div(new Decimal(zanoData.price)).toString()
                        },
                        year: {
                            change: dataYear.changePercent?.toString() || "0",
                            volume: new Decimal(dataYear.volume).div(new Decimal(zanoData.price)).toString()
                        }
                    }
                });

                await new Promise(resolve => setTimeout(resolve, 1000)); // Throttle requests to avoid rate limiting
            } else {
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
                            volume: new Decimal(tokenDataDay.period_data.volume).div(new Decimal(zanoData.price)).toString()
                        },
                        month: {
                            change: tokenDataMonth.period_data.price_change_percent,
                            volume: new Decimal(tokenDataMonth.period_data.volume).div(new Decimal(zanoData.price)).toString()
                        },
                        year: {
                            change: tokenDataYear.period_data.price_change_percent,
                            volume: new Decimal(tokenDataYear.period_data.volume).div(new Decimal(zanoData.price)).toString()
                        }
                    }
                });
            }
        }

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
                ticker: generalDataWeek.largest_tvl.ticker,
            },
            total_tvl: generalDataWeek.total_tvl,

            period_data: {
                week: generalDataWeek.period_data,
                month: generalDataMonth.period_data,
                year: generalDataYear.period_data
            }
        };

    }


    async cacheTotalHistoricalData() {
        const dayTimestamps = generateWeekTimestamps();
        const monthTimestamps = generateMonthsTimestamps();

        const week = await Promise.all(
            dayTimestamps.map(async ({ start, end }) => {
                try {
                    return await fetchTradeStatsInPeriod(start, end);
                } catch (e) {
                    console.error("Failed to fetch daily trade stats", e);
                    return { volume: 0, tvl: 0 };
                }
            })
        );

        const month = await Promise.all(
            monthTimestamps.map(async ({ start, end }) => {
                try {
                    return await fetchTradeStatsInPeriod(start, end);
                } catch (e) {
                    console.error("Failed to fetch monthly trade stats", e);
                    return { volume: 0, tvl: 0 };
                }
            })
        );

        return {
            week,
            month,
        };
    }
}
const tradeModel = new TradeModel();

export default tradeModel;
