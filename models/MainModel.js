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

async function runGeminiVision(prompt, imagePart) {
  // Primary fast model with fallback to flash-lite if demand spikes
  const models = [
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
  ]

  const config = {
    systemInstruction:
      "You are an agronomic expert and plant pathologist. Analyze the provided leaf specimen for foliar diseases, pests, or deficiencies. If healthy, identify the plant and indicate healthy status. Output strictly valid JSON.",
    responseMimeType: "application/json",
    temperature: 0.2,
    maxOutputTokens: 500,
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
      console.warn(`[${model}] inference skipped/failed:`, err?.message || err)
    }
  }

  throw new Error("Diagnosis servers are currently busy. Please retry shortly.")
}

exports.detectDisease = imageFile => {
  return new Promise(async (resolve, reject) => {
    let filePath = imageFile?.path

    try {
      if (!imageFile || !filePath) {
        return reject(new Error("No image file provided or missing file path."))
      }

      const mimeType = imageFile.mimetype || "image/jpeg"
      const imagePart = fileToGenerativePart(filePath, mimeType)

      const prompt = `Analyze this leaf image specimen. Identify the condition, confidence score, and clear actionable treatments.`

      const result = await runGeminiVision(prompt, imagePart)

      // Disk cleanup
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }

      resolve(result)
    } catch (err) {
      console.error("Gemini Detection Error:", err)

      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }

      reject(err)
    }
  })
}
