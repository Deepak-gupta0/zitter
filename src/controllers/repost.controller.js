import { Repost } from "../models/repost.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { Notification } from "../models/notification.model.js";

// ===================PUBLIC ROUTE=============================
const getRepostsOfTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { cursor } = req.query;
  const limit = 10;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Tweet id is invalid");
  }

  const matchStage = {
    tweet: new mongoose.Types.ObjectId(tweetId),
  };

  if (cursor) {
    matchStage.createdAt = { $lt: new Date(cursor) };
  }

  const reposts = await Repost.aggregate([
    { $match: matchStage },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
        pipeline: [
          { $match: { isActive: true } },
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        user: 1,
        createdAt: 1,
      },
    },
  ]);

  const nextCursor =
    reposts.length > 0 ? reposts[reposts.length - 1].createdAt : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        reposts,
        nextCursor,
        hasMore: reposts.length === limit,
      },
      "Reposts fetched successfully"
    )
  );
});

const getRepostStatus = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Tweet id is invalid");
  }

  const repost = await Repost.findOne({
    user: req.user._id,
    tweet: tweetId,
  }).select("_id");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isReposted: !!repost,
      },
      "Repost status fetched successfully"
    )
  );
});

const getRepostQuotes = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { cursor } = req.query;
  const limit = 15;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Tweet id is invalid");
  }

  const matchStage = {
    isPublished: true,
    isDeleted: false,
    type: "QUOTE",
    originalTweet: new mongoose.Types.ObjectId(tweetId),
  };

  if (cursor) {
    matchStage.createdAt = { $lt: new Date(cursor) };
  }

  const quotes = await Tweet.aggregate([
    { $match: matchStage },
    { $sort: { createdAt: -1 } },
    { $limit: limit },

    // 🔹 Quote owner
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          { $match: { isActive: true } },
          {
            $project: {
              avatar: 1,
              username: 1,
              fullName: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$owner" },

    // 🔹 Final shape
    {
      $project: {
        content: 1,
        owner: 1,
        createdAt: 1,
        likesCount: 1,
        replyCount: 1,
        repostCount: 1,
      },
    },
  ]);

  const nextCursor =
    quotes.length > 0 ? quotes[quotes.length - 1].createdAt : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        quotes,
        nextCursor,
        hasMore: quotes.length === limit,
      },
      "Quotes fetched successfully"
    )
  );
});

// =====================PROTECTED ROUTE=============================
const createRepost = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorised request");
  }

  const { tweetId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Tweet id is invalid");
  }

  const tweet = await Tweet.findOne({
    _id: tweetId,
    isDeleted: false,
    isPublished: true,
  }).select("_id owner");
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  try {
    const repost = await Repost.create({
      user: userId,
      tweet: tweetId,
    });

    await Tweet.updateOne({ _id: tweetId }, { $inc: { repostCount: 1 } });

    if (!tweet.owner.equals(userId)) {
      await Notification.create({
        sender: userId,
        receiver: tweet.owner,
        type: "repost",
        entityType: "Tweet",
        entityId: tweet._id,
      });
    }

    return res
      .status(201)
      .json(new ApiResponse(201, repost, "Reposted successfully."));
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "Tweet already reposted");
    }
    throw error;
  }
});

const deleteRepost = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorised request");
  }

  const { tweetId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Tweet id is invalid");
  }

  const tweet = await Tweet.findOne({
    _id: tweetId,
    isPublished: true,
    isDeleted: false,
  }).select("_id owner");

  if (!tweet) {
    throw new ApiError(404, "Tweet not found.");
  }

  const repost = await Repost.findOneAndDelete({
    user: req.user._id,
    tweet: tweetId,
  });

  if (!repost) {
    throw new ApiError(404, "Repost not found");
  }

  if (repost) {
    await Tweet.updateOne(
      { _id: tweetId, repostCount: { $gt: 0 } },
      { $inc: { repostCount: -1 } }
    );

    await Notification.deleteMany({
      sender: userId,
      receiver: tweet.owner,
      type: "repost",
      entityType: "Tweet",
      entityId: tweet._id,
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { deleted: true }, "Repost deleted successfully.")
    );
});

const createRepostQuote = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
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
  if (content.trim().length > 280) {
    throw new ApiError(400, "Quote content too long");
  }

  const tweet = await Tweet.findOne({ _id: tweetId, isDeleted: false }).select(
    "_id owner"
  );

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.type === "QUOTE") {
    throw new ApiError(400, "Cannot quote a quote tweet");
  }

  const alreadyQuoted = await Tweet.exists({
    owner: userId,
    originalTweet: tweetId,
    type: "QUOTE",
  });

  if(alreadyQuoted){
    throw new ApiError(409, "Quote already exists")
  }

  const quote = await Tweet.create({
    type: "QUOTE",
    content: content.trim(),
    owner: req.user._id,
    originalTweet: tweetId,
  });

  await Tweet.findByIdAndUpdate(tweetId, {
    $inc: { quoteCount: 1 },
  });

  await Notification.create({
    sender: userId,
    receiver: tweet.owner,
    type: "repost",
    entityType: "Tweet",
    entityId: tweet._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, quote, "Quote created successfully"));
});

export {
  createRepost,
  createRepostQuote,
  deleteRepost,
  getRepostsOfTweet,
  getRepostStatus,
  getRepostQuotes,
};
