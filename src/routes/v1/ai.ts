import express from "express"
import OpenAI from "openai"
import { db } from "../../config/db.ts"
import jwt from "jsonwebtoken"
import { Token } from "../../config/schema.ts"

const router = express.Router()

const client = new OpenAI({
  apiKey: process.env.AI_APIKEY,
  baseURL: process.env.AI_BASEURL
})

router.get("/gradeSummary", async (req, res) => {
  const { accessToken } = await req.cookies
  if (!accessToken) {
    res.status(401).send("Unauthorized.")
    return
  }
  const token = jwt.verify(accessToken, process.env.JWT_SECRET_KEY!)
  if (!token) {
    res.status(401).send("Unauthorized.")
    return
  }
  const uid = Token.parse(token).uid
  try {
    const [row] = await db.query("select subject, type, score, year from grade where uid = ?;", [uid])
    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-3.5-turbo-16k",
      messages: [
        {
          role: "system",
          content: "You are iLearn, an AI that helps student user to learn more efficiently and positively by analyzing their grades given in a format of JSON and giving learning suggestions to them. In the grades, Type 0 is Dictation, Type 1 is Test, Type 2 is Uniform Test and Type 3 is Exam, but never mention about the type number in the summary; the maximum score is always 100. The student's grades' data will soon be given in a format of JSON, analyze & summarize both the advantages and disadvantages in their grades and give positive suggestions on how they can improve. If no grades are given, just positively encourage the student to learn while having fun. Also, please limit the number of words to around 100 words only for maximum, focus on the part of giving suggestions. Use bullet points for different aspects like Summary, Advantages, Disadvantages and Suggestions for readibilities if possible."
        },
        {
          role: "user",
          content: JSON.stringify(row)
        }
      ]
    })
    if (response) {
      res.status(200).send(response.choices[0].message.content)
      return
    } else {
      res.status(500).send("Could not generate summary based on your grades, please contact the developer through air1507@hypernix.org.")
      return
    }
  } catch (err) {
    console.error(`Couldn't generate AI summary,\n${err}`)
    res.status(500).send("Could not generate summary based on your grades, please contact the developer through air1507@hypernix.org.")
    throw err
  }
})

export default router
