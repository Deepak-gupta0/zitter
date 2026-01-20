import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { options } from "../constant.js";
import jwt from "jsonwebtoken";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import mongoose from "mongoose";

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username?.trim() || !email?.trim() || !password?.trim()) {
    throw new ApiError(400, "All fields are required.");
  }

  const isUsesExists = await User.exists({
    $or: [
      { username: username.trim().toLowerCase() },
      { email: email.trim().toLowerCase() },
    ],
  });

  if (isUsesExists) {
    throw new ApiError(409, "User already exists");
  }

  const create = await User.create({
    username: username.trim().toLowerCase(),
    email: email.trim().toLowerCase(),
    password,
  });

  if (!create) {
    throw new ApiError(500, "Something went wrong while creating registering");
  }

  const safeUser = create.toObject();
  delete safeUser.password;
  delete safeUser.refreshToken;
  delete safeUser.__v;

  return res
    .status(201)
    .json(new ApiResponse(201, safeUser, "User registered successfully."));
});

const generateAccessTokenAndRefeshToken = async (id) => {
  try {
    const user = await User.findById(id);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;

    if (!user.isActive) {
      user.isActive = true;
    }
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.log("Something went wrong while generating the tokens", error);
    throw new ApiError(500, "Something went wrong while generating the tokens");
  }
};

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if ((!email && !username) || !password?.trim()) {
    throw new ApiError(400, "Credentials are required");
  }

  const query = email
    ? { email: email.trim().toLowerCase() }
    : { username: username.trim().toLowerCase() };

  const user = await User.findOne(query).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordCorrect = await user.isPasswordValid(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessTokenAndRefeshToken(
    user._id
  );

  const safeUser = user.toObject();

  delete safeUser.password;
  delete safeUser.refreshToken;
  delete safeUser.isActive;

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, safeUser, "User loggedIn successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User loggedout successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;
  console.log(incomingRefreshToken);
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized cookie");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id).select("-password");

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefeshToken(user._id);

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User get successfully!"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { fullName, location, bio, website, birthDate } = req.body;

  let updateFields = {};

  if (typeof fullName === "string" && fullName.trim()) {
    updateFields.fullName = fullName.trim();
  }

  if (typeof location === "string" && location.trim()) {
    updateFields.location = location.trim();
  }

  if (typeof bio === "string" && bio.trim()) {
    updateFields.bio = bio.trim();
  }

  if (typeof website === "string" && website.trim()) {
    updateFields.website = website.trim();
  }

  if (birthDate) {
    updateFields.birthDate = birthDate;
  }

  if (Object.keys(updateFields).length === 0) {
    throw new ApiError(400, "At least one field is required");
  }

  const update = await User.findByIdAndUpdate(req.user._id, updateFields, {
    new: true,
  }).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, update, "User updated successfully."));
});

const changePassword = asyncHandler(async (req, res) => {
  if (!req?.user._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { oldPassword, newPassword } = req.body;

  if (
    typeof oldPassword !== "string" ||
    typeof newPassword !== "string" ||
    !oldPassword.trim() ||
    !newPassword.trim()
  ) {
    throw new ApiError(400, "Both fields are required");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(400, "New password must be different from old password");
  }

  const user = await User.findById(req.user._id).select("+password");

  const isPasswordCorrect = await user.isPasswordValid(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid credentials");
  }

  user.password = newPassword;
  await user.save(); //password hash middleware runs

  return res
    .status(200)
    .json(
      new ApiResponse(200, { success: true }, "Password updated successfully.")
    );
});

const updateAvatar = asyncHandler(async (req, res) => {
  if (!req?.user._id) {
    throw new ApiError(401, "Unauthorized request");
  }
  const avatarLocalFile = req.file?.path;

  if (!avatarLocalFile) {
    throw new ApiError(400, "avatar file is required.");
  }

  const newAvatar = await uploadOnCloudinary(avatarLocalFile);

  if (!newAvatar?.url) {
    throw new ApiError(500, "Failed to upload avatar");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: newAvatar.url } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { avatar: updatedUser.avatar },
        "Avatar updated successfully."
      )
    );
});

const updateCoverImage = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request.");
  }

  const coverImageLocalFile = req.file?.path;

  if (!coverImageLocalFile) {
    throw new ApiError(400, "avatar file is required.");
  }

  const newCoverImage = await uploadOnCloudinary(coverImageLocalFile);

  if (!newCoverImage?.url) {
    throw new ApiError(500, "Failed to upload cover image");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { coverImage: newCoverImage.url } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { coverImage: updatedUser.coverImage },
        "Cover image updated successfully."
      )
    );
});

const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError("Username is required");
  }

  const profile = await User.aggregate([
    {
      $match: { username: username.toLowerCase(), isActive: true },
    },
    {
      $lookup: {
        from: "subscriptions",
        foreignField: "channel",
        localField: "_id",
        as: "followers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        foreignField: "follower",
        localField: "_id",
        as: "following",
      },
    },
    {
      $lookup: {
        from: "posts",
        let: { userId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$owner", "$$userId"] } } },
          { $count: "count" },
        ],
        as: "tweetsCount",
      },
    },
    {
      $addFields: {
        followerCount: {
          $size: "$followers",
        },
        followingCount: {
          $size: "$following",
        },
        tweetsCount: {
          $ifNull: [{ $arrayElemAt: ["$tweetsCount.count", 0] }, 0],
        },
      },
    },
    {
      $project: {
        refreshToken: 0,
        followers: 0,
        following: 0,
        tweets: 0,
      },
    },
  ]);

  if (!profile.length) {
    throw new ApiError(404, "Channel not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, profile[0], "Channel get successfully"));
});

const searchUsers = asyncHandler(async (req, res) => {
  const { name, cursor } = req.query;
  const limit = Math.min(Number(req.query.limit) || 10, 20);

  if (!name?.trim()) {
    throw new ApiError(400, "Search name is required");
  }

  const query = {
    isActive: true,
    $or: [
      { username: { $regex: name, $options: "i" } },
      { fullName: { $regex: name, $options: "i" } },
    ],
  };

  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const users = await User.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .select("username fullName avatar bio");

  const hasMore = users.length > limit;
  if (hasMore) users.pop();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        nextCursor: hasMore ? users[users.length - 1]._id : null,
      },
      "Users fetched successfully"
    )
  );
});

const deleteAccount = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorised request");
  }

  await User.findByIdAndUpdate(req.user._id, {
    isActive: false,
    refreshToken: null,
  });

  return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, {}, "Account deleted successfully."));
});

export {
  registerUser,
  loginUser,
  getUserProfile,
  searchUsers,
  logoutUser,
  getCurrentUser,
  updateAccountDetails,
  changePassword,
  updateAvatar,
  updateCoverImage,
  deleteAccount,
  refreshAccessToken,
};
