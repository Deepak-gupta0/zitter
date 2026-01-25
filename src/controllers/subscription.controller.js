import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Notification } from "../models/notification.model.js";

const getUserFollowers = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { cursor, limit = 10 } = req.query;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "User id is invalid");
  }

  const userExists = await User.exists({ _id: userId, isActive: true });
  if (!userExists) {
    throw new ApiError(404, "User not found");
  }

  const matchStage = {
    channel: new mongoose.Types.ObjectId(userId),
  };

  if (cursor) {
    matchStage._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const followers = await Subscription.aggregate([
    { $match: matchStage },
    { $sort: { _id: -1 } },
    { $limit: Number(limit) + 1 },
    {
      $lookup: {
        from: "users",
        localField: "follower",
        foreignField: "_id",
        as: "follower",
        pipeline: [
          { $match: { isActive: true } },
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$follower" },
    {
      $project: {
        _id: 1,
        follower: 1,
      },
    },
  ]);

  let hasMore = false;
  let nextCursor = null;
  if (followers.length > limit) {
    hasMore = true;
    nextCursor = followers[limit - 1]._id;
    followers.pop();
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        data: followers.map((f) => f.follower),
        nextCursor,
      },
      "Followers fetched successfully"
    )
  );
});

const getUserFollowing = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 10, cursor } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "user id is invalid.");
  }

  const userExists = await User.exists({ _id: userId, isActive: true });
  if (!userExists) {
    throw new ApiError(404, "User not found");
  }

  const matchStage = {
    follower: new mongoose.Types.ObjectId(userId),
  };

  if (cursor) {
    matchStage._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const following = await Subscription.aggregate([
    {
      $match: matchStage,
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "channel",
        as: "channel",
        pipeline: [
          {
            $match: {
              isActive: true,
            },
          },
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "channel",
    },
    {
      $project: {
        _id: 1,
        channel: 1,
      },
    },
  ]);

  let hasMore = false;
  let nextCursor = null;
  if (followers.length > limit) {
    hasMore = true;
    nextCursor = followers[limit - 1]._id;
    followers.pop();
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        data: following.map((f) => f.channel),
        nextCursor,
        hasMore,
      },
      "Following fetched successfully"
    )
  );
});

const createSubscription = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request.");
  }

  const { channelId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "user id is invalid.");
  }

  const userExists = await User.exists({ _id: channelId, isActive: true });
  if (!userExists) {
    throw new ApiError(404, "User not found");
  }

  const alreadySubscribed = await Subscription.exists({
    channel: channelId,
    follower: req.user._id,
  });

  if (alreadySubscribed) {
    return res.status(200).json(new ApiResponse(200, {}, "Already subscribed"));
  }

  if (userId.toString() === channelId.toString()) {
    throw new ApiError(400, "You cannot follow-unfollow yourself");
  }

  await Promise.all([
    Subscription.create({
      channel: channelId,
      follower: req.user._id,
    }),

    User.updateOne({ _id: channelId }, { $inc: { followerCount: 1 } }),

    User.updateOne({ _id: req.user._id }, { $inc: { followingCount: 1 } }),

    Notification.create({
      sender: userId,
      receiver: channelId,
      type: "follow",
      entityType: "User",
      entityId: userId,
    }),
  ]);

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { subscribed: true },
        "Channel subscribed successfully."
      )
    );
});

const deleteSubscription = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request.");
  }

  const { channelId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "channel id is invalid.");
  }

  const userExists = await User.exists({ _id: channelId, isActive: true });
  if (!userExists) {
    throw new ApiError(404, "channel not found");
  }

  const alreadySubscribed = await Subscription.exists({
    channel: channelId,
    follower: req.user._id,
  });

  if (!alreadySubscribed) {
    return res.status(200).json(new ApiResponse(200, {}, "Not subscribed"));
  }

  if (userId.toString() === channelId.toString()) {
    throw new ApiError(400, "You cannot follow-unfollow yourself");
  }

  await Promise.all([
    Subscription.deleteOne({
      channel: channelId,
      follower: req.user._id,
    }),

    User.updateOne(
      { _id: channelId, followerCount: { $gt: 0 } },
      { $inc: { followerCount: -1 } }
    ),

    User.updateOne(
      { _id: req.user._id, followingCount: { $gt: 0 } },
      { $inc: { followingCount: -1 } }
    ),

    Notification.findOneAndDelete({
      sender: userId,
      receiver: channelId,
      type: "follow",
      entityType: "User",
      entityId: userId
    })
  ]);
  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Channel Unsubscribed successfully."));
});

export {
  getUserFollowers,
  getUserFollowing,
  createSubscription,
  deleteSubscription,
};
