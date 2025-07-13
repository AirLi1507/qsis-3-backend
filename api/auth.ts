import argon2 from "argon2";
import jwt from "jsonwebtoken"
import { db } from "./db";
import { RowDataPacket } from "mysql2";
import { generateAccessToken, generateRefreshToken } from "./token";
import dotenv from "dotenv";

dotenv.config()

export async function login(uid: string, password: string): Promise<false | string[]> {
  if (uid.length > 20 || password.length < 6) {
    return false
  }
  interface Data extends RowDataPacket { password_hash: string, role: number }
  // Checks for password hash if user exist
  const [row] = await db.query<Data[]>("select password_hash, role from user where uid = ? limit 1;", [uid])
  // Since password_hash[0] will be undefined, if user doesn't exist, so we check if user exists here
  if (row.length == 0 || row[0] == undefined) {
    console.error(`Error: User not found!`)
    return false
  }
  try {
    if (await argon2.verify(row[0].password_hash, password)) {
      console.log(`Successful login.`)
      const refreshToken: string | false = await generateRefreshToken(uid, row[0].role)
      const accessToken: string | false = await generateAccessToken(uid, row[0].role)
      if (refreshToken && accessToken) {
        return [refreshToken, accessToken]
      } else {
        return false
      }
    } else {
      console.log("Failure login.")
      return false
    }
  } catch (err) {
    console.error(`Error: Could not authenticate user:\n${err}`)
    return false
  }
}

export async function refresh(token: string): Promise<string | boolean> {
  if (token == undefined) {
    return false
  }
  try {
    const verifyRefresh = jwt.verify(token, process.env.JWT_SECRET_KEY!) as { uid: string, role: number, type: string, iat: number, exp: number }
    const newAccessToken = await generateAccessToken(verifyRefresh.uid, verifyRefresh.role);
    return newAccessToken
  } catch (err) {
    console.error(`Could not verify JWT,\n${err}`)
    return false
  }
}

export async function access(token: string) {
  if (token == undefined) {
    return false
  }
  try {
    const result = jwt.verify(token, process.env.JWT_SECRET_KEY!)
    if (result) {
      return result
    } else {
      return false
    }
  } catch (err) {
    console.error(`Could not verify access token,\n${err}`)
    return false
  }
}
