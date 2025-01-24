import "dotenv/config";
import express from "express";
import logger from "@/api/logger";
import sequelize from "@/api/sequelize";
import initdb from "@/api/database";
import { statsRoute } from "./routes/stats.route";
import { init, syncBlocks, syncStats } from "./utils/sync";
import cors from "cors";
import cacheService from "./services/cache.service";

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not provided at .env file");
}

const app = express();

const envPort = process.env.PORT;
const PORT = envPort ? parseInt(envPort, 10) : 3000;

let syncLaunced = false;
// Log uncaught exceptions and unhandled promise rejections
process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception: ");
    logger.error(err);
});

process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at:");
    logger.error(promise);
    logger.error("reason:");
    logger.error(reason);
});

(async () => {
    await initdb();
    await sequelize.authenticate();
    await sequelize.sync();
    cacheService.init();
    app.use(cors());

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    await init();

    app.use("/api", [statsRoute]);

    app.listen(PORT, () => {
        logger.info(`Server is running on http://localhost:${PORT}`);
    });

    // update data every 5 sec
    setInterval(async () => {
        if (syncLaunced) {
            return;
        }
        syncLaunced = true;
        try {
            await syncStats();
            await syncBlocks();
        } catch (error) {
            logger.error("Sync error: ", error);
        } finally {
            syncLaunced = false;
        }
    }, 5000);
})();


