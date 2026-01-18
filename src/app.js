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
import tweetRoute from "./routes/tweet.route.js"
import likeRoute from "./routes/like.route.js"
import commentRoute from "./routes/comment.route.js"
import cookieParser from "cookie-parser";

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

app.use("/api/v1/users", userRoute)
app.use("/api/v1/tweets", tweetRoute)
app.use("/api/v1/likes", likeRoute)
app.use("/api/v1/comments", commentRoute)

export default app;