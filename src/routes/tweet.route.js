import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { checkIsActive } from "../middlewares/isActive.middleware.js";
import { createTweet, updateTweet, deleteTweet, pinTweetToggle, getTweetById, getUserTweets, getTrendingTweets, getHomeTweets } from "../controllers/tweet.controller.js";

const router = Router();

// 🌍 PUBLIC / MIXED
router.get("/user/:userId", getUserTweets);
router.get("/home", getHomeTweets);
router.get("/trending", getTrendingTweets);
router.get("/:tweetId", getTweetById);

// 🔐 PROTECTED (Login + Active required)
router.use(verifyJwt, checkIsActive);

router.post(
  "/",
  upload.array("media", 5),
  createTweet
);
router.patch("/:tweetId", updateTweet);
router.delete("/:tweetId", deleteTweet);
router.patch("/:tweetId/pin", pinTweetToggle);

export default router;
