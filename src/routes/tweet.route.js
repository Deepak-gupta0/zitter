import { Router } from "express";

const router = Router();

// 🌍 PUBLIC / MIXED
router.get("/user/:userId", getUserTweets);
router.get("/home");
router.get("/trending", getTrendingTweets);
router.get("/:tweetId", getTweetById);

// 🔐 PROTECTED (Login + Active required)
router.use(verifyJwt, checkIsActive);

router.post(
  "/",
  upload.fields([
    { name: "img", maxCount: 4 },
    { name: "video", maxCount: 4 },
    {name: "gif", maxCount: 4}
  ]),
  createTweet
);
router.patch("/:tweetId", updateTweet);
router.delete("/:tweetId", deleteTweet);
router.patch("/:tweetId/pin", pinTweet);

export default router;
