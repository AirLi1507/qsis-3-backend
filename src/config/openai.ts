import OpenAI from "openai";
import logger from "../utils/logger.ts";

export default new OpenAI({
  baseURL: process.env.AI_BASEURL || "https://api.openai.com",
  apiKey: process.env.AI_APIKEY || "fallback_string",
  logger: logger
})
