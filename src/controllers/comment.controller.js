import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.model.js";

const getTweetComments = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { cursor } = req.query; // cursor = last comment's createdAt
  const limit = 15;

  if (!tweetId) {
    return res.status(400).json({ message: "Tweet ID is required." });
  }

  // Query: same tweet, not deleted, top-level comments (parentComment null)
  let query = { 
    tweet: tweetId, 
    parentComment: null, 
    isDeleted: false 
  };

  if (cursor) {
    query.createdAt = { $lt: new Date(cursor) }; // fetch older comments
  }

  const comments = await Comment.find(query)
    .sort({ createdAt: -1 }) // newest first
    .limit(limit)
    .populate("owner", "username avatar fullName"); // populate owner info

  const nextCursor = comments.length > 0 ? comments[comments.length - 1].createdAt : null;

  res.status(200).json({
    comments,
    nextCursor,
    hasMore: comments.length === limit,
  });
});

const createComment = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorised request");
  }

  const { tweetId } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Tweet id is invalid");
  }

  if (!content || !content.trim()) {
    throw new ApiError(400, "content is required");
  }

  const comment = await Comment.create({
    owner: req.user._id,
    content: content.trim(),
    tweet: tweetId,
  });

  const tweetUpdate = await Tweet.updateOne(
    { _id: tweetId, isDeleted: false },
    { $inc: { replyCount: 1 } }
  );

  // Tweet not found → rollback
  if (tweetUpdate.matchedCount === 0) {
    await Comment.findByIdAndDelete(comment._id);
    throw new ApiError(404, "Tweet not found");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "comment added successfully."));
});

const updateComment = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorised request");
  }

  const { commentId } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Comment id is invalid");
  }

  if (!content || !content.trim()) {
    throw new ApiError(400, "content is required");
  }

  const comment = await Comment.findOneAndUpdate(
    { owner: req.user._id, _id: commentId, isDeleted: false },
    {
      content: content.trim(),
      isEdited: true,
    },
    { new: true }
  );

  if (!comment) {
    throw new ApiError(404, "comment not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully."));
});

const deleteComment = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorised request");
  }

  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Comment id is invalid");
  }

  const comment = await Comment.findOneAndUpdate(
    {
      owner: req.user._id,
      _id: commentId,
      isDeleted: false,
    },
    {
      isDeleted: true,
    },
    { new: true }
  );

  if(!comment){
    throw new ApiError(404, "Comment doesnot exists")
  }

  const tweetUpdate = await Tweet.updateOne(
    {
      _id: comment.tweet,
      isDeleted: false,
      replyCount: { $gt: 0 },
    },
    {
      $inc: { replyCount: -1 },
    }
  );

  // Optional safety log (no throw to avoid breaking UX)
  if (tweetUpdate.matchedCount === 0) {
    console.warn("Reply count not updated for tweet:", comment.tweet);
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200, {delete: true}, "Comment deleted successfully.")
  )
});

export { getTweetComments, createComment, updateComment, deleteComment };
