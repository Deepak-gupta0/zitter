import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  extractHashtags,
  getMentionedUsers,
} from "../utils/UtilityFunctions.js";
import { Tweet } from "../models/tweet.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Mention } from "../models/mention.model.js";
import { Like } from "../models/like.model.js";
import { Bookmark } from "../models/bookmark.model.js";
import { Comment } from "../models/comment.model.js";
import { Hashtag } from "../models/hashtag.model.js";
import { HashtagTweet } from "../models/hashtagTweet.model.js";
import { Notification } from "../models/notification.model.js";

//PUBLIC CONTROLLERS
const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const limit = Number(req.query.limit) || 10;
  const { cursor } = req.query;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "userId is not valid");
  }

  const cursorDate = cursor ? new Date(cursor) : null;

  // 1️⃣ Original tweets
  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
        isPublished: true,
        isDeleted: false,
        ...(cursorDate && { createdAt: { $lt: cursorDate } }),
      },
    },
    {
      $project: {
        tweetId: "$_id",
        type: { $literal: "TWEET" },
        createdAt: 1,
      },
    },
  ]);

  // 2️⃣ Reposts
  const reposts = await Repost.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        ...(cursorDate && { createdAt: { $lt: cursorDate } }),
      },
    },
    {
      $project: {
        tweetId: "$post",
        type: { $literal: "REPOST" },
        createdAt: 1,
      },
    },
  ]);

  // 3️⃣ Merge + sort
  let feed = [...tweets, ...reposts]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit + 1);

  // 4️⃣ Pagination handling
  const hasMore = feed.length > limit;
  if (hasMore) feed.pop();

  const nextCursor = feed.length > 0 ? feed[feed.length - 1].createdAt : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        feed,
        pagination: {
          limit,
          hasMore,
          nextCursor,
        },
      },
      "User feed fetched successfully"
    )
  );
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

    const ownerIds = followingDocs.map((f) => f.following);
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

  const nextCursor = hasMore ? tweets[tweets.length - 1]._id : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        tweets,
        pagination: {
          limit,
          hasMore,
          nextCursor,
        },
      },
      "Home feed fetched successfully"
    )
  );
});

const getTrendingTweets = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const { cursor } = req.query;

  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const matchStage = {
    isPublished: true,
    isDeleted: false,
    createdAt: { $gte: last24Hours },
  };

  const tweets = await Tweet.aggregate([
    { $match: matchStage },

    // 1️⃣ calculate score
    {
      $addFields: {
        trendingScore: {
          $add: [
            { $multiply: ["$likesCount", 3] },
            { $multiply: ["$repostCount", 4] },
            { $multiply: ["$replyCount", 2] },
            { $multiply: ["$viewCount", 0.1] },
          ],
        },
      },
    },

    // 2️⃣ cursor filter
    ...(cursor
      ? [
          {
            $match: {
              $or: [
                { trendingScore: { $lt: Number(cursor.score) } },
                {
                  trendingScore: Number(cursor.score),
                  createdAt: { $lt: new Date(cursor.createdAt) },
                },
              ],
            },
          },
        ]
      : []),

    // 3️⃣ sort
    {
      $sort: {
        trendingScore: -1,
        createdAt: -1,
      },
    },

    // 4️⃣ pagination
    {
      $limit: limit + 1,
    },

    // 5️⃣ owner lookup
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

  const hasMore = tweets.length > limit;
  if (hasMore) tweets.pop();

  const nextCursor =
    tweets.length > 0
      ? {
          score: tweets[tweets.length - 1].trendingScore,
          createdAt: tweets[tweets.length - 1].createdAt,
        }
      : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        tweets,
        pagination: {
          limit,
          hasMore,
          nextCursor,
        },
      },
      "Trending tweets fetched successfully"
    )
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

const searchTweets = asyncHandler(async (req, res) => {
  const { q, cursor } = req.query;
  const limit = Number(req.query.limit) || 7;
  if (!q || !q.trim()) {
    throw new ApiError(400, "search query is required.");
  }

  if (cursor) {
    match.createdAt = { $lt: new Date(cursor) };
  }

  const match = {
    isPublished: true,
    isDeleted: false,
    content: { $regex: q.trim(), $options: "i" },
  };

  const tweets = await Tweet.aggregate([
    {
      $match: match,
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $limit: limit + 1,
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

  const hasMore = tweets.length > limit;
  if (hasMore) tweets.pop();

  const nextCursor =
    tweets.length > 0 ? tweets[tweets.length - 1].createdAt : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        tweets,
        pagination: {
          limit,
          hasMore,
          nextCursor,
        },
      },
      "Tweets searched successfully"
    )
  );
});

