// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const http = require( 'http' );

// Vendor
const express = require( 'express' );
const curl = require( 'curl' );
const pg = require( 'pg' );
const Promise = require( 'bluebird' );

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
const ENV = process.env.NODE_ENV || 'development';

const PORT = process.env.PORT || 8080;

const Client = pg.Client;

var dbConfig = {};

if ( ENV === 'production' ) {
	dbConfig.connectionString = process.env.DATABASE_URL;
} else {
	dbConfig.database = 'social_proxy';
}

var app = express();

// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------
function dbInit() {
	return new Promise( ( resolve, reject ) => {
		var db = new Client( dbConfig );

		resolve( db );
	} );
}

function getAccessToken( db, provider, username ) {
	return new Promise( ( resolve, reject ) => {
		db.connect()
			.then( () => {
				console.log( '[LOG] - Successfully connected to database' );

				db.query( `SELECT * FROM access_tokens WHERE username = '${username}' AND provider = '${provider}'`, ( err, result ) => {
					if ( err ) {
						console.log( '[ERROR] - Encountered the following error:' );
						console.log( err );
					}

					db.end()
						.then( () => {
							console.log( '[LOG] - Successfully disconnected from database' );

							if ( !err && result && result.rows && result.rows.length ) {
								console.log( `[LOG] - Successfully extracted data for the following provider and username: ${provider}; ${username}` );
								resolve( result.rows[ 0 ] );
							} else {
								console.log( `[WARN] - No matches found for the following provider and username: ${provider}; ${username}` );
								reject( err || `No matches found for the following provider and username: ${provider}; ${username}` );
							}
						} )
						.catch( ( disconnectErr ) => {
							console.log( '[ERROR] - Failed to disconnect from database.' );
							reject( disconnectErr );
						} )
				} );
			} )
			.catch( ( err ) => {
				console.log( '[ERROR] - Failed to connect to database.' );
				reject( err );
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

function fetchInstagramFeed( username ) {
	return new Promise( ( resolve, reject ) => {
		dbInit()
			.then( ( db ) => {
				if ( username ) {
					return getAccessToken( db, 'instagram', username );
				} else {
					throw new Error( 'Whoops, didn\'t receive a username,' );
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
				resolve( data );
			} )
			.catch( ( err ) => {
				reject( err instanceof Error ? err.message : err );
			} );
	} );
}

function getError( opts ) {
	opts = ( opts && typeof opts === 'object' ) ? opts : {};

	opts.message = getErrorMessage( opts.type, opts.subtype );

	return decorateError( opts );
}

function getErrorMessage( type, subtype ) {
	switch ( type ) {
		case 'bad request':
			switch ( subtype ) {
				default:
					return 'The requested resource is missing, invalid, or has been removed.';
			}
			break;
		default:
			return 'Whoops, something went wrong!';
	}
};

function decorateError( opts ) {
	return {
		error: true,
		statusCode: opts.statusCode || 500,
		errorType: opts.type || null,
		errorSubtype: opts.subtype || null,
		errorMessage: opts.message || 'Whoops, something went wrong.',
	};
}

// --------------------------------------------------
// SETUP
// --------------------------------------------------
app.set( 'views', './dist/views' );
app.set( 'view engine', 'ejs' );
app.engine( 'html', require( 'ejs' ).renderFile );
app.use( express.static( './dist/public' ) );

// --------------------------------------------------
// ROUTES
// --------------------------------------------------


app.get( '/', function( req, res ) {
	res.render( 'index' );
} );

app.get( '/instagram', function( req, res ) {
	res.end( '/// TODO' );
} );

app.get( '/instagram/:username', function( req, res ) {
	res.setHeader( 'Access-Control-Allow-Origin', '*' );

	fetchInstagramFeed( req.params.username )
		.then( ( data ) => {
			res.end( data );
		} )
		.catch( ( err ) => {
			console.log( `[ERROR] - ${err}` );
			res.status( 400 ).json( getError( { type: 'bad request', statusCode: 400 } ) );
		} );
} );


app.listen( PORT, function() {
		console.log( `LISTENING ON PORT: ${PORT}` );
		console.log( `APP IS CURRENTLY RUNNING IN THE FOLLOWING MODE: ${ENV}` );
}  );
