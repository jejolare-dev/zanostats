import { Op } from "sequelize";
import Block from "../schemes/block.model";
import Transaction from "../schemes/transaction.model";

import Decimal from "decimal.js";
import { getDbHeight, getStats } from "../utils/methods";

interface InputDataItem {
    start: number;
    end: number;
}

type InputData = InputDataItem[];

class StatsModel {
    async getZanoBurned(data: InputData) {
        return await Promise.all(
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
    }

    async getAvgNumOfTxsPerBlock(data: InputData) {
        return await Promise.all(
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
                const avgNumOfTxsPerBlock = allTxsCount / blocks.length;
                console.log("avgNumOfTxsPerBlock: ", {
                    avgNumOfTxsPerBlock,
                    allTxsCount,
                    blocksLength: blocks.length,
                });
                return avgNumOfTxsPerBlock;
            })
        );
    }

    async getAvgBlockSize(data: InputData) {
        const blocksCount = await getDbHeight();
        return await Promise.all(
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
    }

    async getConfirmedTxs(data: InputData) {
        const height = await getDbHeight();
        return await Promise.all(
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

                return txs.filter((tx) => height - tx.keeper_block > 20).length;
            })
        );
    }

    async getAliasesCount() {
        const stats = await getStats();
        if (!stats) {
            return {
                alias_count: 0,
                premium_alias_count: 0,
                matrix_alias_count: 0,
            };
        }

        const { alias_count, premium_alias_count, matrix_alias_count } = stats;

        return { alias_count, premium_alias_count, matrix_alias_count };
    }

    async getAssetsCount() {
        const stats = await getStats();
        if (!stats) {
            return {
                assets_count: 0,
                whitelisted_assets_count: 0,
            };
        }
        const { assets_count, whitelisted_assets_count } = stats;
        return {
            assets_count,
            whitelisted_assets_count,
        };
    }
}
const statsModel = new StatsModel();

export default statsModel;
