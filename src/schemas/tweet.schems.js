import * as z from "zod";

export const tweetSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Tweet cannot be empty" })
    .max(280, { message: "Tweet must not exceed 280 characters" })
});