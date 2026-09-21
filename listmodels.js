// listModels.js
require("dotenv").config()
const { GoogleGenAI } = require("@google/genai")

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

async function checkModels() {
  try {
    const list = await ai.models.list()
    console.log("Available models:")
    for await (const m of list) {
      if (m.supportedActions?.includes("generateContent")) {
        console.log(`- ${m.name.replace("models/", "")}`)
      }
    }
  } catch (err) {
    console.error(err)
  }
}

checkModels()
