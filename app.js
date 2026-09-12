const express = require("express")
const app = express()
const cors = require("cors")
const router = require("./router")

app.use(cors())
app.use("/", router)
app.use(express.json())

app.listen(8000, () => {
  console.log("Server is running on port 8000")
})
