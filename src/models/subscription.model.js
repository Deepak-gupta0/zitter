import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const subscriptionSchema = new mongoose.Schema(
  {
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// 🔥 Prevent duplicate subscriptions
subscriptionSchema.index(
  { channel: 1, follower: 1 },
  { unique: true }
);

// ❌ Optional but good validation (enable if you want)
subscriptionSchema.pre("save", function () {
  if (this.channel.equals(this.follower)) {
    return new Error("User cannot follow themselves");
  }
});

subscriptionSchema.plugin(mongooseAggregatePaginate);

export const Subscription = mongoose.model(
  "Subscription",
  subscriptionSchema
);
