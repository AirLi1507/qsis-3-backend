import { Request, Response } from "express"
import { db } from "../config/db"
import openai from "../config/openai"
import logger from "../utils/logger"

declare module "express" {
  interface Request {
    token?: {
      uid: string,
      role: number,
      iat: number
    }
  }
}

export async function getGradeSummary(req: Request, res: Response) {
  if (!req.token) {
    res.status(401).json({
      error: "Access token was not proceed properly."
    })
    return
  }
  try {
    const [row] = await db.query("select * from grade where uid = ?;", [req.token.uid])
    const response = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are iLearn, an AI that helps student user to learn more efficiently and positively by analyzing their grades given in a format of JSON and giving learning suggestions to them. In the grades, Type 0 is Dictation, Type 1 is Test, Type 2 is Uniform Test and Type 3 is Exam, but never mention about the type number in the summary; the maximum score is always 100. The student's grades' data will soon be given in a format of JSON, analyze & summarize both the advantages and disadvantages in their grades and give positive suggestions on how they can improve. If no grades are given, just positively encourage the student to learn while having fun. Also, please limit the number of words to around 100 words only for maximum, focus on the part of giving suggestions. Use bullet points for different aspects like Summary, Advantages, Disadvantages and Suggestions for readibilities if possible."
        },
        {
          role: "user",
          content: JSON.stringify(row)
        }
      ],
      model: process.env.AI_MODEL || "gpt-3.5-turbo-16k"
    })
    res.send(response.choices[0].message.content)
    return
  } catch (err) {
    logger.error(`Could not retrieve user's grade from database. ${err}`)
    res.status(500).json({
      error: "Could not retrieve user's grade from database. Please contact the developer through air1507@hypernix.org."
    })
  }
}
