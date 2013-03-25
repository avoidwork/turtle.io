/**
 * Constructs a response
 * 
 * @method respond
 * @param  {Object}  res             Response object
 * @param  {Object}  req             Request object
 * @param  {Mixed}   output          [Optional] Response
 * @param  {Number}  status          [Optional] HTTP status code, default is 200
 * @param  {Object}  responseHeaders [Optional] HTTP headers to decorate the response with
 * @param  {Object}  timer           [Optional] Date instance
 * @param  {Boolean} compress        [Optional] Enable compression of the response (if supported)
 * @return {Objet}                   Instance
 */
factory.prototype.respond = function ( res, req, output, status, responseHeaders, timer, compress ) {
	status = status || codes.SUCCESS;
	timer  = timer  || new Date(); // Not ideal! This gives a false sense of speed for custom routes

	var body      = !REGEX_HEAD.test(req.method) && output !== null,
	    encoding  = this.compression(req.headers["user-agent"], req.headers["accept-encoding"]),
	    self      = this,
	    nth, salt;

	if ( !( responseHeaders instanceof Object ) ) {
		responseHeaders = {};
	}

	// Determining wether compression is supported
	compress = compress || ( body && encoding !== null );

	// Converting JSON or XML to a String
	if ( body ) {
		switch ( true ) {
			case output instanceof Array:
			case output instanceof Object:
				responseHeaders["Content-Type"] = "application/json";
				output = $.encode( output );
				break;
			/*case output instanceof Document:
				responseHeaders["Content-Type"] = "application/xml";
				output = $.xml.decode(output);
				break;*/
		}
	}

	// Setting Etag if not present
	if (responseHeaders.Etag === undefined) {
		salt = req.url + "-" + req.method + "-" + ( output !== null && typeof output.length !== "undefined" ? output.length : null ) + "-" + output;
		responseHeaders.Etag = "\"" + self.hash( salt ) + "\"";
	}

	// Comparing against request headers incase this is a custom route response
	if (req.headers["if-none-match"] === responseHeaders.Etag) {
		status = 304;
		output = messages.NO_CONTENT;
	}

	// Setting the response status code
	res.statusCode = status;

	// Compressing response to disk
	if ( status !== 304 && compress ) {
		self.compressed( res, req, responseHeaders.Etag.replace(/"/g, ""), output, status, responseHeaders, false, timer );
	}
	// Serving content
	else {
		this.headers( res, req, status, responseHeaders );

		if ( body ) {
			res.write( output );
		}

		res.end();

		dtp.fire( "respond", function ( p ) {
			return [req.headers.host, req.method, req.url, status, diff( timer )];
		});

		self.log( prep.call( self, res, req ) );
	}

	return this;
};
