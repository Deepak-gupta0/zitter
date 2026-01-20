import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";

const tweetLike = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { tweetId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  // 1️⃣ Try to create like (idempotent)
  const like = await Like.findOneAndUpdate(
    {
      likedBy: req.user._id,
      targetId: tweetId,
      targetType: "Tweet",
    },
    {
      $setOnInsert: {
        likedBy: req.user._id,
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
    const tweetUpdate = await Tweet.updateOne(
      { _id: tweetId },
      { $inc: { likesCount: 1 } }
    );

    // 3️⃣ Tweet does not exist → rollback like
    if (tweetUpdate.matchedCount === 0) {
      await Like.deleteOne({
        likedBy: req.user._id,
        targetId: tweetId,
        targetType: "Tweet",
      });

      throw new ApiError(404, "Tweet not found");
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Tweet liked successfully"));
});

const tweetUnlike = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { tweetId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  // 1️⃣ Try to delete like
  const unlike = await Like.findOneAndDelete({
    likedBy: req.user._id,
    targetId: tweetId,
    targetType: "Tweet",
  });

  // 2️⃣ Decrement count ONLY if like existed
  if (unlike) {
    const tweetUpdate = await Tweet.updateOne(
      { _id: tweetId, likesCount: { $gt: 0 } },
      { $inc: { likesCount: -1 } }
    );

    // Optional safety (rare case)
    if (tweetUpdate.matchedCount === 0) {
      // tweet doesn't exist, restore like (very rare)
      await Like.create({
        likedBy: req.user._id,
        targetId: tweetId,
        targetType: "Tweet",
      });

      throw new ApiError(404, "Tweet not found");
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: false }, "Tweet unliked successfully"));
});

const commentLike = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "comment id is invalid");
  }

  const comment = await Comment.findOne({_id: commentId, isDeleted: false})

  if(!comment){
    throw new ApiError(404, "Comment not found")
  }

  const like = await Like.findOneAndUpdate(
    {
      likedBy: req.user._id,
      targetId: commentId,
      targetType: "Comment",
    },
    {
      $setOnInsert: {
        likedBy: req.user._id,
        targetId: commentId,
        targetType: "Comment",
      },
    },
    { upsert: true, new: false }
  );

  if (!like) {
    const commentUpdate = await Comment.updateOne(
      { _id: commentId },
      { $inc: { likesCount: 1 } }
    );

    // 3️⃣ Tweet does not exist → rollback like
    if (commentUpdate.matchedCount === 0) {
      await Like.deleteOne({
        likedBy: req.user._id,
        targetId: commentId,
        targetType: "Comment",
      });

      throw new ApiError(404, "Comment not found");
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Comment liked successfully."));
});

const commentUnlike = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "comment id is invalid");
  }

  const comment = await Comment.findOne({_id: commentId, isDeleted: false})

  if(!comment){
    throw new ApiError(404, "Comment not found")
  }

  const unlike = await Like.findOneAndDelete({
    likedBy: req.user._id,
    targetId: commentId,
    targetType: "Comment",
  });

  if (unlike) {
    const commentUpdate = await Comment.updateOne(
      { _id: commentId, likesCount: { $gt: 0 } },
      { $inc: { likesCount: -1 } }
    );

    if (commentUpdate.matchedCount === 0) {
      // tweet doesn't exist, restore like (very rare)
      await Like.create({
        likedBy: req.user._id,
        targetId: commentId,
        targetType: "Comment",
      });

      throw new ApiError(404, "Tweet not found");
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {liked: false}, "Comment unlike successfully"));
});

export { tweetLike, tweetUnlike, commentLike, commentUnlike };
