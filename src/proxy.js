/**
 * Proxies a (root) URL to a route
 *
 * @method proxy
 * @public
 * @param  {String}  origin Host to proxy (e.g. http://hostname)
 * @param  {String}  route  Route to proxy
 * @param  {String}  host   [Optional] Hostname this route is for (default is all)
 * @param  {Boolean} stream [Optional] Stream response to client (default is false)
 * @return {Object}         Instance
 */
factory.prototype.proxy = function ( origin, route, host, stream ) {
	stream    = ( stream === true );
	var self  = this,
	    verbs = ["delete", "get", "post", "put", "patch"],
	    timer = new Date(),
	    handle, headers, wrapper;

	/**
	 * Response handler
	 *
	 * @method handle
	 * @private
	 * @param  {Mixed}  arg   Proxy response
	 * @param  {Object} xhr   XmlHttpRequest
	 * @param  {Object} req   HTTP(S) request Object
	 * @param  {Object} res   HTTP(S) response Object
	 * @param  {Object} timer [Optional] Date instance
	 * @return {Undefined}    undefined
	 */
	handle = function ( arg, xhr, req, res, timer ) {
		var resHeaders = {},
		    etag       = "",
		    regex      = /("|')\//g,
		    replace    = "$1" + route + "/",
		    url        = self.url( req ),
		    delay      = $.expires,
		    rewrite;

		try {
			// Getting or creating an Etag
			if ( xhr.status !== 304 ) {
				resHeaders = headers( xhr.getAllResponseHeaders() );
				rewrite    = REGEX_REWRITE.test( resHeaders["Content-Type"].replace( REGEX_NVAL, "" ) );
				etag       = resHeaders.Etag || "\"" + self.etag( url, resHeaders["Content-Length"] || 0, resHeaders["Last-Modified"] || 0, arg ) + "\"";

				// Setting headers
				if ( resHeaders.Etag !== etag ) {
					resHeaders.Etag = etag;
				}

				if ( resHeaders.Allow === undefined || resHeaders.Allow.isEmpty() ) {
					resHeaders.Allow = resHeaders["Access-Control-Allow-Methods"] || "GET";
				}

				resHeaders.Server = self.config.headers.Server;

				if ( !$.regex.no.test( resHeaders["Cache-Control"] ) ) {
					// Determining how long rep is valid
					if ( resHeaders["Cache-Control"] && $.regex.number_present.test( resHeaders["Cache-Control"] ) ) {
						delay = $.number.parse( $.regex.number_present.exec( resHeaders["Cache-Control"] )[0], 10 );
					}
					else if ( resHeaders.Expires !== undefined ) {
						delay = new Date( resHeaders.Expires ).diff( new Date() );
					}

					if ( delay > 0 ) {
						// Updating LRU
						self.register( url, {etag: etag.replace( /\"/g, "" ), mimetype: resHeaders["Content-Type"]}, true );

						// Removing from LRU when invalid
						$.delay( function () {
							self.unregister( url );
						}, delay );
					}
				}

				// Determining if a 304 response is valid based on Etag only (no timestamp is kept)
				if ( req.headers["if-none-match"] === etag ) {
					self.respond( req, res, messages.NO_CONTENT, codes.NOT_MODIFIED, resHeaders, timer, false );
				}
				else {
					if ( REGEX_HEAD.test( req.method.toLowerCase() ) ) {
						arg = messages.NO_CONTENT;
					}
					// Fixing root path of response
					else if ( rewrite ) {
						if ( arg instanceof Array || arg instanceof Object ) {
							arg = $.decode( $.encode( arg ).replace( regex, replace ) );
						}
						else if ( typeof arg === "string" ) {
							arg = arg.replace( regex, replace );
						}
					}

					self.respond( req, res, arg, xhr.status, resHeaders, timer, false );
				}
			}
			else {
				self.respond( req, res, arg, xhr.status, {Server: self.config.headers.Server}, timer, false );
			}
		}
		catch (e) {
			self.respond( req, res, self.page( codes.BAD_GATEWAY, self.hostname( req ) ), codes.BAD_GATEWAY, {Allow: "GET"}, timer, false );
			self.log( e, true );
		}
	};

	/**
	 * Capitalizes HTTP headers
	 *
	 * @method headers
	 * @private
	 * @param  {Object} args Response headers
	 * @return {Object}      Reshaped response headers
	 */
	headers = function ( args ) {
		var result = {};

		args.trim().split( "\n" ).each( function ( i ) {
			var header, value;

			value          = i.replace( $.regex.header_value_replace, "" );
			header         = i.replace( $.regex.header_replace, "" );
			header         = header.unhyphenate( true ).replace( /\s+/g, "-" );
			result[header] = value;
		});

		return result;
	};

	/**
	 * Wraps the proxy request
	 *
	 * @method wrapper
	 * @private
	 * @param  {Object} req   HTTP(S) request Object
	 * @param  {Object} res   HTTP(S) response Object
	 * @param  {Object} timer [Optional] Date instance
	 * @return {Undefined}    undefined
	 */
	wrapper = function ( req, res, timer ) {
		var url     = origin + req.url.replace( new RegExp( "^" + route ), "" ),
		    method  = req.method.toLowerCase(),
		    headerz = $.clone( req.headers ),
		    parsed  = $.parse( url ),
		    fn, options, proxyReq;

		// Facade to handle()
		fn = function ( arg, xhr ) {
			handle( arg, xhr, req, res, timer );
		};

		// Streaming response to Client
		if ( stream ) {
			headerz.host = req.headers.host;

			options = {
				headers  : headerz,
				hostname : parsed.hostname,
				method   : req.method,
				path     : parsed.path,
				port     : parsed.port || 80
			};

			if ( !parsed.auth.isEmpty() ) {
				options.auth = parsed.auth;
			}

			proxyReq = http.request( options, function ( proxyRes ) {
				res.writeHeader(proxyRes.statusCode, proxyRes.headers);
				proxyRes.pipe( res );
			});

			if ( REGEX_BODY.test( req.method ) ) {
				proxyReq.write( req.body );
			}

			proxyReq.end();

			dtp.fire( "proxy", function () {
				return [req.headers.host, req.method, route, origin, diff( timer )];
			});
		}
		// Acting as a RESTful proxy
		else {
			// Removing support for compression so the response can be rewritten (if textual)
			delete headerz["accept-encoding"];

			if ( REGEX_BODY.test( req.method ) ) {
				url[method]( fn, fn, req.body, headerz );
			}
			else if ( REGEX_DEL.test( method ) ) {
				url.del( fn, fn, headerz );
			}
			else if ( REGEX_HEAD.test( method ) ) {
				if ( method === "head" ) {
					method = "headers";
				}

				url[method]( fn, fn );
			}
			else {
				url.get( fn, fn, headerz );
			}
		}
	};

	// Setting route
	verbs.each( function ( i ) {
		self[i]( route, wrapper, host );
		self[i]( route + "/.*", wrapper, host );

		dtp.fire( "proxy-set", function () {
			return [host || "*", i.toUpperCase(), origin, route, diff( timer )];
		});
	});

	return this;
};