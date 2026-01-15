import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const repostSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    user: { //jisne repost kia hai
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

repostSchema.index({post : 1, user: 1}, {unique: true})

repostSchema.plugin(mongooseAggregatePaginate)

export const Repost = mongoose.model("Repost", repostSchema);
