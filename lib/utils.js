// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
// Vendor
// Project

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------

// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------
/**
 * Given an object, function converts it to an ampersand delimited query string.
 *
 * @param {Object} `obj`
 * @return {string}
 */
/// TODO[@jrmykolyn]: Update function to handle cases where the value at a given key is an: Array; Object; etc.
function objToQuery( obj ) {
	if ( !obj || typeof obj !== 'object' ) {
		return '';
	}

	return Object.keys( obj ).map( ( key ) => {
		return `${key}=${obj[key]}`;
	} ).join( '&' );
}

// --------------------------------------------------
// PUBLIC API
// --------------------------------------------------
module.exports = {
	objToQuery,
};
