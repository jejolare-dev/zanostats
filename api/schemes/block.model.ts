import { Model, DataTypes } from "sequelize";
import sequelize from "@/api/sequelize";

class Block extends Model {
    declare readonly id: number;
    declare block_id: string;
    declare height: number;
    declare txs_count: number;
    declare total_fee: string;
    declare timestamp: bigint;
    declare base_reward: string;
    declare blob: string;
    declare block_cumulative_size: string;
    declare block_tself_size: string;
    declare cumulative_diff_adjusted: string;
    declare cumulative_diff_precise: string;
    declare difficulty: string;
    declare effective_fee_median: string;
    declare tx_id: string;
    declare is_orphan: boolean;
    declare penalty: string;
    declare prev_id: string;
    declare summary_reward: string;
    declare this_block_fee_median: string;
    declare total_txs_size: string;
    declare type: string;
    declare miner_text_info: string;
    declare pow_seed: string;
    declare already_generated_coins: string;
    declare object_in_json: any;
}

Block.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        block_id: { type: DataTypes.STRING, unique: true, allowNull: false },
        height: { type: DataTypes.INTEGER, unique: true, allowNull: false },
        block_cumulative_size: { type: DataTypes.TEXT, allowNull: true },
        txs_count: { type: DataTypes.INTEGER, allowNull: false },
        total_fee: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        timestamp: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        actual_timestamp: { type: DataTypes.BIGINT, allowNull: true },
        base_reward: { type: DataTypes.TEXT, allowNull: true },
        blob: { type: DataTypes.STRING, allowNull: true },
        block_tself_size: { type: DataTypes.TEXT, allowNull: true },
        cumulative_diff_adjusted: { type: DataTypes.TEXT, allowNull: true },
        cumulative_diff_precise: { type: DataTypes.TEXT, allowNull: true },
        difficulty: { type: DataTypes.TEXT, allowNull: true },
        effective_fee_median: { type: DataTypes.TEXT, allowNull: true },
        is_orphan: { type: DataTypes.BOOLEAN, allowNull: true },
        penalty: { type: DataTypes.TEXT, allowNull: true },
        prev_id: { type: DataTypes.STRING, allowNull: true },
        summary_reward: { type: DataTypes.TEXT, allowNull: true },
        this_block_fee_median: { type: DataTypes.TEXT, allowNull: true },
        total_txs_size: { type: DataTypes.TEXT, allowNull: true },
        tr_count: { type: DataTypes.TEXT, allowNull: true },
        type: { type: DataTypes.TEXT, allowNull: true },
        miner_text_info: { type: DataTypes.STRING, allowNull: true },
        pow_seed: { type: DataTypes.STRING, allowNull: true },
        already_generated_coins: { type: DataTypes.STRING, allowNull: true },
        object_in_json: { type: DataTypes.JSONB, allowNull: true },
    },
    {
        sequelize,
        modelName: "blocks",
        timestamps: false,
        indexes: [
            {
                fields: ["timestamp"],
            }
        ]
    }
);

export default Block;
