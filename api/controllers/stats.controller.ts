import { Request, Response } from 'express';
import { getStats } from '../utils/methods';
import statsModel from '../models/stats.model';
import cacheService from '../services/cache.service';

class StatsController {
	async getCachedData(req: Request, res: Response) {
		const cachedData = await cacheService.getCachedData();
		return res.status(200).send({ success: true, data: cachedData });
	}

	async getZanoPrice(req: Request, res: Response) {
		const cachedData = await cacheService.getCachedData();
		return res.status(200).send({ success: true, data: cachedData.zanoPrice });
	}

	async getAliasesCount(req: Request, res: Response) {
		const stats = await getStats();
		if (!stats) return res.status(500);

		const { premium_alias_count, alias_count, matrix_alias_count } = stats;

		return res.status(200).send({
			success: true,
			data: {
				premium_alias_count,
				alias_count,
				matrix_alias_count,
			},
		});
	}

	async getAssetsCount(req: Request, res: Response) {
		const stats = await getStats();
		if (!stats) return res.status(500);

		const { assets_count, whitelisted_assets_count } = stats;
		return res.status(200).send({
			success: true,
			data: { assets_count, whitelisted_assets_count },
		});
	}

	async getAvgNumberOfTxsPerBlock(req: Request, res: Response) {
		const data = req.body;

		const avgNumOfTxsPerBlocks = await statsModel.getAvgNumOfTxsPerBlock(data);

		return res.status(200).send({ success: true, data: avgNumOfTxsPerBlocks });
	}

	async getZanoBurned(req: Request, res: Response) {
		const data = req.body;
		const burnedZanoResult = await statsModel.getZanoBurned(data);

		return res.status(200).send({ success: true, data: burnedZanoResult });
	}

	async getAvgBlockSize(req: Request, res: Response) {
		const data = req.body;

		const avgBlockSizes = await statsModel.getAvgBlockSize(data);

		return res.status(200).send({ success: true, data: avgBlockSizes });
	}

	async getConfirmedTxs(req: Request, res: Response) {
		const data = req.body;

		const confirmedTxs = await statsModel.getConfirmedTxs(data);

		return res.status(200).send({
			success: true,
			data: confirmedTxs,
		});
	}
}

export const statsController = new StatsController();
