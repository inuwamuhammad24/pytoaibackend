const { detectDisease } = require("./../models/MainModel")

exports.home = (req, res) => {
  res.json("Welcome to the Plant Diseases API!")
}

exports.detectDisease = (req, res) => {
  detectDisease(req.file)
    .then(result => {
      console.log(result)
    })
    .catch(err => {
      res.status(500).json({ error: err.message })
    })
}
