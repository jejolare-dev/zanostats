import Stats from "../models/stats.model";
import Block from "../models/block.model";
import Transaction from "../models/transaction.model";
import logger from "../logger";
import {
    getTxsFromBlocks,
    transformBlockDataForDb,
    transformTxDataForDb,
} from "./utils";
import {
    getAssetsCount,
    getBlockchainHeight,
    getBlocksDetails,
    getDbHeight,
    getInfo,
    getTxDetails,
    updateDbHeight,
} from "./methods";

const txsQueue: any[] = [];

export async function init() {
    const stats = await Stats.findOne({
        where: {
            id: 1,
        },
    });
    if (!stats) {
        await Stats.create();
        await updateDbHeight(2980100);

        const firstBlocks = await getBlocksDetails(0, 100);
        const firstTxs = getTxsFromBlocks(firstBlocks);
        txsQueue.push(...firstTxs.map((tx) => tx.id));
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
            txsQueue.push(...txs.map((tx) => tx.id));
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
            txsQueue.push(...restTxs.map((tx) => tx.id));

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
        logger.error(e);
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

        await stats!.update({ alias_count, assets_count });
    } catch (e: any) {
        logger.error(e);
    }
}

export async function syncTxs() {
    while (txsQueue.length) {
        try {
            const txId = txsQueue.pop();
            if (!txId) return;
            const resTx = await getTxDetails(txId);
            const tranformedTx = transformTxDataForDb(resTx);
            const txToUpdate = await Transaction.findOne({
                where: {
                    tx_id: txId,
                },
            });
            txToUpdate?.set("ins", tranformedTx.ins);
            txToUpdate?.set("outs", tranformedTx.outs);
            txToUpdate?.set("extra", tranformedTx.extra);
            txToUpdate?.set("attachments", tranformedTx.attachments);
            await txToUpdate?.save();
        } catch (e) {
            logger.error(`error at tx sync: ${e}`);
        }
    }
}
