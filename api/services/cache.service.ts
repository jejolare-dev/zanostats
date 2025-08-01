import statsModel from "../models/stats.model";
import { getZanoPrice } from "../utils/methods";
import {
    generateMonthsTimestamps,
    generateWeekTimestamps,
    generateYearsTimestamps,
} from "../utils/utils";
import {
    PREV_DAY,
    PREV_HOUR,
    PREV_MONTH,
    PREV_WEEK,
    PREV_YEAR,
} from "@/api/constants";
import tradeModel from "../models/trade.model";
import { ICache } from "../types/types";

class CacheService {
    private inited: boolean = false;
    private cache: ICache;

    constructor() {
        this.cache = {
            zanoBured: {},
            avgNumOfTxsPerBlocks: {},
            avgBlocksSize: {},
            confirmedTxs: {},
            zanoPrice: {
                usd: 0,
                usd_24h_change: 0,
            },
            aliasesCount: {},
            assetsCount: {},
            stakingData: {},
            tradeStats: {
                assets: [],
                general: {
                    largest_tvl: {
                        asset_id: "",
                        tvl: "0",
                        ticker: ""
                    },
                    total_tvl: "0",
                    period_data: {
                        week: {
                            active_tokens: "0",
                            total_volume: "0",
                            most_traded: {
                                asset_id: "",
                                volume: "0",
                            },
                        },
                        month: {
                            active_tokens: "0",
                            total_volume: "0",
                            most_traded: {
                                asset_id: "",
                                volume: "0",
                            },
                        },
                        year: {
                            active_tokens: "0",
                            total_volume: "0",
                            most_traded: {
                                asset_id: "",
                                volume: "0",
                            },
                        },
                    },
                }
            }
        };
    }

    async cacheBurnedData() {
        const burnedZanoTimestamps = [
            PREV_HOUR(),
            PREV_DAY(),
            PREV_WEEK(),
            PREV_MONTH(),
            PREV_YEAR(),
            0,
        ].map((start) => {
            return {
                start,
                end: Date.now(),
            };
        });

        const burnedZanoResult = await statsModel.getZanoBurned(
            burnedZanoTimestamps
        );

        const [
            burnedZanoHour,
            burnedZanoDay,
            burnedZanoWeek,
            burnedZanoMonth,
            burnedZanoYear,
            burnedZanoAll,
        ] = burnedZanoResult;

        this.cache.zanoBured = {
            hour: burnedZanoHour,
            day: burnedZanoDay,
            week: burnedZanoWeek,
            month: burnedZanoMonth,
            year: burnedZanoYear,
            all: burnedZanoAll,
        };
    }

    async cacheAvgNumOfTxsPerBlocks() {
        this.cache.avgNumOfTxsPerBlocks = await this.createCacheData(
            statsModel.getAvgNumOfTxsPerBlock
        );
    }

    async cacheAvgBlocksSize() {
        this.cache.avgBlocksSize = await this.createCacheData(
            statsModel.getAvgBlockSize
        );
    }

    async cacheConfirmedTxs() {
        this.cache.confirmedTxs = await this.createCacheData(
            statsModel.getConfirmedTxs
        );
    }

    async cacheZanoPrice() {
        const zanoPriceResult = await getZanoPrice();

        this.cache.zanoPrice = zanoPriceResult.zano;
    }

    async cacheAliases() {
        const { alias_count, premium_alias_count, matrix_alias_count } =
            await statsModel.getAliasesCount();

        this.cache.aliasesCount = {
            in_matrix: matrix_alias_count,
            all: alias_count,
            premium: premium_alias_count,
        };
    }

    async cacheAssets() {
        const { assets_count, whitelisted_assets_count } =
            await statsModel.getAssetsCount();

        this.cache.assetsCount = {
            whitelisted: whitelisted_assets_count,
            all: assets_count,
        };
    }

    async cacheStakingData() {
        const stakingData = await statsModel.getStakingData();
        this.cache.stakingData = stakingData;
    }

    async cacheTradeStats() {
        const tokensData = await tradeModel.getTradeTokensData();
        this.cache.tradeStats.assets = tokensData;
        const generalData = await tradeModel.getTradeGeneralData();

        if (!generalData) {
            throw new Error("Failed to fetch trade general data");
        } 

        this.cache.tradeStats.general = generalData;
    }

    init() {
        if (this.inited) return;
        this.inited = true;

        (async () => {
            while (true) {
                try {
                    await Promise.allSettled([
                        this.cacheTradeStats(),
                        this.cacheBurnedData(),
                        this.cacheAvgNumOfTxsPerBlocks(),
                        this.cacheAvgBlocksSize(),
                        this.cacheConfirmedTxs(),
                        this.cacheZanoPrice(),
                        this.cacheAliases(),
                        this.cacheAssets(),
                        this.cacheStakingData(),
                    ]);
                } catch (error) {
                    console.error(error);
                }

                await new Promise((r) => setTimeout(r, 10_000));
            }
        })();
    }

    async createCacheData(
        method: (
            timestamps: { start: number; end: number }[]
        ) => Promise<number[]>
    ) {
        const monthsTimestamps = generateMonthsTimestamps();
        const weekTimestamps = generateWeekTimestamps();
        const yearsTimestamps = generateYearsTimestamps();
        const dayCurrent = await method(weekTimestamps);
        const dayOffset = await method([
            {
                start: PREV_DAY(),
                end: Date.now(),
            },
        ]);
        const monthCurrent = await method(monthsTimestamps);
        const monthOffset = await method([
            {
                start: PREV_MONTH(),
                end: Date.now(),
            },
        ]);
        const yearCurrent = await method(yearsTimestamps);
        const yearOffset = await method([
            {
                start: PREV_YEAR(),
                end: Date.now(),
            },
        ]);

        return {
            day: {
                current: dayCurrent,
                offset: dayOffset,
            },
            month: {
                current: monthCurrent,
                offset: monthOffset,
            },
            year: {
                current: yearCurrent,
                offset: yearOffset,
            },
        };
    }
    async getCachedData() {
        return this.cache;
    }
}

const cacheService = new CacheService();

export default cacheService;
