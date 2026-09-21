const fs = require("fs")
require("dotenv").config()
const { GoogleGenAI, Type } = require("@google/genai")

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

function fileToGenerativePart(imagePath, mimeType = "image/jpeg") {
  const fileBuffer = fs.readFileSync(imagePath)
  return {
    inlineData: {
      data: fileBuffer.toString("base64"),
      mimeType: mimeType || "image/jpeg",
    },
  }
}

const sleep = ms => new Promise(res => setTimeout(res, ms))

async function callGeminiWithFallback(prompt, imagePart) {
  // Cascading priority across separate active model quotas
  const models = [
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
  ]

  const config = {
    systemInstruction:
      "You are a plant disease detection assistant. Analyze the provided image and identify any diseases present in the plant. Provide a confidence score for your diagnosis and suggest possible treatments.",
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        disease: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
        description: { type: Type.STRING },
        treatments: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ["disease", "confidence", "description", "treatments"],
    },
  }

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [prompt, imagePart],
        config,
      })
      return JSON.parse(response.text)
    } catch (err) {
      console.warn(
        `[${model}] failed (${err?.status || err?.code || "error"}):`,
        err?.message || err,
      )
      // Automatically advances to next model if quota (429) or high demand (503) occurs
      await sleep(500)
    }
  }

  throw new Error(
    "All active vision models are temporarily unavailable. Please retry shortly.",
  )
}

exports.detectDisease = imageFile => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!imageFile || !imageFile.path) {
        return reject(new Error("No image file provided or missing file path."))
      }

      const mimeType = imageFile.mimetype || "image/jpeg"
      const imagePart = fileToGenerativePart(imageFile.path, mimeType)

      const prompt = `Analyze this plant leaf specimen as an agronomist and plant pathologist. 
Identify if any disease, pest damage, or deficiency exists. If healthy, state 'Healthy Plant'.`

      const result = await callGeminiWithFallback(prompt, imagePart)

      if (fs.existsSync(imageFile.path)) {
        fs.unlinkSync(imageFile.path)
      }

      resolve(result)
    } catch (err) {
      console.error("Gemini Detection Final Error:", err)

      if (imageFile?.path && fs.existsSync(imageFile.path)) {
        fs.unlinkSync(imageFile.path)
      }

      reject(err)
    }
  })
}
