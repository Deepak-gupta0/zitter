import { Router } from "express";
import {verifyJwt} from "../middlewares/auth.middleware.js"
import {checkIsActive} from "../middlewares/isActive.middleware.js"
import { clearAllBookmarks, getBookmarkStatus, getMyBookmarks, removeBookmark, toggleBookmark } from "../controllers/bookmark.controller.js";

const router = Router()

// 🔐 PROTECTED
router.use(verifyJwt, checkIsActive);

router.post("/:tweetId", toggleBookmark);
router.get("/", getMyBookmarks);
router.get("/:tweetId/status", getBookmarkStatus);
router.delete("/:tweetId", removeBookmark);
router.delete("/", clearAllBookmarks);

export default router;