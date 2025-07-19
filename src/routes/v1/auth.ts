import express from "express"
import * as z from "zod"
import argon2 from "argon2"
import jwt from "jsonwebtoken"
import { db } from "../../config/db.ts"
import { Token } from "../../config/zod.ts"
import { evaluate } from "mathjs"

const router = express.Router()

router.get("/refresh", async (req, res) => {
  const { refreshToken } = await req.cookies
  if (!refreshToken) {
    res.status(401).send("Unauthorized.")
    return
  }
  const verifiedToken = jwt.verify(refreshToken, process.env.JWT_SECRET_KEY!)
  if (!verifiedToken) {
    res.status(401).send("Invalid refresh token.")
    return
  }
  const { uid, role } = Token.parse(verifiedToken)
  const accessToken = jwt.sign({
    uid: uid,
    role: role,
    type: "access"
  }, process.env.JWT_SECRET_KEY!)
  res.cookie(
    "accessToken",
    accessToken,
    {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "strict",
      maxAge: evaluate(process.env.ACCESS_TOKEN_EXPIRES_TIME || "54000000")
    }
  )
  res.status(200).json(true)
})

router.post("/login", async (req, res) => {
  const { uid, password } = await req.body
  if (!uid || !password) {
    res.status(400).json(false)
    return
  }
  try {
    let [row] = await db.query("select distinct password_hash from user where uid = ?;", [uid])
    const Password = z.array(z.object({ password_hash: z.string() }))
    const hash = Password.parse(row)[0].password_hash
    console.log("parse password hash")
    const result = await argon2.verify(hash, password)
    if (result) {
      [row] = await db.query("select role from user where uid = ?;", [uid])
      const Role = z.array(z.object({ role: z.number() }))
      const role = Role.parse(row)[0].role
      console.log("parse role int")
      const refreshToken = jwt.sign({
        uid: uid,
        role: role,
        type: "refresh"
      }, process.env.JWT_SECRET_KEY!)
      res.cookie(
        "refreshToken",
        refreshToken,
        {
          path: "/",
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          sameSite: "strict",
          maxAge: evaluate(process.env.REFRESH_TOKEN_EXPIRES_TIME || "604800000")
        }
      )
      // res.status(200).send("Login successful.")
      res.status(200).json(true)
      return
    } else {
      // res.status(401).send("Credentials provided invalid.")
      res.status(401).json(false)
      return
    }
  } catch (err) {
    console.error(`Couldn't login user,\n${err}`)
    res.status(500).send("Internal server error.\nLogin unsuccessful.")
    return
  }
})

export default router
