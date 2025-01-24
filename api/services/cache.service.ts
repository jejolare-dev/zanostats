import statsModel from "../models/stats.model";
import { getZanoPrice } from "../utils/methods";
import {
    generateMonthsTimestamps,
    generateWeekTimestamps,
} from "../utils/utils";

class CacheService {
    private inited: boolean = false;
    private cache: {
        zanoBured: number[];
        avgNumOfTxsPerBlocks: number[];
        avgBlocksSize: number[];
        confirmedTxs: number[];
        zanoPrice: {
            usd: number;
            usd_24h_change: number;
        };
        aliasesCount: number;
        whiteListedAssetsCount: number;
    };

    constructor() {
        this.cache = {
            zanoBured: [],
            avgNumOfTxsPerBlocks: [],
            avgBlocksSize: [],
            confirmedTxs: [],
            zanoPrice: {
                usd: 0,
                usd_24h_change: 0,
            },
            aliasesCount: 0,
            whiteListedAssetsCount: 1,
        };
    }

    init() {
        if (this.inited) return;
        this.inited = true;

        (async () => {
            while (true) {
                const PREV_YEAR = Date.now() - 3_600_000 * 24 * 7 * 30 * 12;
                const monthsTimestamps = generateMonthsTimestamps();
                const weekTimestamps = generateWeekTimestamps();

                try {
                    const burnedZanoResult = await statsModel.getZanoBurned([
                        {
                            start: PREV_YEAR,

                            end: Date.now(),
                        },
                    ]);

                    this.cache.zanoBured = burnedZanoResult;

                    const avgNumOfTxsPerBlockResult =
                        await statsModel.getAvgNumOfTxsPerBlock(
                            monthsTimestamps
                        );

                    this.cache.avgNumOfTxsPerBlocks = avgNumOfTxsPerBlockResult;

                    const avgBlockSizeResult = await statsModel.getAvgBlockSize(
                        weekTimestamps
                    );

                    this.cache.avgBlocksSize = avgBlockSizeResult;

                    const confirmedTxsResult = await statsModel.getConfirmedTxs(
                        weekTimestamps
                    );
                    this.cache.confirmedTxs = confirmedTxsResult;

                    const zanoPriceResult = await getZanoPrice();

                    this.cache.zanoPrice = zanoPriceResult.zano;

                    this.cache.aliasesCount = await statsModel.getAliasesCount();

                } catch (error) {
                    console.error(error);
                }

                await new Promise((r) => setTimeout(r, 10000));
            }
        })();
    }

    async getCachedData() {
        return this.cache;
    }
}

const cacheService = new CacheService();

export default cacheService;
