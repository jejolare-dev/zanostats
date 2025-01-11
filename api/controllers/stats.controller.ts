import { Request, Response } from "express";
import Block from "../models/block.model";
import Transaction from "../models/transaction.model";
import { Op } from "sequelize";
import Stats from "../models/stats.model";
import { formatUnixMsTimestampToSec } from "../utils/utils";

class StatsController {
    async getRegisteredAliasesCount(req: Request, res: Response) {
        const stats = await Stats.findOne({
            where: {
                id: 1,
            },
        });
        const aliasesCount = stats?.alias_count;
        return res.status(200).send({
            success: true,
            data: aliasesCount,
        });
    }

    async getRegisteredAssetsCount(req: Request, res: Response) {
        const stats = await Stats.findOne({
            where: {
                id: 1,
            },
        });
        const assetsCount = stats?.assets_count;
        return res.status(200).send({
            success: true,
            data: assetsCount,
        });
    }

    async getAvgNumberOfTxsPerBlock(req: Request, res: Response) {
        const { data } = req?.body;
        const startPeriod = data.startPeriod || 0;
        const endPeriod = data.endPeriod || Date.now();
        const stats = await Stats.findOne({
            where: {
                id: 1,
            },
        });
        const blocksCount = stats?.db_height;
        const start = formatUnixMsTimestampToSec(startPeriod);
        const end = formatUnixMsTimestampToSec(endPeriod);

        if (!blocksCount) return res.status(500);

        const blocks = await Block.findAll({
            where: {
                timestamp: {
                    [Op.gte]: start,
                    [Op.lte]: end,
                },
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
        const stats = await Stats.findOne({
            where: {
                id: 1,
            },
        });
        const burnedZano = stats?.burned_zano;
        return res.status(200).send({ success: true, data: burnedZano });
    }

    async getAvgBlockSize(req: Request, res: Response) {
        const { data } = req?.body;
        const startPeriod = data.startPeriod || 0;
        const endPeriod = data.endPeriod || Date.now();
        const start = formatUnixMsTimestampToSec(startPeriod);
        const end = formatUnixMsTimestampToSec(endPeriod);
        const stats = await Stats.findOne({
            where: {
                id: 1,
            },
        });
        const blocksCount = stats?.db_height;
        if (!blocksCount) return res.status(500);
        const blocks = await Block.findAll({
            where: {
                timestamp: {
                    [Op.gte]: start,
                    [Op.lte]: end,
                },
            },
        });

        const allBlocksSize = blocks.reduce(
            (blocksSize, block) => blocksSize + block.block_size,
            0
        );
        const avgBlockSize = allBlocksSize / blocksCount;
        return res.status(200).send({ success: true, data: avgBlockSize });
    }

    async getConfirmedTxsPerDay(req: Request, res: Response) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const start = formatUnixMsTimestampToSec(startOfDay.getTime());
        const end = formatUnixMsTimestampToSec(endOfDay.getTime());

        const dailyTxs = await Transaction.findAll({
            where: {
                timestamp: {
                    [Op.gte]: start,
                    [Op.lte]: end,
                },
            },
        });

        const stats = await Stats.findOne({
            where: {
                id: 1,
            },
        });

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
