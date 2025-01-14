import "dotenv/config";
import express from "express";
import next from "next";
import logger from "@/api/logger";
import sequelize from "@/api/sequelize";
import initdb from "@/api/database";
import { statsRoute } from "./routes/stats.route";
import { init, syncBlocks, syncStats } from "./utils/sync";

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not provided at .env file");
}

const app = express();

const envPort = process.env.PORT;
const PORT = envPort ? parseInt(envPort, 10) : 3000;

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev, turbopack: true });
const handle = nextApp.getRequestHandler();

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

    await nextApp.prepare();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    await init();

    app.use("/api", [statsRoute]);

    app.get("*", (req, res) => handle(req, res));

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
            await syncBlocks();
            await syncStats();
        } catch (error) {
            logger.error("Sync error: ", error);
        } finally {
            syncLaunced = false;
        }
    }, 5000);
})();
