import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath : "targetType",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
     enum: ["Tweet", "Comment"],
    },
    likedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  { timestamps: true}
);

likeSchema.index(
  { targetId: 1, targetType: 1, likedBy: 1 },
  { unique: true }
);
likeSchema.index({ likedBy: 1, createdAt: -1 });
likeSchema.index({ targetType: 1, targetId: 1 });
mon
export const Like = mongoose.model("Like", likeSchema);
