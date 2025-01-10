import axios from "axios";
import Stats from "../models/stats.model";
import Block from "../models/block.model";
import Transaction from "../models/transaction.model";
import logger from "../logger";
import {
    countBurnedZano,
    getTxsFromBlocks,
    transformBlockDataForDb,
    transformTxDataForDb,
} from "./utils";

const zanoURL =
    process.env.ZANOD_URL || "http://37.27.100.59:10500/json_rpc";

export async function init() {
    const stats = await Stats.findOne({
        where: {
            id: 1,
        },
    });
    if (!stats) {
        await Stats.create();
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

async function updateBurnedZano(newBurnedZano: number) {
    try {
        const stats = await Stats.findOne({
            where: {
                id: 1,
            },
        });
        const prevBurned = stats?.burned_zano;
        const totalBurned = newBurnedZano + prevBurned!;
        await stats?.update({ burned_zano: totalBurned });
        return totalBurned;
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

export async function syncDb() {
    try {
        let databaseHeight = await getDbHeight();
        const blockchainHeight = await getBlockchainHeight();
        while (blockchainHeight - databaseHeight > 100) {
            const blockPromises = Array.from({ length: 10 }, () => {
                if (blockchainHeight - databaseHeight <= 100) return;
                return getBlocksDetails((databaseHeight += 100), 100);
            }).filter(Boolean);

            const blocksPack = await Promise.all(blockPromises);
            const blocks = blocksPack.flat(Infinity);
            const txs = getTxsFromBlocks(blocks);
            const burnedZano = countBurnedZano(txs);
            const totalBurned = await updateBurnedZano(burnedZano);
            const transformedToDbBlocks = blocks.map(transformBlockDataForDb);
            const transformedToDbTxs = txs.map(transformTxDataForDb);
            logger.info(`zano burned: ${totalBurned}`);

            await Block.bulkCreate(transformedToDbBlocks, {
                ignoreDuplicates: true,
            });
            await Transaction.bulkCreate(transformedToDbTxs, {
                ignoreDuplicates: true,
            });

            await updateDbHeight(databaseHeight);
            logger.info(`DB height ${databaseHeight}/${blockchainHeight}`);
        }

        const restHeight = databaseHeight - blockchainHeight;
        const restBlocks = await getBlocksDetails(
            (databaseHeight += restHeight),
            restHeight
        );
        const restTxs = getTxsFromBlocks(restBlocks);
        const burnedZano = countBurnedZano(restTxs);
        const totalBurned = await updateBurnedZano(burnedZano);
        const transformedToDbBlocks = restBlocks.map(transformBlockDataForDb);
        const transformedToDbTxs = restTxs.map(transformTxDataForDb);
        logger.info(`zano burned: ${totalBurned}`);

        await Block.bulkCreate(transformedToDbBlocks, {
            ignoreDuplicates: true,
        });
        await Transaction.bulkCreate(transformedToDbTxs, {
            ignoreDuplicates: true,
        });

        await updateDbHeight(databaseHeight);
        logger.info(`DB height ${databaseHeight}/${blockchainHeight}`);
        logger.info(`Sync complete`);
    } catch (e) {
        console.error(e);
    }
}
