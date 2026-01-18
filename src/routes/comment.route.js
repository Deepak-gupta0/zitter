import { Router } from "express";
import { checkIsActive } from "../middlewares/isActive.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { getTweetComments, createComment, updateComment, deleteComment, getCommentReplies, createReplyOnComment, getComment } from "../controllers/comment.controller.js";


const router = Router()

// 🌍 PUBLIC
router.get("/tweets/:tweetId/comments", getTweetComments)
router.get("/:commentId/replies", getCommentReplies)
router.get("/:commentId", getComment)


// 🔐 PROTECTED
router.use(verifyJwt, checkIsActive);
router.post("/tweets/:tweetId/comments", createComment)
router.patch("/:commentId", updateComment)
router.delete("/:commentId", deleteComment)

router.post("/:commentId/replies", createReplyOnComment)


export default router;