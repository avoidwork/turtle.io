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

	// Decorating "Expires" header
	if ( !headers.Expires && headers["Cache-Control"] && !$.regex.no.test( headers["Cache-Control"] ) && !$.regex.priv.test( headers["Cache-Control"] ) && $.regex.number_present.test( headers["Cache-Control"] ) ) {
		headers.Expires = new Date( new Date( new Date().getTime() + $.number.parse( $.regex.number_present.exec( headers["Cache-Control"] )[0], 10 ) * 1000 ) ).toUTCString();
	}

	// Decorating "Transfer-Encoding" header
	if ( !headers["Transfer-Encoding"] )  {
		headers["Transfer-Encoding"] = "chunked";
	}

	// Removing headers not wanted in the response
	if ( !get || status >= this.codes.BAD_REQUEST ) {
		delete headers["Cache-Control"];
		delete headers.Expires;
		delete headers["Last-Modified"];
	}
	else if ( status === this.codes.NOT_MODIFIED ) {
		delete headers["Last-Modified"];
	}

	if ( status === this.codes.NOT_FOUND ) {
		headers.Allow = "";
		headers["Access-Control-Allow-Methods"] = "";
	}

	return headers;
};
