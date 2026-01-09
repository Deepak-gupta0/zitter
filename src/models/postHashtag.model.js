import mongoose, { Schema } from "mongoose";

const postHashtagSchema = new Schema({
  post: {
    type: Schema.Types.ObjectId,
    ref: "Post",
    required: true,
  },
  hashtag: {
    type: Schema.Types.ObjectId,
    ref: "Hashtag",
    index: true,
    required: true,
  },
});

postHashtagSchema.index({ post: 1, hashtag: 1 }, { unique: true });
postHashtagSchema.index({ post: 1, createdAt: -1 }, );
postHashtagSchema.index({ hashtag: 1, createdAt: -1 }, );


export const PostHashtag = mongoose.model("PostHashtag", postHashtagSchema);
