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
import repostRoute from "./routes/repost.route.js"
import bookmarkRoute from "./routes/bookmark.route.js"
import mentionRoute from "./routes/mention.route.js"
import commentRoute from "./routes/comment.route.js"
import hashtagRoute from "./routes/hashtag.route.js"
import notificationRoute from "./routes/notification.route.js"
import subscriptionRouter from "./routes/subscription.route.js"
import cookieParser from "cookie-parser";

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

app.use("/api/v1/users", userRoute)
app.use("/api/v1/tweets", tweetRoute)
app.use("/api/v1/likes", likeRoute)
app.use("/api/v1/comments", commentRoute)
app.use("/api/v1/reposts", repostRoute)
app.use("/api/v1/subs", subscriptionRouter)
app.use("/api/v1/bookmarks", bookmarkRoute)
app.use("/api/v1/mentions", mentionRoute)
app.use("/api/v1/hashtags", hashtagRoute)
app.use("/api/v1/notification", notificationRoute)


export default app;