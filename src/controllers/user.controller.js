import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { options } from "../constant.js";
import jwt from "jsonwebtoken";

const getUser = asyncHandler(async (req, res) => {
  return res.send({
    success: "Working now",
  });
});

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

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
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

const getCurrentUser = asyncHandler(async(req, res) => {
 if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const user = await User.findById(req.user._id).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }


  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "User get successfully!")
  )
})

// const updateAccountDetails = asyncHandler(async(req, res) => {
//   const {fullName, location, bio, website, birthDate} = req.body;

//   if(!fullName.trim() && !location.trim() && !bio.trim() && !website.trim() && !birthDate.trim()){
//     throw new ApiResponse(400, "At least one field is required.")
//   }

//   let fieldQuery;

//   if(fullName) fieldQuery.fullName


// })

export { getUser, registerUser, loginUser };
