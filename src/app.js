import express from "express";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN, //env mei ye hai "http://localhost:3000"
    credentials: true,
  })
);

import userRoute from "./routes/user.route.js"
import cookieParser from "cookie-parser";

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

app.use("/api/v1/users", userRoute)

export default app;