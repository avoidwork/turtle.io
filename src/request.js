/**
 * Request handler which provides RESTful CRUD operations
 *
 * Default route is for GET only
 *
 * @param  {Object} res   HTTP(S) response Object
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} timer Date instance
 * @return {Object}       Instance
 */
factory.prototype.request = function ( res, req, timer ) {
	var self    = this,
	    host    = this.hostname( req ),
	    parsed  = $.parse( this.url( req ) ),
	    method  = REGEX_GET.test( req.method ) ? "get" : req.method.toLowerCase(),
	    handled = false,
	    found   = false,
	    count, handle, nth, root;

	// Most likely this request will fail due to latency, so handle it as a 503 and 'retry after a minute'
	if ( toobusy() ) {
		dtp.fire( "busy", function () {
			return [req.headers.host, req.method, req.url, self.server.connections, diff( timer )];
		});

		return this.respond( res, req, this.page( codes.ERROR_SERVICE, host ), codes.ERROR_SERVICE, {"Retry-After": 60}, timer, false );
	}

	// Can't find the hostname in vhosts, try the default (if set) or send a 500
	if ( !this.config.vhosts.hasOwnProperty( host ) ) {
		$.array.cast( this.config.vhosts, true ).each(function ( i ) {
			var regex = new RegExp( i.replace(/^\*/, ".*" ) );

			if ( regex.test( host ) ) {
				found = true;
				host  = i;
				return false;
			}
		});

		if ( !found ) {
			if ( this.config["default"] !== null ) {
				host = this.config["default"];
			}
			else {
				throw new Error( messages.ERROR_APPLICATION );
			}
		}
	}

	root = this.config.root + "/" + this.config.vhosts[host];

	if (!parsed.hasOwnProperty( "host") ) {
		parsed.host = req.headers.host;
	}

	if (!parsed.hasOwnProperty( "protocol") ) {
		parsed.protocol = "http:";
	}

	// Handles the request after determining the path
	handle = function ( path, url, timer ) {
		var allow, del, post, mimetype, status;

		allow   = self.allows( req.url, host );
		del     = self.allowed( "DELETE", req.url, host );
		post    = self.allowed( "POST", req.url, host );
		handled = true;
		url     = parsed.href;

		dtp.fire( "request", function () {
			return [url, allow, diff( timer )];
		});

		fs.exists( path, function ( exists ) {
			if ( !exists && method === "post" ) {
				if ( self.allowed( req.method, req.url, host ) ) {
					self.write( path, res, req, timer );
				}
				else {
					status = codes.NOT_ALLOWED;
					self.respond( res, req, self.page( status, host ), status, {Allow: allow}, timer, false );
				}
			}
			else if ( !exists ) {
				stats = codes.NOT_FOUND;
				self.respond( res, req, self.page( status, host ), status, ( post ? {Allow: "POST"} : {} ), timer, false );
			}
			else if ( !self.allowed( method.toUpperCase(), req.url, host ) ) {
				stats = codes.NOT_ALLOWED;
				self.respond( res, req, self.page( status, host ), status, {Allow: allow}, timer, false );
			}
			else {
				if ( !REGEX_SLASH.test( req.url ) ) {
					allow = allow.explode().remove( "POST" ).join( ", " );
				}

				switch ( method ) {
					case "delete":
						fs.unlink( path, function ( e ) {
							if ( e ) {
								self.error( req, req, e, timer );
							}
							else {
								self.respond( res, req, messages.NO_CONTENT, codes.NO_CONTENT, {}, timer, false );
							}
						});
						break;
					case "get":
					case "head":
					case "options":
						mimetype = mime.lookup( path );
						fs.stat( path, function ( e, stat ) {
							var size, modified, etag, headers;

							if ( e ) {
								self.error( res, req, e );
							}
							else {
								size     = stat.size;
								modified = stat.mtime.toUTCString();
								etag     = "\"" + self.hash( req.url + "-" + stat.size + "-" + stat.mtime ) + "\"";
								headers  = {Allow: allow, "Content-Length": size, "Content-Type": mimetype, Etag: etag, "Last-Modified": modified};

								if ( req.method === "GET" ) {
									if ( ( Date.parse( req.headers["if-modified-since"] ) >= stat.mtime ) || ( req.headers["if-none-match"] === etag ) ) {
										self.respond( res, req, messages.NO_CONTENT, codes.NOT_MODIFIED, headers, timer, false );
									}
									else {
										headers["Transfer-Encoding"] = "chunked";
										etag = etag.replace( /\"/g, "" );
										self.compressed( res, req, etag, path, codes.SUCCESS, headers, true, timer );
									}
								}
								else {
									self.respond( res, req, messages.NO_CONTENT, codes.SUCCESS, headers, timer, false );
								}
							}
						});
						break;
					case "put":
						self.write( path, res, req, timer );
						break;
					default:
						self.error( req, req, undefined, timer );
				}
			}
		});
	};

	// Determining if the request is valid
	fs.stat( root + parsed.pathname, function ( e, stats ) {
		if ( e ) {
			self.error( res, req, e );
		}
		else {
			if ( !stats.isDirectory() ) {
				handle( root + parsed.pathname, parsed.pathname );
			}
			else {
				// Adding a trailing slash for relative paths; redirect is not cached
				if ( stats.isDirectory() && !REGEX_DIR.test( parsed.pathname ) ) {
					self.respond( res, req, messages.NO_CONTENT, codes.MOVED, {"Location": parsed.pathname + "/"}, timer, false );
				}
				else {
					nth   = self.config.index.length;
					count = 0;

					self.config.index.each( function ( i ) {
						fs.exists( root + parsed.pathname + i, function ( exists ) {
							if ( exists && !handled ) {
								handle( root + parsed.pathname + i, parsed.pathname + i, timer );
							}
							else if ( !exists && ++count === nth ) {
								self.error( res, req, messages.NOT_FOUND );
							}
						});
					});
				}
			}
		}
	});

	return this;
};
