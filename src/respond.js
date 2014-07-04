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
	var self     = this,
		timer    = precise().start(),
	    ua       = req.headers["user-agent"],
	    encoding = req.headers["accept-encoding"],
	    type, options;

	if ( body === null || body === undefined ) {
		body = this.messages.NO_CONTENT;
	}

	status  = status || this.codes.SUCCESS;
	headers = this.headers( headers || {"content-type": "text/plain"}, status, REGEX_GET.test( req.method ) );
	file    = file === true;

	if ( req.method == "OPTIONS" ) {
		delete headers["accept-ranges"];
		delete headers["content-length"];
		delete headers["cache-control"];
		delete headers["content-type"];
		delete headers.etag;
		delete headers["last-modified"];
		delete headers.expires;
		delete headers["transfer-encoding"];
	}
	// Ensuring an Etag
	else if ( body && !headers.etag ) {
		headers.etag = "\"" + this.etag( req.parsed.href, body.length || 0, headers["last-modified"] || 0, body || 0 ) + "\"";
	}

	if ( !file && body !== this.messages.NO_CONTENT ) {
		body = this.encode( body );

		// Ensuring JSON has proper mimetype
		if ( REGEX_JSONWRP.test( body ) ) {
			headers["content-type"] = "application/json";
		}

		if ( req.method === "GET" ) {
			// CSV hook
			if ( status === this.codes.SUCCESS && body && headers["content-type"] === "application/json" && req.headers.accept && REGEX_CSV.test( string.explode( req.headers.accept )[0].replace( REGEX_NVAL, "" ) ) ) {
				headers["content-type"] = "text/csv";

				if ( !headers["content-disposition"] ) {
					headers["content-disposition"] = "attachment; filename=\"" + req.parsed.pathname.replace( /.*\//g, "" ).replace(/\..*/, "_" ) + req.parsed.search.replace( "?", "" ).replace( /\&/, "_" ) + ".csv\"";
				}

				body = json.csv( body );
			}
		}
	}

	if ( status === this.codes.NOT_MODIFIED || status < this.codes.MULTIPLE_CHOICE || status >= this.codes.BAD_REQUEST ) {
		// req.parsed may not exist if coming from `error()`
		if ( req.parsed ) {
			if ( !headers.allow && status !== this.codes.NOT_FOUND && status < this.codes.SERVER_ERROR ) {
				headers["access-control-allow-methods"] = headers.allow = this.allows( req.parsed.pathname, req.parsed.hostname );
			}

			if ( req.method === "GET" && ( status === this.codes.SUCCESS || status === this.codes.NOT_MODIFIED ) ) {
				// Updating cache
				if ( !REGEX_NOCACHE.test( headers["cache-control"] ) && !REGEX_PRIVATE.test( headers["cache-control"] ) ) {
					this.register( req.parsed.href, {etag: headers.etag.replace( /"/g, "" ), headers: headers, mimetype: headers["content-type"], timestamp: parseInt( new Date().getTime() / 1000, 10 )}, true );
				}

				// Setting a watcher on the local path
				if ( req.path ) {
					this.watch( req.parsed.href, req.path );
				}
			}
		}
		else {
			delete headers.allow;
			delete headers["access-control-allow-methods"];
		}
	}

	// Fixing 'accept-ranges' for non-filesystem based responses
	if ( !file ) {
		delete headers["accept-ranges"];
	}

	// Removing header because it's ambiguous
	if ( status === this.codes.NOT_MODIFIED ) {
		delete headers["accept-ranges"];
	}

	// Clean up, in case it these are still hanging around
	if ( status === this.codes.NOT_FOUND ) {
		delete headers.allow;
		delete headers["access-control-allow-methods"];
	}

	// Setting `x-response-time`
	headers["x-response-time"]  = ( ( req.timer.stopped === null ? req.timer.stop() : req.timer ).diff() / 1000000 ).toFixed( 2 ) + " ms";

	// Determining if response should be compressed
	if ( status === this.codes.SUCCESS && body && this.config.compress && ( type = this.compression( ua, encoding, headers["content-type"] ) ) && type !== null ) {
		headers["content-encoding"]  = REGEX_GZIP.test( type ) ? "gzip" : "deflate";
		headers["transfer-encoding"] = "chunked";

		if ( file && req.headers.range ) {
			status  = this.codes.PARTIAL_CONTENT;
			options = {};

			array.each( req.headers.range.match( /\d+/g ), function ( i, idx ) {
				options[idx === 0 ? "start" : "end"] = parseInt( i, 10 );
			} );

			headers["content-range"]  = "bytes " + options.start + "-" + options.end + "/" + headers["content-length"];
			headers["content-length"] = number.diff( options.end, options.start ) + 1;
		}

		res.writeHead( status, headers );
		this.compress( req, res, body, type, headers.etag.replace( /"/g, "" ), file, options );
	}
	else if ( status === this.codes.SUCCESS && file && req.method === "GET" ) {
		if ( req.headers.range ) {
			status  = this.codes.PARTIAL_CONTENT;
			options = {};

			array.each( req.headers.range.match( /\d+/g ), function ( i, idx ) {
				options[idx === 0 ? "start" : "end"] = parseInt( i, 10 );
			} );

			headers["content-range"]  = "bytes " + options.start + "-" + options.end + "/" + headers["content-length"];
			headers["content-length"] = number.diff( options.end, options.start ) + 1;
		}

		headers["transfer-encoding"] = "chunked";
		res.writeHead( status, headers );

		fs.createReadStream( body, options ).on( "error", function ( e ) {
			self.log( new Error( "[client " + ( req.headers["x-forwarded-for"] ? array.last( string.explode( req.headers["x-forwarded-for"] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
			self.error( req, res, self.codes.SERVER_ERROR );
		} ).pipe( res );
	}
	else {
		if ( body !== this.messages.NO_CONTENT ) {
			if ( headers["content-length"] === undefined ) {
				if ( body instanceof Buffer ) {
					headers["content-length"] = Buffer.byteLength( body.toString() );
				}
				else if ( typeof body == "string" ) {
					headers["content-length"] = Buffer.byteLength( body );
				}
			}
		}

		if ( req.method !== "OPTIONS" ) {
			headers["content-length"] = headers["content-length"] || 0;
		}

		res.writeHead( status, headers );
		res.end( body );
	}

	timer.stop();

	this.dtp.fire( "respond", function () {
		return [req.headers.host, req.method, req.url, status, timer.diff()];
	} );

	return this.log( this.prep( req, res, headers ), "info" );
};
