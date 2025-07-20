import { Request, Response } from "express"
import z from "zod"
import { db } from "../config/db.ts"
import argon2id from "argon2"
import jwt from "jsonwebtoken"
import { evaluate } from "mathjs"
import logger from "../utils/logger.ts"
import { Token } from "../config/schema.ts"

export async function login(req: Request, res: Response) {

  const Credentials = z.object({
    uid: z.string(),
    password: z.string()
  })

  const { uid, password } = Credentials.parse(await req.body)

  if (!uid || !password) {
    res.status(401).json({
      error: "Credentials invalid."
    })
    return
  }

  try {
    const HashSchema = z.array(
      z.object({
        password_hash: z.string()
      })
    )
    let [row] = await db.query("select password_hash from user where uid = ?;", [uid])
    const hash = HashSchema.parse(row)[0].password_hash
    if (await argon2id.verify(hash, password)) {
      const RoleSchema = z.array(
        z.object({
          role: z.number()
        })
      );
      [row] = await db.query("select role from user where uid = ?;", [uid])
      const role = RoleSchema.parse(row)[0].role
      const refreshToken = jwt.sign(
        {
          uid: uid,
          role: role,
          type: "refresh"
        },
        process.env.JWT_SECRET_KEY
        ||
        "fallback_secret"
      )

      res.cookie(
        "refreshToken",
        refreshToken,
        {
          sameSite: "strict",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: evaluate(process.env.REFRESH_TOKEN_EXPIRES_TIME || "604800000")
        }
      )

      const accessToken = jwt.sign(
        {
          uid: uid,
          role: role,
          type: "access"
        },
        process.env.JWT_SECRET_KEY
        ||
        "fallback_secret"
      )

      res.cookie(
        "accessToken",
        accessToken,
        {
          sameSite: "strict",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: evaluate(process.env.REFRESH_TOKEN_EXPIRES_TIME || "54000000")

        }
      )
      res.json(true)
    } else {
      res.json(false)
    }
  } catch (err) {
    logger.error(`Could not retrieve hash from database. ${err}`)
    res.status(500).json({
      error: "Error during retrieving password hash from database."
    })
  }
}

export function logout(_req: Request, res: Response) {
  res
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
  res.json(true)
  return
}

export function refresh(req: Request, res: Response) {

  const { refreshToken } = req.cookies

  if (!refreshToken) {
    res.status(401).json({
      error: "Refresh token not provided."
    })
    return
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET_KEY!)
    const { uid, role } = Token.parse(payload)
    const accessToken = jwt.sign(
      {
        uid: uid,
        role: role,
        type: "access"
      },
      process.env.JWT_SECRET_KEY
      ||
      "fallback_secret"
    )

    res.cookie(
      "accessToken",
      accessToken,
      {
        sameSite: "strict",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: evaluate(process.env.REFRESH_TOKEN_EXPIRES_TIME || "54000000")

      }
    )

    res.json(true)
  } catch (err) {
    res.status(401).json({
      error: "Could not verify JWT."
    })
    return
  }
}
