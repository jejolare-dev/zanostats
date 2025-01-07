import { Model, DataTypes } from "sequelize";
import sequelize from "@/api/sequelize";
import Block from "./block.model";

class Transaction extends Model {
    declare readonly id: number;
    declare tx_id: string;
    declare keeper_block: number;
    declare timestamp: Date;
}

Transaction.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        tx_id: { type: DataTypes.STRING, unique: true, allowNull: false },
        keeper_block: { type: DataTypes.INTEGER, allowNull: false },
        timestamp: { type: DataTypes.DATE, allowNull: false },
    },
    {
        sequelize,
        modelName: "transactions",
        timestamps: false,
    }
);

Transaction.belongsTo(Block, {
    foreignKey: "keeper_block",
    targetKey: "height",
});

export default Transaction;
