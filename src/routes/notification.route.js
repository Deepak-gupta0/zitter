import { Router } from "express";
import { deleteNotification, getMyNotifications } from "../controllers/notification.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { checkIsActive } from "../middlewares/isActive.middleware.js";

const router = Router()

// =================PROTECTED ROUTE========================
router.use(verifyJwt, checkIsActive)
router.get("/", getMyNotifications)
router.delete("/:notifyId", deleteNotification)

export default router;