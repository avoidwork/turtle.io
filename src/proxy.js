/**
 * Proxies a (root) URL to a route
 * 
 * @param  {String} origin Host to proxy (e.g. http://hostname)
 * @param  {String} route  Route to proxy
 * @param  {String} host   [Optional] Hostname this route is for (default is all)
 * @return {Object}        Instance
 */
factory.prototype.proxy = function ( origin, route, host ) {
	var self  = this,
	    verbs = ["delete", "get", "post", "put"],
	    timer = new Date(),
	    handle, headers, wrapper;

	/**
	 * Response handler
	 * 
	 * @param  {Mixed}  arg   Proxy response
	 * @param  {Object} xhr   XmlHttpRequest
	 * @param  {Object} res   HTTP response Object
	 * @param  {Object} req   HTTP request Object
	 * @param  {Object} timer Date instance
	 * @return {Undefined}    undefined
	 */
	handle = function ( arg, xhr, res, req, timer ) {
		var resHeaders = {},
		    etag       = "",
		    date       = "",
		    regex      = /("|')\//g,
		    replace    = "$1" + route + "/",
		    nth, raw;

		try {
			// Getting or creating an Etag
			resHeaders = headers( xhr.getAllResponseHeaders() );
			date       = ( resHeaders["Last-Modified"] || resHeaders["Date"] ) || undefined;

			if ( isNaN( new Date( date ).getFullYear() ) ) {
				date = undefined;
			}

			etag = resHeaders.Etag || "\"" + self.hash( req.url + "-" + resHeaders["Content-Length"] + "-" + new Date( date ).getTime() ) + "\"";

			// Setting headers
			if ( resHeaders.Etag !== etag ) {
				resHeaders.Etag = etag;
			}

			if ( resHeaders.Allow === undefined || resHeaders.Allow.isEmpty() ) {
				resHeaders.Allow = resHeaders["Access-Control-Allow-Methods"] || "GET";
			}

			// Determining if a 304 response is valid based on Etag only (no timestamp is kept)
			switch ( true ) {
				case req.headers["if-none-match"] === etag:
					self.respond( res, req, messages.NO_CONTENT, codes.NOT_MODIFIED, resHeaders, timer );
					/*self.headers(res, req, codes.NOT_MODIFIED, resHeaders);
					res.end();*/
					break;
				default:
					resHeaders["Transfer-Encoding"] = "chunked";
					etag = etag.replace(/\"/g, "");

					// Fixing root path of response
					switch (true) {
						case arg instanceof Array:
						case arg instanceof Object:
							arg = $.decode( $.encode( arg ).replace( regex, replace ) );
							break;
						case typeof arg === "string":
							arg = arg.replace( regex, replace );
							break;
					}

					// Ready to compress response
					self.compressed( res, req, etag, arg, xhr.status, resHeaders, false, timer );
			}
		}
		catch (e) {
			self.log( e, true );
			self.respond( res, req, messages.NO_CONTENT, codes.ERROR_GATEWAY, {"Allow": "GET"}, timer );
		}

		dtp.fire( "proxy", function ( p ) {
			return [req.headers.host, req.method, route, origin, diff( timer )];
		});
	};

	/**
	 * Capitalizes HTTP headers
	 * 
	 * @param  {Object} args Response headers
	 * @return {Object}      Reshaped response headers
	 */
	headers = function ( args ) {
		var result = {},
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
	 * @param  {Object} res HTTP response Object
	 * @param  {Object} req HTTP request Object
	 * @return {Undefined}  undefined
	 */
	wrapper = function ( res, req ) {
		var url    = origin + req.url.replace( new RegExp( "^" + route ), "" ),
		    timer  = new Date(),
		    method = req.method.toLowerCase(),
		    fn, payload;

		if ( method === "delete" ) method = "del";

		// Facade to handle()
		fn = function ( arg, xhr ) {
			handle( arg, xhr, res, req, timer );
		};

		// Setting listeners if expecting a body
		if ( REGEX_BODY.test( req.method ) ) {
			req.setEncoding( "utf-8" );

			req.on( "data", function ( data ) {
				payload = payload === undefined ? data : payload + data;
			});

			req.on( "end", function () {
				url[method]( fn, fn, payload, req.headers );
			});
		}
		else url[method]( fn, fn );
	};

	// Setting route
	verbs.each( function ( i ) {
		self[REGEX_DEL.test( i ) ? "delete" : i]( route, wrapper, host );
		self[REGEX_DEL.test( i ) ? "delete" : i]( route + "/.*", wrapper, host );

		dtp.fire( "proxy-set", function ( p ) {
			return [host || "*", REGEX_DEL.test( i ) ? "delete" : i, origin, route, diff( timer )];
		});
	});

	return this;
};
