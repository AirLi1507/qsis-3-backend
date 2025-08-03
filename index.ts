import { configDotenv } from "dotenv";
import express from "express";
import cookieParser from "cookie-parser"
import apiRoutes from "./src/routes/v1"
configDotenv()

const server = express()
server.use(cookieParser())
server.use(express.json())

server.use("/v1", apiRoutes)

server.listen(process.env.PORT || 3000, () => { console.log(`Server listening on ${process.env.PORT || 5000}`) })
