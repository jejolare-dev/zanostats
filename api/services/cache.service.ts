import statsModel from '../models/stats.model';
import { getZanoPrice } from '../utils/methods';
import {
	generateMonthsTimestamps,
	generateWeekTimestamps,
	generateYearsTimestamps,
} from '../utils/utils';
import { PREV_DAY, PREV_HOUR, PREV_MONTH, PREV_WEEK, PREV_YEAR } from '../constants';

type CacheDataWithOffset<T> = {
	current: T;
	offset: T;
};

type TimePeriodCacheData<T> = {
	year: CacheDataWithOffset<T>;
	day: CacheDataWithOffset<T>;
	month: CacheDataWithOffset<T>;
};

class CacheService {
	private inited: boolean = false;
	private cache: {
		zanoBured: Record<string, number>;
		avgNumOfTxsPerBlocks: TimePeriodCacheData<number[]> | object;
		avgBlocksSize: TimePeriodCacheData<number[]> | object;
		confirmedTxs: TimePeriodCacheData<number[]> | object;
		zanoPrice: {
			usd: number;
			usd_24h_change: number;
		};
		aliasesCount: Record<string, number>;
		assetsCount: Record<string, number>;
		stakingData: Record<string, number>;
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
			stakingData: {},
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

		const burnedZanoResult = await statsModel.getZanoBurned(burnedZanoTimestamps);

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
			statsModel.getAvgNumOfTxsPerBlock,
		);
	}

	async cacheAvgBlocksSize() {
		this.cache.avgBlocksSize = await this.createCacheData(statsModel.getAvgBlockSize);
	}

	async cacheConfirmedTxs() {
		this.cache.confirmedTxs = await this.createCacheData(statsModel.getConfirmedTxs);
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
		const { assets_count, whitelisted_assets_count } = await statsModel.getAssetsCount();

		this.cache.assetsCount = {
			whitelisted: whitelisted_assets_count,
			all: assets_count,
		};
	}

	async cacheStakingData() {
		const stakingData = await statsModel.getStakingData();
		this.cache.stakingData = stakingData;
	}

	init() {
		if (this.inited) return;
		this.inited = true;

		(async () => {
			while (true) {
				try {
					await Promise.allSettled([
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
		method: (_timestamps: { start: number; end: number }[]) => Promise<number[]>,
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