//PROTECTED CONTROLLERS
const createTweet = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const files = req.files || [];
  const content = req.body.content?.trim() || "";

  if (!content && files.length === 0) {
    throw new ApiError(400, "Tweet cannot be empty");
  }

  if (files.length > 5) {
    throw new ApiError(400, "Maximum 5 media files allowed");
  }

  // 🔹 upload media
  const media = await Promise.all(
    files.map(async (file) => {
      const result = await uploadOnCloudinary(file.path, "tweets");

      const isVideo = file.mimetype.startsWith("video");
      const isGif = file.mimetype === "image/gif";

      return {
        type: isVideo ? "video" : isGif ? "gif" : "image",
        url: result.secure_url,
        publicId: result.public_id,
        height: result.height,
        width: result.width,
        duration: result.duration,
      };
    })
  );

  // 🔹 mentions
  const mentionedUsers = getMentionedUsers(content);
  const usernames = mentionedUsers.map((u) => u.username);

  const mentionedUserDocs = await User.find({
    username: { $in: usernames },
    isActive: true,
  }).select("_id username");

  // 🔹 create tweet
  const tweet = await Tweet.create({
    owner: req.user._id,
    media: media.length ? media : undefined,
    type: "TWEET",
    content,
  });

  // 🔹 save mentions + 🔔 notifications
  if (mentionedUserDocs.length) {
    const mentionPayload = [];
    const notificationPayload = [];

    for (const user of mentionedUserDocs) {
      // mention record
      mentionPayload.push({
        tweet: tweet._id,
        mentionedUser: user._id,
        mentionedBy: req.user._id,
        isRead: false,
      });

      // self mention → no notification
      if (!user._id.equals(req.user._id)) {
        notificationPayload.push({
          sender: req.user._id,
          receiver: user._id,
          type: "mention",
          entityType: "Tweet",
          entityId: tweet._id,
          isRead: false,
        });
      }
    }

    await Promise.all([
      Mention.insertMany(mentionPayload),
      notificationPayload.length
        ? Notification.insertMany(notificationPayload)
        : Promise.resolve(),
    ]);
  }

  // ===============================
  // 🔥 HASHTAG LOGIC
  // ===============================

  const hashtags = extractHashtags(content);

  if (hashtags.length) {
    const hashtagDocs = await Promise.all(
      hashtags.map((tag) =>
        Hashtag.findOneAndUpdate(
          { name: tag },
          { $setOnInsert: { name: tag } },
          { upsert: true, new: true }
        )
      )
    );

    const hashtagTweetPayload = hashtagDocs.map((hashtag) => ({
      hashtag: hashtag._id,
      tweet: tweet._id,
    }));

    await HashtagTweet.insertMany(hashtagTweetPayload);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully."));
});

const updateTweet = asyncHandler(async (req, res) => {
  // 1️⃣ Auth check
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { tweetId } = req.params;
  const { content } = req.body;

  // 2️⃣ Validate tweetId
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  // 3️⃣ Validate content
  if (!content || !content.trim()) {
    throw new ApiError(400, "Tweet content cannot be empty");
  }

  // 4️⃣ Update tweet (owner check included)
  const tweet = await Tweet.findOneAndUpdate(
    { _id: tweetId, owner: req.user._id },
    { content: content.trim() },
    {
      new: true,
      runValidators: true,
    }
  );

  // 5️⃣ Tweet not found or not owner
  if (!tweet) {
    throw new ApiError(404, "Tweet not found or access denied");
  }

  // 6️⃣ Success response
  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  // 1️⃣ Auth check
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { tweetId } = req.params;

  // 2️⃣ Validate tweetId
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  // 3️⃣ Delete tweet (owner check included)
  const tweet = await Tweet.findOne({
    _id: tweetId,
    owner: req.user._id,
  });

  // 4️⃣ Tweet not found / not owner
  if (!tweet) {
    throw new ApiError(404, "Tweet not found or access denied");
  }

  await Promise.all([
    Mention.deleteMany({ tweet: tweet._id }),
    Like.deleteMany({
      targetId: tweet._id,
      targetType: "Tweet",
    }),
    Bookmark.deleteMany({ tweet: tweet._id }),
    Comment.updateMany({ tweet: tweet._id }, { $set: { isDeleted: true } }),
    Tweet.updateMany(
      { originalTweet: tweet._id },
      { $set: { isDeleted: true } }
    ),
    Notification.deleteMany({
      entityType: "Tweet",
      entityId: tweet._id,
    }),
  ]);

  tweet.isDeleted = true;
  await tweet.save();

  // 5️⃣ Success response
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

const pinTweetToggle = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { tweetId } = req.params;

  // 2️⃣ Validate tweetId
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const tweet = await Tweet.exists({
    _id: tweetId,
    owner: req.user._id,
  });

  if (!tweet) {
    throw new ApiError(404, "Tweet not found or access denied");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    [
      {
        $set: {
          pinnedTweetId: {
            $cond: [
              { $eq: ["$pinnedTweetId", new mongoose.Types.ObjectId(tweetId)] },
              null, // unpin
              new mongoose.Types.ObjectId(tweetId), // pin
            ],
          },
        },
      },
    ],
    { new: true, updatePipeline: true }
  ).select("pinnedTweetId");

  const isPinned = String(user.pinnedTweetId) === tweetId;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPinned },
        isPinned ? "Tweet successfully pinned" : "Tweet successfully unpinned"
      )
    );
});

export {
  createTweet,
  updateTweet,
  deleteTweet,
  pinTweetToggle,
  getTweetById,
  getTrendingTweets,
  getHomeTweets,
  getUserTweets,
  searchTweets,
};
