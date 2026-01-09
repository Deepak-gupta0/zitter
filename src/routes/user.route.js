import { Router } from "express";
import { getUser, registerUser } from "../controllers/user.controller.js";

const router = Router();

router.route("/").get(getUser);

router.route("/register").post(registerUser);
export default router;
