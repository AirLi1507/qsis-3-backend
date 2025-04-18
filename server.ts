import dotenv from "dotenv"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import path from "path"
import crypto, { verify } from "node:crypto"
import { addUser, authUser, selectUsers, userInfoTypes, verifySession } from "./api/db.ts"

dotenv.config()

const server = express()

server.use(express.json())
server.use(cors())
server.use(helmet({ contentSecurityPolicy: false }))
server.use(express.urlencoded({ extended: true }))

server.use(express.static(path.join(__dirname, "static/")))

server.get("/test", (req, res) => {
  res.send("test")
})

server.get("/auth", async (req, res) => {
  const data = await selectUsers()
  res.send(data)
})

server.post("/auth/new", async (req, res) => {
  const newUserInfo: userInfoTypes = await req.body
  const state = await addUser(newUserInfo)
  console.dir(newUserInfo)
  console.log(state)
  res.send(state)
})

server.post("/auth/login", async (req, res) => {
  const data: { uid: string, password: string } = await req.body
  const clientData: { ip: string, user_agent: string } = { ip: req.socket.remoteAddress!.toString(), user_agent: req.headers["user-agent"]!.toString() }
  const state = await authUser(data.uid, data.password, clientData)
  console.log(state)
  res.send(state)
})

server.post("/auth/session", async (req, res) => {

  const data: { token: string } = await req.body

  const state = await verifySession(data.token)

  console.log(state)
  console.log(typeof state)

  res.send(state)
  /*
  const data: { uid: string, session_no: number } = await req.body
  const clientData: { ip: string, user_agent: string } = { ip: req.socket.remoteAddress!.toString(), user_agent: req.headers["user-agent"]!.toString() }
  const state = await verifySession(data.uid, data.session_no, clientData)
  console.log(state)
  res.send(state)
  */
})

server.get("/panel", (req, res) => {
  res.sendFile(path.join(__dirname, "static/"))
})

server.get("/generate_secret", (req, res) => {
  res.send(crypto.randomBytes(64).toString("hex"))
})

server.listen(process.env.PORT || 5000, () => { console.log("server listening on port " + process.env.PORT || 5000) })
