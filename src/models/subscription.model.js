import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const subscriptionSchema = new mongoose.Schema({
  channel : {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
    required : true,
  },
  follower : {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index : true,
    required : true,
  },
}, {timestamps: true})

subscriptionSchema.index({channel: 1, follower: 1}, {unique: true})

subscriptionSchema.pre(function (next) {
  if(this.channel.equals(this.follower)) {
    return next(new Error("User cannot follow themselves"))
  }

  return next();
})

subscriptionSchema.index({ channel: 1, _id: -1 });
subscriptionSchema.index({ follower: 1, _id: -1 });

subscriptionSchema.plugin(mongooseAggregatePaginate)

export const Subscription = mongoose.model("Subscription", subscriptionSchema)