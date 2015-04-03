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
respond ( req, res, body, status=CODES.SUCCESS, headers, file=false ) {
	let head = regex.head.test( req.method ),
		timer = precise().start(),
		ua = req.headers[ "user-agent" ],
		encoding = req.headers[ "accept-encoding" ],
		type, options;

	let finalize = () => {
		let cheaders, cached;

		if ( status === CODES.NOT_MODIFIED || status < CODES.MULTIPLE_CHOICE || status >= CODES.BAD_REQUEST ) {
			// req.parsed may not exist if coming from `error()`
			if ( req.parsed ) {
				if ( regex.get_only.test( req.method ) && status === CODES.SUCCESS ) {
					// Updating cache
					if ( !regex.nocache.test( headers[ "cache-control" ] ) && !regex[ "private" ].test( headers[ "cache-control" ] ) ) {
						if ( headers.etag === undefined ) {
							headers.etag = "\"" + this.etag( req.parsed.href, body.length || 0, headers[ "last-modified" ] || 0, body || 0 ) + "\"";
						}

						cheaders = clone( headers, true );

						delete cheaders[ "access-control-allow-origin" ];
						delete cheaders[ "access-control-expose-headers" ];
						delete cheaders[ "access-control-max-age" ];
						delete cheaders[ "access-control-allow-credentials" ];
						delete cheaders[ "access-control-allow-methods" ];
						delete cheaders[ "access-control-allow-headers" ];

						cached = this.etags.get( req.parsed.href );

						if ( !cached ) {
							this.register( req.parsed.href, {
								etag: cheaders.etag.replace( /"/g, "" ),
								headers: cheaders,
								mimetype: cheaders[ "content-type" ],
								timestamp: parseInt( new Date().getTime() / 1000, 10 )
							}, true );
						}
					}

					// Setting a watcher on the local path
					if ( req.path ) {
						this.watch( req.parsed.href, req.path );
					}
				}
			}
			else {
				delete headers.allow;
				delete headers[ "access-control-allow-methods" ];
			}
		}
	}

	if ( body === null || body === undefined ) {
		body = MESSAGES.NO_CONTENT;
	}

	headers = this.headers( req, headers || { "content-type": "text/plain" }, status );

	if ( head ) {
		delete headers.etag;
		delete headers[ "last-modified" ];
	}

	if ( !file && body !== MESSAGES.NO_CONTENT ) {
		body = this.encode( body, req.headers.accept );

		if ( headers[ "content-length" ] === undefined ) {
			if ( body instanceof Buffer ) {
				headers[ "content-length" ] = Buffer.byteLength( body.toString() );
			}
			else if ( typeof body == "string" ) {
				headers[ "content-length" ] = Buffer.byteLength( body );
			}
		}

		headers[ "content-length" ] = headers[ "content-length" ] || 0;

		if ( head ) {
			body = MESSAGES.NO_CONTENT;

			if ( regex.options.test( req.method ) ) {
				headers[ "content-length" ] = 0;
				delete headers[ "content-type" ];
			}
		}

		// Ensuring JSON has proper mimetype
		if ( regex.json_wrap.test( body ) ) {
			headers[ "content-type" ] = "application/json";
		}

		if ( regex.get_only.test( req.method ) ) {
			// CSV hook
			if ( status === CODES.SUCCESS && body && headers[ "content-type" ] === "application/json" && req.headers.accept && regex.csv.test( string.explode( req.headers.accept )[ 0 ].replace( regex.nval, "" ) ) ) {
				headers[ "content-type" ] = "text/csv";

				if ( !headers[ "content-disposition" ] ) {
					headers[ "content-disposition" ] = "attachment; filename=\"" + req.parsed.pathname.replace( /.*\//g, "" ).replace( /\..*/, "_" ) + req.parsed.search.replace( "?", "" ).replace( /\&/, "_" ) + ".csv\"";
				}

				body = csv.encode( body );
			}
		}
	}

	// Fixing 'accept-ranges' for non-filesystem based responses
	if ( !file ) {
		delete headers[ "accept-ranges" ];
	}

	if ( status === CODES.NOT_MODIFIED ) {
		delete headers[ "accept-ranges" ];
		delete headers[ "content-encoding" ];
		delete headers[ "content-length" ];
		delete headers[ "content-type" ];
		delete headers.date;
		delete headers[ "transfer-encoding" ];
	}

	// Clean up, in case it these are still hanging around
	if ( status === CODES.NOT_FOUND ) {
		delete headers.allow;
		delete headers[ "access-control-allow-methods" ];
	}

	// Setting `x-response-time`
	headers[ "x-response-time" ] = ( ( req.timer.stopped === null ? req.timer.stop() : req.timer ).diff() / 1000000 ).toFixed( 2 ) + " ms";

	// Setting the partial content headers
	if ( req.headers.range ) {
		options = {};

		array.each( req.headers.range.match( /\d+/g ) || [], ( i, idx ) => {
			options[ idx === 0 ? "start" : "end" ] = parseInt( i, 10 );
		} );

		if ( options.end === undefined ) {
			options.end = headers[ "content-length" ];
		}

		if ( isNaN( options.start ) || isNaN( options.end ) || options.start >= options.end ) {
			delete req.headers.range;
			return this.error( req, res, CODES.NOT_SATISFIABLE );
		}

		status = CODES.PARTIAL_CONTENT;
		headers.status = status + " " + http.STATUS_CODES[ status ];
		headers[ "content-range" ] = "bytes " + options.start + "-" + options.end + "/" + headers[ "content-length" ];
		headers[ "content-length" ] = number.diff( options.end, options.start ) + 1;
	}

	// Determining if response should be compressed
	if ( ua && ( status === CODES.SUCCESS || status === CODES.PARTIAL_CONTENT ) && body !== MESSAGES.NO_CONTENT && this.config.compress && ( type = this.compression( ua, encoding, headers[ "content-type" ] ) ) && type !== null ) {
		headers[ "content-encoding" ] = regex.gzip.test( type ) ? "gzip" : "deflate";

		if ( file ) {
			headers[ "transfer-encoding" ] = "chunked";
			delete headers["content-length"];
		}

		finalize();

		this.compress( req, res, body, type, headers.etag ? headers.etag.replace( /"/g, "" ) : undefined, file, options, status, headers );
	}
	else if ( ( status === CODES.SUCCESS || status === CODES.PARTIAL_CONTENT ) && file && regex.get_only.test( req.method ) ) {
		headers[ "transfer-encoding" ] = "chunked";
		delete headers["content-length"];

		finalize();

		if ( !res._header && !res._headerSent ) {
			res.writeHead( status, headers );
		}

		fs.createReadStream( body, options ).on( "error", ( e ) => {
			this.log( new Error( "[client " + ( req.headers[ "x-forwarded-for" ] ? array.last( string.explode( req.headers[ "x-forwarded-for" ] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
			this.error( req, res, CODES.SERVER_ERROR );
		} ).pipe( res );
	}
	else {
		finalize();

		if ( !res._header && !res._headerSent ) {
			res.writeHead( status, headers );
		}

		res.end( status === CODES.PARTIAL_CONTENT ? body.slice( options.start, options.end ) : body );
	}

	timer.stop();

	this.signal( "respond", () => {
		return [ req.headers.host, req.method, req.url, status, timer.diff() ];
	} );

	return this.log( this.prep( req, res, headers ), "info" );
}
