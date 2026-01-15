import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Tweet } from "../models/tweet.model.js";
import { Subscription } from "../models/subscription.model.js";


//PUBLIC CONTROLLERS
const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "userId is not valid");
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
        isPublished: true,
        isDeleted: false,
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
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
              _id: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "comments",
        foreignField: "post",
        localField: "_id",
        as: "reply",
      },
    },
    {
      $lookup: {
        from: "reposts",
        foreignField: "post",
        localField: "_id",
        as: "repost",
      },
    },
    {
      $lookup: {
        from: "likes",
        foreignField: "targetId",
        localField: "_id",
        as: "likes",
      },
    },
    {
      $addFields: {
        replyCount: {
          $size: "$reply",
        },
        repostCount: {
          $size: "$repost",
        },
        likesCount: {
          $size: "$likes",
        },
      },
    },
  ]);
});

const getHomeTweets = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const { cursor } = req.query;

  let matchStage = {
    isPublished: true,
    isDeleted: false,
  };

  // 🔐 LOGGED-IN → personalized feed
  if (req.user?._id) {
    const followingDocs = await Follow.find({
      follower: req.user._id,
    }).select("following");

    const ownerIds = followingDocs.map(f => f.following);
    ownerIds.push(req.user._id);

    matchStage.owner = { $in: ownerIds };
  }

  // 🌍 PUBLIC → cursor based
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    matchStage._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const tweets = await Tweet.aggregate([
    { $match: matchStage },
    { $sort: { _id: -1 } },
    { $limit: limit + 1 },
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
              _id: 1,
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$owner" },
  ]);

  let hasMore = false;
  if (tweets.length > limit) {
    hasMore = true;
    tweets.pop();
  }

  const nextCursor = hasMore
    ? tweets[tweets.length - 1]._id
    : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        tweets,
        hasMore,
        nextCursor,
      },
      "Home feed fetched successfully"
    )
  );
});


const getTrendingTweets = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 20;

  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 100);

  const tweets = await Tweet.aggregate([
    {
      $match: {
        isPublished: true,
        isDeleted: false,
        createdAt: { $gte: last24Hours },
      },
    },
    {
      $addFields: {
        trendingScore: {
          $add: [
            { $multiply: { $likesCount: 3 } },
            { $multiply: { $repostCount: 4 } },
            { $multiply: { $replyCount: 2 } },
            { $multiply: { $viewCount: 0.1 } },
          ],
        },
      },
    },
    {
      $sort: {
        trendingScore: -1,
      },
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "owner",
        as: "owner",
        pipeline: [
          {
            $match: { isActive: true },
          },
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
              _id: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
  ]);

  if (!tweets.length) {
    throw new ApiError(404, "No trending-tweets are found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, tweets, "Trending tweets are successfully found")
    );
});

const getTweetById = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  await Tweet.findOneAndUpdate(
    { _id: tweetId, isPublished: true, isDeleted: false },
    {
      $inc: {
        viewCount: 1,
      },
    }
  );

  const tweet = await Tweet.aggregate([
    {
      $match: {
        isPublished: true,
        isDeleted: false,
        _id: new mongoose.Types.ObjectId(tweetId),
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
              _id: 1,
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
  ]);

  if (!tweet.length) {
    throw new ApiError(404, "Tweet not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet[0], "Tweet found successfully"));
});


//PROTECTED CONTROLLERS
const createTweet = asyncHandler(async(req, res) => {
  const {content} = req.body; 
  const mediaLocalPath = 
  // if(!content || !content.trim()){
  //   throw new ApiError(400, )
  // }


})
