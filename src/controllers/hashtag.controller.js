import { asyncHandler, asynchandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Hashtag } from "../models/hashtag.model.js";
import { HashtagTweet } from "../models/hashtagTweet.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getTrendingHashtag = asynchandler(async (req, res) => {
  const limit = Number(req.query.limit) || 10;

  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const trendingHashtags = await HashtagTweet.aggregate([
    {
      // sirf last 24h ke data
      $match: {
        createdAt: { $gte: last24Hours },
      },
    },
    {
      // hashtag ke hisaab se group
      $group: {
        _id: "$hashtag",
        tweetCount: { $sum: 1 },
      },
    },
    {
      // zyada use hua = upar
      $sort: { tweetCount: -1 },
    },
    {
      $limit: limit,
    },
    {
      // hashtag ka naam laane ke liye
      $lookup: {
        from: "hashtags",
        localField: "_id",
        foreignField: "_id",
        as: "hashtag",
      },
    },
    {
      $unwind: "$hashtag",
    },
    {
      // final response clean
      $project: {
        _id: 0,
        hashtagId: "$hashtag._id",
        name: "$hashtag.name",
        tweetCount: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        trendingHashtags,
        "Trending hashtags fetched successfully"
      )
    );
});

const searchHashTags = asynchandler(async (req, res) => {
  const { q, cursor } = req.query;
  const limit = Number(req.query.limit) || 10;

  if (!q || !q.trim()) {
    throw new ApiError(400, "query is required.");
  }

  const matchStage = {
    name: { $regex: q.trim(), $options: "i" },
  };

  if (cursor) {
    matchStage.createdAt = { $lt: new Date(cursor) };
  }

  const hashtags = await Hashtag.find(matchStage)
    .sort({ createdAt: -1 })
    .limit(limit + 1);

  const hasMore = hashtags.length > limit;
  if (hasMore) hashtags.pop();

  const nextCursor =
    hashtags.length > 0
      ? hashtags[hashtags.length - 1].createdAt
      : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        hashtags,
        pagination: {
          limit,
          hasMore,
          nextCursor,
        },
      },
      "Hashtags fetched successfully"
    )
  );
});


const getTweetsByHashtags = asyncHandler(async (req, res) => {
  const { tag } = req.params;
  const { cursor } = req.query;
  const limit = Number(req.query.limit) || 15;

  if (!tag || !tag.trim()) {
    throw new ApiError(400, "Tag is required");
  }

  const matchHashtagTweet = {
    "hashtag.name": tag.toLowerCase().trim(),
  };

  if (cursor) {
    matchHashtagTweet.createdAt = { $lt: new Date(cursor) };
  }

  const tweets = await HashtagTweet.aggregate([
    // 1️⃣ join hashtag to filter by name
    {
      $lookup: {
        from: "hashtags",
        localField: "hashtag",
        foreignField: "_id",
        as: "hashtag",
      },
    },
    { $unwind: "$hashtag" },

    // 2️⃣ match requested hashtag
    {
      $match: matchHashtagTweet,
    },

    // 3️⃣ latest first
    {
      $sort: { createdAt: -1 },
    },

    // 4️⃣ pagination trick
    {
      $limit: limit + 1,
    },

    // 5️⃣ join tweets
    {
      $lookup: {
        from: "tweets",
        localField: "tweet",
        foreignField: "_id",
        as: "tweet",
      },
    },
    { $unwind: "$tweet" },

    // 6️⃣ project only tweet
    {
      $project: {
        _id: 0,
        tweet: 1,
        createdAt: 1,
      },
    },
  ]);

  const hasMore = tweets.length > limit;
  if (hasMore) tweets.pop();

  const nextCursor =
    tweets.length > 0
      ? tweets[tweets.length - 1].createdAt
      : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        tweets: tweets.map((t) => t.tweet),
        pagination: {
          limit,
          hasMore,
          nextCursor,
        },
      },
      "Hashtag tweets fetched successfully"
    )
  );
});
