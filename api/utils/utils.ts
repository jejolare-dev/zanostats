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

export const generateWeekTimestamps = () => {
    const daysOfWeek: any[] = [0, 1, 2, 3, 4, 5, 6];
    const today = new Date();
    const currentDay = today.getDay();
    const timestamps: any[] = [];
    for (const day of daysOfWeek) {
        const diffDays = (currentDay - day + 7) % 7;
        if (diffDays > 0) {
            const currDay = new Date(today);
            currDay.setDate(today.getDate() - diffDays);
            currDay.setHours(0, 0, 0, 0);
            const nextDay = new Date(today);
            nextDay.setDate(today.getDate() - diffDays + 1);
            nextDay.setHours(0, 0, 0, 0);
            timestamps.push({
                start: currDay.getTime(),
                end: nextDay.getTime(),
            });
        }
    }
    const currDay = new Date(today);
    currDay.setDate(today.getDate());
    currDay.setHours(0, 0, 0, 0);
    const lastHour = new Date(Date.now());
    lastHour.setMinutes(0, 0, 0);
    timestamps.push({
        start: currDay.getTime(),
        end: lastHour.getTime(),
    });

    return timestamps.sort((a, b) => a.end - b.end);
};

export const generateMonthsTimestamps = () => {
    const today = new Date();
    const timestamps: { start: number; end: number }[] = [];

    for (let i = 11; i >= 0; i--) {
        const start = new Date(today);
        start.setMonth(today.getMonth() - i);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setMonth(start.getMonth() + 1);

        timestamps.push({
            start: start.getTime(),
            end: end.getTime(),
        });
    }

    timestamps[timestamps.length - 1].end = Date.now();

    return timestamps;
};

export const generateYearsTimestamps = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const timestamps: any = [];
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
    return timestamps.sort((a, b) => a.end - b.end);
};
