import express from "express"
import userRoute from "./user.ts"
import authRoute from "./auth.ts"
import ecRoute from "./ec.ts"
import aiRoute from "./ai.ts"

const router = express.Router()

router.use("/user", userRoute)
router.use("/auth", authRoute)
router.use("/ec", ecRoute)
router.use("/ai", aiRoute)

export default router
