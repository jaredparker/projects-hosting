
const path      = require('path');
const http      = require('http');
const express   = require('express');
const subdomain = require('express-subdomain');

const db = require('projects-db');

if( process.env.NODE_ENV != 'production' ){ require('dotenv').config(); }

// DataBase init

const uri = process.env.MONGO_DB_URI;
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
};

db.connect( uri, options );

// App init

const app = express();
const server = http.createServer(app);

// Routes

app.use(subdomain( `*`, (req, res, next) => res.send('Hello world!') ));

// listen for requests
server.listen( process.env.PORT || 3000, () => {
    console.log( `Listening at ${server.address().address}:${server.address().port}` );
});
