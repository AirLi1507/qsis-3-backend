import dotenv from "dotenv"
import { evaluate } from "mathjs"
import express, { NextFunction, Request, Response } from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import helmet from "helmet"
import path from "path"
import crypto from "node:crypto"
import { addHomework, addUser, confirmHomework, getBasicInfo, getUser, selectUsers, userInfoTypes } from "./api/db.ts"
import { access, login, refresh } from "./api/auth.ts"
import { ec, grade, homework, pfp, profile } from "./api/resource.ts";
import { accessTokenInterface } from "./api/token.ts";
import argon2 from "argon2";
import { aiGradeSummarize } from "./api/ai.ts";

dotenv.configDotenv()

const server = express()

server.use(express.json())
server.use(cookieParser())
server.use(cors({ origin: "https://test-3.hypernix.dev", credentials: true }))
server.use(helmet({ contentSecurityPolicy: false }))

server.use(express.static(path.join(__dirname, "static/")))
server.use(express.urlencoded({ extended: true }))

server.post("/pfp", async (req, res) => {
  const accessToken = await req.cookies.accessToken
  const uid = await req.cookies.uid
  const result = await pfp(uid, accessToken)
  if (result == 401) {
    res.status(401).send("Unauthorized.")
  } else if (result == 403) {
    res.status(403).send("Access denied.")
  } else if (result == 404) {
    res.status(404).send("Not found.")
  } else {
    res.sendFile(result)
  }
})

server.get("/profile", async (req, res) => {
  const accessToken = await req.cookies.accessToken
  const lang = await req.cookies.lang
  const uid = await req.cookies.uid
  const result = await profile(lang, uid, accessToken)
  if (result == 401) {
    res.status(401).send("Unauthorized.")
  } else if (result == 403) {
    res.status(403).send("Access denied.")
  } else if (result == 404) {
    res.status(404).send("Not found.")
  } else {
    res.json(result)
  }
})

server.get("/ai/gradeSummary", async (req, res) => {
  const { accessToken } = await req.cookies
  const studentGrade = await grade(accessToken)
  if (studentGrade == 404) {
    res.status(404).send("Student not found.")
  } else if (studentGrade == 401) {
    res.status(401).send("Unauthorized.")
  } else {
    const result = await aiGradeSummarize(studentGrade)
    res.send(result)
  }
})

server.get("/ec/list", async (req, res) => {
  const { accessToken } = await req.cookies
  const result = await ec(accessToken)
  res.json(result)
})

server.get("/homework/todo", async (req, res) => {
  const { accessToken, uid } = await req.cookies
  const result = await homework(uid, accessToken, 0)
  res.json(result)
})

server.get("/homework/submission", async (req, res) => {
  const { accessToken, uid } = await req.cookies
  const result = await homework(uid, accessToken, 1)
  res.json(result)
})

server.post("/homework/add", async (req, res) => {
  const accessToken = await req.cookies.accessToken
  const { subject, name, date, className } = await req.body
  const user = await access(accessToken) as accessTokenInterface | false
  if (user) {
    if (user.role < 1) {
      res.status(403).send("Access denied.")
      return
    }
    const result = await addHomework(subject, name, date, user.uid, className)
    if (result) {
      res.json(true)
    } else {
      res.status(500).send("Internal server error, couldn't add homework.")
    }
  } else {
    res.status(401).send("Unauthorized.")
    return
  }
})

server.post("/homework/confirm", async (req, res) => {
  const { accessToken } = await req.cookies
  const uid = await req.body.uid
  const id = Number(await req.body.id)
  const status = Number(await req.body.status)
  const user = await access(accessToken) as accessTokenInterface | false
  if (user) {
    if (user.role < 1) {
      res.status(403).send("Access denied.")
      return
    }
    const result = await confirmHomework(uid, id, status)
    if (result) {
      res.json(true)
    } else {
      res.status(500).send("Internal server error, couldn't confirm homework.")
    }
  } else {
    res.status(401).send("Unauthorized.")
    return
  }
})

