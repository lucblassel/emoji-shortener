const path = require("path");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const monk = require("monk");
const helmet = require("helmet");
const punycode = require("punycode");
const yup = require("yup");
const nodeEmoji = require("node-emoji");
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// reading database address + secret
require("dotenv").config();

const db = monk(process.env.MONGODB_URL);
// check connection is established
db.then(() => {
  console.log("Monk connected to database 🔗");
});
// choose collection
const urls = db.get("urls");
urls.createIndex({ emojis: 1 }, { unique: true });

// create app
const app = express();
const port = process.env.PORT || 3000;

// get domain name
const domain = process.env.DOMAIN || `localhost:${port}`;

// set up middleware
app.use(express.static(path.join(__dirname, 'public'))); // serve static files
app.use(morgan("combined")); // log requests
app.use(cors()); // enable CORS
app.use(helmet()); // secure app & set headers
app.use(express.json()); // parse request body as JSON

// templating
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// define paths
const pathHomePage = path.join(__dirname, "public/index.html");
const path404Page = path.join(__dirname, "public/404.html");

// data validation schema
const schema = yup.object().shape({
  emojis: yup
    .string()
    .trim()
    .matches(/^[\w\-]/i), // if not specified we generate one at random
  url: yup.string().trim().url().required(),
});

// check if key exists
function keyExists(key) {
  urls.findOne({ emojis: key }).then((doc) => {
    if (doc) {
      return true;
    } else {
      return false;
    }
  });
}

// generate random key not in use
function generateRandomEmojis() {
  let emojis;
  let exists;
  do {
    emojis = "";
    for (let i = 0; i < 5; i++) {
      emojis += nodeEmoji.random().emoji;
    }
    exists = keyExists(punycode.encode(emojis));
    console.log(`${emojis}: keyExists? ${exists}`);
  } while (exists);
  return emojis;
}

// serve landing page
app.get("/", (req, res) => {
    // res.render('index');
  res.sendFile(pathHomePage);
});

// create new shortened URL
app.post("/newURL", slowDown({
    windowMs: 30 * 1000,
    delayAfter: 1,
    delayMs: 500
}), rateLimit({
    windowMs: 30 * 1000,
    max: 1
}), async (req, res, next) => {
  let { emojis, url } = req.body;
  let encodedEmojis = emojis ? punycode.encode(emojis) : undefined;
  try {
    await schema.validate({
      encodedEmojis,
      url,
    });

    if (!encodedEmojis) {
      emojis = generateRandomEmojis();
      encodedEmojis = punycode.encode(emojis);
    } else {
      if (keyExists(encodedEmojis)) {
        throw new Error("This emoji slug already exists... 😿");
      }
    }

    if (encodedEmojis.slice(0, -1) === emojis) {
      throw new Error("There must be at least 1 emoji in the slug... 👹");
    }

    let newURL = { emojis: encodedEmojis, url: url, raw: emojis };
    let created = await urls.insert(newURL);
    res.send({port:port, domain:domain, ...created});
  } catch (error) {
    console.log("Error caught on this req");
    console.log("params", req.params, "body", req.body);
    next(error);
  }
});

// get URL from shortened URL
app.get("/:id", async (req, res, next) => {
  const emojis = punycode.encode(req.params.id);
  try {
    const url = await urls.findOne({ emojis });
    if (url) {
      //   return res.send(
      //     `These emojis: ${punycode.decode(emojis)} redirect to: ${url.url}`
      //   );
      res.render("response", {
        emojiURL: `http://${domain}/${req.params.id}`,
        redirectURL: url.url,
      });
    } else {
      return res.statusCode(404).sendFile(path404Page);
    }
  } catch {
    return res.status(404).sendFile(path404Page);
  }
});

// handle 404
app.use((req, res, next) => {
  res.status(404).sendFile(path404Page);
});

// handle errors
app.use((error, req, res, next) => {
  if (error.status) {
    res.status(error.status);
  } else {
    res.status(500);
  }
  let obj = {
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : error.stack,
    req: req.body
  }
  res.json(obj);
  console.log(obj);
});

// start listening
app.listen(port, () => {
  console.log(`Listening on port ${port} 🦻`);
});
