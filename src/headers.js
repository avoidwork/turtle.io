/**
 * Sets response headers
 *
 * @method headers
 * @param  {Object}  req      Request Object
 * @param  {Object}  rHeaders Response headers
 * @param  {Number}  status   HTTP status code, default is 200
 * @return {Object}           Response headers
 */
TurtleIO.prototype.headers = function ( req, rHeaders, status ) {
	var timer = precise().start(),
		get = REGEX_GET.test( req.method ),
		headers;

	// Decorating response headers
	if ( status !== this.codes.NOT_MODIFIED && status >= this.codes.MULTIPLE_CHOICE && status < this.codes.BAD_REQUEST ) {
		headers = rHeaders;
	}
	else if ( rHeaders instanceof Object ) {
		headers = clone( this.config.headers, true );
		merge( headers, rHeaders );
		headers.allow = req.allow;

		if ( !headers.date ) {
			headers.date = new Date().toUTCString();
		}

		if ( req.cors ) {
			if ( ( req.method == "OPTIONS" || req.headers[ "x-requested-with" ] ) && headers[ "access-control-allow-origin" ] === "*" ) {
				headers[ "access-control-allow-origin" ] = req.headers.origin || req.headers.referer.replace( /\/$/, "" );
				headers[ "access-control-allow-credentials" ] = "true";
			}

			headers[ "access-control-allow-methods" ] = headers.allow;
		}
		else {
			delete headers[ "access-control-allow-headers" ];
			delete headers[ "access-control-allow-methods" ];
			delete headers[ "access-control-allow-origin" ];
			delete headers[ "access-control-expose-headers" ];
		}

		// Decorating "Transfer-Encoding" header
		if ( !headers[ "transfer-encoding" ] ) {
			headers[ "transfer-encoding" ] = "identity";
		}

		// Removing headers not wanted in the response
		if ( !get || status >= this.codes.BAD_REQUEST ) {
			delete headers[ "cache-control" ];
			delete headers.etag;
			delete headers[ "last-modified" ];
		}

		if ( status === this.codes.NOT_MODIFIED ) {
			delete headers[ "last-modified" ];
		}

		if ( ( status === this.codes.NOT_FOUND && headers.allow ) || status >= this.codes.SERVER_ERROR ) {
			delete headers[ "accept-ranges" ];
		}

		if ( !headers[ "last-modified" ] ) {
			delete headers[ "last-modified" ];
		}
	}

	headers.status = status + " " + http.STATUS_CODES[ status ];

	timer.stop();

	this.signal( "headers", function () {
		return [ status, timer.diff() ];
	} );

	return headers;
};
