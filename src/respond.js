/**
 * Send a response
 *
 * @method respond
 * @param  {Object}  req     Request Object
 * @param  {Object}  res     Response Object
 * @param  {Mixed}   body    Primitive, Buffer or Stream
 * @param  {Number}  status  [Optional] HTTP status, default is `200`
 * @param  {Object}  headers [Optional] HTTP headers
 * @param  {Boolean} file    [Optional] Indicates `body` is a file path
 * @return {Object}          TurtleIO instance
 */
TurtleIO.prototype.respond = function ( req, res, body, status, headers, file ) {
	var url      = this.url( req ),
	    ua       = req.headers["user-agent"],
	    encoding = req.headers["accept-encoding"],
	    type;

	status  = status || 200;
	headers = this.headers( headers || {"Content-Type": "text/plain"}, status, req.method === "GET" );

	if ( body ) {
		body = this.encode( body );

		// Emsuring JSON has proper mimetype
		if ( $.regex.json_wrap.test( body ) ) {
			headers["Content-Type"] = "application/json";
		}

		if ( req.method === "GET" ) {
			// Ensuring an Etag
			if ( status === 200 && !headers.Etag ) {
				headers.Etag = "\"" + this.etag( url, body.length || 0, headers["Last-Modified"] || 0 ) + "\"";
			}

			// Updating cache
			this.register( url, {etag: headers.Etag, mimetype: headers["Content-Type"]}, true );
		}
	}

	// Decorating response
	res.statusCode = status;

	// Determining if response should be compressed
	if ( status === 200 && body && this.config.compress && ( type = this.compression( ua, encoding, headers["Content-Type"] ) ) && type !== null ) {
		if ( body instanceof Buffer ) {
			headers["Content-Length"] = body.toString().length;
		}

		headers["Content-Encoding"] = type;
		res.writeHead( status, headers );
		this.compress( body, type, headers.Etag.replace( /"/g, "" ), res );
	}
	else if ( file ) {
		res.writeHead( status, headers );
		fs.createReadStream( body ).pipe( res );
	}
	else {
		if ( body instanceof Buffer ) {
			headers["Content-Length"] = body.toString().length;
		}

		res.writeHead( status, headers );
		res.end( body );
	}

	return this.log( this.prep( req, res ) );
};
