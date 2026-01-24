import { Router } from "express";
import {
  getMentionCountOfMe,
  getTweetMentions,
  getWhoMentionsMe,
  mentionsMarksAsRead,
} from "../controllers/mention.controller.js";

import { verifyJwt } from "../middlewares/auth.middleware.js";
import { checkIsActive } from "../middlewares/isActive.middleware.js";


/* ───────────────── PUBLIC ROUTES ───────────────── */
const router = Router()

// 🔓 Public: kisi post ke mentions (read-only)
router.get("/tweet/:tweetId", getTweetMentions);

/* ─────────────── PROTECTED ROUTES ─────────────── */

router.use(verifyJwt, checkIsActive);

// 🔐 User apni mentions feed dekhe
router.get("/", getWhoMentionsMe);

// 🔔 Badge / count
router.get("/count", getMentionCountOfMe);

// 🧹 User apni mentions clear kare
router.delete("/", mentionsMarksAsRead);

export default router;