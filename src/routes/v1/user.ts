import express from "express"
import * as z from "zod"
import { db } from "../../config/db.ts"
import jwt from "jsonwebtoken"
import { Token } from "../../config/schema.ts"
import fs from "fs"
import path from "path"

const router = express.Router()

const User = z.array(z.object({
  chi_name: z.string(),
  eng_name: z.string(),
  role: z.number(),
  form: z.number(),
  className: z.string(),
  classNo: z.number()
}))

router.get("/", async (req, res) => {
  const { accessToken } = await req.cookies
  if (!accessToken) {
    res.status(401).send("Unauthorized.")
    return
  }
  const token = jwt.verify(accessToken, process.env.JWT_SECRET_KEY!)
  if (!token) {
    res.status(401).send("Unauthorized.")
    return
  }
  const uid = Token.parse(token).uid
  const [row] = await db.query("select chi_name, eng_name, form, className, classNo, role from user where uid = ?;", [uid])
  const result = User.parse(row)[0]
  res.json(result)
})

router.get("/pfp", async (req, res) => {
  const { accessToken } = await req.cookies
  if (!accessToken) {
    res.status(401).send("Unauthorized.")
    return
  }
  const token = jwt.verify(accessToken, process.env.JWT_SECRET_KEY!)
  if (!token) {
    res.status(401).send("Unauthorized.")
    return
  }
  const uid = Token.parse(token).uid
  const sanitizedUid = path.basename(uid)
  const filename = sanitizedUid + ".jpg"
  const filepath = path.join(__dirname, "../../../data/pfp/", filename)
  if (fs.existsSync(filepath)) {
    res.status(200).sendFile(filepath)
    return
  } else {
    res.status(404).send("File not found.")
    return
  }
})

export default router
