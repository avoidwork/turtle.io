/**
 * TurtleIO factory
 *
 * @method factory
 * @return {Object} TurtleIO instance
 */
function factory () {
	var self = new TurtleIO();

	self.get( function etag ( req, res, next ) {
		var method = req.method.toLowerCase(),
		    cached, headers;

		if ( !REGEX_HEAD.test( method ) && !req.headers.range ) {
			cached = self.etags.get( req.parsed.href );

			// Sending a 304 if Client is making a GET & has current representation
			if ( cached && req.headers["if-none-match"] && req.headers["if-none-match"].replace( /\"/g, "" ) === cached.etag ) {
				headers     = clone( cached.headers, true );
				headers.age = parseInt( new Date().getTime() / 1000 - cached.timestamp, 10 );

				delete headers["content-encoding"];
				delete headers["transfer-encoding"];

				return self.respond( req, res, self.messages.NO_CONTENT, self.codes.NOT_MODIFIED, headers );
			}
			else {
				next();
			}
		}
		else {
			next();
		}
	} );

	self.use( function cors () {
		var req = arguments[0],
			ref = req.headers.referer;

		req.cors = ref !== undefined && ref !== req.parsed.protocol + "//" + req.parsed.host;
		arguments[2]();
	} );

	return self;
}
