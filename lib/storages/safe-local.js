
// @ Copies locally stored app to the temp directory (to avoid damage to src files)

const path = require( 'path' );
const fs   = require( 'fs-extra' );

async function fetch( projectID ){
    const source      = path.join( __dirname, '../../projects/', projectID );
    const destination = path.join( __dirname, '../../temp/sessions/', projectID );

    await fs.copy( source, destination );

    return destination;
}

async function clear( projectID ){
    const dir = path.join( __dirname, '../../temp/sessions/', projectID );
    await fs.remove( dir );
}

module.exports = { fetch, clear };