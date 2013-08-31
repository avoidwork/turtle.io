/**
 * Send a response
 *
 * @method respond
 * @param  {Object}  req     Request Object
 * @param  {Object}  res     Response Object
 * @param  {Mixed}   body    Primitive or Buffer
 * @param  {Number}  status  [Optional] HTTP status, default is `200`
 * @param  {Object}  headers [Optional] HTTP headers
 * @return {Object}          TurtleIO instance
 */
TurtleIO.prototype.respond = function ( req, res, body, status, headers ) {
	var ua       = req.headers["user-agent"],
	    encoding = req.headers["accept-encoding"],
	    stream, type;

	status  = status || 200;
	headers = this.headers( headers || {"Content-Type": "text/plain"} );

	if ( body ) {
		body = this.encode( body );

		// Ensuring an Etag
		if ( req.method === "GET" && !headers.Etag ) {
			headers.Etag = "\"" + this.etag( this.url( req ), body.length || 0, headers["Last-Modified"] || 0 ) + "\"";
		}

		// Emsuring JSON has proper mimetype
		if ( $.regex.json_wrap.test( body ) ) {
			headers["Content-Type"] = "application/json";
		}
	}

	// Decorating response
	res.statusCode = status;
	res.writeHead( status, headers );

	// Determining if response should be compressed
	if ( body && this.config.compress && ( type = this.compression( ua, encoding, headers["Content-Type"] ) ) && type !== null ) {
		if ( typeof body === "string" ) {
			stream = new Buffer( body );
		}

		res.setHeader( "Content-Encoding", type );
		this.compress( stream || body, type, headers.Etag, res );
	}
	else {
		res.end( body );
	}

	return this.log( this.prep( req, res ) );
};
