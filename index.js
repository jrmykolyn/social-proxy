// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const http = require( 'http' );
const crypto = require( 'crypto' );

// Vendor
const express = require( 'express' );
const curl = require( 'curl' );
const pg = require( 'pg' );
const Promise = require( 'bluebird' );

// Project
const { utils } = require( './lib' );

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
// Classes/Instances
const Client = pg.Client;
var hash = crypto.createHash( 'sha256' );

// Environment
const ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 8080;

// Session
var sessionIdentifier = getSessionIdentifier();

// Database
var dbConfig = {};

if ( ENV === 'production' ) {
	dbConfig.connectionString = process.env.DATABASE_URL;
} else {
	dbConfig.database = 'social_proxy';
}

// App
var app = express();

// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------
function getSessionIdentifier() {
	hash.update( new Date().getTime().toString() );

	return hash.digest( 'hex' ).substring( 0, 10 );
}

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
				console.log( `[${sessionIdentifier}][LOG] - Successfully connected to database` );

				db.query( `SELECT * FROM access_tokens WHERE username = '${username}' AND provider = '${provider}'`, ( err, result ) => {
					if ( err ) {
						console.log( '[ERROR] - Encountered the following error:' );
						console.log( err );
					}

					db.end()
						.then( () => {
							console.log( `[${sessionIdentifier}][LOG] - Successfully disconnected from database` );

							if ( !err && result && result.rows && result.rows.length ) {
								console.log( `[${sessionIdentifier}][LOG] - Successfully extracted data for the following provider and username: ${provider}; ${username}` );
								resolve( result.rows[ 0 ] );
							} else {
								console.log( `[${sessionIdentifier}][WARN] - No matches found for the following provider and username: ${provider}; ${username}` );
								reject( err || `No matches found for the following provider and username: ${provider}; ${username}` );
							}
						} )
						.catch( ( disconnectErr ) => {
							console.log( `[${sessionIdentifier}][ERROR] - Failed to disconnect from database.` );
							reject( disconnectErr );
						} )
				} );
			} )
			.catch( ( err ) => {
				console.log( `[${sessionIdentifier}][ERROR] - Failed to connect to database.` );
				reject( err );
			} );
	} );
}

function fetchInstagramData( accessToken, options ) {
	options = ( options && typeof options === 'object' ) ? options : {};

	var query = ( options.query && typeof options.query === 'object' ) ? options.query : {};
	var queryStr = utils.objToQuery( query );

	return new Promise( ( resolve, reject ) => {
		var maxCount = 99; /// TODO[@jrmykolyn]: Move to config.
		var count = null;

		if ( !accessToken ) {
			reject( 'Missing or invalid access token.' );
		}

		if ( options && options.query && options.query.count ) {
			count = ( options.query.count <= maxCount ) ? options.query.count : maxCount;
		}

		var url = `https://api.instagram.com/v1/users/self/media/recent?access_token=${accessToken}&${queryStr}`;
		var data = [];

		fetchInstagramPostBatch( url, count, data, resolve, reject );
	} );
}

/// TODO[@jrmykolyn]: Do *SOMETHING* about the fact that this function takes 5 arguments...
function fetchInstagramPostBatch( url, count, data, onComplete, onError ) {
	curl.get(
		url,
		{
			CURLOPT_RETURNTRANSFER: 1,
			CURLOPT_FOLLOWLOCATION: true,
		},
		function( err, response, body ) {
			if ( err ) {
				onError( err );
			}

			// Parse response
			var bodyJson = JSON.parse( body );

			// Add accumulated data to response data.
			bodyJson.data = [ ...bodyJson.data, ...data ];

			// If we've hit the desired or max amount of data:
			// - Invoke the `onComplete` callback with the trimmed, stringified data.
			// Else
			// - Go again!
			if ( bodyJson.data.length >= count ) {
				bodyJson.data = bodyJson.data.slice( 0, count );

				onComplete( JSON.stringify( bodyJson ) );
			} else {
				var newUrl = `${url}&max_id=${bodyJson.pagination.next_max_id}`; /// TODO[@jrmykolyn]: Handle cases where `bodyJson` does not include `pagination` data.

				fetchInstagramPostBatch( newUrl, count, bodyJson.data, onComplete, onError );
			}
	} );
}

function fetchInstagramFeed( username, options ) {
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
						return fetchInstagramData( data.access_token, options );
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

	// Extract `options` (ie. params) from request or fall back to empty object.
	var options = {
		query: ( req.query && typeof req.query === 'object' ) ? req.query : {},
	};

	fetchInstagramFeed( req.params.username, options )
		.then( ( data ) => {
			res.end( data );
		} )
		.catch( ( err ) => {
			console.log( `[${sessionIdentifier}][ERROR] - ${err}` );
			res.status( 400 ).json( getError( { type: 'bad request', statusCode: 400 } ) );
		} );
} );


app.listen( PORT, function() {
		console.log( `[APP] - LISTENING ON PORT: ${PORT}` );
		console.log( `[APP] - RUNNING IN THE FOLLOWING MODE: ${ENV}` );
}  );
