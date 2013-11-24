/**
 * Handles the request
 *
 * @method handle
 * @param  {Object}  req   HTTP(S) request Object
 * @param  {Object}  res   HTTP(S) response Object
 * @param  {String}  path  File path
 * @param  {String}  url   Requested URL
 * @param  {Boolean} dir   `true` is `path` is a directory
 * @param  {Object}  stat  fs.Stat Object
 * @return {Object}        TurtleIO instance
 */
TurtleIO.prototype.handle = function ( req, res, path, url, dir, stat ) {
	var self   = this,
	    parsed = $.parse( url ),
	    allow  = this.allows( parsed.pathname, parsed.hostname ),
	    write  = allow.indexOf( dir ? "POST" : "PUT" ) > -1,
	    del    = allow.indexOf( "DELETE" ) > -1,
	    method = req.method,
	    cached, etag, headers, mimetype, modified, size;

	// File request
	if ( !dir ) {
		if ( REGEX_GET.test( method ) ) {
			mimetype = mime.lookup( path );
			cached   = this.etags.cache[url];
			size     = stat.size;
			modified = stat.mtime.toUTCString();
			etag     = "\"" + this.etag( url, size, stat.mtime ) + "\"";
			headers  = {Allow: allow, "Content-Length": size, "Content-Type": mimetype, Etag: etag, "Last-Modified": modified};

			if ( method === "GET" ) {
				// Decorating path for watcher
				req.path = path;

				// Client has current version
				if ( ( req.headers["if-none-match"] === etag ) || ( !req.headers["if-none-match"] && Date.parse( req.headers["if-modified-since"] ) >= stat.mtime ) ) {
					this.respond( req, res, this.messages.NO_CONTENT, this.codes.NOT_MODIFIED, headers );
				}
				// Sending current version
				else {
					this.respond( req, res, path, this.codes.SUCCESS, headers, true );
				}
			}
			else {
				this.respond( req, res, this.messages.NO_CONTENT, this.codes.SUCCESS, headers );
			}
		}
		else if ( method === "DELETE" && del ) {
			this.stale( this.url( req ) );

			fs.unlink( path, function ( e ) {
				if ( e ) {
					self.error( req, req, self.codes.SERVER_ERROR );
				}
				else {
					self.respond( req, res, self.messages.NO_CONTENT, self.codes.NO_CONTENT, {} );
				}
			} );
		}
		else if ( method === "PUT" && write ) {
			this.write( path, req, res );
		}
		else {
			this.error( req, req, this.codes.SERVER_ERROR );
		}
	}
	// Directory request
	else {
		if ( ( method === "POST" || method === "PUT" ) && write ) {
			this.write( path, req, res );
		}
		else if ( method === "DELETE" && del ) {
			this.stale( this.url( req ) );

			fs.unlink( path, function ( e ) {
				if ( e ) {
					self.error( req, req, self.codes.SERVER_ERROR );
				}
				else {
					self.respond( req, res, self.messages.NO_CONTENT, self.codes.NO_CONTENT, {} );
				}
			} );
		}
		else {
			this.error( req, req, this.codes.NOT_ALLOWED );
		}
	}

	return this;
};
