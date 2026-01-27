import * as z from "zod"; 

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must have atlest 3 character")
    .max(20, "Username should not have more than 20 character"),
  email: z.string().email({ message: "Invalid email address" }),
  password: z
  .string()
  .min(6)
  .max(20)
  .regex(/[a-zA-Z]/, { message: "Password must contain at least one letter" })
  .regex(/[0-9]/, { message: "Password must contain at least one number" })

});

