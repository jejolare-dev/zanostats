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
    getStats,
    getTxDetails,
    updateDbHeight,
} from "./methods";

export async function init() {
    const stats = await getStats();
    if (!stats) {
        try {
            await Stats.create();
            const firstBlocks = await getBlocksDetails(0, 100);
            await saveBlocksAndTxs(firstBlocks);
        } catch (e) {
            logger.error(`error at init db : ${e}`);
        }
    }
}

export async function syncBlocks() {
    try {
        let databaseHeight = await getDbHeight();
        const blockchainHeight = await getBlockchainHeight();

        const BLOCKS_PER_REQUEST = 100;

        while (blockchainHeight - databaseHeight > BLOCKS_PER_REQUEST) {
            const blockPromises = Array.from({ length: 10 }, () => {
                if (blockchainHeight - databaseHeight <= BLOCKS_PER_REQUEST)
                    return;
                if (databaseHeight + BLOCKS_PER_REQUEST > blockchainHeight)
                    return;
                return getBlocksDetails(
                    (databaseHeight += BLOCKS_PER_REQUEST),
                    BLOCKS_PER_REQUEST
                );
            }).filter(Boolean);

            const blocksPack = await Promise.all(blockPromises);
            const blocks = blocksPack.flat(Infinity);

            await saveBlocksAndTxs(blocks);
            await updateDbHeight(databaseHeight);

            logger.info(`DB height ${databaseHeight}/${blockchainHeight}`);
        }

        const restHeight = blockchainHeight - databaseHeight;

        if (restHeight > 0) {
            const restBlocks = await getBlocksDetails(
                databaseHeight,
                restHeight
            );
            const restTxs = getTxsFromBlocks(restBlocks);
            await saveBlocksAndTxs(restTxs);

            databaseHeight += restHeight;
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
        const stats = await getStats();
        const { alias_count } = info?.result?.alias_count;
        const assets_count = await getAssetsCount();
        await stats!.update({ alias_count, assets_count });
    } catch (e: any) {
        logger.error(e);
    }
}

export async function syncTxs(txs: number[]) {
    while (txs.length) {
        try {
            const txId = txs.pop();
            if (!txId) return;
            const txToUpdate = await Transaction.findOne({
                where: {
                    id: txId,
                },
            });
            if (!txToUpdate) return;
            const resTx = await getTxDetails(txToUpdate?.tx_id);
            if (!resTx) throw `Fetch error tx ${txToUpdate?.tx_id}`;
            const tranformedTx = transformTxDataForDb(resTx);
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

async function saveBlocksAndTxs(blocks: Block[]) {
    const txs = getTxsFromBlocks(blocks);
    const transformedToDbBlocks = blocks.map(transformBlockDataForDb);
    const transformedToDbTxs = txs.map(transformTxDataForDb);

    await Block.bulkCreate(transformedToDbBlocks, {
        ignoreDuplicates: true,
    });
    const txsRow = await Transaction.bulkCreate(transformedToDbTxs, {
        ignoreDuplicates: true,
    });

    await syncTxs(txsRow.map((tx) => tx.id));
}
