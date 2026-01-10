import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

const getUser = asyncHandler(async (req, res) => {
  return res.send({
    success: "Working now",
  });
});

export { getUser, registerUser };