server.get("/info/basic", async (req, res) => {
  const accessToken = await req.cookies.accessToken
  const user = await access(accessToken) as accessTokenInterface | false
  if (user) {
    const result = await getBasicInfo(user.uid)
    res.json(result)
    return
  } else {
    res.status(401).send("Unauthorized")
    return
  }
})

server.get("/info/user", async (req, res) => {
  const accessToken = await req.cookies.accessToken
  const user = await access(accessToken) as accessTokenInterface | false
  if (user) {
    const result = await getUser(user.uid)
    res.status(200).json(result)
    return
  } else {
    res.status(401).send("Unauthorized")
    return
  }

})

server.get("/sus", async (req, res) => {
  const accessToken = await req.cookies.accessToken
  res.send(accessToken)
})

server.get("/role", async (req, res) => {
  const accessToken = await req.cookies.accessToken
  const result = await access(accessToken) as accessTokenInterface | false
  if (result) {
    res.send(result.role)
  } else {
    res.status(401).send("Unauthorized.")
  }
})


/* basic http auth process by AI below */
function basicAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Restricted Area"');
    res.status(401).send('Authentication required');
    return; // Ensure no further execution
  }

  // Decode the Base64-encoded credentials
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  // Replace with your actual username and password check
  const validUsername = process.env.PANEL_USERNAME!; // Example username
  const validPassword = process.env.PANEL_PASSWORD; // Example password

  if (username === validUsername && password === validPassword) {
    return next(); // Credentials are valid, proceed to the route
  }

  res.set('WWW-Authenticate', 'Basic realm="Restricted Area"');
  res.status(401).send('Invalid credentials');
  return; // Ensure no further execution
}

/* end of AI code */

server.get('/auth', basicAuth, async (req: Request, res: Response) => {
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
  const authResult = await login(data.uid, data.password)
  if (authResult != false) {
    res
      .cookie(
        "refreshToken",
        authResult[0],
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: evaluate(process.env.REFRESH_TOKEN_EXPIRES_TIME! || '604800000')
        }
      )
      .cookie(
        "accessToken",
        authResult[1],
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: evaluate(process.env.REFRESH_TOKEN_EXPIRES_TIME! || '54000000')
        }
      )
      .cookie(
        "uid",
        data.uid,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: evaluate(process.env.REFRESH_TOKEN_EXPIRES_TIME! || '54000000')
        }

      )
    res.json(true)
    console.log(`User ${data.uid} has logged in.`)
  } else {
    res.status(401).json(false)
    console.log(`User ${data.uid} login failed.`)
  }
})

server.get("/auth/logout", async (req, res) => {
  res
    .cookie(
      "refreshToken",
      "",
      {
        maxAge: 0
      }
    )
    .cookie(
      "accessToken",
      "",
      {
        maxAge: 0
      }
    )
    .cookie(
      "uid",
      "",
      {
        maxAge: 0
      }
    )
  res.json(true)
})

server.get("/auth/refresh", async (req, res) => {
  const refreshToken = await req.cookies.refreshToken
  if (refreshToken == undefined) {
    console.error("Error: Refresh token is undefined.")
    res.status(401).json(false)
    return
  }
  const result = await refresh(refreshToken)
  if (result) {
    res.cookie(
      "accessToken",
      result,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: evaluate(process.env.ACCESS_TOKEN_EXPIRES_TIME! || '54000000')
      }
    )
    res.json(true)
    return
  } else {
    res.json(false)
    return
  }
})

server.get("/generate_secret", (req, res) => {
  res.send(crypto.randomBytes(256).toString("hex"))
})

server.post("/pw_generate", async (req, res) => {
  const plaintext = await req.body.password
  const argon_hash = await argon2.hash(
    plaintext,
    {
      type: 2,
      memoryCost: 64 * 1024,
      hashLength: 96,
      parallelism: 8,
      timeCost: 8
    }
  )
  res.send(argon_hash)
  return
})

server.listen(process.env.PORT || 5000, () => {
  console.log("server listening on port " + process.env.PORT || 5000)
})


server.post("/idk", async (req, res) => {
  console.dir(await req.cookies)
  res.send("ok")
})
