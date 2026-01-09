import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

const getUser = asyncHandler(async (req, res) => {
  return res.send({
    success: "Working now",
  });
});

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    throw new ApiError(400, "All fields are required.");
  }

  const isUsesExists = await User.exists({
    $or : [
      {username}, {email}
    ]
  });

  if(isUsesExists){
    throw new ApiError(409, "User alredy exists")
  }

  const create = await User.create({
    username, email, password
  })

  if(!create){
    throw new ApiError(500, "Something went wrong while creating registering")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200, create, "User registered successfully.")
  )
});

export { getUser, registerUser };
