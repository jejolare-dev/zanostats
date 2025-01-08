import { DataTypes, Model } from "sequelize";
import sequelize from "@/api/sequelize";

class Stats extends Model {
    declare readonly id: number;
    declare db_height: number;
    declare burned_zano: number;
}

Stats.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: false,
            defaultValue: 1,
        },
        db_height: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        burned_zano: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0,
        },
    },
    { sequelize, modelName: "stats" }
);

export default Stats;
