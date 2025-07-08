import { Request, Response } from 'express';
import logger from '../logger';
import { BlockType, Transaction } from '../../types';

export default function handlerTryCatch(
	handler: (_req: Request, _res: Response) => Promise<unknown> | unknown,
) {
	return async (req: Request, res: Response) => {
		try {
			await handler(req, res);
		} catch (err) {
			logger.error('Internal server error');
			logger.error(err);
			res.status(500).send({
				success: false,
				data: 'Internal server error',
			});
		}
	};
}

export function getTxsFromBlocks(blocks: BlockType[]) {
	return blocks.map((block) => block.transactions_details).flat(Infinity);
}

export const decodeString = (input?: string): string | undefined => {
	if (!input) return input;

	const escaped = input.replace(/'/g, "''");
	const cleaned = escaped.split('\u0000').join('');

	return cleaned.replace(/\\u([\dA-Fa-f]{4})/g, (_, code) =>
		String.fromCharCode(parseInt(code, 16)),
	);
};

export function transformTxDataForDb(tx: BlockType): Transaction {
	const { id, timestamp, extra, ins, outs, attachments, ...rest } = tx;
	return {
		tx_id: id,
		extra: decodeString(JSON.stringify(extra)),
		ins: decodeString(JSON.stringify(ins)),
		outs: decodeString(JSON.stringify(outs)),
		attachments: decodeString(JSON.stringify(attachments || {})),
		timestamp: timestamp * 1000,
		...rest,
	};
}

export function transformBlockDataForDb(block: BlockType) {
	const { id, transactions_details, timestamp, miner_text_info, object_in_json, ...rest } = block;
	return {
		block_id: id,
		timestamp: timestamp * 1000,
		miner_text_info: decodeString(miner_text_info),
		object_in_json: decodeString(object_in_json),
		txs_count: transactions_details.length,
		...rest,
	};
}

export const generateWeekTimestamps = () => {
	const daysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6];
	const today = new Date();
	const currentDay = today.getDay();
	const timestamps: { start: number; end: number }[] = [];
	for (const day of daysOfWeek) {
		const diffDays = (currentDay - day + 7) % 7;

		const currDay = new Date(today);
		currDay.setDate(today.getDate() - diffDays);
		currDay.setHours(0, 0, 0, 0);

		const nextDay = new Date(currDay);
		nextDay.setDate(currDay.getDate() + 1);
		nextDay.setHours(0, 0, 0, 0);

		timestamps.push({
			start: currDay.getTime(),
			end: nextDay.getTime() > Date.now() ? Date.now() : nextDay.getTime(),
		});
	}

	const result = timestamps.sort((a, b) => a.end - b.end);

	return result;
};

export const generateMonthsTimestamps = () => {
	const today = new Date();
	const timestamps: { start: number; end: number }[] = [];

	for (let i = 11; i >= 0; i--) {
		const start = new Date();
		start.setMonth(today.getMonth() - i, 1);
		start.setHours(0, 0, 0, 0);

		const end = new Date(start);
		end.setMonth(end.getMonth() + 1, 1);
		end.setHours(0, 0, 0, 0);

		timestamps.push({
			start: start.getTime(),
			end: end.getTime(),
		});
	}

	timestamps[timestamps.length - 1].end = Date.now();
	const result = timestamps.sort((a, b) => a.end - b.end);

	return result;
};

export const generateYearsTimestamps = () => {
	const today = new Date();
	const currentYear = today.getFullYear();
	const timestamps: { start: number; end: number }[] = [];
	for (let year = 2019; year < currentYear; year++) {
		const currentYearDate = new Date(year, 0, 1, 0);
		const nextYearDate = new Date(year + 1, 0, 1);
		currentYearDate.setHours(0, 0, 0, 0);
		nextYearDate.setHours(0, 0, 0, 0);
		timestamps.push({
			start: currentYearDate.getTime(),
			end: nextYearDate.getTime(),
		});
	}

	timestamps.push({
		start: new Date(currentYear, 0, 1).getTime(),
		end: Date.now(),
	});

	const result = timestamps.sort((a, b) => a.end - b.end);

	return result;
};
