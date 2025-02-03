import { DataTypes, Model } from "sequelize";
import sequelize from "@/api/sequelize";

class Stats extends Model {
    declare readonly id: number;
    declare db_height: number;
    declare assets_count: number;
    declare alias_count: number;
    declare matrix_alias_count: number;
    declare whitelisted_assets_count: number;
    declare premium_alias_count: number;
    declare staked_coins: number;
    declare APY: number;
    declare staked_percentage: number;
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
            defaultValue: 0,
        },
        assets_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        alias_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        matrix_alias_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        whitelisted_assets_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        premium_alias_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        staked_coins: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "0",
        },
        APY: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "0",
        },
        staked_percentage: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "0",
        },
    },
    { sequelize, modelName: "stats" }
);

export default Stats;
