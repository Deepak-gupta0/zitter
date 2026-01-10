import { Router } from "express";
import { getUser, loginUser, registerUser } from "../controllers/user.controller.js";

const router = Router();

router.route("/").get(getUser);

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
export default router;
