import { Router } from "express";
import { checkIsActive } from "../middlewares/isActive.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { getTweetComments, createComment, updateComment, deleteComment } from "../controllers/comment.controller.js";


const router = Router()

// 🌍 PUBLIC
router.get("/tweets/:tweetId/comments", getTweetComments)

// 🔐 PROTECTED
router.use(verifyJwt, checkIsActive);
router.post("/tweets/:tweetId", createComment)
router.patch("/:commentId", updateComment)
router.delete("/:commentId", deleteComment)


export default router;