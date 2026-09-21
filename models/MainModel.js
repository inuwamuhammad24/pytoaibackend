const fs = require("fs")
require("dotenv").config()
const Groq = require("groq-sdk")

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

function fileToDataUri(filePath, mimeType = "image/jpeg") {
  const fileBuffer = fs.readFileSync(filePath)
  const base64Data = fileBuffer.toString("base64")
  return `data:${mimeType};base64,${base64Data}`
}

exports.detectDisease = imageFile => {
  return new Promise(async (resolve, reject) => {
    let filePath = imageFile?.path

    try {
      if (!imageFile || !filePath) {
        return reject(new Error("No image file provided or missing path."))
      }

      const mimeType = imageFile.mimetype || "image/jpeg"
      const dataUri = fileToDataUri(filePath, mimeType)

      const prompt = `You are an expert plant pathologist. 
Analyze the leaf specimen in this image and return your findings strictly in valid JSON format.
JSON Schema:
{
  "disease": "string (name of disease or 'Healthy Plant')",
  "confidence": number (between 0.0 and 1.0),
  "description": "string (concise summary of symptoms)",
  "treatments": ["string", "string"]
}`

      const chatCompletion = await groq.chat.completions.create({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUri,
                },
              },
            ],
          },
        ],
        // Forces Groq to guarantee clean, parseable JSON
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_completion_tokens: 500,
      })

      const rawContent = chatCompletion.choices[0]?.message?.content
      const result = JSON.parse(rawContent)

      // Disk cleanup
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }

      resolve(result)
    } catch (err) {
      console.error("Groq Detection Error:", err)

      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }

      reject(err)
    }
  })
}
