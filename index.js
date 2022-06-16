
const path      = require( 'path' );
const fs        = require( 'fs-extra' );
const http      = require('http');
const express   = require( 'express' );
const subdomain = require('express-subdomain');

const db = require('projects-db');
const ProjectManager = require( path.join(__dirname, './lib/projectManager.js') );

if( process.env.NODE_ENV != 'production' ){ require('dotenv').config(); }

// Clear workspace

fs.remove( path.join( __dirname, 'temp' ) );

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

const manager = new ProjectManager();

// Routes

server.on( 'upgrade', manager.handleUpgrade() );
app.use(subdomain( `*`, manager.middleware() ));

// listen for requests
server.listen( process.env.PORT || 3000, () => {
    console.log( `Listening at ${server.address().address}:${server.address().port}` );
});
