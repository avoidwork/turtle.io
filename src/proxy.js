/**
 * Proxies a URL to a route
 *
 * @method proxy
 * @param  {String}  route  Route to proxy
 * @param  {String}  origin Host to proxy (e.g. http://hostname)
 * @param  {String}  host   [Optional] Hostname this route is for (default is all)
 * @param  {Boolean} stream [Optional] Stream response to client (default is false)
 * @return {Object}         TurtleIO instance
 */
proxy ( route, origin, host, stream=false ) {
	/**
	 * Response handler
	 *
	 * @method handle
	 * @private
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @param  {Mixed}  arg Proxy response
	 * @param  {Object} xhr XmlHttpRequest
	 * @return {Undefined}  undefined
	 */
	let handle = ( req, res, arg, xhr ) => {
		let etag = "",
			regexOrigin = new RegExp( origin.replace( regex.end_slash, "" ), "g" ),
			url = req.parsed.href,
			stale = STALE,
			get = regex.get_only.test( req.method ),
			rewriteOrigin = req.parsed.protocol + "//" + req.parsed.host + ( route == "/" ? "" : route ),
			cached, resHeaders, rewrite;

		resHeaders = headers( xhr.getAllResponseHeaders() );
		resHeaders.via = ( resHeaders.via ? resHeaders.via + ", " : "" ) + resHeaders.server;
		resHeaders.server = this.config.headers.server;

		// Something went wrong
		if ( xhr.status < CODES.CONTINUE ) {
			this.error( req, res, CODES.BAD_GATEWAY );
		}
		else if ( xhr.status >= CODES.SERVER_ERROR ) {
			this.error( req, res, xhr.status );
		}
		else {
			// Determining if the response will be cached
			if ( get && ( xhr.status === CODES.SUCCESS || xhr.status === CODES.NOT_MODIFIED ) && !regex.nocache.test( resHeaders[ "cache-control" ] ) && !regex[ "private" ].test( resHeaders[ "cache-control" ] ) ) {
				// Determining how long rep is valid
				if ( resHeaders[ "cache-control" ] && regex.number.test( resHeaders[ "cache-control" ] ) ) {
					stale = number.parse( regex.number.exec( resHeaders[ "cache-control" ] )[ 0 ], 10 );
				}
				else if ( resHeaders.expires !== undefined ) {
					stale = new Date( resHeaders.expires );
					stale = number.diff( stale, new Date() );
				}

				// Removing from LRU when invalid
				if ( stale > 0 ) {
					setTimeout( () => {
						this.unregister( url );
					}, stale * 1000 );
				}
			}

			if ( xhr.status !== CODES.NOT_MODIFIED ) {
				rewrite = regex.rewrite.test( ( resHeaders[ "content-type" ] || "" ).replace( regex.nval, "" ) );

				// Setting headers
				if ( get && xhr.status === CODES.SUCCESS ) {
					etag = resHeaders.etag || "\"" + this.etag( url, resHeaders[ "content-length" ] || 0, resHeaders[ "last-modified" ] || 0, this.encode( arg ) ) + "\"";

					if ( resHeaders.etag !== etag ) {
						resHeaders.etag = etag;
					}
				}

				if ( resHeaders.allow === undefined || string.isEmpty( resHeaders.allow ) ) {
					resHeaders.allow = resHeaders[ "access-control-allow-methods" ] || "GET";
				}

				// Determining if a 304 response is valid based on Etag only (no timestamp is kept)
				if ( get && req.headers[ "if-none-match" ] === etag ) {
					cached = this.etags.get( url );

					if ( cached ) {
						resHeaders.age = parseInt( new Date().getTime() / 1000 - cached.value.timestamp, 10 );
					}

					this.respond( req, res, MESSAGES.NO_CONTENT, CODES.NOT_MODIFIED, resHeaders );
				}
				else {
					if ( regex.head.test( req.method.toLowerCase() ) ) {
						arg = MESSAGES.NO_CONTENT;
					}
					// Fixing root path of response
					else if ( rewrite ) {
						// Changing the size of the response body
						delete resHeaders[ "content-length" ];

						if ( arg instanceof Array || arg instanceof Object ) {
							arg = json.encode( arg, req.headers.accept ).replace( regexOrigin, rewriteOrigin );

							if ( route !== "/" ) {
								arg = arg.replace( /"(\/[^?\/]\w+)\//g, "\"" + route + "$1/" );
							}

							arg = json.decode( arg );
						}
						else if ( typeof arg == "string" ) {
							arg = arg.replace( regexOrigin, rewriteOrigin );

							if ( route !== "/" ) {
								arg = arg.replace( /(href|src)=("|')([^http|mailto|<|_|\s|\/\/].*?)("|')/g, ( "$1=$2" + route + "/$3$4" ) )
									.replace( new RegExp( route + "//", "g" ), route + "/" );
							}
						}
					}

					this.respond( req, res, arg, xhr.status, resHeaders );
				}
			}
			else {
				this.respond( req, res, arg, xhr.status, resHeaders );
			}
		}
	}

	/**
	 * Converts HTTP header String to an Object
	 *
	 * @method headers
	 * @private
	 * @param  {Object} args Response headers
	 * @return {Object}      Reshaped response headers
	 */
	let headers = ( args ) => {
		let result = {};

		if ( !string.isEmpty( args ) ) {
			array.each( string.trim( args ).split( "\n" ), ( i ) => {
				let header, value;

				value = i.replace( regex.headVAL, "" );
				header = i.replace( regex.headKEY, "" ).toLowerCase();
				result[ header ] = !isNaN( value ) ? Number( value ) : value;
			} );
		}

		return result;
	}

	/**
	 * Wraps the proxy request
	 *
	 * @method wrapper
	 * @private
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Undefined}  undefined
	 */
	let wrapper = ( req, res ) => {
		let timer = precise().start(),
			url = origin + ( route !== "/" ? req.url.replace( new RegExp( "^" + route ), "" ) : req.url ),
			method = req.method.toLowerCase(),
			headerz = clone( req.headers, true ),
			parsed = parse( url ),
			cached = this.etags.get( url ),
			streamd = ( stream === true ),
			mimetype = cached ? cached.mimetype : mime.lookup( !regex.ext.test( parsed.pathname ) ? "index.htm" : parsed.pathname ),
			defer, fn, options, proxyReq, xhr;

		// Facade to handle()
		fn = ( arg ) => {
			timer.stop();

			this.signal( "proxy", () => {
				return [ req.vhost, req.method, route, origin, timer.diff() ];
			} );

			handle( req, res, arg, xhr );
		};

		// Streaming formats that do not need to be rewritten
		if ( !streamd && ( regex.ext.test( parsed.pathname ) && !regex.json.test( mimetype ) ) && regex.stream.test( mimetype ) ) {
			streamd = true;
		}

		// Identifying proxy behavior
		headerz[ "x-host" ] = parsed.host;
		headerz[ "x-forwarded-for" ] = headerz[ "x-forwarded-for" ] ? headerz[ "x-forwarded-for" ] + ", " + req.ip : req.ip;
		headerz[ "x-forwarded-proto" ] = parsed.protocol.replace( ":", "" );
		headerz[ "x-forwarded-server" ] = this.config.headers.server;

		if ( !headerz[ "x-real-ip" ] ) {
			headerz[ "x-real-ip" ] = req.ip;
		}

		// Streaming response to Client
		if ( streamd ) {
			headerz.host = req.headers.host;

			options = {
				headers: headerz,
				hostname: parsed.hostname,
				method: req.method,
				path: parsed.path,
				port: parsed.port || 80
			};

			if ( !string.isEmpty( parsed.auth ) ) {
				options.auth = parsed.auth;
			}

			proxyReq = http.request( options, ( proxyRes ) => {
				res.writeHeader( proxyRes.statusCode, proxyRes.headers );
				proxyRes.pipe( res );
			} );

			proxyReq.on( "error", ( e ) => {
				this.error( req, res, regex.refused.test( e.message ) ? CODES.SERVER_UNAVAILABLE : CODES.SERVER_ERROR );
			} );

			if ( regex.body.test( req.method ) ) {
				proxyReq.write( req.body );
			}

			proxyReq.end();
		}
		// Acting as a RESTful proxy
		else {
			// Removing support for compression so the response can be rewritten (if textual)
			delete headerz[ "accept-encoding" ];

			defer = request( url, method, req.body, headerz );
			xhr = defer.xhr;

			defer.then( fn, fn );
		}
	}

	// Setting route
	array.each( VERBS, ( i ) => {
		if ( route === "/" ) {
			this[ i ]( "/.*", wrapper, host );
		}
		else {
			this[ i ]( route, wrapper, host );
			this[ i ]( route + "/.*", wrapper, host );
		}
	} );

	return this;
}
