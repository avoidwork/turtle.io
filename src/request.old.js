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
	    parsed  = $.parse( this.url( req ) ),
	    host    = parsed.hostname,
	    method  = req.method,
	    handled = false,
	    found   = false,
	    count, handle, path, nth, root;

	/**
	 * Handles the request after determining the path
	 *
	 * @method handle
	 * @private
	 * @param  {String}  path  File path
	 * @param  {String}  url   Requested URL
	 * @param  {Boolean} dir   `true` is `path` is a directory
	 * @param  {Object}  stat  [Optional] fs.lstat Object
	 * @param  {Object}  timer Date instance
	 * @return {Undefined}     undefined
	 */
	handle = function ( path, url, dir, stats, timer ) {
		var allow = self.allows( parsed.pathname, host ),
		    write = allow.indexOf( dir ? "POST" : "PUT" ) > -1, //self.allowed( dir ? "POST" : "PUT", parsed.pathname, host ),
		    del   = allow.indexOf( "DELETE" ) > -1, //self.allowed( "DELETE", req.url, host ),
		    cached, etag, get, headers, mimetype, modified, size;

		/**
		 * GET handler
		 *
		 * @method get
		 * @private
		 * @param  {Object} stat fs.lstat Object
		 * @return {Undefined}   undefined
		 */
		get = function ( stat ) {
			mimetype = mime.lookup( path );
			cached   = self.registry.cache[url];
			size     = stat.size;
			modified = stat.mtime.toUTCString();
			etag     = "\"" + self.etag( url, size, stat.mtime ) + "\"";
			headers  = {Allow: allow, "Content-Length": size, "Content-Type": mimetype, Etag: etag, "Last-Modified": modified};

			if ( method === "GET" ) {
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
		};

		if ( self.config.probes ) {
			dtp.fire( "request", function () {
				return [url, allow, diff( timer )];
			});
		}

		// File request
		if ( !dir ) {
			if ( REGEX_GET.test( method ) ) {
				if ( stats ) {
					get( stats );
				}
				else {
					fs.lstat( path, function ( e, stats ) {
						if ( e ) {
							self.error( req, req, e, timer );
						}
						else {
							get( stats );
						}
					});
				}
			}
			else if ( method === "DELETE" && del ) {
				self.stale( self.url( req ) );

				fs.unlink( path, function ( e ) {
					if ( e ) {
						self.error( req, req, e, timer );
					}
					else {
						self.respond( req, res, messages.NO_CONTENT, codes.NO_CONTENT, {}, timer, false );
					}
				});
			}
			else if ( method === "PUT" && write ) {
				self.write( path, req, res, timer );
			}
			else {
				self.error( req, req, undefined, timer );
			}
		}
		// Directory request
		else {
			if ( ( method === "POST" || method === "PUT" ) && write ) {
				self.write( path, req, res, timer );
			}
			else if ( method === "DELETE" && del ) {
				self.stale( self.url( req ) );

				fs.unlink( path, function ( e ) {
					if ( e ) {
						self.error( req, req, e, timer );
					}
					else {
						self.respond( req, res, messages.NO_CONTENT, codes.NO_CONTENT, {}, timer, false );
					}
				});
			}
			else {
				self.error( req, req, undefined, timer );
			}
		}
	};

	// Most likely this request will fail due to latency, so handle it as a 503 and 'retry after a minute'
	if ( toobusy() ) {
		if ( this.config.probes ) {
			dtp.fire( "busy", function () {
				return [parsed.host, method, req.url, self.server.connections, diff( timer )];
			});
		}

		return this.respond( req, res, this.page( codes.SERVICE_UNAVAILABLE, host ), codes.SERVICE_UNAVAILABLE, {"Retry-After": 60}, timer, false );
	}

	// Can't find the hostname in vhosts, try the default (if set) or send a 500
	if ( ! ( host in this.config.vhosts ) ) {
		this.config.vhostsList.each( function ( i, idx ) {
			if ( self.config.vhostsRegExp[idx].test( host ) ) {
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
				this.error( req, res, messages.SERVER_ERROR );
			}
		}
	}

	// Preparing file path
	root = this.config.root + "/" + this.config.vhosts[host];
	path = ( root + parsed.pathname ).replace( REGEX_DIR, "" );

	// Determining if the request is valid
	fs.lstat( path, function ( e, stats ) {
		if ( e ) {
			self.error( req, res, e );
		}
		else if ( !stats.isDirectory() ) {
			handle( path, parsed.href, false, stats, timer );
		}
		else if ( stats.isDirectory() && !REGEX_GET.test( method ) ) {
			handle( path, parsed.href, true, undefined, timer );
		}
		else {
			count = 0;
			nth   = self.config.indexes;
			path += "/";

			self.config.index.each( function ( i ) {
				fs.exists( path + i, function ( exists ) {
					if ( !handled ) {
						if ( exists ) {
							handled = true;
							handle( path + i, parsed.href + i, false, undefined, timer );
						}
						else if ( ++count === nth ) {
							self.error( req, res, messages.NOT_FOUND );
						}
					}
				});
			});
		}
	});

	return this;
};
