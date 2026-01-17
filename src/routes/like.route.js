import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { checkIsActive } from "../middlewares/isActive.middleware.js";
import { commentLike, commentUnlike, tweetLike, tweetUnlike } from "../controllers/like.controller.js";

const router = Router();

router.use(verifyJwt, checkIsActive);

router.post("/tweets/:tweetId/like", tweetLike);
router.delete("/tweets/:tweetId/like", tweetUnlike);

router.post("/comments/:commentId/like", commentLike);
router.delete("/comments/:commentId/like", commentUnlike);

export default router;
