import { Router } from "express";
import { createRepost, createRepostQuote, deleteRepost, getRepostQuotes, getRepostsOfTweet, getRepostStatus } from "../controllers/repost.controller.js";

const router = Router()

// 🌍 PUBLIC
router.get("/tweets/:tweetId/reposts", getRepostsOfTweet)
router.get("/tweets/:tweetId/quotes", getRepostQuotes)

// 🔐 PROTECTED
router.post("/tweets/:tweetId/repost", createRepost)
router.delete("/tweets/:tweetId/repost", deleteRepost)
router.post("/tweets/:tweetId/quote", createRepostQuote)
router.get("/tweets/:tweetId/repost/status", getRepostStatus )


export default router;