import { Router } from "express";
import { statsController } from "../controllers/stats.controller";
import handlerTryCatch from "../utils/utils";

export const statsRoute = Router();

statsRoute.post(
    "/get-confirmed-txs-per-day",
    handlerTryCatch(statsController.getConfirmedTxsPerDay)
);

statsRoute.post(
    "/get-avg-txs-number-per-block",
    handlerTryCatch(statsController.getAvgNumberOfTxsPerBlock)
);

statsRoute.post(
    "/get-avg-block-size",
    handlerTryCatch(statsController.getAvgBlockSize)
);

statsRoute.post(
    "/get-registered-aliases-count",
    handlerTryCatch(statsController.getRegisteredAliasesCount)
);

statsRoute.post(
    "/get-registered-assets-count",
    handlerTryCatch(statsController.getRegisteredAssetsCount)
);

statsRoute.post(
    "/get-zano-burned",
    handlerTryCatch(statsController.getZanoBurned)
);
