const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const monk = require("monk");
const helmet = require("helmet");

// reading database address + secret
require("dotenv").config();

const app = express();
const port = 3000;

const db = monk(process.env.MONGODB_URL);

db.then(() => {
  console.log("Monk connected to database 🔗");
});

const urls = db.get("urls");
urls.createIndex({ emojis: 1 }, { unique: true });

app.use(morgan("tiny")); // log requests
app.use(cors()); // enable CORS
app.use(helmet()); // secure app & set headers
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello There...");
});

app.get("/lasturl", (req, res) => {
  urls.find({}).each((url, cursor) => {
    res.send(JSON.stringify(url));
    cursor.close();
  });
});

app.get("/:id", (req, res) => {
  const id = req.params.id
  urls.findOne({ emojis: id }).then(({ emojis, url }) => {
    res.send(`These emojis: ${emojis} redirect to: ${url}`)
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port} 🦻`);
});
