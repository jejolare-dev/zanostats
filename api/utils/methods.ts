import axios from "axios";
import Stats from "../schemes/stats.model";

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

export async function updateDbHeight(newHeight: number) {
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
        const stats = await Stats.findOne({
            where: {
                id: 1,
            },
        });
        return stats;
    } catch (e) {
        console.error(e);
    }
}

export async function getMatrixAdressesCount() {
    try {
        const matrixApiUrl = process.env.MATRIX_API_URL;
        const result: any = await axios.get(
            `${matrixApiUrl}/get-registered-addresses`,
            {
                params: {
                    page: 1,
                    items: Number.MAX_SAFE_INTEGER,
                },
            }
        );
        const matrixAliasesCount = (result?.data?.addresses || []).filter(
            (address) => address.registered
        ).length;
        return matrixAliasesCount;
    } catch (e) {
        console.error(e);
    }
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

