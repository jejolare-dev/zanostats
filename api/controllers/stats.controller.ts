import { Request, Response } from "express";
import Block from "../models/block.model";
import Transaction from "../models/transaction.model";
import { Op } from "sequelize";
import Decimal from "decimal.js";
import { getStats } from "../utils/methods";

class StatsController {
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
        const stats = await getStats();
        if (!stats) return res.status(500);
        const blocksCount = stats.db_height;
        if (!blocksCount) return res.status(500);

        const avgNumOfTxsPerBlocks = await Promise.all(
            data.map(async (timestamp: { start: number; end: number }) => {
                const { start, end } = timestamp;
                const blocks = await Block.findAll({
                    where: {
                        timestamp: {
                            [Op.gte]: start,
                            [Op.lte]: end,
                        },
                    },
                    raw: true,
                    attributes: ["txs_count"],
                });
                const allTxsCount = blocks.reduce(
                    (txsCount, block) => txsCount + block.txs_count,
                    0
                );
                const avgNumOfTxsPerBlock = allTxsCount / blocksCount;
                return avgNumOfTxsPerBlock;
            })
        );

        return res
            .status(200)
            .send({ success: true, data: avgNumOfTxsPerBlocks });
    }

    async getZanoBurned(req: Request, res: Response) {
        const data = req.body;
        const burnedZanoResult = await Promise.all(
            data.map(async (timestamp: { start: number; end: number }) => {
                const { start, end } = timestamp;
                const blocks = await Block.findAll({
                    where: {
                        height: {
                            [Op.gte]: 2555000,
                        },
                        timestamp: {
                            [Op.gte]: start,
                            [Op.lte]: end,
                        },
                    },
                    raw: true,
                    attributes: ["total_fee"],
                });
                const burnedZanoBig = blocks.reduce(
                    (totalFee, block) =>
                        totalFee.plus(new Decimal(Number(block.total_fee))),
                    new Decimal(0)
                );

                return burnedZanoBig
                    .dividedBy(new Decimal(10).pow(12))
                    .toNumber();
            })
        );

        return res.status(200).send({ success: true, data: burnedZanoResult });
    }

    async getAvgBlockSize(req: Request, res: Response) {
        const data = req.body;
        const stats = await getStats();
        if (!stats) return res.status(500);
        const blocksCount = stats?.db_height;
        if (!blocksCount) return res.status(500);

        const avgBlockSizes = await Promise.all(
            data.map(async (timestamp: { start: number; end: number }) => {
                const { start, end } = timestamp;
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
                        blocksSize.plus(
                            new Decimal(block.block_cumulative_size)
                        ),
                    new Decimal(0)
                );

                return allBlocksSize.dividedBy(blocksCount).toNumber();
            })
        );

        return res.status(200).send({ success: true, data: avgBlockSizes });
    }

    async getConfirmedTxs(req: Request, res: Response) {
        const data = req.body;
        const stats = await getStats();
        const currHeight = stats?.db_height;
        if (!currHeight) {
            return res.status(500).send({ success: false });
        }
        const confirmedTxs = await Promise.all(
            data.map(async (timestamp: { start: number; end: number }) => {
                const { start, end } = timestamp;
                const key = end.toString();
                const txs = await Transaction.findAll({
                    where: {
                        timestamp: {
                            [Op.gte]: start,
                            [Op.lte]: end,
                        },
                    },
                    raw: true,
                    attributes: ["keeper_block"],
                });

                return txs.filter((tx) => currHeight - tx.keeper_block > 20)
                    .length;
            })
        );
        return res.status(200).send({
            success: true,
            data: confirmedTxs,
        });
    }
}

export const statsController = new StatsController();
