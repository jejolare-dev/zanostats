import Decimal from "decimal.js";
import { tokensWhitelist } from "../constants/config";
import { ICache } from "../types/types";
import { fetchTradeAssetData, fetchTradeGeneralData, fetchTradeStatsInPeriod } from "../utils/methods";
import { fetchMexcData, SimpleStats } from "../utils/mexc";
import { generateMonthsTimestamps, generateWeekTimestamps } from "../utils/utils";
import { TradeAssetStats } from "../types/api";

const ZANO_ASSET_ID = "d6329b5b1f7c0805b5c345f4957554002a2f557845f64d7645dae0e051a6498a";
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

                const tradeTokenData = await (async () => {

                    if (targetToken.asset_id === ZANO_ASSET_ID) {
                        return null;
                    }

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
                    

                    return {
                        day: tokenDataDay,
                        month: tokenDataMonth,
                        year: tokenDataYear,
                    }
                })();


                const totalCoins = await (async () => {
                    if (targetToken.asset_id === ZANO_ASSET_ID) {
                        const total = await fetch('https://explorer.zano.org/api/get_total_coins').then(res => res.text());

                        if (!parseInt(total)) {
                            throw new Error("Failed to fetch total coins from Zano explorer");
                        }

                        return total;
                    } else {
                        return tradeTokenData?.day?.current_supply || "0";
                    }
                })() || "0";

                const Tvl = (new Decimal(dataDay.price)
                    .mul(new Decimal(totalCoins)))
                    .div(new Decimal(zanoData.price))
                    .toString();
                const MC = Tvl;

                function getPeriodData(period: "day" | "month" | "year") {

                    const mexcPeriodData = period === "day" ? dataDay : period === "month" ? dataMonth : dataYear;

                    const tradePeriodData = tradeTokenData ? tradeTokenData[period] : null;

                    return {
                        change: ZANO_ASSET_ID === targetToken.asset_id ? 
                            mexcPeriodData.changePercent.toString() :
                            tradePeriodData?.period_data.price_change_percent?.toString() || "0",

                        volume: ZANO_ASSET_ID === targetToken.asset_id ?
                            new Decimal(mexcPeriodData.volume).div(new Decimal(zanoData.price)).toString() :
                            new Decimal(tradePeriodData?.period_data.volume || "0").toString()
                    };
                }



                results.push({
                    asset_id: targetToken.asset_id,
                    tvl: Tvl.toString(),
                    // Frontend expects all data in Zano (not USD) it for all other assets   
                    price: new Decimal(dataDay.price).div(new Decimal(zanoData.price)).toString(),
                    name: tradeTokenData?.day?.name || "Zano",
                    type: targetToken.type,
                    market_cap: MC.toString(),
                    ticker: tradeTokenData?.day?.ticker || "ZANO",
                    current_supply: totalCoins,
                    periodData: {
                        day: getPeriodData("day"),
                        month: getPeriodData("month"),
                        year: getPeriodData("year")
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
                            volume: new Decimal(tokenDataDay.period_data.volume).toString()
                        },
                        month: {
                            change: tokenDataMonth.period_data.price_change_percent,
                            volume: new Decimal(tokenDataMonth.period_data.volume).toString()
                        },
                        year: {
                            change: tokenDataYear.period_data.price_change_percent,
                            volume: new Decimal(tokenDataYear.period_data.volume).toString()
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
