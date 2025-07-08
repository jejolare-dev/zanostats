export type Transaction = {
	id?: string;
	timestamp: number;
	extra: unknown;
	ins: unknown;
	outs: unknown;
	attachments?: unknown;
	[key: string]: unknown;
};

export type BlockType = {
	id: string;
	timestamp: number;
	transactions_details: Transaction[];
	miner_text_info: string;
	object_in_json: string;
	[key: string]: unknown;
};

export type GetInfoResponse = {
	result: {
		pos_difficulty: string;
		total_coins: string;
		alias_count: string;
	};
};

export type StakingInfo = {
	staked_coins: number;
	APY: number;
	staked_percentage: number;
};
