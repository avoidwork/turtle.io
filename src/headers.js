/**
 * Sets response headers
 *
 * @method headers
 * @param  {Object}  req             HTTP(S) request Object
 * @param  {Object}  res             HTTP(S) response Object
 * @param  {Number}  status          [Optional] Response status code
 * @param  {Object}  responseHeaders [Optional] HTTP headers to decorate the response with
 * @return {Objet}                   TurtleIO instance
 */
TurtleIO.prototype.headers = function ( req, res, status, responseHeaders ) {
	status      = status || this.codes.SUCCESS;
	var get     = REGEX_GET.test( req.method ),
	    headers = this.config.headers;

	// Decorating response headers
	if ( responseHeaders instanceof Object ) {
		$.merge( headers, responseHeaders );
	}

	// If passing an empty Object, make sure to set `Allow`
	if ( !headers.Allow || headers.Allow.isEmpty() && status !== 404 && status !== 405 ) {
		headers.Allow = "GET";
	}

	// Fixing `Allow` header
	if ( !REGEX_HEAD2.test( headers.Allow ) ) {
		headers.Allow = headers.Allow.toUpperCase().split( /,|\s+/ ).filter( function ( i ) {
			return ( !i.isEmpty() && !REGEX_HEAD.test( i ) );
		}).join( ", " ).replace( "GET", "GET, HEAD, OPTIONS" );
	}

	headers.Date = new Date().toUTCString();

	if ( headers["Access-Control-Allow-Methods"].isEmpty() ) {
		headers["Access-Control-Allow-Methods"] = headers.Allow;
	}

	// Decorating "Last-Modified" header
	if ( headers["Last-Modified"].isEmpty() ) {
		headers["Last-Modified"] = headers.Date;
	}

	// Decorating "Transfer-Encoding" header
	headers["Transfer-Encoding"] = "chunked";

	// Removing headers not wanted in the response
	if ( !get || status >= this.codes.BAD_REQUEST ) {
		delete headers["Cache-Control"];
	}

	if ( ( status >= this.codes.FORBIDDEN && status <= this.codes.NOT_FOUND ) || ( status >= this.codes.SERVER_ERROR ) ) {
		delete headers.Allow;
		delete headers["Access-Control-Allow-Methods"];
		delete headers["Last-Modified"];
	}

	return headers;
};
