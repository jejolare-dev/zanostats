import axios from 'axios';
import Decimal from 'decimal.js';
import Stats from '../schemes/stats.model';
import { BlockType, GetInfoResponse, StakingInfo } from '../../types';

const zanoURL = process.env.ZANOD_URL || 'http://37.27.100.59:10500/json_rpc';

export async function getInfo() {
	try {
		const info: { data: GetInfoResponse } = await axios.post(zanoURL, {
			id: 0,
			jsonrpc: '2.0',
			method: 'getinfo',
			params: {
				flags: 1048575,
			},
		});

		return info.data;
	} catch (e) {
		console.error(e);
	}
}

export async function getTxDetails(tx_hash: string) {
	try {
		const res: { data: { result: { tx_info: number } } } = await axios.post(zanoURL, {
			id: 0,
			jsonrpc: '2.0',
			method: 'get_tx_details',
			params: {
				tx_hash,
			},
		});

		return res.data.result.tx_info;
	} catch (e) {
		console.error(e);
	}
}

export async function getAssetsCount() {
	try {
		const result: { data: { result: { assets: string } } } = await axios.post(zanoURL, {
			id: 0,
			jsonrpc: '2.0',
			method: 'get_assets_list',
			params: {
				count: Number.MAX_SAFE_INTEGER,
				offset: 0,
			},
		});
		if (!result.data.result) {
			throw new Error('Fetch data error');
		}

		const count = result.data.result.assets.length;

		return count;
	} catch (e) {
		console.error(e);
	}
}

export async function getBlockchainHeight() {
	try {
		const result: { data: { height: string } } = await axios.post(
			`http://37.27.100.59:10500/getheight`,
			{},
		);
		return result.data.height;
	} catch (e) {
		console.error(e);
	}
}

export async function getDbHeight() {
	try {
		const stats = await Stats.findOne();
		return stats?.db_height;
	} catch (e) {
		console.error(e);
	}
}

export async function updateDbHeight(newHeight: number) {
	try {
		const stats = await Stats.findOne();
		await stats?.update({ db_height: newHeight });
	} catch (e) {
		console.error(e);
	}
}

export async function getBlocksDetails(fromHeight: number, count: number) {
	try {
		const result: { data: { result: { blocks: BlockType[] } } } = await axios.post(zanoURL, {
			id: 0,
			jsonrpc: '2.0',
			method: 'get_blocks_details',
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

export async function getStats() {
	try {
		const stats = await Stats.findOne();

		if (!stats) throw new Error('Error at get stats');

		return stats;
	} catch (e) {
		console.error(e);
		return null;
	}
}

export async function getMatrixAdressesCount() {
	try {
		const matrixApiUrl = process.env.MATRIX_API_URL;
		const result: { data: { data: number } } = await axios.get(
			`${matrixApiUrl}/get-addresses-count`,
		);
		const { data } = result.data;
		return data;
	} catch (e) {
		console.error(e);
	}
}

export async function getPremiumAliasesCount() {
	try {
		const result: { data: { result: { aliases: { alias: string }[] } } } = await axios.post(
			zanoURL,
			{
				id: 0,
				jsonrpc: '2.0',
				method: 'get_all_alias_details',
				params: {},
			},
		);
		return result.data.result.aliases.filter((e) => e.alias.length <= 5).length;
	} catch (e) {
		console.error(e);
	}
}

export async function getZanoPrice() {
	try {
		const result = await fetch(
			'https://api.coingecko.com/api/v3/simple/price?ids=zano&vs_currencies=usd&include_24hr_change=true',
		).then((res) => res.json());
		return result;
	} catch (e) {
		console.error(e);
	}
}

export async function getStakingInfo(): Promise<StakingInfo> {
	const result: StakingInfo = {
		staked_coins: 0,
		APY: 0,
		staked_percentage: 0,
	};

	try {
		const info = await getInfo();

		const posDiff = new Decimal((info as GetInfoResponse).result.pos_difficulty);
		const totalCoins = new Decimal((info as GetInfoResponse).result.total_coins);

		const pos_diff_to_total_ratio = posDiff.dividedBy(totalCoins);
		const divider = new Decimal(176.363);

		const stakedPercentage = new Decimal(0.55)
			.mul(pos_diff_to_total_ratio)
			.dividedBy(divider)
			.mul(100)
			.toNumber();

		result.staked_percentage = parseFloat(stakedPercentage.toFixed(2));

		result.staked_coins = totalCoins
			.dividedBy(100)
			.mul(result.staked_percentage)
			.dividedBy(new Decimal(10 ** 12))
			.toNumber();

		result.APY = new Decimal(720 * 365)
			.dividedBy(result.staked_coins || 1)
			.mul(100)
			.toNumber();
	} catch (error) {
		console.error('Failed to fetch staking info:', error);
	}

	return result;
}
