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

export function countBurnedZano(txs: any[]) {
    const burnedZanoBig = txs.reduce((totalFee, tx) => (totalFee += tx.fee), 0);
    const burnedZano = burnedZanoBig / 10 ** 12;
    return burnedZano;
}

export function getTxsFromBlocks(blocks: any[]) {
    return blocks
        .map((block: any) => block.transactions_details)
        .flat(Infinity);
}

export function transformTxDataForDb(tx: any) {
    const { id, keeper_block, timestamp } = tx;
    return {
        tx_id: id,
        keeper_block,
        timestamp,
    };
}

export function transformBlockDataForDb(block: any) {
    const {
        id,
        height,
        block_cumulative_size,
        total_fee,
        timestamp,
        transactions_details,
    } = block;
    return {
        block_id: id,
        height,
        block_size: block_cumulative_size,
        total_fee,
        timestamp,
        txs_count: transactions_details.length,
    };
}
