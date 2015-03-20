/**
 * Sets response headers
 *
 * @method headers
 * @param  {Object}  req      Request Object
 * @param  {Object}  rHeaders Response headers
 * @param  {Number}  status   HTTP status code, default is 200
 * @return {Object}           Response headers
 */
headers ( req, rHeaders, status ) {
	let timer = precise().start(),
		get = regex.get.test( req.method ),
		headers;

	// Decorating response headers
	if ( status !== CODES.NOT_MODIFIED && status >= CODES.MULTIPLE_CHOICE && status < CODES.BAD_REQUEST ) {
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
			if ( ( regex.options.test( req.method ) || req.headers[ "x-requested-with" ] ) && headers[ "access-control-allow-origin" ] === "*" ) {
				headers[ "access-control-allow-origin" ] = req.headers.origin || req.headers.referer.replace( /\/$/, "" );
				headers[ "access-control-allow-credentials" ] = "true";
			}

			headers[ "access-control-allow-methods" ] = headers.allow;
		}
		else {
			delete headers[ "access-control-allow-origin" ];
			delete headers[ "access-control-expose-headers" ];
			delete headers[ "access-control-max-age" ];
			delete headers[ "access-control-allow-credentials" ];
			delete headers[ "access-control-allow-methods" ];
			delete headers[ "access-control-allow-headers" ];
		}

		// Decorating "Transfer-Encoding" header
		if ( !headers[ "transfer-encoding" ] ) {
			headers[ "transfer-encoding" ] = "identity";
		}

		// Removing headers not wanted in the response
		if ( !get || status >= CODES.BAD_REQUEST ) {
			delete headers[ "cache-control" ];
			delete headers.etag;
			delete headers[ "last-modified" ];
		}

		if ( status === CODES.NOT_MODIFIED ) {
			delete headers[ "last-modified" ];
		}

		if ( ( status === CODES.NOT_FOUND && headers.allow ) || status >= CODES.SERVER_ERROR ) {
			delete headers[ "accept-ranges" ];
		}

		if ( !headers[ "last-modified" ] ) {
			delete headers[ "last-modified" ];
		}
	}

	headers.status = status + " " + http.STATUS_CODES[ status ];

	timer.stop();

	this.signal( "headers", () => {
		return [ status, timer.diff() ];
	} );

	return headers;
}
