import { Request, Response } from "express";
import logger from "@/api/logger";

export default function handlerTryCatch(
    handler: (req: Request, res: Response) => Promise<unknown> | unknown
) {
    return async (req: Request, res: Response) => {
        try {
            await handler(req, res);
        } catch (err) {
            logger.error("Internal server error");
            logger.error(err);
            res.status(500).send({
                success: false,
                data: "Internal server error",
            });
        }
    };
}

export function getTxsFromBlocks(blocks: any[]) {
    return blocks
        .map((block: any) => block.transactions_details)
        .flat(Infinity);
}

export function transformTxDataForDb(tx: any) {
    const { id, timestamp, extra, ins, outs, attachments, ...rest } = tx;
    return {
        tx_id: id,
        extra: decodeString(JSON.stringify(extra)),
        ins: decodeString(JSON.stringify(ins)),
        outs: decodeString(JSON.stringify(outs)),
        attachments: decodeString(
            JSON.stringify(Boolean(attachments) ? attachments : {})
        ),
        timestamp: timestamp * 1000,
        ...rest,
    };
}

export function transformBlockDataForDb(block: any) {
    const {
        id,
        transactions_details,
        timestamp,
        miner_text_info,
        object_in_json,
        ...rest
    } = block;
    return {
        block_id: id,
        timestamp: timestamp * 1000,
        miner_text_info: decodeString(miner_text_info),
        object_in_json: decodeString(object_in_json),
        txs_count: transactions_details.length,
        ...rest,
    };
}

export const decodeString = (str) => {
    if (!!str) {
        str = str.replace(/'/g, "''");
        return str.replace(/\u0000/g, "", (unicode) => {
            return String.fromCharCode(
                parseInt(unicode.replace(/\\u/g, ""), 16)
            );
        });
    }
    return str;
};
