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
	 * @param  {Object} req     Request Object
	 * @param  {Object} res     Response Object
	 * @param  {Object} headers Proxy Response headers
	 * @param  {Object} status  Proxy Response status
	 * @param  {String} arg     Proxy Response body
	 * @return {Undefined}      undefined
	 */
	let handle = ( req, res, headers, status, arg ) => {
		let deferred = defer(),
			etag = "",
			regexOrigin = new RegExp( origin.replace( regex.end_slash, "" ), "g" ),
			url = req.parsed.href,
			stale = STALE,
			get = regex.get_only.test( req.method ),
			rewriteOrigin = req.parsed.protocol + "//" + req.parsed.host + ( route == "/" ? "" : route ),
			cached, rewrite;

		if ( headers.server ) {
			headers.via = ( headers.via ? headers.via + ", " : "" ) + headers.server;
		}

		headers.server = this.config.headers.server;

		if ( status >= CODES.BAD_REQUEST ) {
			this.error( req, res, status, arg ).then( function ( arg ) {
				deferred.resolve( arg );
			} );
		} else {
			// Determining if the response will be cached
			if ( get && ( status === CODES.SUCCESS || status === CODES.NOT_MODIFIED ) && !regex.nocache.test( headers[ "cache-control" ] ) && !regex[ "private" ].test( headers[ "cache-control" ] ) ) {
				// Determining how long rep is valid
				if ( headers[ "cache-control" ] && regex.number.test( headers[ "cache-control" ] ) ) {
					stale = number.parse( regex.number.exec( headers[ "cache-control" ] )[ 0 ], 10 );
				} else if ( headers.expires !== undefined ) {
					stale = new Date( headers.expires );
					stale = number.diff( stale, new Date() );
				}

				// Removing from LRU when invalid
				if ( stale > 0 ) {
					setTimeout( () => {
						this.unregister( url );
					}, stale * 1000 );
				}
			}

			if ( status !== CODES.NOT_MODIFIED ) {
				rewrite = regex.rewrite.test( ( headers[ "content-type" ] || "" ).replace( regex.nval, "" ) );

				// Setting headers
				if ( get && status === CODES.SUCCESS ) {
					etag = headers.etag || "\"" + this.etag( url, headers[ "content-length" ] || 0, headers[ "last-modified" ] || 0, this.encode( arg ) ) + "\"";

					if ( headers.etag !== etag ) {
						headers.etag = etag;
					}
				}

				if ( headers.allow === undefined || string.isEmpty( headers.allow ) ) {
					headers.allow = headers[ "access-control-allow-methods" ] || "GET";
				}

				// Determining if a 304 response is valid based on Etag only (no timestamp is kept)
				if ( get && req.headers[ "if-none-match" ] === etag ) {
					cached = this.etags.get( url );

					if ( cached ) {
						headers.age = parseInt( new Date().getTime() / 1000 - cached.value.timestamp, 10 );
					}

					this.respond( req, res, MESSAGES.NO_CONTENT, CODES.NOT_MODIFIED, headers ).then( function ( arg ) {
						deferred.resolve( arg );
					}, function ( e ) {
						deferred.reject( e );
					} );
				} else {
					if ( regex.head.test( req.method.toLowerCase() ) ) {
						arg = MESSAGES.NO_CONTENT;
					} else if ( rewrite ) {
						// Changing the size of the response body
						delete headers[ "content-length" ];

						if ( arg instanceof Array || arg instanceof Object ) {
							arg = json.encode( arg, req.headers.accept ).replace( regexOrigin, rewriteOrigin );

							if ( route !== "/" ) {
								arg = arg.replace( /"(\/[^?\/]\w+)\//g, "\"" + route + "$1/" );
							}

							arg = json.decode( arg );
						} else if ( typeof arg == "string" ) {
							arg = arg.replace( regexOrigin, rewriteOrigin );

							if ( route !== "/" ) {
								arg = arg.replace( /(href|src)=("|')([^http|mailto|<|_|\s|\/\/].*?)("|')/g, ( "$1=$2" + route + "/$3$4" ) )
									.replace( new RegExp( route + "//", "g" ), route + "/" );
							}
						}
					}

					this.respond( req, res, arg, status, headers ).then( function ( arg ) {
						deferred.resolve( arg );
					}, function ( e ) {
						deferred.reject( e );
					} );
				}
			} else {
				this.respond( req, res, arg, status, headers ).then( function ( arg ) {
					deferred.resolve( arg );
				}, function ( e ) {
					deferred.reject( e );
				} );
			}
		}

		return deferred.promise;
	};

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
			deferred = defer(),
			url = origin + ( route !== "/" ? req.url.replace( new RegExp( "^" + route ), "" ) : req.url ),
			headerz = clone( req.headers, true ),
			parsed = parse( url ),
			streamd = ( stream === true ),
			mimetype = mime.lookup( !regex.ext.test( parsed.pathname ) ? "index.htm" : parsed.pathname ),
			fn, options, proxyReq, next, obj;

		// Facade to handle()
		fn = ( headers, status, body ) => {
			timer.stop();
			this.signal( "proxy", function () {
				return [ req.vhost, req.method, route, origin, timer.diff() ];
			} );
			handle( req, res, headers, status, body ).then( function ( arg ) {
				deferred.resolve( arg );
			}, function ( e ) {
				deferred.reject( e );
			} );
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

		headerz.host = req.headers.host;
		options = {
			headers: headerz,
			hostname: parsed.hostname,
			method: req.method,
			path: parsed.path,
			port: parsed.port || headerz[ "x-forwarded-proto" ] === "https" ? 443 : 80,
			agent: false
		};

		if ( !string.isEmpty( parsed.auth ) ) {
			options.auth = parsed.auth;
		}

		if ( streamd ) {
			next = function ( proxyRes ) {
				res.writeHeader( proxyRes.statusCode, proxyRes.headers );
				proxyRes.pipe( res );
			};
		} else {
			next = function ( proxyRes ) {
				var data = "";

				proxyRes.setEncoding( "utf8" );
				proxyRes.on( "data", function ( chunk ) {
					data += chunk;
				} ).on( "end", function () {
					fn( proxyRes.headers, proxyRes.statusCode, data );
				} );
			}
		}

		if ( parsed.protocol.indexOf( "https" ) > -1 ) {
			options.rejectUnauthorized = false;
			obj = https;
		} else {
			obj = http;
		}

		proxyReq = obj.request( options, next );
		proxyReq.on( "error", ( e ) => {
			this.error( req, res, regex.refused.test( e.message ) ? CODES.SERVER_UNAVAILABLE : CODES.SERVER_ERROR, e.message );
		} );

		if ( regex.body.test( req.method ) ) {
			proxyReq.write( req.body );
		}

		proxyReq.end();

		return deferred.promise;
	};

	// Setting route
	array.each( VERBS, ( i ) => {
		if ( route === "/" ) {
			this[ i ]( "/.*", wrapper, host );
		} else {
			this[ i ]( route, wrapper, host );
			this[ i ]( route + "/.*", wrapper, host );
		}
	} );

	return this;
}
