import Stats from "../schemes/stats.model";
import Block from "../schemes/block.model";
import Transaction from "../schemes/transaction.model";
import logger from "../logger";
import {
    generateMonthsTimestamps,
    generateWeekTimestamps,
    generateYearsTimestamps,
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
    getMatrixAdressesCount,
    getPremiumAliasesCount,
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
            await saveBlocksAndTxs(restBlocks);

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
        const { alias_count } = info?.result;
        const assets_count = await getAssetsCount();
        const matrix_alias_count = await getMatrixAdressesCount();
        const premium_alias_count = await getPremiumAliasesCount();

        await stats!.update({
            alias_count,
            assets_count,
            matrix_alias_count,
            premium_alias_count,
        });
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
// TODO: Remove
// export async function cacheData() {
//     const data = [
//         ...generateMonthsTimestamps(),
//         ...generateWeekTimestamps(),
//         ...generateYearsTimestamps(),
//     ];
//     const blocksCount = await getDbHeight();
//     await Promise.all(
//         data.map(async (timestamp: { start: number; end: number }) => {
//             const { start, end } = timestamp;
//             const key = end.toString();
//             const txs = await Transaction.findAll({
//                 where: {
//                     timestamp: {
//                         [Op.gte]: start,
//                         [Op.lte]: end,
//                     },
//                 },
//                 raw: true,
//                 attributes: ["keeper_block"],
//             });
//             cache.getConfirmedTransactions[key] = txs.filter(
//                 (tx) => blocksCount - tx.keeper_block > 20
//             ).length;
//         })
//     );
//     await Promise.all(
//         data.map(async (timestamp: { start: number; end: number }) => {
//             const { start, end } = timestamp;
//             const key = end.toString();

//             const blocks = await Block.findAll({
//                 where: {
//                     timestamp: {
//                         [Op.gte]: start,
//                         [Op.lte]: end,
//                     },
//                 },
//                 raw: true,
//                 attributes: ["block_cumulative_size"],
//             });

//             const allBlocksSize = blocks.reduce(
//                 (blocksSize, block) =>
//                     blocksSize.plus(new Decimal(block.block_cumulative_size)),
//                 new Decimal(0)
//             );

//             cache.getAvgBlockSize[key] = allBlocksSize
//                 .dividedBy(blocksCount)
//                 .toNumber();
//         })
//     );
//     await Promise.all(
//         data.map(async (timestamp: { start: number; end: number }) => {
//             const { start, end } = timestamp;
//             const key = end.toString();

//             const blocks = await Block.findAll({
//                 where: {
//                     height: {
//                         [Op.gte]: 2555000,
//                     },
//                     timestamp: {
//                         [Op.gte]: start,
//                         [Op.lte]: end,
//                     },
//                 },
//                 raw: true,
//                 attributes: ["total_fee"],
//             });
//             const burnedZanoBig = blocks.reduce(
//                 (totalFee, block) =>
//                     totalFee.plus(new Decimal(Number(block.total_fee))),
//                 new Decimal(0)
//             );
//             const burnedZano = burnedZanoBig
//                 .dividedBy(new Decimal(10).pow(12))
//                 .toNumber();
//             cache.getZanoBurned[key] = burnedZano;
//         })
//     );
//     await Promise.all(
//         data.map(async (timestamp: { start: number; end: number }) => {
//             const { start, end } = timestamp;
//             const key = end.toString();
//             const blocks = await Block.findAll({
//                 where: {
//                     timestamp: {
//                         [Op.gte]: start,
//                         [Op.lte]: end,
//                     },
//                 },
//                 raw: true,
//                 attributes: ["txs_count"],
//             });
//             const allTxsCount = blocks.reduce(
//                 (txsCount, block) => txsCount + block.txs_count,
//                 0
//             );
//             const avgNumOfTxsPerBlock = allTxsCount / blocksCount;
//             cache.getAvgNumberOfTxsPerBlock[key] = avgNumOfTxsPerBlock;
//         })
//     );
// }
