import mysql, { RowDataPacket } from "mysql2"
import argon2 from "argon2"
import dotenv from "dotenv"
import { homework } from "./resource"
import test from "node:test"
import { networkInterfaces } from "node:os"

dotenv.config()

export interface userInfoTypes {
  uid?: string
  password?: string
  chi_name?: string
  eng_name?: string
  email?: string
  class?: string
  classNo?: number
  form?: number
  role?: number
}

export interface userDataRow extends RowDataPacket, userInfoTypes { }

const db = mysql.createPool({
  host: (process.env.MYSQL_HOST as string),
  port: Number(process.env.MYSQL_PORT),
  database: (process.env.MYSQL_DB as string),
  user: (process.env.MYSQL_USER as string),
  password: (process.env.MYSQL_PASSWORD as string)
}).promise()

export { db }

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
    const argon_hash = await argon2.hash(
      data.password!,
      {
        type: 2,
        memoryCost: 64 * 1024,
        hashLength: 96,
        parallelism: 8,
        timeCost: 8
      }
    )
    try {
      await db.query(
        "insert into user (uid , password_hash , chi_name , eng_name , email , class , classNo , form, role) values (? , ? , ? , ? , ? , ? , ? , ? , ?);",
        [
          data.uid,
          argon_hash,
          data.chi_name,
          data.eng_name,
          data.email,
          data.class,
          data.classNo,
          data.form,
          data.role,
        ])
      console.log("User added.")
      return "OK"
    } catch (error) {
      console.error(`User can't be added.\nError: ${error}`)
      return `FAILED: ${error}`
    }
  }
}

export async function getBasicInfo(uid: string) {
  interface infoInterface extends RowDataPacket {
    chi_name: string
    eng_name: string
    form: number
    class: "A" | "B" | "C" | "D" | "E"
    classNo: number
  }
  const [row] = await db.query<infoInterface[]>("select chi_name, eng_name, form, class, classNo from user where uid = ?;", [uid])
  if (row.length == 0) {
    return false
  }
  console.dir(row[0])
  return {
    chi_name: row[0].chi_name,
    eng_name: row[0].eng_name,
    class: row[0].form + row[0].class,
    classNo: row[0].classNo
  }
}

export async function getUserProfile(uid: string, isChi: boolean): Promise<{ name: string, class: string, classNo: number } | false> {
  interface profileInterface extends RowDataPacket {
    chi_name: string
    eng_name: string
    form: number
    class: "A" | "B" | "C" | "D" | "E"
    classNo: number
  }
  const query = `select ${isChi ? "chi_name" : "eng_name"}, form, class, classNo from user where uid = ?;`
  const [row] = await db.query<profileInterface[]>(query, [uid])
  if (row.length == 0) {
    return false
  }
  console.dir(row[0])
  return {
    name: isChi ? row[0].chi_name : row[0].eng_name,
    class: row[0].form + row[0].class,
    classNo: row[0].classNo
  }
}

export async function getHomework(uid: string, role: number, type: number) {
  interface homeworkInterface extends RowDataPacket {
    subject: string
    name: string
    due_date: Date
  }
  if (role == 0) {
    interface formClassInterface extends RowDataPacket {
      form: number,
      class: string
    }
    const [row] = await db.query<formClassInterface[]>("select form, class from user where uid = ?;", [uid])
    const className = row[0].form + row[0].class
    if (type == 0) {
      try {
        return (await db.query("select subject,name,due_date from homework where class = ? and status = 0;", [className]))[0]
      } catch (err) {
        throw err
      }
    } else if (type == 1) {
      interface submissionInterface extends homeworkInterface {
        submission_status: number
      }
      try {
        const [row] = await db.query<submissionInterface[]>("select homework.subject,homework.name,homework.due_date,submission.submission_status from homework inner join submission on homework.id = submission.id where submission.uid = ?;", [uid])
        return row
      } catch (err) {
        throw err
      }
    }
  }
}

export async function addHomework(subject: string, name: string, due_date: string, uid: string, className: string) {
  try {
    const create_date = new Date().toISOString().split("T")[0]
    await db.query("insert into homework (subject , name , create_date , due_date , uid , class , status) values (? , ? , ? , ? , ? , ? , 0);", [subject, name, create_date, due_date, uid, className])
    return true
  } catch (err) {
    console.error(`Couldn't add homework,\n${err}`)
    return false
  }
}

export async function confirmHomework(uid: string, id: number, status: number) {
  interface homeworkInterface extends RowDataPacket {
    id: number
  }
  interface userInterface extends RowDataPacket {
    uid: string
  }
  try {
    const [row] = await db.query<homeworkInterface[]>("select distinct id from homework where id = ?;", [id])
    if (row[0].id == undefined) {
      return false
    }
    const [user] = await db.query<userInterface[]>("select distinct uid from user where uid = ?;", [uid])
    if (!user[0].uid) {
      return false
    }
    await db.query("update homework set status = 1 where id = ?;", [id])
    const submit_date = new Date().toISOString().split("T")[0]
    await db.query("insert into submission (id , uid , submit_date , submission_status) values (? , ? , ? , ?);", [id, uid, submit_date, status])
    return true
  } catch (err) {
    console.error(`Couldn't confirm homework,\n${err}`)
    throw err
  }
}

export async function getUser(uid: string) {
  interface userInterface extends RowDataPacket {
    chi_name: string
    eng_name: string
    form: number
    className: "A" | "B" | "C" | "D" | "E"
    classNo: number
  }
  try {
    const [row] = await db.query<userInterface[]>("select chi_name, eng_name, form, class as className, classNo from user where uid = ?;", [uid])
    if (row[0]) {
      return row[0]
    } else {
      return 404
    }
  } catch (err) {
    console.error(`Couldn't retrieve user from database,\n${err}`)
    throw err
  }
}

export async function getEC() {
  interface ecInterface extends RowDataPacket {
    name: string
    desc: string
    cost: number
  }
  try {
    const [row] = await db.query<ecInterface[]>("select ec.name, ec.description, ec.cost, user.chi_name as teacher from ec left join user on ec.teacher = user.uid;")
    if (row) {
      return row
    } else {
      return 404
    }
  } catch (err) {
    console.error(`Couldn't retrieve curriculum list from database,\n${err}`)
    throw err
  }
}

export async function getGrade(uid: string) {
  interface gradeInterface extends RowDataPacket {
    subject: string,
    type: number,
    score: number,
    year: number
  }
  try {
    const [row] = await db.query<gradeInterface[]>("select subject, type, score, year from grade where uid = ?;", [uid])
    if (row) {
      return row
    } else {
      return 404
    }
  } catch (err) {
    console.error(`Couldn't retrieve grades from database,\n${err}`)
    throw err
  }
}
