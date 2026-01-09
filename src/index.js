import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

import app from "./app.js";
import connectDB from "./db/index.js";

const port = process.env.PORT || 4500;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend is running on http://localhost:${port}/`);
    });
    app.on("error", (error) => {
      console.log("Listening failed on the server.", error);
    });
  })
  .catch((error) => {
    console.log("Database connection failed.", error);
  });
