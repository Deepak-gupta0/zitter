import { Router } from "express";
import { deleteNotification, getMyNotifications } from "../controllers/notification.controller.js";

const router = Router()

// =================PROTECTED ROUTE========================
router.get("/", getMyNotifications)
router.delete("/:notifyId", deleteNotification)

export default router;