
// @ Directs to locally stored app (WARN: This can affect src files)

const path = require( 'path' );

function fetch( projectID ){
    return path.join( __dirname, '../../projects/', projectID );
}

function clear(){}

module.exports = { fetch, clear };