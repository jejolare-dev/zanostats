import axios from "axios";
import Stats from "../models/stats.model";
import Block from "../models/block.model";
import Transaction from "../models/transaction.model";
import logger from "../logger";
import {
    getTxsFromBlocks,
    transformBlockDataForDb,
    transformTxDataForDb,
} from "./utils";
import { Op } from "sequelize";
import Decimal from "decimal.js";

const zanoURL = process.env.ZANOD_URL || "http://37.27.100.59:10500/json_rpc";

export async function init() {
    const stats = await Stats.findOne({
        where: {
            id: 1,
        },
    });
    if (!stats) {
        await Stats.create();

        const firstBlocks = await getBlocksDetails(0, 100);
        const firstTxs = getTxsFromBlocks(firstBlocks);
        const transformedToDbBlocks = firstBlocks.map(transformBlockDataForDb);
        const transformedToDbTxs = firstTxs.map(transformTxDataForDb);
        await Block.bulkCreate(transformedToDbBlocks, {
            ignoreDuplicates: true,
        });
        await Transaction.bulkCreate(transformedToDbTxs, {
            ignoreDuplicates: true,
        });
    }
}

export async function getInfo() {
    try {
        const info = await axios.post(zanoURL, {
            id: 0,
            jsonrpc: "2.0",
            method: "getinfo",
            params: {
                flags: 1048575,
            },
        });

        return info.data as any;
    } catch (e) {
        console.error(e);
    }
}

export async function getAssetsCount() {
    try {
        const result: any = await axios.post(zanoURL, {
            id: 0,
            jsonrpc: "2.0",
            method: "get_assets_list",
            params: {
                count: Number.MAX_SAFE_INTEGER,
                offset: 0,
            },
        });
        if (!result.data.result) {
            throw "Fetch data error";
        }

        const count = result.data.result.assets.length;

        return count;
    } catch (e) {
        console.error(e);
    }
}

export async function getBlockchainHeight() {
    try {
        const result: any = await axios.post(
            `http://37.27.100.59:10500/getheight`,
            {}
        );
        return result.data.height;
    } catch (e) {
        console.error(e);
    }
}

export async function getDbHeight() {
    try {
        const stats = await Stats.findOne({
            where: {
                id: 1,
            },
        });
        return stats?.db_height as any;
    } catch (e) {
        console.error(e);
    }
}

async function updateDbHeight(newHeight: number) {
    try {
        const stats = await Stats.findOne({
            where: {
                id: 1,
            },
        });
        await stats?.update({ db_height: newHeight });
    } catch (e) {
        console.error(e);
    }
}

async function getBlocksDetails(fromHeight: number, count: number) {
    try {
        const result: any = await axios.post(zanoURL, {
            id: 0,
            jsonrpc: "2.0",
            method: "get_blocks_details",
            params: {
                count,
                height_start: fromHeight,
                ignore_transactions: false,
            },
        });
        return result.data.result.blocks;
    } catch (e) {
        console.error(e);
    }
}

export async function syncBlocks() {
    try {
        let databaseHeight = await getDbHeight();
        const blockchainHeight = await getBlockchainHeight();

        while (blockchainHeight - databaseHeight > 100) {
            const blockPromises = Array.from({ length: 10 }, () => {
                if (blockchainHeight - databaseHeight <= 100) return;
                if (databaseHeight + 100 > blockchainHeight) return;
                return getBlocksDetails((databaseHeight += 100), 100);
            }).filter(Boolean);

            const blocksPack = await Promise.all(blockPromises);
            const blocks = blocksPack.flat(Infinity);

            const txs = getTxsFromBlocks(blocks);
            const transformedToDbBlocks = blocks.map(transformBlockDataForDb);
            const transformedToDbTxs = txs.map(transformTxDataForDb);

            await Block.bulkCreate(transformedToDbBlocks, {
                ignoreDuplicates: true,
            });
            await Transaction.bulkCreate(transformedToDbTxs, {
                ignoreDuplicates: true,
            });

            await updateDbHeight(databaseHeight);
            logger.info(`DB height ${databaseHeight}/${blockchainHeight}`);
        }

        const restHeight = blockchainHeight - databaseHeight;

        if (restHeight > 0) {
            const restBlocks = await getBlocksDetails(
                databaseHeight,
                restHeight
            );
            databaseHeight += restHeight;
            const restTxs = getTxsFromBlocks(restBlocks);
            const transformedToDbBlocks = restBlocks.map(
                transformBlockDataForDb
            );
            const transformedToDbTxs = restTxs.map(transformTxDataForDb);

            await Block.bulkCreate(transformedToDbBlocks, {
                ignoreDuplicates: true,
            });
            await Transaction.bulkCreate(transformedToDbTxs, {
                ignoreDuplicates: true,
            });
            await updateDbHeight(databaseHeight);
        }

        logger.info(`DB height ${databaseHeight}/${blockchainHeight}`);
        logger.info(`Sync complete`);
    } catch (e) {
        console.error(e);
    }
}

export async function syncStats() {
    try {
        const info = await getInfo();
        const stats = await Stats.findOne({
            where: {
                id: 1,
            },
        });
        const { alias_count } = info?.result?.alias_count;
        const assets_count = await getAssetsCount();
        const dbHeight = stats?.db_height;
        let burned_zano = 0;
        if (dbHeight && dbHeight >= 2555000) {
            const blocks = await Block.findAll({
                where: {
                    height: {
                        [Op.gte]: 2555000,
                    },
                    total_fee: {
                        [Op.ne]: 0,
                    },
                },
            });
            const burnedZanoBig = blocks.reduce(
                (totalFee, block) =>
                    totalFee.plus(new Decimal(Number(block.total_fee))),
                new Decimal(0)
            );
            burned_zano = burnedZanoBig
                .dividedBy(new Decimal(10).pow(12))
                .toNumber();
        }
        logger.info(`burned zano: ${burned_zano}`);

        await stats!.update({ alias_count, assets_count, burned_zano });
    } catch (e: any) {
        console.error(e);
    }
}
