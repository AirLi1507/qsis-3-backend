import mysql, { RowDataPacket } from "mysql2"
import argon2 from "argon2"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

export interface userInfoTypes {
  uid?: string
  password?: string
  chi_name?: string
  eng_name?: string
  email?: string
  role?: number
}

interface userDataRow extends RowDataPacket, userInfoTypes { }

interface clientInfo extends userInfoTypes {
  ip: string
  user_agent: string
}

const db = mysql.createPool({
  host: (process.env.MYSQL_HOST as string),
  port: Number(process.env.MYSQL_PORT),
  database: (process.env.MYSQL_DB as string),
  user: (process.env.MYSQL_USER as string),
  password: (process.env.MYSQL_PASSWORD as string)
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
      await db.query(
        "insert into user (uid , password_hash , chi_name , eng_name , email , role) values (? , ? , ? , ? , ? , ?);",
        [
          data.uid,
          argon_hash,
          data.chi_name,
          data.eng_name,
          data.email,
          data.role
        ])
      console.log("User added.")
      return "OK"
    } catch (error) {
      console.error(`User can't be added.\nError: ${error}`)
      return `FAILED: ${error}`
    }
  }
}

export async function authUser(uid: string, password: string, client: clientInfo): Promise<boolean | object> {
  interface hashObjectType extends RowDataPacket { password_hash?: string }

  try {
    const [row] = await db.query<hashObjectType[]>("select password_hash from user where uid = ? limit 1;", [uid])

    if (row[0].password_hash != undefined) {
      if (await argon2.verify(row[0].password_hash, password)) {
        return await getRefreshToken(uid, client)
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

export async function getRefreshToken(uid: string, client: clientInfo): Promise<object | boolean> {

  console.log("Now is " + new Date().toUTCString())

  const token = jwt.sign(
    {
      uid: uid,
      ip: client.ip,
      user_agent: client.user_agent
    },
    process.env.JWT_SECRET_KEY!.toString(),
    {
      expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_TIME)
    }
  )

  const expireDateInUTC = new Date(new Date().getTime() + 1000 * Number(process.env.REFRESH_TOKEN_EXPIRES_TIME)).toUTCString()

  console.log("Expires at " + expireDateInUTC)

  return { refresh_token: token, expires_at: expireDateInUTC }
}


export async function verifyToken(token: string): Promise<boolean> {
  try {
    const sessionValid = jwt.verify(token, process.env.JWT_SECRET_KEY!.toString())
    console.log(sessionValid)
    return true
  } catch (error) {
    console.error(`Session verification failed. \nError: ${error}`)
    return false
  }
}

export async function authRefresh(token: string): Promise<string | false> {
  const verifyJWT = jwt.verify(token, process.env.JWT_SECRET_KEY!.toString())
  if (verifyJWT) {
    const decodedRefreshToken = jwt.verify(token, process.env.JWT_SECRET_KEY!.toString()) as clientInfo
    const newAccessToken = jwt.sign(
      {
        uid: decodedRefreshToken.uid,
        ip: decodedRefreshToken.user_agent
      },
      process.env.JWT_SECRET_KEY!.toString(),
      {
        expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_TIME)
      }
    )
    return newAccessToken
  } else {
    return false
  }
}
