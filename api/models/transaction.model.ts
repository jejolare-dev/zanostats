import { Model, DataTypes } from "sequelize";
import sequelize from "@/api/sequelize";
import Block from "./block.model";

class Transaction extends Model {
    declare readonly id: number;
    declare keeper_block: number;
    declare tx_id: string;
    declare amount: string;
    declare blob_size: string;
    declare extra: string;
    declare fee: string;
    declare ins: string;
    declare outs: string;
    declare pub_key: string;
    declare timestamp: bigint;
    declare attachments: string;
}

Transaction.init(
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        tx_id: { type: DataTypes.STRING, unique: true, allowNull: false },
        keeper_block: { type: DataTypes.INTEGER, allowNull: false },
        timestamp: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        amount: { type: DataTypes.STRING, allowNull: true },
        blob_size: { type: DataTypes.STRING, allowNull: true },
        extra: { type: DataTypes.TEXT, allowNull: true },
        fee: { type: DataTypes.STRING, allowNull: true },
        ins: { type: DataTypes.TEXT, allowNull: true },
        outs: { type: DataTypes.TEXT, allowNull: true },
        pub_key: { type: DataTypes.TEXT, allowNull: true },
        attachments: { type: DataTypes.TEXT, allowNull: true },
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
