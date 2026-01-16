import multer from "multer"
import path from "path";
import { ApiError } from "../utils/ApiError.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/temp"); // temp storage
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});


const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(
      new ApiError(400, "Only images, gifs and videos are allowed"),
      false
    );
  }

  cb(null, true);
};


export const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 5,                 // 🔒 total max files
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
});