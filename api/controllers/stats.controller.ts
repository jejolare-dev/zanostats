import { Request, Response } from "express";
import Block from "../models/block.model";
import Transaction from "../models/transaction.model";
import { Op } from "sequelize";
import Decimal from "decimal.js";
import { getStats } from "../utils/methods";

class StatsController {
    async getRegisteredAliasesCount(req: Request, res: Response) {
        const stats = await getStats();
        if (!stats) return res.status(500);
        const aliasesCount = stats.alias_count;
        return res.status(200).send({
            success: true,
            data: aliasesCount,
        });
    }

    async getRegisteredAssetsCount(req: Request, res: Response) {
        const stats = await getStats();
        if (!stats) return res.status(500);
        const assetsCount = stats.assets_count;
        return res.status(200).send({
            success: true,
            data: assetsCount,
        });
    }

    async getAvgNumberOfTxsPerBlock(req: Request, res: Response) {
        const { data } = req?.body;
        const startPeriod = data?.startPeriod || 0;
        const endPeriod = data?.endPeriod || Date.now();
        const stats = await getStats();
        if (!stats) return res.status(500);
        const blocksCount = stats?.db_height;
        const start = startPeriod;
        const end = endPeriod;

        if (!blocksCount) return res.status(500);

        const blocks = await Block.findAll({
            where: {
                timestamp: {
                    [Op.gte]: start,
                    [Op.lte]: end,
                },
                raw: true,
                attributes: ["txs_count"],
            },
        });
        const allTxsCount = blocks.reduce(
            (txsCount, block) => txsCount + block.txs_count,
            0
        );
        const avgNumOfTxsPerBlock = allTxsCount / blocksCount;

        return res
            .status(200)
            .send({ success: true, data: avgNumOfTxsPerBlock });
    }

    async getZanoBurned(req: Request, res: Response) {
        const { data } = req?.body;
        const startPeriod = data?.startPeriod || 0;
        const endPeriod = data?.endPeriod || Date.now();
        const start = startPeriod;
        const end = endPeriod;

        const blocks = await Block.findAll({
            where: {
                height: {
                    [Op.gte]: 2555000,
                },
                timestamp: {
                    [Op.gte]: start,
                    [Op.lte]: end,
                },
                raw: true,
                attributes: ["total_fee"],
            },
        });
        const burnedZanoBig = blocks.reduce(
            (totalFee, block) =>
                totalFee.plus(new Decimal(Number(block.total_fee))),
            new Decimal(0)
        );
        const burnedZano = burnedZanoBig
            .dividedBy(new Decimal(10).pow(12))
            .toNumber();

        return res.status(200).send({ success: true, data: burnedZano });
    }

    async getAvgBlockSize(req: Request, res: Response) {
        const { data } = req?.body;
        const startPeriod = data?.startPeriod || 0;
        const endPeriod = data?.endPeriod || Date.now();
        const start = startPeriod;
        const end = endPeriod;
        const stats = await getStats();
        if (!stats) return res.status(500);

        const blocksCount = stats?.db_height;
        if (!blocksCount) return res.status(500);

        const blocks = await Block.findAll({
            where: {
                timestamp: {
                    [Op.gte]: start,
                    [Op.lte]: end,
                },
            },
            raw: true,
            attributes: ["block_cumulative_size"],
        });

        const allBlocksSize = blocks.reduce(
            (blocksSize, block) =>
                blocksSize.plus(new Decimal(block.block_cumulative_size)),
            new Decimal(0)
        );

        const avgBlockSize = allBlocksSize.dividedBy(blocksCount);
        return res
            .status(200)
            .send({ success: true, data: avgBlockSize.toNumber() });
    }

    async getConfirmedTxsPerDay(req: Request, res: Response) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const start = startOfDay.getTime();
        const end = endOfDay.getTime();

        const dailyTxs = await Transaction.findAll({
            where: {
                timestamp: {
                    [Op.gte]: start,
                    [Op.lte]: end,
                },
            },
            raw: true,
            attributes: ["keeper_block"],
        });

        const stats = await getStats();

        const currHeight = stats?.db_height;

        if (!currHeight) return res.status(200).send({ success: false });

        const confirmedTxs = dailyTxs.filter(
            (txs) => currHeight - txs.keeper_block > 20
        );

        return res.status(200).send({
            success: true,
            data: confirmedTxs,
        });
    }
}

export const statsController = new StatsController();
