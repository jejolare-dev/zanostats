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

class CacheService {
    private inited: boolean = false;
    private cache: {
        zanoBured: Record<string, number>;
        avgNumOfTxsPerBlocks: Record<string, number[]>;
        avgBlocksSize: Record<string, number[]>;
        confirmedTxs: Record<string, number[]>;
        zanoPrice: {
            usd: number;
            usd_24h_change: number;
        };
        aliasesCount: Record<string, number>;
        assetsCount: Record<string, number>;
    };

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
        };
    }

    init() {
        if (this.inited) return;
        this.inited = true;

        (async () => {
            while (true) {
                const monthsTimestamps = generateMonthsTimestamps();
                const weekTimestamps = generateWeekTimestamps();
                const yearsTimestamps = generateYearsTimestamps();

                try {
                    const burnedZanoTimestamps = [
                        PREV_HOUR,
                        PREV_DAY,
                        PREV_WEEK,
                        PREV_MONTH,
                        PREV_YEAR,
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

                    this.cache.avgNumOfTxsPerBlocks = {
                        day: await statsModel.getAvgNumOfTxsPerBlock(
                            weekTimestamps
                        ),
                        month: await statsModel.getAvgNumOfTxsPerBlock(
                            monthsTimestamps
                        ),
                        year: await statsModel.getAvgNumOfTxsPerBlock(
                            yearsTimestamps
                        ),
                    };

                    this.cache.avgBlocksSize = {
                        day: await statsModel.getAvgBlockSize(weekTimestamps),
                        month: await statsModel.getAvgBlockSize(
                            monthsTimestamps
                        ),
                        year: await statsModel.getAvgBlockSize(yearsTimestamps),
                    };

                    this.cache.confirmedTxs = {
                        day: await statsModel.getConfirmedTxs(weekTimestamps),
                        month: await statsModel.getConfirmedTxs(
                            monthsTimestamps
                        ),
                        year: await statsModel.getConfirmedTxs(yearsTimestamps),
                    };

                    const zanoPriceResult = await getZanoPrice();

                    this.cache.zanoPrice = zanoPriceResult.zano;

                    const {
                        alias_count,
                        premium_alias_count,
                        matrix_alias_count,
                    } = await statsModel.getAliasesCount();

                    this.cache.aliasesCount = {
                        in_matrix: matrix_alias_count,
                        all: alias_count,
                        premium: premium_alias_count,
                    };

                    const { assets_count, whitelisted_assets_count } =
                        await statsModel.getAssetsCount();

                    this.cache.assetsCount = {
                        whitelisted: whitelisted_assets_count,
                        all: assets_count,
                    };
                } catch (error) {
                    console.error(error);
                }

                await new Promise((r) => setTimeout(r, 10_000));
            }
        })();
    }

    async getCachedData() {
        return this.cache;
    }
}

const cacheService = new CacheService();

export default cacheService;
