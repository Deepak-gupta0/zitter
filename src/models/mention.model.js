import mongoose, { Schema } from "mongoose";

const mentionSchema = new Schema({
  tweet: {
    type: Schema.Types.ObjectId,
    ref: "Post",
    required: true,
    index: true,
  },
  mentionedUser: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {timestamps: true});

mentionSchema.index({ tweet: 1, mentionedUser: 1 }, { unique: true });
mentionSchema.index({ mentionedUser: 1, createdAt: -1 });

export const Mention = mongoose.model("Mention", mentionSchema);
