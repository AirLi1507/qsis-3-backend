import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken"
import { Token } from "../config/schema.ts"
import logger from "../utils/logger.ts"

declare module "express" {
  interface Request {
    token?: {
      uid: string,
      role: number,
      iat: number
    }
  }
}

export function accessMiddleware(req: Request, res: Response, next: NextFunction) {
  const { accessToken } = req.cookies
  if (!accessToken) {
    res.status(401).json({
      error: "Unauthorized."
    })
  }
  try {
    const payload = jwt.verify(accessToken, process.env.JWT_SECRET_KEY || "fallback_secret")
    const parsedJWT = Token.parse(payload)
    req.token = parsedJWT
    next()
  } catch (err) {
    logger.error(`Could not verify access token. ${err}`)
    res.status(500).json({
      error: "Could not verify access token."
    })
    return
  }
}
