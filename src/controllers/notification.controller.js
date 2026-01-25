import mongoose from "mongoose";
import { Notification } from "../models/notification.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getMyNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const limit = Number(req.query.limit) || 10;
  const { cursor } = req.query;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const match = {
    receiver: new mongoose.Types.ObjectId(userId),
  };

  if (cursor) {
    match.createdAt = { $lt: new Date(cursor) };
  }

  const notifications = await Notification.aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $limit: limit + 1 },

    {
      $lookup: {
        from: "users",
        localField: "sender",
        foreignField: "_id",
        as: "sender",
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
    {
      $unwind: {
        path: "$sender",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "tweets",
        localField: "entityId",
        foreignField: "_id",
        as: "tweet",
        pipeline: [
          {
            $match: {
              isPublished: true,
              isDeleted: false,
            },
          },
          {
            $project: {
              content: 1,
              createdAt: 1,
              type: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "entityId",
        foreignField: "_id",
        as: "comment",
        pipeline: [
          {
            $match: {
              isDeleted: false,
            },
          },
          {
            $project: {
              content: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "entityId",
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

    {
      $addFields: {
        entity: {
          $cond: [
            { $eq: ["$entityType", "Tweet"] },
            { $arrayElemAt: ["$tweet", 0] },
            {
              $cond: [
                { $eq: ["$entityType", "Comment"] },
                { $arrayElemAt: ["$comment", 0] },
                { $arrayElemAt: ["$user", 0] },
              ],
            },
          ],
        },
      },
    },

    { $project: { tweet: 0, comment: 0, user: 0 } },
  ]);

  let hasNextPage = false;
  let nextCursor = null;
  let slicedNotifications = notifications;

  if (notifications.length > limit) {
    hasNextPage = true;
    const last = notifications.pop();
    nextCursor = last.createdAt;
    slicedNotifications = notifications;
  }

  // 🔥 mark fetched notifications as read
  const unreadIds = slicedNotifications
    .filter((n) => n.isRead === false)
    .map((n) => n._id);

  if (unreadIds.length) {
    await Notification.updateMany(
      { _id: { $in: unreadIds } },
      { $set: { isRead: true } }
    );
  }

  return res.status(200).json(
    new ApiResponse(200, {
      notifications: slicedNotifications,
      nextCursor,
      hasNextPage,
    })
  );
});

const deleteNotification = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorised request");
  }
  const { notifyId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(notifyId)) {
    throw new ApiError(400, "Notification id is invalid");
  }

  const notification = await Notification.findOneAndDelete({
    _id: notifyId,
    receiver: userId,
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found.");
  }

  return res
  .status(200)
  .json(
      new ApiResponse(
        200,
        { deleted: true },
        "Notification is successfully deleted."
      )
    )
});

export { getMyNotifications, deleteNotification};
