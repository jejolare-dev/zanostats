import axios from "axios";
import Stats from "../schemes/stats.model";
import Decimal from "decimal.js";
import logger from "../logger";
import { totalHistoricalStatsResponse, totalHistoricalStatsType, TradeAssetStats, TradeAssetStatsResponse, TradeGeneralStats, TradeGeneralStatsResponse } from "../types/api";

const zanoURL = process.env.ZANOD_URL || "http://37.27.100.59:10500/json_rpc";

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

export async function getTxDetails(tx_hash: string) {
    try {
        const res: any = await axios.post(zanoURL, {
            id: 0,
            jsonrpc: "2.0",
            method: "get_tx_details",
            params: {
                tx_hash,
            },
        });

        return res.data.result.tx_info as any;
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
            `${zanoURL.replace('/json_rpc', '')}/getheight`,
            {}
        );
        return result.data.height;
    } catch (e) {
        console.error(e);
    }
}

export async function getDbHeight() {
    try {
        const stats = await Stats.findOne();
        return stats?.db_height as any;
    } catch (e) {
        console.error(e);
    }
}

export async function updateDbHeight(newHeight: number) {
    try {
        const stats = await Stats.findOne();
        logger.info(`Updating DB height to ${newHeight} with current height ${stats?.db_height}`);

        await stats?.update({ db_height: newHeight });
        await stats?.save();
    } catch (e) {
        console.error(e);
    }
}

export async function getBlocksDetails(fromHeight: number, count: number) {
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

export async function getStats() {
    try {
        const stats = await Stats.findOne();

        if (!stats) throw new Error("Error at get stats");

        return stats;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getMatrixAdressesCount() {
    try {
        const matrixApiUrl = process.env.MATRIX_API_URL;
        const result: any = await axios.get(
            `${matrixApiUrl}/get-addresses-count`
        );
        const { data } = result.data;
        return data;
    } catch (e) {
        console.error(e);
    }
}

export async function fetchTradeAssetData(queryParams: Record<string, any> = {}) {
    const tradeApiUrl = process.env.TRADE_API_URL;

    if (!tradeApiUrl) {
        throw new Error("TRADE_API_URL is not defined in environment variables");
    }

    const result = await axios.get(`${tradeApiUrl}/stats/asset`, {
        params: queryParams,
        headers: {
            "Content-Type": "application/json",
        },
    });

    return (result?.data as TradeAssetStatsResponse).data as TradeAssetStats;

}

export async function fetchTradeGeneralData(queryParams: Record<string, any> = {}) {
    try {
        const tradeApiUrl = process.env.TRADE_API_URL;

        if (!tradeApiUrl) {
            throw new Error("TRADE_API_URL is not defined in environment variables");
        }

        const result = await axios.get(`${tradeApiUrl}/stats/total`, {
            params: queryParams,
            headers: {
                "Content-Type": "application/json",
            },
        });

        return (result?.data as TradeGeneralStatsResponse).data as TradeGeneralStats;

    } catch (e) {
        console.error(e);
    }
}

export async function fetchTradeStatsInPeriod(from: number, to: number) {
    const tradeApiUrl = process.env.TRADE_API_URL;
    const result = await axios.get(`${tradeApiUrl}/stats/total_stats_in_period`, {
        params: {
            from_timestamp: from,
            to_timestamp: to,
        }
    });

    const data = (result?.data as totalHistoricalStatsResponse)?.data as totalHistoricalStatsType;

    return {
        tvl: Number(data?.total_tvl ?? 0),
        volume: Number(data?.volume ?? 0),
    };
}


export async function getPremiumAliasesCount() {
    try {
        const result: any = await axios.post(zanoURL, {
            id: 0,
            jsonrpc: "2.0",
            method: "get_all_alias_details",
            params: {},
        });
        return result.data.result.aliases.filter((e) => e.alias.length <= 5)
            .length;
    } catch (e) {
        console.error(e);
    }
}

export async function getZanoPrice() {
    try {
        const result = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=zano&vs_currencies=usd&include_24hr_change=true"
        ).then((res) => res.json());
        return result;
    } catch (e) {
        console.error(e);
    }
}

export async function getStakingInfo() {
    const result = {
        staked_coins: 0,
        APY: 0,
        staked_percentage: 0,
    };

    try {
        const info = await getInfo();

        const pos_diff_to_total_ratio = new Decimal(
            info.result.pos_difficulty
        ).dividedBy(new Decimal(info.result.total_coins));

        const divider = new Decimal(176.363);

        const stakedPercentage = new Decimal(0.55)
            .mul(pos_diff_to_total_ratio)
            .dividedBy(divider)
            .mul(100)
            .toNumber();

        result.staked_percentage = parseFloat(stakedPercentage.toFixed(2));

        result.staked_coins = new Decimal(info.result.total_coins)
            .dividedBy(100)
            .mul(new Decimal(result.staked_percentage))
            .dividedBy(new Decimal(10 ** 12))
            .toNumber();

        result.APY = new Decimal(720 * 365)
            .dividedBy(new Decimal(result.staked_coins))
            .mul(100)
            .toNumber()

    } catch (error) {
        console.error(error);
    }
    return result;
}