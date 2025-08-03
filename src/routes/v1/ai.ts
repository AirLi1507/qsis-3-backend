import express from "express"
import { getGradeSummary } from "../../controllers/aiController.ts"
import { accessMiddleware } from "../../middleware/auth.ts"

const router = express.Router()

router.use(accessMiddleware)
router.get("/gradeSummary", getGradeSummary)

export default router
