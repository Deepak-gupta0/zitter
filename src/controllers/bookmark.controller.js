import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { Bookmark } from "../models/bookmark.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggleBookmark = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { tweetId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Tweet id is invalid");
  }

  const tweet = await Tweet.exists({
    _id: tweetId,
    isDeleted: false,
    isPublished: true,
  });

  if (!tweet) {
    throw new ApiError(404, "Tweet not found.");
  }

  const existedBookmark = await Bookmark.exists({
    user: req.user._id,
    tweet: tweetId,
  });

  if (!existedBookmark) {
    await Bookmark.create({ user: req.user._id, tweet: tweetId });

    return res
      .status(201)
      .json(new ApiResponse(201, { bookmarked: true }, "Tweet is bookmarked"));
  }

  await Bookmark.findOneAndDelete({ user: req.user._id, tweet: tweetId });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { bookmarked: false },
        "Tweet is removed from bookmark"
      )
    );
});

const getMyBookmarks = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const limit = Number(req.query.limit) || 20;
  const { cursor } = req.query;

  const matchStage = {
    user: new mongoose.Types.ObjectId(req.user._id),
  };

  if (cursor) {
    matchStage.createdAt = { $lt: new Date(cursor) };
  }

  const bookmarks = await Bookmark.aggregate([
    { $match: matchStage },
    { $sort: { createdAt: -1 } },
    { $limit: limit + 1 }, // 👈 important
    {
      $lookup: {
        from: "tweets",
        localField: "tweet",
        foreignField: "_id",
        as: "tweet",
        pipeline: [
          {
            $match: {
              isDeleted: false,
              isPublished: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
            },
          },
          { $unwind: "$owner" },
          {
            $project: {
              content: 1,
              createdAt: 1,
              media: 1,
              replyCount: 1,
              repostCount: 1,
              quoteCount: 1,
              likesCount: 1,
              viewCount: 1,
              type: 1,
              owner: {
                _id: 1,
                username: 1,
                fullName: 1,
                avatar: 1,
              },
            },
          },
        ],
      },
    },
    { $unwind: "$tweet" }, // remove bookmarks whose tweet no longer exists
  ]);

  const hasMore = bookmarks.length > limit;
  if (hasMore) bookmarks.pop();

  const nextCursor =
    bookmarks.length > 0 ? bookmarks[bookmarks.length - 1].createdAt : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        bookmarks,
        nextCursor,
        hasMore,
      },
      "Bookmarks fetched successfully"
    )
  );
});

const getBookmarkStatus = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { tweetId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  // Optional but recommended: ensure tweet exists
  const tweetExists = await Tweet.exists({
    _id: tweetId,
    isDeleted: false,
    isPublished: true,
  });

  if (!tweetExists) {
    throw new ApiError(404, "Tweet not found");
  }

  const isBookmarked = await Bookmark.exists({
    user: req.user._id,
    tweet: tweetId,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isBookmarked: Boolean(isBookmarked) },
        "Bookmark status fetched"
      )
    );
});

const removeBookmark = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { tweetId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  // Optional but recommended: ensure tweet exists
  const tweetExists = await Tweet.exists({
    _id: tweetId,
    isDeleted: false,
    isPublished: true,
  });

  if (!tweetExists) {
    throw new ApiError(404, "Tweet not found");
  }

  const removed = await Bookmark.findOneAndDelete({
    user: req.user._id,
    tweet: tweetId,
  });

  if (!removed) {
    throw new ApiError(404, "Bookmark not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet removed from bookmark."));
});

const clearAllBookmarks = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { deletedCount } = await Bookmark.deleteMany({ user: req.user._id });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { deletedCount },
        "All tweets are removed from bookmark."
      )
    );
});

export { toggleBookmark, getMyBookmarks, getBookmarkStatus, removeBookmark, clearAllBookmarks };
