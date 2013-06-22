/**
 * Proxies a (root) URL to a route
 *
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
	 * @param  {Mixed}  arg   Proxy response
	 * @param  {Object} xhr   XmlHttpRequest
	 * @param  {Object} res   HTTP(S) response Object
	 * @param  {Object} req   HTTP(S) request Object
	 * @param  {Object} timer [Optional] Date instance
	 * @return {Undefined}    undefined
	 */
	handle = function ( arg, xhr, res, req, timer ) {
		var resHeaders = {},
		    etag       = "",
		    regex      = /("|')\//g,
		    replace    = "$1" + route + "/",
		    date, rewrite;

		try {
			// Getting or creating an Etag
			resHeaders = headers( xhr.getAllResponseHeaders() );
			date       = ( resHeaders["Last-Modified"] || resHeaders.Date ) || undefined;
			rewrite    = REGEX_REWRITE.test( resHeaders["Content-Type"].replace( REGEX_NVAL, "" ) );

			if ( isNaN( new Date( date ).getFullYear() ) ) {
				date = new Date();
			}
			else {
				date = new Date( date );
			}

			etag = resHeaders.Etag || "\"" + self.hash( req.url + "-" + req.method + "-" + resHeaders["Content-Length"] + "-" + date.getTime() ) + "\"";

			// Setting headers
			if ( resHeaders.Etag !== etag ) {
				resHeaders.Etag = etag;
			}

			if ( resHeaders.Allow === undefined || resHeaders.Allow.isEmpty() ) {
				resHeaders.Allow = resHeaders["Access-Control-Allow-Methods"] || "GET";
			}

			resHeaders.Server = self.config.headers.Server;

			// Determining if a 304 response is valid based on Etag only (no timestamp is kept)
			if ( req.headers["if-none-match"] === etag ) {
				self.respond( res, req, messages.NO_CONTENT, codes.NOT_MODIFIED, resHeaders, timer, false );
			}
			else {
				resHeaders["Transfer-Encoding"] = "chunked";
				etag = etag.replace( /\"/g, "" );

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

				// Sending compressed version to Client if supported
				if ( req.headers["accept-encoding"] !== undefined ) {
					self.compressed( res, req, etag, arg, xhr.status, resHeaders, false, timer );
				}
				else {
					self.respond( res, req, arg, xhr.status, resHeaders, timer, false );
				}
			}
		}
		catch (e) {
			self.respond( res, req, messages.NO_CONTENT, codes.ERROR_GATEWAY, {Allow: "GET"}, timer, false );
			self.log( e, true );
		}
	};

	/**
	 * Capitalizes HTTP headers
	 *
	 * @param  {Object} args Response headers
	 * @return {Object}      Reshaped response headers
	 */
	headers = function ( args ) {
		var result  = {},
		    rvalue  = /.*:\s+/,
		    rheader = /:.*/;

		args.trim().split( "\n" ).each( function ( i ) {
			var header, value;

			value          = i.replace( rvalue, "" );
			header         = i.replace( rheader, "" );
			header         = header.unhyphenate( true ).replace( /\s+/g, "-" );
			result[header] = value;
		});

		return result;
	};

	/**
	 * Wraps the proxy request
	 *
	 * @param  {Object} res   HTTP(S) response Object
	 * @param  {Object} req   HTTP(S) request Object
	 * @param  {Object} timer [Optional] Date instance
	 * @return {Undefined}    undefined
	 */
	wrapper = function ( res, req, timer ) {
		var url     = origin + req.url.replace( new RegExp( "^" + route ), "" ),
		    method  = req.method.toLowerCase(),
		    headerz = $.clone( req.headers ),
		    parsed  = $.parse( url ),
		    fn, options, proxyReq;

		// Facade to handle()
		fn = function ( arg, xhr ) {
			handle( arg, xhr, res, req, timer );
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