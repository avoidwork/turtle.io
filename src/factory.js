/**
 * TurtleIO factory
 *
 * @method factory
 * @return {Object} TurtleIO instance
 */
let factory = () => {
	let self = new TurtleIO();

	let cors = ( req, res, next ) => {
		req.cors = ( req.headers.origin !== undefined );
		next();
	};

	let etag = ( req, res, next ) => {
		let cached, headers;

		if ( REGEX.get_only.test( req.method ) && !req.headers.range ) {
			cached = self.etags.get( req.parsed.href );

			// Sending a 304 if Client is making a GET & has current representation
			if ( cached && req.headers[ "if-none-match" ] && req.headers[ "if-none-match" ].replace( /\"/g, "" ) === cached.etag ) {
				headers = clone( cached.headers, true );
				headers.age = parseInt( new Date().getTime() / 1000 - cached.timestamp, 10 );
				return self.respond( req, res, MESSAGES.NO_CONTENT, CODES.NOT_MODIFIED, self.headers( req, headers, CODES.NOT_MODIFIED ) );
			}
			else {
				next();
			}
		}
		else {
			next();
		}
	};

	self.use( cors ).blacklist( cors );
	self.use( etag ).blacklist( etag );

	return self;
}
