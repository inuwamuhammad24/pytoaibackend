const express = require("express")
const router = express.Router()
const homeControllers = require("./controllers/mainControllers")
const multer = require("multer")
const upload = multer({ dest: "uploads/" })

router.get("/", homeControllers.home)
router.post(
  "/detect-disease",
  upload.single("image"),
  homeControllers.detectDisease,
)

module.exports = router
