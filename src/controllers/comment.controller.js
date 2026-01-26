import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.model.js";
import { Notification } from "../models/notification.model.js";

// ==================PUBLIC ROUTE========================
const getTweetComments = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { cursor } = req.query; // cursor = last comment's createdAt
  const limit = 15;

  if (!tweetId) {
    throw new ApiError(400, "Tweet id is required.");
  }

  // Query: same tweet, not deleted, top-level comments (parentComment null)
  let query = {
    tweet: tweetId,
    parentComment: null,
    isDeleted: false,
  };

  if (cursor) {
    query.createdAt = { $lt: new Date(cursor) }; // fetch older comments
  }

  const comments = await Comment.find(query)
    .sort({ createdAt: -1 }) // newest first
    .limit(limit)
    .populate("owner", "username avatar fullName"); // populate owner info

  const nextCursor =
    comments.length > 0 ? comments[comments.length - 1].createdAt : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
        nextCursor,
        hasMore: comments.length === limit,
      },
      "Tweets fetched successfully."
    )
  );
});

const getCommentReplies = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { cursor } = req.query;
  const limit = 7;

  if (!commentId) {
    throw new ApiError(400, "Comment id is required.");
  }

  const parentComment = await Comment.findById(commentId);

  if (!parentComment || parentComment.isDeleted) {
    throw new ApiError(404, "Parent comment not found");
  }

  if (cursor && isNaN(new Date(cursor).getTime())) {
    throw new ApiError(400, "Invalid cursor");
  }

  let query = {
    parentComment: commentId,
    isDeleted: false,
  };

  if (cursor) {
    query.createdAt = { $lt: new Date(cursor) };
  }

  const comments = await Comment.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("owner", "username avatar fullName");

  const nextCursor =
    comments.length > 0 ? comments[comments.length - 1].createdAt : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
        nextCursor,
        hasMore: comments.length === limit,
      },
      "Comment replies fetched successfully."
    )
  );
});

const getAComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "comment id is invalid");
  }

  const comment = await Comment.aggregate([
    {
      $match: {
        isDeleted: false,
        _id: new mongoose.Types.ObjectId(commentId),
      },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "owner",
        as: "owner",
        pipeline: [
          {
            $match: {
              isActive: true,
            },
          },
          {
            $project: {
              avatar: 1,
              fullName: 1,
              username: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$owner",
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);

  if (!comment.length) {
    throw new ApiError(404, "Comment not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment[0], "Comment get successfully."));
});

// =======================PROTECTED ROUTE===================
const createComment = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorised request");
  }

  const { tweetId } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Tweet id is invalid");
  }

  const tweet = await Tweet.findOne({
    _id: tweetId,
    isPublished: true,
    isDeleted: false,
  }).select("_id owner");

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (!content || !content.trim()) {
    throw new ApiError(400, "content is required");
  }

  const comment = await Comment.create({
    owner: userId,
    content: content.trim(),
    tweet: tweetId,
  });

  if (comment) {
    await Tweet.updateOne(
      { _id: tweetId, isDeleted: false },
      { $inc: { replyCount: 1 } }
    );

    // notify tweet owner (no self notification)
    if (!tweet.owner.equals(userId)) {
      await Notification.create({
        sender: userId,
        receiver: tweet.owner,
        type: "comment",
        entityType: "Tweet",
        entityId: tweet._id,
      });
    }
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
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorised request");
  }

  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Comment id is invalid");
  }

  const comment = await Comment.findOneAndUpdate(
    {
      owner: userId,
      _id: commentId,
      isDeleted: false,
    },
    {
      isDeleted: true,
    },
    { new: true }
  );

  const tweet = await Tweet.findOneAndUpdate(
    { _id: comment.tweet, isDeleted: false },
    { $inc: { replyCount: -1 } }
  ).select("_id owner");

  if (tweet) {
    await Notification.deleteMany({
      entityType: "Tweet",
      entityId: tweet._id,
    });
  }

  await Like.deleteMany({
    targetId: commentId,
    targetType: "Comment",
  });

  await Notification.deleteMany({
    entityType: "Comment",
    entityId: commentId,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { deleted: true }, "Comment deleted successfully")
    );
});

const createReplyOnComment = asyncHandler(async (req, res) => {

  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request.");
  }

  const { commentId } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "comment id is invalid");
  }

  if (!content || !content.trim()) {
    throw new ApiError(400, "content is required.");
  }

  const parentComment = await Comment.findOne({
    _id: commentId,
    isDeleted: false,
  }).select("_id owner tweet");


  if (!parentComment) {
    throw new ApiError(404, "Parent comment not found");
  }

  const reply = await Comment.create({
    owner: userId,
    content: content.trim(),
    tweet: parentComment.tweet,
    parentComment: parentComment._id,
  });

  await Comment.updateOne(
    { _id: parentComment._id },
    { $inc: { replyCount: 1 } }
  );

  if (!parentComment.owner.equals(userId)) {
    await Notification.create({
      sender: userId,
      receiver: parentComment.owner,
      type: "reply",
      entityType: "Comment",
      entityId: parentComment._id,
    });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, reply, "Reply added successfully."));
});

export {
  getTweetComments,
  createComment,
  updateComment,
  deleteComment,
  createReplyOnComment,
  getCommentReplies,
  getAComment,
};
