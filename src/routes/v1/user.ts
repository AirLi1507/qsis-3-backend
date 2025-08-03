import express from "express"
import { getProfilePicture, getUser } from "../../controllers/userController.ts"
import { accessMiddleware } from "../../middleware/auth.ts"

const router = express.Router()

router.use(accessMiddleware)
router.get("/", getUser)
router.get("/pfp", getProfilePicture)

export default router
