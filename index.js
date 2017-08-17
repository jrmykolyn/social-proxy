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

function fetchInstagramFeed( username ) {
	return new Promise( ( resolve, reject ) => {
		dbConnect()
			.then( ( routeBits ) => {
				if ( username ) {
					return getAccessToken( 'instagram', username );
				} else {
					throw new Error( 'Whoops, didn\'t receive a userbame,' );
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
// ROUTES
// --------------------------------------------------
app.use( express.static( 'public' ) );

app.get( '/', function( req, res ) {
	res.end( '/// TODO' );
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
			res.status( 400 ).json( getError( { type: 'bad request', statusCode: 400 } ) );
		} );
} );


app.listen( PORT, function() {
		console.log( `LISTENING ON PORT: ${PORT}` );
		console.log( `APP IS CURRENTLY RUNNING IN THE FOLLOWING MODE: ${ENV}` );
}  );
