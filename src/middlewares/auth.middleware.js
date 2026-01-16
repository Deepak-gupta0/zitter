import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const verifyJwt = asyncHandler(async(req, _, next) => {
 const token = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "")

 if(!token){
  throw new ApiError(401, "Unauthorized user")
 }

 const tokenData = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

 if(!tokenData){
  throw new ApiError(401, "access-token expired")
 }

 const user = await User.findById(tokenData._id).select("-password -refreshToken")

 if(!user){
    throw new ApiError(401, "Inavlid Access Token for the User")
  }

  req.user = user

  next()

})

export {verifyJwt};