import { Router } from "express";
import { statsController } from "../controllers/stats.controller";
import handlerTryCatch from "../utils/utils";

export const statsRoute = Router();

statsRoute.post(
    "/get-confirmed-txs",
    handlerTryCatch(statsController.getConfirmedTxs)
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
    "/get-aliases-count",
    handlerTryCatch(statsController.getAliasesCount)
);

statsRoute.post(
    "/get-assets-count",
    handlerTryCatch(statsController.getAssetsCount)
);

statsRoute.post(
    "/get-zano-burned",
    handlerTryCatch(statsController.getZanoBurned)
);
