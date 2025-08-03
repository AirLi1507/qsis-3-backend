import z from "zod"
import { Request, Response } from "express"
import { db } from "../config/db"
import logger from "../utils/logger"
import path from "path"
import fs from "fs"

const User = z.array(z.object({
  chi_name: z.string(),
  eng_name: z.string(),
  role: z.number(),
  form: z.number(),
  className: z.string(),
  classNo: z.number()
}))

export async function getUser(req: Request, res: Response) {
  if (!req.token) {
    res.status(401).json({
      error: "Access token was not proceed properly."
    })
    return
  }
  try {
    const [row] = await db.query("select chi_name, eng_name, form, className, classNo, role from user where uid = ?;", [req.token.uid])
    const data = User.parse(row)[0]
    res.json(data)
    return
  } catch (err) {
    logger.error(`Could not retrieve user from database. ${err}`)
    res.status(500).json({
      error: "Could not retrieve user from database."
    })
    return
  }
}

export async function getProfilePicture(req: Request, res: Response) {
  if (!req.token) {
    res.status(401).json({
      error: "Access token was not proceed properly."
    })
    return
  }
  const filename = req.token.uid + ".jpg"
  const filepath = path.join(__dirname, "../../data/pfp/", filename)
  if (fs.existsSync(filepath)) {
    res.sendFile(filepath)
  } else {
    res.status(404).json({
      error: "File not found."
    })
  }
}
