// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const http = require( 'http' );

// Vendor
const curl = require( 'curl' );
const pg = require( 'pg' );
const Promise = require( 'bluebird' );

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
const ENV = process.env.NODE_ENV || 'development';

const PORT = process.env.PORT || 8080;

const unsupportedRoutes = [ '/favicon.ico', '/robots.txt' ]; /// TEMP

const Client = pg.Client;

var dbConfig = {
	database: ( ENV === 'development' ) ? 'social_proxy' : 'd3oi6sirqo59c0',
}

var db;

// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------
function parseRoute( route ) {
	return new Promise( ( resolve, reject ) => {
		let routeBits = route.split( '/' ).filter( ( bit ) => { return bit !== '' } );

		resolve( routeBits );
	} );
}

function dbConnect() {
	return new Promise( ( resolve, reject ) => {
		db = new Client( dbConfig );

		resolve( db );
	} );
}

function getAccessToken( provider, username ) {
	return new Promise( ( resolve, reject ) => {
		db.connect();

		db.query( `SELECT * FROM access_tokens WHERE username = '${username}' AND provider = '${provider}'`, ( err, result ) => {
			if ( err ) {
				console.log( 'ENCOUNTERED ERROR' ); /// TEMP
				console.log( err );
			}

			db.end();

			if ( !err && result && result.rows && result.rows.length ) {
				resolve( result.rows[ 0 ] );
			} else {
				reject( err || `No matches found for the following provider and username: ${provider}; ${username}` );
			}
		} );
	} );
}

function fetchInstagramData( accessToken ) {
	return new Promise( ( resolve, reject ) => {
		if ( !accessToken ) {
			reject( 'Missing or invalid access token.' );
		}

		curl.get(
			`https://api.instagram.com/v1/users/self/media/recent?access_token=${accessToken}`,
			{
				CURLOPT_RETURNTRANSFER: 1,
				CURLOPT_FOLLOWLOCATION: true,
			},
			function( err, response, body ) {
				if ( err ) {
					reject( err );
				}

				resolve( body );
			} );
		} );
	}

	// --------------------------------------------------
	// INIT
	// --------------------------------------------------
	http.createServer( ( req, res ) => {
		// ...
		res.setHeader( 'Access-Control-Allow-Origin', '*' );

		if ( unsupportedRoutes.includes( req.url ) ) {
			res.end();
		} else {
			dbConnect()
				.then( () => {
					return parseRoute( req.url );
				} )
				.then( ( routeBits ) => {
					let [ provider, username ] = routeBits;

					if ( provider && username ) {
						return getAccessToken( provider, username );
					} else {
						throw new Error( 'Did not receive either: provider; username' );
					}
				} )
				.then( ( data ) => {
					provider = ( data && data.provider && typeof data.provider === 'string' ) ? data.provider.toLowerCase() : null;

					switch ( provider ) {
						case 'instagram':
							return fetchInstagramData( data.access_token );
						default:
							throw new Error( 'Failed to match provider.' );
					}
				} )
				.then( ( data ) => {
					res.end( data );
				} )
				.catch( ( err ) => {
					res.end( err instanceof Error ? err.message : err );
				} );
		}
	} ).listen( PORT, () => {
		console.log( `LISTENING ON PORT: ${PORT}` );
		console.log( `APP IS CURRENTLY RUNNING IN THE FOLLOWING MODE: ${ENV}` );
	} )
