/**
 * Handles the request after determining the path
 *
 * @method handle
 * @private
 * @param  {String}  path  File path
 * @param  {String}  url   Requested URL
 * @param  {Boolean} dir   `true` is `path` is a directory
 * @param  {Object}  stat  fs.Stat Object
 * @return {Undefined}     undefined
 */
TurtleIO.prototype.handle = function ( req, res, path, url, dir, stat ) {
	var allow = self.allows( parsed.pathname, host ),
	    write = allow.indexOf( dir ? "POST" : "PUT" ) > -1,
	    del   = allow.indexOf( "DELETE" ) > -1,
	    cached, etag, get, headers, mimetype, modified, size;

	// File request
	if ( !dir ) {
		if ( REGEX_GET.test( method ) ) {
			mimetype = mime.lookup( path );
			cached   = self.etags.cache[url];
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
			self.write( path, req, res );
		}
		else if ( method === "DELETE" && del ) {
			self.stale( self.url( req ) );

			fs.unlink( path, function ( e ) {
				if ( e ) {
					self.error( req, req );
				}
				else {
					self.respond( req, res, messages.NO_CONTENT, codes.NO_CONTENT, {}, false );
				}
			});
		}
		else {
			self.error( req, req );
		}
	}
};
