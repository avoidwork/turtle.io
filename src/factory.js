/**
 * TurtleIO factory
 *
 * @method factory
 * @return {Object} TurtleIO instance
 */
let factory = function () {
	let app = new TurtleIO();

	function cors ( req, res, next ) {
		req.cors = ( req.headers.origin !== undefined );
		next();
	}

	function etag ( req, res, next ) {
		let cached, headers;

		if ( regex.get_only.test( req.method ) && !req.headers.range ) {
			// Not mutating cache, because `respond()` will do it
			cached = app.etags.cache[ req.parsed.href ];

			// Sending a 304 if Client is making a GET & has current representation
			if ( cached && ( req.headers[ "if-none-match" ] || "" ).replace( /\"/g, "" ) === cached.etag ) {
				headers = clone( cached.headers, true );
				headers.age = parseInt( new Date().getTime() / 1000 - cached.timestamp, 10 );
				app.respond( req, res, MESSAGES.NO_CONTENT, CODES.NOT_MODIFIED, headers ).then( function () {
					next();
				},  function () {
					next();
				} );
			} else {
				next();
			}
		} else {
			next();
		}
	}

	app.use( cors ).blacklist( cors );
	app.use( etag ).blacklist( etag );

	return app;
};
