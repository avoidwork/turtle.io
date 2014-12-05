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
TurtleIO.prototype.proxy = function ( route, origin, host, stream ) {
	stream   = ( stream === true );
	var self = this;

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
	function handle ( req, res, arg, xhr ) {
		var etag          = "",
		    regexOrigin   = new RegExp( origin.replace( REGEX_ENDSLSH, "" ), "g" ),
		    url           = req.parsed.href,
		    stale         = STALE,
		    get           = req.method === "GET",
		    rewriteOrigin = req.parsed.protocol + "//" + req.parsed.host + ( route == "/" ? "" : route ),
		    cached, resHeaders, rewrite;

		resHeaders        = headers( xhr.getAllResponseHeaders() );
		resHeaders.via    = ( resHeaders.via ? resHeaders.via + ", " : "" ) + resHeaders.server;
		resHeaders.server = self.config.headers.server;

		// Something went wrong
		if ( xhr.status < self.codes.CONTINUE ) {
			self.error( req, res, self.codes.BAD_GATEWAY );
		}
		else if ( xhr.status >= self.codes.SERVER_ERROR ) {
			self.error( req, res, xhr.status );
		}
		else {
			// Determining if the response will be cached
			if ( get && ( xhr.status === self.codes.SUCCESS || xhr.status === self.codes.NOT_MODIFIED ) && !REGEX_NOCACHE.test( resHeaders["cache-control"] ) && !REGEX_PRIVATE.test( resHeaders["cache-control"] ) ) {
				// Determining how long rep is valid
				if ( resHeaders["cache-control"] && REGEX_NUMBER.test( resHeaders["cache-control"] ) ) {
					stale = number.parse( REGEX_NUMBER.exec( resHeaders["cache-control"] )[0], 10 );
				}
				else if ( resHeaders.expires !== undefined ) {
					stale = new Date( resHeaders.expires );
					stale = number.diff( stale, new Date() );
				}

				// Removing from LRU when invalid
				if ( stale > 0 ) {
					setTimeout( function () {
						self.unregister( url );
					}, stale * 1000 );
				}
			}

			if ( xhr.status !== self.codes.NOT_MODIFIED ) {
				rewrite = REGEX_REWRITE.test( ( resHeaders["content-type"] || "" ).replace( REGEX_NVAL, "" ) );

				// Setting headers
				if ( get && xhr.status === self.codes.SUCCESS ) {
					etag = resHeaders.etag || "\"" + self.etag( url, resHeaders["content-length"] || 0, resHeaders["last-modified"] || 0, self.encode( arg ) ) + "\"";

					if ( resHeaders.etag !== etag ) {
						resHeaders.etag = etag;
					}
				}

				if ( resHeaders.allow === undefined || string.isEmpty( resHeaders.allow ) ) {
					resHeaders.allow = resHeaders["access-control-allow-methods"] || "GET";
				}

				// Determining if a 304 response is valid based on Etag only (no timestamp is kept)
				if ( get && req.headers["if-none-match"] === etag ) {
					cached = self.etags.get( url );

					if ( cached ) {
						resHeaders.age = parseInt( new Date().getTime() / 1000 - cached.value.timestamp, 10 );
					}

					self.respond( req, res, self.messages.NO_CONTENT, self.codes.NOT_MODIFIED, resHeaders );
				}
				else {
					if ( REGEX_HEAD.test( req.method.toLowerCase() ) ) {
						arg = self.messages.NO_CONTENT;
					}
					// Fixing root path of response
					else if ( rewrite ) {
						// Changing the size of the response body
						delete resHeaders["content-length"];

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

					self.respond( req, res, arg, xhr.status, resHeaders );
				}
			}
			else {
				self.respond( req, res, arg, xhr.status, resHeaders );
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
	function headers ( args ) {
		var result = {};

		if ( !string.isEmpty( args ) ) {
			array.each( string.trim( args ).split( "\n" ), function ( i ) {
				var header, value;

				value          = i.replace( REGEX_HEADVAL, "" );
				header         = i.replace( REGEX_HEADKEY, "" ).toLowerCase();
				result[header] = !isNaN( value ) ? Number( value ) : value;
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
	function wrapper ( req, res ) {
		var timer    = precise().start(),
		    url      = origin + ( route !== "/" ? req.url.replace( new RegExp( "^" + route ), "" ) : req.url ),
		    method   = req.method.toLowerCase(),
		    headerz  = clone( req.headers, true ),
		    parsed   = parse( url ),
		    cached   = self.etags.get( url ),
		    streamd  = ( stream === true ),
		    mimetype = cached ? cached.mimetype : mime.lookup( !REGEX_EXT.test( parsed.pathname ) ? "index.htm" : parsed.pathname ),
		    defer, fn, options, proxyReq, xhr;

		// Facade to handle()
		fn = function ( arg ) {
			timer.stop();

			self.signal( "proxy", function () {
				return [req.headers.host, req.method, route, origin, timer.diff()];
			});

			handle( req, res, arg, xhr );
		};

		// Streaming formats that do not need to be rewritten
		if ( !streamd && ( REGEX_EXT.test( parsed.pathname ) && !REGEX_JSON.test( mimetype ) ) && REGEX_STREAM.test( mimetype ) ) {
			streamd = true;
		}

		// Identifying proxy behavior
		headerz["x-host"]             = parsed.host;
		headerz["x-forwarded-for"]    = headerz["x-forwarded-for"] ? headerz["x-forwarded-for"] + ", " + req.ip : req.ip;
		headerz["x-forwarded-proto"]  = parsed.protocol.replace( ":", "" );
		headerz["x-forwarded-server"] = self.config.headers.server;

		if ( !headerz["x-real-ip"] ) {
			headerz["x-real-ip"] = req.ip;
		}

		// Streaming response to Client
		if ( streamd ) {
			headerz.host = req.headers.host;

			options = {
				headers  : headerz,
				hostname : parsed.hostname,
				method   : req.method,
				path     : parsed.path,
				port     : parsed.port || 80
			};

			if ( !string.isEmpty( parsed.auth ) ) {
				options.auth = parsed.auth;
			}

			proxyReq = http.request( options, function ( proxyRes ) {
				res.writeHeader(proxyRes.statusCode, proxyRes.headers);
				proxyRes.pipe( res );
			} );

			proxyReq.on( "error", function ( e ) {
				self.error( req, res, REGEX_REFUSED.test( e.message ) ? self.codes.SERVER_UNAVAILABLE : self.codes.SERVER_ERROR );
			} );

			if ( REGEX_BODY.test( req.method ) ) {
				proxyReq.write( req.body );
			}

			proxyReq.end();
		}
		// Acting as a RESTful proxy
		else {
			// Removing support for compression so the response can be rewritten (if textual)
			delete headerz["accept-encoding"];

			defer = request( url, method, req.body, headerz );
			xhr   = defer.xhr;

			defer.then( fn, fn );
		}
	}

	// Setting route
	array.each( VERBS, function ( i ) {
		if ( route === "/" ) {
			self[i]( "/.*", wrapper, host );
		}
		else {
			self[i]( route, wrapper, host );
			self[i]( route + "/.*", wrapper, host );
		}
	} );

	return this;
};
