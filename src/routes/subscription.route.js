import { Router } from "express";
import {
  createSubscription,
  deleteSubscription,
  getUserFollowers,
  getUserFollowing,
} from "../controllers/subscription.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { checkIsActive } from "../middlewares/isActive.middleware.js";

const router = Router();

// 🌍 PUBLIC
router.get("/channel/:userId/followers", getUserFollowers);
router.get("/channel/:userId/following", getUserFollowing);

// 🔐 PROTECTED
router.use(verifyJwt, checkIsActive)
router.post("/follow/:channelId", createSubscription);
router.delete("/follow/:channelId", deleteSubscription);

export default router;
