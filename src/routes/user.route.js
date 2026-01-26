import { Router } from "express";
import { optionalAuth, verifyJwt } from "../middlewares/auth.middleware.js";
import { checkIsActive } from "../middlewares/isActive.middleware.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  getUserProfile,
  searchUsers,
  updateAccountDetails,
  changePassword,
  updateAvatar,
  updateCoverImage,
  deleteAccount,
  deleteAvatar,
  deleteCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// 🌍 PUBLIC ROUTES
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);
router.get("/profile/:username", optionalAuth, getUserProfile);
router.get("/search", searchUsers);

// 🔐 PROTECTED ROUTES
router.use(verifyJwt, checkIsActive);

router.post("/logout", logoutUser);
router.get("/me", getCurrentUser);
router.patch("/profile", updateAccountDetails);
router.patch("/password", changePassword);
router.patch("/avatar", upload.single("avatar"), updateAvatar);
router.delete("/avatar", deleteAvatar)
router.patch("/cover-image", upload.single("coverImage"), updateCoverImage);
router.delete("/cover-image", deleteCoverImage)
router.delete("/account", deleteAccount);

export default router;