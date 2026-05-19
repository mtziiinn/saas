import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contactsRouter from "./contacts";
import companiesRouter from "./companies";
import tasksRouter from "./tasks";
import dashboardRouter from "./dashboard";
import searchRouter from "./search";
import exportRouter from "./export";

const router: IRouter = Router();

router.use(healthRouter);
router.use(searchRouter);
router.use(exportRouter);
router.use(contactsRouter);
router.use(companiesRouter);
router.use(tasksRouter);
router.use(dashboardRouter);

export default router;
