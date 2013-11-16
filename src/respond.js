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
	    parsed   = $.parse( url ),
	    ua       = req.headers["user-agent"],
	    encoding = req.headers["accept-encoding"],
	    type;

	status  = status || this.codes.SUCCESS;
	headers = this.headers( headers || {"Content-Type": "text/plain"}, status, req.method === "GET" );
	file    = ( file === true );

	if ( !headers.Allow ) {
		headers["Access-Control-Allow-Methods"] = headers.Allow = this.allows( parsed.pathname, parsed.hostname );
	}

	if ( body ) {
		body = this.encode( body );

		// Ensuring JSON has proper mimetype
		if ( $.regex.json_wrap.test( body ) ) {
			headers["Content-Type"] = "application/json";
		}

		if ( req.method === "GET" ) {
			// CSV hook
			if ( status === this.codes.SUCCESS && body && headers["Content-Type"] === "application/json" && req.headers.accept && REGEX_CSV.test( req.headers.accept.explode()[0].replace( REGEX_NVAL, "" ) ) ) {
				headers["Content-Type"] = "text/csv";

				if ( !headers["Content-Disposition"] ) {
					headers["Content-Disposition"] = "attachment; filename=\"" + req.url.replace( REGEX_NURI, "" ) + ".csv\"";
				}

				body = $.json.csv( body );
			}
		}
	}

	if ( req.method === "GET" && ( status === this.codes.SUCCESS || status === this.codes.NOT_MODIFIED ) ) {
		// Ensuring an Etag
		if ( !headers.Etag ) {
			headers.Etag = "\"" + this.etag( url, body.length || 0, headers["Last-Modified"] || 0, body || 0 ) + "\"";
		}

		// Updating cache
		if ( !$.regex.no.test( headers["Cache-Control"] ) && !$.regex.priv.test( headers["Cache-Control"] ) ) {
			this.register( url, {etag: headers.Etag.replace( /"/g, "" ), mimetype: headers["Content-Type"]}, true );
		}

		// Setting a watcher on the local path
		if ( req.path ) {
			this.watch( url, req.path, headers["Content-Type"] );
		}
	}

	// Decorating response
	res.statusCode = status;

	// Determining if response should be compressed
	if ( status === this.codes.SUCCESS && body && this.config.compress && ( type = this.compression( ua, encoding, headers["Content-Type"] ) ) && type !== null ) {
		if ( body instanceof Buffer ) {
			headers["Content-Length"] = body.toString().length;
		}

		headers["Content-Encoding"] = REGEX_GZIP.test( type ) ? "gzip" : "deflate";
		res.writeHead( status, headers );
		this.compress( body, type, headers.Etag.replace( /"/g, "" ), req, res, file );
	}
	else if ( file ) {
		res.writeHead( status, headers );
		fs.createReadStream( body ).on( "error", function ( e ) {
				this.log( e );
				this.error( req, res, this.codes.SERVER_ERROR );
		}.bind( this ) ).pipe( res );
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
