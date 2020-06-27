const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const monk = require("monk");
const helmet = require("helmet");

const app = express();
const port = 3000

app.use(morgan('tiny')); // log requests
app.use(cors()); // enable CORS
app.use(helmet()); // secure app & set headers

app.get('/', (req, res) => {
    console.log(`request received: \n${req}`);
    res.send('Hello There...');
});

app.listen(port, () => {
    console.log(`Listening on port ${port} 🦻`)
})