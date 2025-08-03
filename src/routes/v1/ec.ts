import express from "express"
import { getAttendance, getList, joinEc } from "../../controllers/ecController.ts"
import { accessMiddleware } from "../../middleware/auth.ts"

const router = express.Router()

router.use(accessMiddleware)
router.get("/list", getList)
router.get("/attendance", getAttendance)
router.post("/join", joinEc)

export default router
