/**
 * Sets response headers
 *
 * @method headers
 * @param  {Object}  rHeaders Response headers
 * @param  {Number}  status   HTTP status code, default is 200
 * @param  {Boolean} get      Indicates if responding to a GET
 * @return {Object}           Response headers
 */
TurtleIO.prototype.headers = function ( rHeaders, status, get ) {
	var headers = $.clone( this.config.headers, true );

	// Decorating response headers
	if ( rHeaders instanceof Object ) {
		$.merge( headers, rHeaders );
	}

	// Fixing `Allow` header
	if ( !REGEX_HEAD2.test( headers.Allow ) ) {
		headers.Allow = headers.Allow.toUpperCase().explode().filter( function ( i ) {
			return !REGEX_HEAD.test( i );
		} ).join( ", " ).replace( "GET", "GET, HEAD, OPTIONS" );
	}

	if ( !headers.Date ) {
		headers.Date = new Date().toUTCString();
	}

	if ( headers["Access-Control-Allow-Methods"].isEmpty() ) {
		headers["Access-Control-Allow-Methods"] = headers.Allow;
	}

	// Decorating "Last-Modified" header
	if ( !headers["Last-Modified"] ) {
		headers["Last-Modified"] = headers.Date;
	}

	// Decorating "Transfer-Encoding" header
	if ( !headers["Transfer-Encoding"] )  {
		headers["Transfer-Encoding"] = "chunked";
	}

	// Removing headers not wanted in the response
	if ( !get || status >= this.codes.BAD_REQUEST ) {
		delete headers["Cache-Control"];
	}

	if ( status === this.codes.NOT_MODIFIED || ( status >= this.codes.FORBIDDEN && status <= this.codes.NOT_FOUND ) || ( status >= this.codes.SERVER_ERROR ) ) {
		delete headers.Allow;
		delete headers["Access-Control-Allow-Headers"];
		delete headers["Access-Control-Allow-Methods"];
		delete headers["Access-Control-Allow-Origin"];
		delete headers["Last-Modified"];
	}

	return headers;
};
