import z from "zod"

export const Token = z.object({
  uid: z.string(),
  role: z.number(),
  type: z.enum(["access", "refresh"]),
  iat: z.number()
})
