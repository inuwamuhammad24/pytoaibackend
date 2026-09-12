const detectDisease = require("./../models/MainModel")
const fs = require("fs")
require("dotenv").config()
const { GoogleGenAI, Type } = require("@google/genai")

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

exports.home = (req, res) => {
  res.json("Welcome to the Plant Diseases API!")
}

function fileToGenerativePart(imagePath, mimeType = "image/jpeg") {
  const fileBuffer = fs.readFileSync(imagePath)
  return {
    inlineData: {
      data: fileBuffer.toString("base64"),
      mimeType: mimeType || "image/jpeg",
    },
  }
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

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [prompt, imagePart],
        config: {
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
        },
      })

      const result = JSON.parse(response.text)

      // Clean up uploaded temp file from disk if no longer needed
      if (fs.existsSync(imageFile.path)) {
        fs.unlinkSync(imageFile.path)
      }

      resolve(result)
    } catch (err) {
      console.error("Gemini Detection Error:", err)

      // Clean up uploaded temp file on error as well
      if (imageFile?.path && fs.existsSync(imageFile.path)) {
        fs.unlinkSync(imageFile.path)
      }

      reject(err)
    }
  })
}
