import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { optionalAuth, verifyJwt } from "../middlewares/auth.middleware.js";
import { checkIsActive } from "../middlewares/isActive.middleware.js";
import { createTweet, updateTweet, deleteTweet, pinTweetToggle, getTweetById, getUserTweets, getTrendingTweets, getHomeTweets, searchTweets, getFollowingTweets} from "../controllers/tweet.controller.js";

const router = Router();

// 🌍 PUBLIC / MIXED
router.get("/user/:userId", getUserTweets);
router.get("/home", optionalAuth, getHomeTweets);
router.get("/trending", getTrendingTweets);
router.get("/:tweetId", getTweetById);
router.post("/search", searchTweets);

// 🔐 PROTECTED (Login + Active required)`
router.use(verifyJwt, checkIsActive);

router.post(
  "/",
  upload.array("media", 5),
  createTweet
);
router.patch("/:tweetId", updateTweet);
router.delete("/:tweetId", deleteTweet);
router.patch("/:tweetId/pin", pinTweetToggle);
router.get("/f/following", getFollowingTweets);

export default router;
