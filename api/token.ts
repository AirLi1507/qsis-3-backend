import dotenv from "dotenv"
import { evaluate } from "mathjs"
import jwt from "jsonwebtoken"

dotenv.config()

export async function generateRefreshToken(uid: string, role: number): Promise<string | false> {
  try {
    const token = jwt.sign(
      {
        uid: uid,
        role: role,
        type: "refresh"
      },
      process.env.JWT_SECRET_KEY!,
      {
        expiresIn: evaluate(process.env.REFRESH_TOKEN_EXPIRES_TIME!),
      }
    )
    return token
  } catch (err) {
    console.error(`Could not generate refresh token, error:\n${err}`)
    return false
  }
}

export async function generateAccessToken(uid: string, role: number): Promise<string | false> {
  try {
    const token = jwt.sign(
      {
        uid: uid,
        role: role,
        type: "access"
      },
      process.env.JWT_SECRET_KEY!,
      {
        expiresIn: evaluate(process.env.ACCESS_TOKEN_EXPIRES_TIME!)
      }
    )
    return token
  } catch (err) {
    console.error(`Could not generate access token,\n${err}`)
    return false
  }
}


export interface accessTokenInterface { uid: string, role: number, type: string, iat: number, exp: number }
