import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import stocksRouter from "./stocks";
import watchlistRouter from "./watchlist";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(stocksRouter);
router.use(watchlistRouter);
router.use(aiRouter);

export default router;
