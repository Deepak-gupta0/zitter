import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";
import { Notification } from "../models/notification.model.js";

const tweetLike = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const { tweetId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const tweet = await Tweet.findOne({
    _id: tweetId,
    isPublished: true,
    isDeleted: false,
  }).select("_id owner");

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  // 1️⃣ Try to create like (idempotent)
  const like = await Like.findOneAndUpdate(
    {
      likedBy: userId,
      targetId: tweetId,
      targetType: "Tweet",
    },
    {
      $setOnInsert: {
        likedBy: userId,
        targetId: tweetId,
        targetType: "Tweet",
      },
    },
    {
      upsert: true,
      new: false, // null means like did not exist before
    }
  );

  // 2️⃣ Increment count ONLY if like was newly created
  if (!like) {
    await Tweet.updateOne({ _id: tweetId }, { $inc: { likesCount: 1 } });

    // 3️⃣Made a notify for if A is sending notify to B
    if (!tweet.owner.equals(userId)) {
      await Notification.create({
        sender: userId,
        receiver: tweet.owner,
        type: "like",
        entityType: "Tweet",
        entityId: tweetId,
      });
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Tweet liked successfully"));
});

const tweetUnlike = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { tweetId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const tweet = await Tweet.findOne({
    _id: tweetId,
    isPublished: true,
    isDeleted: false,
  }).select("_id owner");

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  // 1️⃣ Try to delete like
  const unlike = await Like.findOneAndDelete({
    likedBy: req.user._id,
    targetId: tweetId,
    targetType: "Tweet",
  });

  // 2️⃣ Decrement count ONLY if like existed
  if (unlike) {
    await Tweet.updateOne(
      { _id: tweetId, likesCount: { $gt: 0 } },
      { $inc: { likesCount: -1 } }
    );

    //delete notification
    await Notification.deleteMany({
      sender: userId,
      receiver: tweet.owner._id ?? tweet.owner,
      type: "like",
      entityType: "Tweet",
      entityId: tweetId,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: false }, "Tweet unliked successfully"));
});

const commentLike = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "comment id is invalid");
  }

  const comment = await Comment.findOne({
    _id: commentId,
    isDeleted: false,
  }).select("_id owner");

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const like = await Like.findOneAndUpdate(
    {
      likedBy: userId,
      targetId: commentId,
      targetType: "Comment",
    },
    {
      $setOnInsert: {
        likedBy: userId,
        targetId: commentId,
        targetType: "Comment",
      },
    },
    { upsert: true, new: false }
  );

  if (!like) {
    await Comment.updateOne({ _id: commentId }, { $inc: { likesCount: 1 } });

    if (!comment.owner.equals(userId)) {
      await Notification.create({
        sender: userId,
        receiver: comment.owner,
        type: "like",
        entityType: "Comment",
        entityId: commentId,
      });
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Comment liked successfully."));
});

const commentUnlike = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "comment id is invalid");
  }

  const comment = await Comment.findOne({
    _id: commentId,
    isDeleted: false,
  }).select("_id owner");

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const unlike = await Like.findOneAndDelete({
    likedBy: userId,
    targetId: commentId,
    targetType: "Comment",
  });

  if (unlike) {
    await Comment.updateOne(
      { _id: commentId, likesCount: { $gt: 0 } },
      { $inc: { likesCount: -1 } }
    );

    await Notification.deleteMany({
        sender: userId,
        receiver: comment.owner._id ?? comment.owner,
        type: "like",
        entityType: "Comment",
        entityId: commentId,
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { liked: false }, "Comment unlike successfully")
    );
});

export { tweetLike, tweetUnlike, commentLike, commentUnlike };
