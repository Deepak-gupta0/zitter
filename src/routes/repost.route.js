import { Router } from "express";
import { createRepost, createRepostQuote, deleteRepost, getRepostQuotes, getRepostsOfTweet, getRepostStatus } from "../controllers/repost.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { checkIsActive } from "../middlewares/isActive.middleware.js";

const router = Router()

// 🌍 PUBLIC
router.get("/tweets/:tweetId/reposts", getRepostsOfTweet)//who reposted my tweet. (get those persons)
router.get("/tweets/:tweetId/quotes", getRepostQuotes) //who reposted my quote. (get those persons)

// 🔐 PROTECTED
router.use(verifyJwt, checkIsActive);
router.post("/tweets/:tweetId/repost", createRepost) //To create the Repost
router.delete("/tweets/:tweetId/repost", deleteRepost) // To delete the Repost
router.post("/tweets/:tweetId/quote", createRepostQuote) // Create the Quote
router.get("/tweets/:tweetId/repost/status", getRepostStatus ) // To get the status of Repost.


export default router;