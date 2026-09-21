const { detectDisease } = require("./../models/MainModel")

exports.home = (req, res) => {
  res.json("Welcome to the Plant Diseases API!")
}

exports.detectDisease = (req, res) => {
  console.log("Received file:", req.file)
  detectDisease(req.file)
    .then(result => {
      res.json(result)
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({ error: err.message })
    })
}
