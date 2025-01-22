import { Op } from "sequelize";
import Block from "../schemes/block.model";
import Decimal from "decimal.js";

interface InputDataItem {
    start: number;
    end: number;
}

type InputData = InputDataItem[];

class StatsModel {
    async getZanoBurned(data: InputData) {
        return await Promise.all(
            data.map(async (timestamp: { start: number; end: number }) => {
                const { start, end } = timestamp;
                const blocks = await Block.findAll({
                    where: {
                        height: {
                            [Op.gte]: 2555000,
                        },
                        timestamp: {
                            [Op.gte]: start,
                            [Op.lte]: end,
                        },
                    },
                    raw: true,
                    attributes: ["total_fee"],
                });
                const burnedZanoBig = blocks.reduce(
                    (totalFee, block) =>
                        totalFee.plus(new Decimal(Number(block.total_fee))),
                    new Decimal(0)
                );

                return burnedZanoBig
                    .dividedBy(new Decimal(10).pow(12))
                    .toNumber();
            })
        )
    }
}
const statsModel = new StatsModel();


export default statsModel;