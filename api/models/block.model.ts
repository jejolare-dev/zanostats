import { Model, DataTypes } from "sequelize";
import sequelize from "@/api/sequelize";

class Block extends Model {
    declare readonly id: number;
    declare block_id: string;
    declare height: number;
    declare block_size: number;
    declare txs_count: number;
    declare total_fee: number;
    declare timestamp: number;
}

Block.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        block_id: { type: DataTypes.STRING, unique: true, allowNull: false },
        height: { type: DataTypes.INTEGER, unique: true, allowNull: false },
        block_size: { type: DataTypes.INTEGER, allowNull: false },
        txs_count: { type: DataTypes.INTEGER, allowNull: false },
        total_fee: {
            type: DataTypes.BIGINT,
            allowNull: false,
            get() {
                return Number(this.getDataValue("total_fee"));
            },
        },
        timestamp: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: "blocks",
        timestamps: false,
    }
);

export default Block;
