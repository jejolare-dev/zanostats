import { Router } from "express";
import { assetController } from "../controllers/asset.controller";
import handlerTryCatch from "../utils/utils";

export const assetRoute = Router();

assetRoute.post(
    "/get-token-info",
    handlerTryCatch(assetController.getTokenStatsAllPeriods)
);
