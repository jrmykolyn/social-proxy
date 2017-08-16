// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const http = require( 'http' );

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
const PORT = process.env.port || 8080;

const unsupportedRoutes = [ '/favicon.ico', '/robots.txt' ]; /// TEMP

// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------

// --------------------------------------------------
// INIT
// --------------------------------------------------
http.createServer( ( req, res ) => {
	if ( unsupportedRoutes.includes( req.url ) ) {
		res.end();
	} else {
		res.end( 'Hello, world!' );
	}
} ).listen( PORT, () => {
	console.log( `LISTENING ON PORT: ${PORT}` );
} )
