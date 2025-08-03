import { Request, Response } from "express";
import { db } from "../config/db.ts";
import logger from "../utils/logger.ts";

export async function getList(_req: Request, res: Response) {
  try {
    const [row] = await db.query("select ec.id as ec_id, ec.name, ec.description, ec.teacher, ec.cost from ec left join user on user.uid = ec.teacher;")
    res.json(row)
  } catch (err) {
    logger.error(`Could not retrieve EC(s) from database. ${err}`)
    res.status(500).json({
      error: "Could not retrieve EC(s) from database."
    })
    return
  }
}

export async function joinEc(req: Request, res: Response) {
  const body: { 0: string, 1: string, 2: string } | undefined = await req.body
  if (body == undefined) {
    res.status(400).json({
      error: "Bad request, no EC(s) is specified to join."
    })
    return
  }
  const data = [body[0], body[1], body[2]]
  data.forEach(async (val) => {
    const ec_id = Number(val)
    if (ec_id < 1) {
      return
    }
    try {
      if (!req.token) {
        res.status(401).json({
          error: "Access token was not proceed properly."
        })
        return
      }
      await db.query(`
        insert into
        attendance
        values
        (
        ?,
        ?,
        ?,
        ?
        )
        ;
        `,
        [
          req.token?.uid,
          ec_id,
          new Date().toISOString().split("T")[0],
          new Date().getFullYear()
        ]
      )
    } catch (err) {
      logger.error(`Could not add user to EC. ${err}`)
      res.status(500).json({
        error: "Could not join selected EC."
      })
      return
    }
    res.json(true)
    return
  })
  res.status(400).json({
    error: "No EC(s) specified to join."
  })
}

export async function getAttendance(req: Request, res: Response) {
  if (!req.token) {
    res.status(401).json({
      error: "Access token was not proceed properly."
    })
    return
  }
  try {
    const [row] = await db.query(`
    select
      ec.id as ec_id,
      ec.name,
      ec.description,
      user.chi_name as teacher,
      ec.cost
    from
      attendance
    left join
      ec
    on
      ec.id = attendance.ec_id
    left join
      user
    on
      ec.teacher = user.uid
    where
      attendance.uid = ?
    ;
    `,
      [req.token.uid]
    )
    res.json(row)
  } catch (err) {
    logger.error(`Could not retrieve EC attendance(s) from database. ${err}`)
    res.status(500).json({
      error: "Could not retrieve EC attendance(s) from database."
    })
    return

  }
}
