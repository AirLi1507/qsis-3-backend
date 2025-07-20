import express from "express"
import {
  login,
  logout,
  refresh
} from "../../controllers/authController.ts"

const router = express.Router()

router.get("/refresh", refresh)
router.post("/login", login)
router.get("/logout", logout)

export default router
