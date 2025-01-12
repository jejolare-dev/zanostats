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
        const txsRow = await Transaction.bulkCreate(transformedToDbTxs, {
            ignoreDuplicates: true,
        });

        await syncTxs(txsRow.map((tx) => tx.id));
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
            const txsRow = await Transaction.bulkCreate(transformedToDbTxs, {
                ignoreDuplicates: true,
            });

            await syncTxs(txsRow.map((tx) => tx.id));

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
            const txsRow = await Transaction.bulkCreate(transformedToDbTxs, {
                ignoreDuplicates: true,
            });

            await syncTxs(txsRow.map((tx) => tx.id));

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
