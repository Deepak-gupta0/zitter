import mongoose from "mongoose";
import { Mention } from "../models/mention.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.model.js";

const getWhoMentionsMe = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request.");
  }
  const { cursor, limit = 9 } = req.query;

  const matchStage = {
    mentionedUser: new mongoose.Types.ObjectId(req.user._id),
  };

  if (cursor) {
    matchStage.createdAt = { $lt: new Date(cursor) };
  }

  const mentions = await Mention.aggregate([
    {
      $match: matchStage,
    },
    { $sort: { createdAt: -1 } },
    { $limit: limit + 1 },
    {
      $lookup: {
        from: "tweets",
        foreignField: "_id",
        localField: "tweet",
        as: "tweet",
        pipeline: [
          {
            $match: {
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
                  $match: {
                    isActive: true,
                  },
                },
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
          {
            $unwind: "$owner",
          },
        ],
      },
    },
    {
      $project: {
        tweet: {
          content: 1,
          owner: 1,
          createdAt: 1,
        },
        createdAt: 1,
      },
    },
  ]);

  const hasMore = mentions.length > limit;
  if (hasMore) mentions.pop();

  const nextCursor =
    mentions.length > 0 ? mentions[mentions.length - 1].createdAt : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        mentions,
        nextCursor,
        hasMore,
      },
      "Successfully fetched who mentions me."
    )
  );
});

//getPostMentions → iss post mei kaun mention hua
const getTweetMentions = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Tweet id is invalid");
  }

  const tweetExists = await Tweet.exists({ _id: tweetId, isDeleted: false, isPublished: true });
  if (!tweetExists) throw new ApiError(404, "Post not found");

  const mentions = await Mention.aggregate([
    {
      $match: {
        tweet: new mongoose.Types.ObjectId(tweetId),
      },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "mentionedUser",
        as: "mentionedUser",
        pipeline: [
          {
            $match: {
              isActive: true,
            },
          },
          {
            $project: {
              avatar: 1,
              username: 1,
              fullName: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$mentionedUser",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $project: {
        _id: 1,
        mentionedUser: 1,
        createdAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, mentions, "Mentioned user fetched successfully")
    );
});


const getMentionCountOfMe = asyncHandler(async(req, res) => {
  if(!req.user?._id){
    throw new ApiError(401, "Unauthorized request")
  }
  const count = await Mention.countDocuments({mentionedUser: req.user._id})

  return res
  .status(200)
  .json(
    new ApiResponse(200, {count}, "Mentions count fetched successfully.")
  )
})

const mentionsMarksAsRead = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const result = await Mention.updateMany(
    {
      mentionedUser: req.user._id,
      isRead: false,
    },
    {
      $set: { isRead: true },
    }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        clearedCount: result.modifiedCount,
      },
      "Mentions marked as read successfully."
    )
  );
});


export { getWhoMentionsMe, getTweetMentions, getMentionCountOfMe, mentionsMarksAsRead};
