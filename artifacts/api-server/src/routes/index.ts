import { Router, type IRouter } from "express";
import healthRouter from "./health";
import itemsRouter from "./items";
import leadsRouter from "./leads";
import sessionRouter from "./session";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sessionRouter);
router.use(leadsRouter);
router.use(itemsRouter);

export default router;
