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

                return allBlocksSize.dividedBy(blocks.length).toNumber();
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
        try {
            const stats = await getStats();
            if (!stats) throw new Error("Error at get stats");
            const { alias_count, premium_alias_count, matrix_alias_count } =
                stats;
            return { alias_count, premium_alias_count, matrix_alias_count };
        } catch (e) {
            console.error(e);
            return {
                alias_count: 0,
                premium_alias_count: 0,
                matrix_alias_count: 0,
            };
        }
    }

    async getAssetsCount() {
        try {
            const stats = await getStats();
            if (!stats) {
                throw new Error("Error at get stats");
            }
            const { assets_count, whitelisted_assets_count } = stats;
            return {
                assets_count,
                whitelisted_assets_count,
            };
        } catch (e) {
            console.error(e);
            return { assets_count: 0, whitelisted_assets_count: 0 };
        }
    }

    async getStakingData() {
        try {
            const stats = await getStats();
            if (!stats) {
                throw new Error("Error at get stats");
            }
            

            const { staked_coins, staked_percentage, APY } = stats;
            return { staked_coins, staked_percentage, APY };
        } catch (e) {
            console.error(e);
            return { staked_coins: 0, staked_percentage: 0, APY: 0 };
        }
    }
}
const statsModel = new StatsModel();

export default statsModel;
