import mongoose, { Schema } from "mongoose";

const hashtagTweetSchema = new Schema({
  tweet: {
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

hashtagTweetSchema.index({ tweet: 1, hashtag: 1 }, { unique: true });
hashtagTweetSchema.index({ tweet: 1, createdAt: -1 }, );
hashtagTweetSchema.index({ hashtag: 1, createdAt: -1 }, );


export const HashtagTweet = mongoose.model("HashtagTweet", hashtagTweetSchema);
