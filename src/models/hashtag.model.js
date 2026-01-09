import mongoose, { Schema } from "mongoose";

const hashtagSchema = new Schema({
  name : {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,   // VERY IMPORTANT
  },
}, {timestamps: true})

hashtagSchema.index({name: 1})


export const Hashtag = mongoose.model("Hashtag", hashtagSchema)