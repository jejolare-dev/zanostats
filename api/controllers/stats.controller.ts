import { Request, Response } from "express";
import {
    getAssetsCount,
    getBlockchainHeight,
    getDbHeight,
    getInfo,
} from "../utils/methods";
import Block from "../models/block.model";
import Stats from "../models/stats.model";
import Transaction from "../models/transaction.model";
import { Op } from "sequelize";

class StatsController {
    async getRegisteredAliasesCount(req: Request, res: Response) {
        const info = await getInfo();
        if (!info?.result?.alias_count) {
            return res.status(200).send({ success: false });
        }
        return res.status(200).send({
            success: true,
            data: info?.result?.alias_count,
        });
    }

    async getRegisteredAssetsCount(req: Request, res: Response) {
        const assetsCount = await getAssetsCount();
        if (!assetsCount) {
            return res.status(200).send({ success: false });
        }
        return res.status(200).send({
            success: true,
            data: assetsCount,
        });
    }

    async getAvgNumberOfTxsPerBlock(req: Request, res: Response) {
        const blocksCount = await getDbHeight();
        const blocks = await Block.findAll();
        const allTxsCount = blocks.reduce(
            (txsCount, block) => txsCount + block.txs_count,
            0
        );
        const avgNumOfTxsPerBlock = (allTxsCount / blocksCount).toFixed(0);
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
        if (!stats) return res.status(200).send({ success: false });
        const { burned_zano } = stats;
        return res.status(200).send({ success: true, data: burned_zano });
    }

    async getAvgBlockSize(req: Request, res: Response) {
        const blocksCount = await getDbHeight();
        const blocks = await Block.findAll();

        const allBlocksSize = blocks.reduce(
            (blocksSize, block) => blocksSize + block.block_size,
            0
        );
        const avgBlockSize = (allBlocksSize / blocksCount).toFixed(0);
        return res.status(200).send({ success: true, data: avgBlockSize });
    }

    async getConfirmedTxsPerDay(req: Request, res: Response) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const dailyTxs = await Transaction.findAll({
            where: {
                timestamp: {
                    [Op.gte]: startOfDay,
                    [Op.lte]: endOfDay,
                },
            },
        });
        const currHeight = await getBlockchainHeight();

        if (!currHeight) return res.status(200).send({ success: false });

        const dailyConfirmedTxs = dailyTxs.filter(
            (txs) => currHeight - txs.keeper_block > 20
        );

        return res.status(200).send({
            success: true,
            data: dailyConfirmedTxs,
        });
    }
}

export const statsController = new StatsController();
