import mysql, { RowDataPacket } from "mysql2"
import argon2 from "argon2"
import jwt from "jsonwebtoken"

export interface userInfoTypes {
  uid?: string
  password?: string
  chi_name?: string
  eng_name?: string
  email?: string
  role?: number
}

interface userDataRow extends RowDataPacket, userInfoTypes { }

interface clientInfo {
  ip: string
  user_agent: string
}

const db = mysql.createPool({
  host: process.env.MYSQL_HOST?.toString(),
  port: Number(process.env.MYSQL_PORT),
  database: process.env.MYSQL_DB?.toString(),
  user: process.env.MYSQL_USER?.toString(),
  password: process.env.MYSQL_PASSWORD?.toString()
}).promise()

export async function selectUsers() {
  const [rows] = await db.query("select * from user;")
  return rows
}

export async function addUser(data: userInfoTypes) {

  const [uidExistence] = await db.query<userDataRow[]>("select uid from user where uid = ? limit 1;", [data.uid])

  if (uidExistence[0]) {
    console.log("User duplicated.")
    return "DUPLICATED"
  } else {
    data.role = Number(data.role)
    console.dir(data)
    const argon_hash = await argon2.hash(data.password!, { memoryCost: 65535 })
    try {
      await db.query(`insert into user (uid , password_hash , chi_name , eng_name , email , role) values ("${data.uid}" , "${argon_hash}" , "${data.chi_name}" , "${data.eng_name}" , "${data.email}", ${data.role});`)
      console.log("User added.")
      return "OK"
    } catch (error) {
      console.error(`User can't be added.\nError: ${error}`)
      return `FAILED: ${error}`
    }
  }
}

export async function authUser(uid: string, password: string, client: clientInfo): Promise<boolean | string> {
  interface hashObjectType extends RowDataPacket { password_hash?: string }
  try {
    const [row] = await db.query<hashObjectType[]>("select password_hash from user where uid = ? limit 1;", [uid])

    if (row[0].password_hash != undefined) {
      if (await argon2.verify(row[0].password_hash, password)) {
        return await newSession(uid, client)
      } else {
        return false
      }
    } else {
      return false
    }

  } catch (error) {
    console.error(`Could not authenticate user. \nError: ${error}`)
    return false
  }
}

export async function newSession(uid: string, client: clientInfo): Promise<string | boolean> {
  console.log("Now is " + (Math.round(new Date().getTime() / 1000)))
  const token = jwt.sign(
    {
      uid: uid,
      ip: client.ip,
      user_agent: client.user_agent
    },
    process.env.JWT_SECRET_KEY!.toString(),
    { expiresIn: 30 }
  )

  return token

  // OLD SESSION SYSTEM
  /*
  const randomNo = Math.round(Math.random() * 10000000000)
  const session_hash = await argon2.hash(randomNo.toString(), { memoryCost: 65535 })
  const currentTime = Math.round(new Date().getTime() / 1000)
  console.log(`Now is ${currentTime}`)
  const expireTime = (currentTime + 30)
  console.log(`Expires at ${expireTime}`)
  try {
    await db.query("insert into session (uid, session_hash, expires_at, user_agent, ip_addr) values (?, ?, ?, ?, ?);", [uid, session_hash, expireTime, client.user_agent, client.ip])
    return randomNo
  } catch (error) {
    console.error(`Session hash generation failed. \nError: ${error}`)
    return false
  }
  */
}

export async function verifySession(token: string): Promise<boolean> {

  try {
    const sessionValid = jwt.verify(token, process.env.JWT_SECRET_KEY!.toString())

    console.log(sessionValid)

    return true
  } catch (error) {
    console.error(`Session verification failed. \nError: ${error}`)
    return false
  }

  // OLD SESSION SYSTEM
  /*
  console.log(`SESSION NUMBER: ${session_no}`)
  interface sessionObjectType extends RowDataPacket, clientInfo {
    session_hash: string
    expires_at: number
  }
  try {
    const [row] = await db.query<sessionObjectType[]>("select session_hash, expires_at from session where uid = ? and user_agent = ? and ip_addr = ? limit 1;", [
      uid,
      client.user_agent,
      client.ip
    ])
    const sessionCorrect = await argon2.verify(row[0].session_hash, session_no.toString())
    if (sessionCorrect) {
      console.log(`Verifying, now is ${Math.round(new Date().getTime() / 1000)}`)
      if (row[0].expires_at < Math.round(new Date().getTime() / 1000)) {
        console.log("Session expired, deleting...")
        await db.query("delete from session where session_hash = ?;", [row[0].session_hash])
        return false
      } else {
        return true
      }
    } else {
      return false
    }
  } catch (error) {
    console.error(`Could not verify session. \nError: ${error}`)
    return false
  }
  */
}
