import express from "express"
import { db } from "../../config/db.ts"
import jwt from "jsonwebtoken"

const router = express.Router()

router.get("/list", async (req, res) => {
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
  const [row] = await db.query("select ec.name, ec.description, user.chi_name as teacher, ec.cost from ec left join user on ec.teacher = user.uid;")
  res.json(row)
})

export default router
