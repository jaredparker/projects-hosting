
const path      = require( 'path' );
const http      = require('http');
const express   = require( 'express' );
const subdomain = require('express-subdomain');

const db = require('projects-db');
const ProjectManager = require( path.join(__dirname, './lib/projectManager.js') );

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

// Project Manager init

const manager = new ProjectManager({
});

// Routes

app.use(subdomain( `*`, manager.middleware() ));

// listen for requests
server.listen( process.env.PORT || 3000, () => {
    console.log( `Listening at ${server.address().address}:${server.address().port}` );
});
