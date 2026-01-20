import { Router } from "express";
import { createRepost, createRepostQuote, deleteRepost, getRepostQuotes, getRepostsOfTweet, getRepostStatus } from "../controllers/repost.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { checkIsActive } from "../middlewares/isActive.middleware.js";

const router = Router()

// 🌍 PUBLIC
router.get("/tweets/:tweetId/reposts", getRepostsOfTweet)//who reposted my tweet
router.get("/tweets/:tweetId/quotes", getRepostQuotes) //who reposted my quote.

// 🔐 PROTECTED
router.use(verifyJwt, checkIsActive);
router.post("/tweets/:tweetId/repost", createRepost)
router.delete("/tweets/:tweetId/repost", deleteRepost)
router.post("/tweets/:tweetId/quote", createRepostQuote)
router.get("/tweets/:tweetId/repost/status", getRepostStatus )


export default router;