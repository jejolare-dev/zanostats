import Stats from '../schemes/stats.model';
import Block from '../schemes/block.model';
import Transaction from '../schemes/transaction.model';
import logger from '../logger';
import { getTxsFromBlocks, transformBlockDataForDb, transformTxDataForDb } from './utils';
import {
	getAssetsCount,
	getBlockchainHeight,
	getBlocksDetails,
	getDbHeight,
	getInfo,
	getMatrixAdressesCount,
	getPremiumAliasesCount,
	getStakingInfo,
	getStats,
	// getTxDetails,
	updateDbHeight,
} from './methods';
import { BlockType } from '../../types';

export async function syncTxs(_txs: number[]) {
	// while (txs.length) {
	//     try {
	//         const txId = txs.pop();
	//         if (!txId) return;
	//         const txToUpdate = await Transaction.findOne({
	//             where: {
	//                 id: txId,
	//             },
	//         });
	//         if (!txToUpdate) return;
	//         const resTx = await getTxDetails(txToUpdate?.tx_id);
	//         if (!resTx) throw `Fetch error tx ${txToUpdate?.tx_id}`;
	//         const tranformedTx = transformTxDataForDb(resTx);
	//         txToUpdate?.set("ins", tranformedTx.ins);
	//         txToUpdate?.set("outs", tranformedTx.outs);
	//         txToUpdate?.set("extra", tranformedTx.extra);
	//         txToUpdate?.set("attachments", tranformedTx.attachments);
	//         await txToUpdate?.save();
	//     } catch (e) {
	//         logger.error(`error at tx sync: ${e}`);
	//     }
	// }
}

async function saveBlocksAndTxs(blocks: BlockType[]) {
	const txs = getTxsFromBlocks(blocks);
	const transformedToDbBlocks = blocks.map(transformBlockDataForDb);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const transformedToDbTxs: any = txs.map(transformTxDataForDb as any);
	await Block.bulkCreate(transformedToDbBlocks, {
		ignoreDuplicates: true,
	});
	const txsRow = await Transaction.bulkCreate(transformedToDbTxs, {
		ignoreDuplicates: true,
	});

	await syncTxs(txsRow.map((tx) => tx.id));
}

export async function syncBlocks(): Promise<void> {
	try {
		let databaseHeight = await getDbHeight();
		const blockchainHeightRaw = await getBlockchainHeight();

		if (databaseHeight === undefined) {
			throw new Error('DB height is undefined');
		}
		if (blockchainHeightRaw === undefined) {
			throw new Error('Blockchain height is undefined');
		}

		const blockchainHeight = Number(blockchainHeightRaw);
		const BLOCKS_PER_REQUEST = 100;

		while (blockchainHeight - databaseHeight > BLOCKS_PER_REQUEST) {
			const currentHeight = databaseHeight;

			const blockPromises: Promise<BlockType[] | undefined>[] = Array.from(
				{ length: 10 },
				(_, i) => {
					const height = currentHeight + (i + 1) * BLOCKS_PER_REQUEST;
					if (height > blockchainHeight) return Promise.resolve(undefined);
					return getBlocksDetails(height, BLOCKS_PER_REQUEST);
				},
			);

			const blocksPack = await Promise.all(blockPromises);
			const blocks = blocksPack.flat().filter(Boolean) as BlockType[];

			if (blocks.length) {
				await saveBlocksAndTxs(blocks);
				databaseHeight += blocks.length;
				await updateDbHeight(databaseHeight);
				logger.info(`DB height ${databaseHeight}/${blockchainHeight}`);
			} else {
				break; // nothing fetched
			}
		}

		const restHeight = blockchainHeight - databaseHeight;

		if (restHeight > 0) {
			const restBlocks = await getBlocksDetails(databaseHeight, restHeight);
			if (restBlocks) {
				await saveBlocksAndTxs(restBlocks);
				databaseHeight += restBlocks.length;
				await updateDbHeight(databaseHeight);
			}
		}

		logger.info(`DB height ${databaseHeight}/${blockchainHeight}`);
		logger.info(`Sync complete`);
	} catch (e) {
		logger.error('syncBlocks failed', e);
	}
}

export async function syncStats() {
	try {
		const info = await getInfo();
		const stats = await getStats();
		if (!stats) {
			throw new Error('Error at sync stats');
		}
		if (!info?.result) {
			throw new Error('Invalid response from getInfo');
		}
		const { alias_count } = info.result;
		const assets_count = await getAssetsCount();
		const matrix_alias_count = await getMatrixAdressesCount();
		const premium_alias_count = await getPremiumAliasesCount();
		const { staked_coins, staked_percentage, APY } = await getStakingInfo();

		console.log('STATS (Sync)', {
			alias_count,
			assets_count,
			matrix_alias_count,
			premium_alias_count,
			staked_coins,
			staked_percentage,
			APY,
		});

		await stats.update({
			alias_count,
			assets_count,
			matrix_alias_count,
			premium_alias_count,
			staked_coins,
			staked_percentage,
			APY,
		});
	} catch (e) {
		logger.error(e);
	}
}

export async function initApp() {
	try {
		await Stats.destroy({ where: {} });
		await Stats.create();
		const firstBlocks = await getBlocksDetails(0, 100);

		if (!firstBlocks) {
			throw new Error('No blocks received from getBlocksDetails');
		}

		await saveBlocksAndTxs(firstBlocks);
	} catch (e) {
		logger.error(`error at init db : ${e}`);
	}
}
