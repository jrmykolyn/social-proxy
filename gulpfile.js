// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node

// Vendor
var gulp = require( 'gulp' );
var sass = require( 'gulp-sass' );
var PathMap = require( 'sfco-path-map' );

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
var PATHS = new PathMap( {
	src: './src',
	srcViews: '{{src}}/views',
	srcStyles: '{{src}}/styles',
	srcScripts: '{{src}}/scripts',
	srcAssets: '{{src}}/assets',
	dist: './dist',
	public: '{{dist}}/public',
	distViews: '{{dist}}/views',
	distStyles: '{{public}}/css',
	distScripts: '{{public}}/js',
	distAssets: '{{public}}/assets',
} );

// --------------------------------------------------
// DEFINE FUNCTIONS
// --------------------------------------------------
/**
 * Given 2x path patterns, function copies the matched files/folders from one location to the other.
 *
 * @param {string} from
 * @param {string} to
 */
function migrate( from, to ) {
	gulp.src( from ).pipe( gulp.dest( to ) );
}

// --------------------------------------------------
// DEFINE TASKS
// --------------------------------------------------
/**
 * Wrapper around any/all tasks to be executed when `gulp` is run.
 */
gulp.task( 'default', [ 'styles', 'scripts', 'views', 'assets' ] );

/**
 * Wrapper around any/all style-related tasks.
 */
gulp.task( 'styles', function() {
	gulp.src( `${PATHS.srcStyles}/styles.scss` )
		.pipe( sass( {
			outputStyle: 'expanded',
		} ) )
		.pipe( gulp.dest( PATHS.distStyles ) );
} );

/**
 * Wrapper around any/all script-related tasks.
 */
gulp.task( 'scripts', function() {
	migrate( `${PATHS.srcScripts}/**/*.js`, PATHS.distScripts );
} );

/**
 * Wrapper around any/all 'view'-related tasks.
 */
gulp.task( 'views', function() {
	migrate( `${PATHS.srcViews}/**/*.ejs`, PATHS.distViews );
} );

/**
 * Wrapper around any/all asset-related tasks.
 */
gulp.task( 'assets', function() {
	migrate( `${PATHS.srcAssets}/*`, PATHS.distAssets );
} );
