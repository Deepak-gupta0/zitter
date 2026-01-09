import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type : String,
      enum: [
        "like",
        "comment",
        "reply",
        "repost",
        "follow",
        "mention",
      ],
      required: true,
      index: true,
    },
    post : {
      type : Schema.Types.ObjectId,
      ref: "Post",
      default : null
    },
    comment : {
      type : Schema.Types.ObjectId,
      ref: "Post",
      default : null
    },
    isRead : {
      type: Boolean,
      default: false,
      index: true,
    }
  },
  { timestamps: true }
);
//Optimise feed ke liye 
notificationSchema.index({receiver: 1, createdAt: -1})
//New notify ke liye 
notificationSchema.index({receiver: 1, isRead: 1})
notificationSchema.index(
  { sender: 1, receiver: 1, type: 1, post: 1 },
  { unique: false }
);

export const Notification = mongoose.model("Notification", notificationSchema);
