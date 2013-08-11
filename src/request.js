/**
 * Request handler which provides RESTful CRUD operations
 *
 * @method request
 * @public
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} res   HTTP(S) response Object
 * @param  {Object} timer Date instance
 * @return {Object}       Instance
 */
factory.prototype.request = function ( req, res, timer ) {
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

		return this.respond( req, res, this.page( codes.SERVICE_UNAVAILABLE, host ), codes.SERVICE_UNAVAILABLE, {"Retry-After": 60}, timer, false );
	}

	// Can't find the hostname in vhosts, try the default (if set) or send a 500
	if ( !this.config.vhosts.hasOwnProperty( host ) ) {
		$.array.cast( this.config.vhosts, true ).each(function ( i ) {
			var regex = new RegExp( i.replace( /^\*/, ".*" ) );

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
				throw new Error( messages.SERVER_ERROR );
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

	/**
	 * Handles the request after determining the path
	 *
	 * @method handle
	 * @private
	 * @param  {String} path  File path
	 * @param  {String} url   Requested URL
	 * @param  {Object} timer Date instance
	 * @return {Undefined}    undefined
	 */
	handle = function ( path, url, timer ) {
		var allow, cached, del, post, mimetype, status;

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
					self.write( path, req, res, timer );
				}
				else {
					status = codes.NOT_ALLOWED;
					self.respond( req, res, self.page( status, host ), status, {Allow: allow}, timer, false, true );
				}
			}
			else if ( !exists ) {
				status = codes.NOT_FOUND;
				self.respond( req, res, self.page( status, host ), status, ( post ? {Allow: "POST"} : {} ), timer, false, true );
			}
			else if ( !self.allowed( method.toUpperCase(), req.url, host ) ) {
				status = codes.NOT_ALLOWED;
				self.respond( req, res, self.page( status, host ), status, {Allow: allow}, timer, false, true );
			}
			else {
				if ( !REGEX_SLASH.test( req.url ) ) {
					allow = allow.explode().remove( "POST" ).join( ", " );
				}

				switch ( method ) {
					case "delete":
						self.stale( self.url( req ) );

						fs.unlink( path, function ( e ) {
							if ( e ) {
								self.error( req, req, e, timer );
							}
							else {
								self.respond( req, res, messages.NO_CONTENT, codes.NO_CONTENT, {}, timer, false );
							}
						});
						break;

					case "get":
					case "head":
					case "options":
						mimetype = mime.lookup( path );
						cached   = self.registry.cache[url];

						fs.stat( path, function ( e, stat ) {
							var size, modified, etag, headers;

							if ( e ) {
								self.error( req, res, e );
							}
							else {
								size     = stat.size;
								modified = stat.mtime.toUTCString();
								etag     = "\"" + self.etag( url, stat.size, stat.mtime ) + "\"";
								headers  = {Allow: allow, "Content-Length": size, "Content-Type": mimetype, Etag: etag, "Last-Modified": modified};

								if ( req.method === "GET" ) {
									// Creating `watcher` in master ps to update LRU
									if ( !cached ) {
										self.watch( url, path, mimetype );
									}

									// Client has current version
									if ( ( req.headers["if-none-match"] === etag ) || ( !req.headers["if-none-match"] && Date.parse( req.headers["if-modified-since"] ) >= stat.mtime ) ) {
										self.respond( req, res, messages.NO_CONTENT, codes.NOT_MODIFIED, headers, timer, false );
									}
									// Sending current version
									else {
										self.respond( req, res, path, codes.SUCCESS, headers, timer, true, true );
									}
								}
								else {
									self.respond( req, res, messages.NO_CONTENT, codes.SUCCESS, headers, timer, false );
								}
							}
						});
						break;

					case "put":
						self.write( path, req, res, timer );
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
			self.error( req, res, e );
		}
		else {
			if ( !stats.isDirectory() ) {
				handle( root + parsed.pathname, parsed.pathname );
			}
			else {
				// Adding a trailing slash for relative paths; redirect is not cached
				if ( stats.isDirectory() && !REGEX_DIR.test( parsed.pathname ) ) {
					self.respond( req, res, messages.NO_CONTENT, codes.MOVED, {"Location": parsed.pathname + "/"}, timer, false );
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
								self.error( req, res, messages.NOT_FOUND );
							}
						});
					});
				}
			}
		}
	});

	return this;
};
