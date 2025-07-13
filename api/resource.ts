import path from "path";
import fs from "fs"
import { access } from "./auth";
import { accessTokenInterface } from "./token";
import { getEC, getGrade, getHomework, getUserProfile } from "./db";

export async function pfp(uid: string, token: string): Promise<string | 401 | 403 | 404> {
  const result = await access(token) as accessTokenInterface | false
  if (result) {
    const filename = result.uid === uid ? uid : (result.role > 0 ? uid : null)
    if (!filename) {
      return 403
    }
    const sanitized = path.basename(filename)
    const fullpath = path.join(__dirname, "../data/pfp/", sanitized + ".jpg")
    if (fs.existsSync(fullpath)) {
      return fullpath
    } else {
      return 404
    }
  } else {
    return 401
  }
}

export async function profile(lang: string, uid: string, token: string): Promise<{} | 401 | 403 | 404> {
  const isChi = lang === "zh-HK"
  const result = await access(token) as accessTokenInterface | false
  if (result) {
    const user = result.uid === uid ? uid : (result.role > 0 ? uid : null)
    if (!user) {
      return 403
    }
    const profileObj = await getUserProfile(user, isChi)
    if (!profileObj) {
      return 404
    }
    return profileObj
  } else {
    return 401
  }
}

export async function homework(uid: string, token: string, type: number) {
  const result = await access(token) as accessTokenInterface | false
  if (result) {
    const user = result.uid === uid ? uid : (result.role > 0 ? uid : null)
    if (!user) {
      return 403
    }
    const idk = await getHomework(uid, result.role, type)
    return idk
  } else {
    return 401
  }
}

export async function ec(token: string) {
  const result = await access(token) as accessTokenInterface | false
  if (result) {
    return await getEC()
  } else {
    return 401
  }
}

export async function grade(token: string) {
  const result = await access(token) as accessTokenInterface | false
  if (result) {
    return await getGrade(result.uid)
  } else {
    return 401
  }
}

