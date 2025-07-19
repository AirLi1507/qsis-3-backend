import { configDotenv } from "dotenv"
import mysql from "mysql2"

configDotenv()

const db = mysql.createPool({
  host: String(process.env.MYSQL_HOST) || "localhost",
  port: Number(process.env.MYSQL_PORT) || 3306,
  database: String(process.env.MYSQL_DB) || "opensis",
  user: String(process.env.MYSQL_USER) || "opensis",
  password: String(process.env.MYSQL_PASSWORD) || "password"
}).promise()

export { db }
