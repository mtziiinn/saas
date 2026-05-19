import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import contactsRouter from "./contacts";
import companiesRouter from "./companies";
import tasksRouter from "./tasks";
import dashboardRouter from "./dashboard";
import searchRouter from "./search";
import exportRouter from "./export";
import treatmentPlansRouter from "./treatment-plans";
import financialRouter from "./financial";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(searchRouter);
router.use(exportRouter);
router.use(contactsRouter);
router.use(companiesRouter);
router.use(tasksRouter);
router.use(dashboardRouter);
router.use(treatmentPlansRouter);
router.use(financialRouter);

export default router;
