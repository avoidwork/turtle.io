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
handle ( req, res, path, url, dir, stat ) {
	let self = this,
		allow, del, etag, headers, method, mimetype, modified, size, write;

	allow = req.allow;
	write = allow.indexOf( dir ? "POST" : "PUT" ) > -1;
	del = allow.indexOf( "DELETE" ) > -1;
	method = req.method;

	// File request
	if ( !dir ) {
		if ( REGEX.get.test( method ) ) {
			mimetype = mime.lookup( path );
			size = stat.size;
			modified = stat.mtime.toUTCString();
			etag = "\"" + this.etag( url, size, stat.mtime ) + "\"";
			headers = {
				allow: allow,
				"content-length": size,
				"content-type": mimetype,
				etag: etag,
				"last-modified": modified
			};

			if ( method === "GET" ) {
				// Decorating path for watcher
				req.path = path;

				// Client has current version
				if ( ( req.headers[ "if-none-match" ] === etag ) || ( !req.headers[ "if-none-match" ] && Date.parse( req.headers[ "if-modified-since" ] ) >= stat.mtime ) ) {
					this.respond( req, res, MESSAGES.NO_CONTENT, CODES.NOT_MODIFIED, headers, true );
				}
				// Sending current version
				else {
					this.respond( req, res, path, CODES.SUCCESS, headers, true );
				}
			}
			else {
				this.respond( req, res, MESSAGES.NO_CONTENT, CODES.SUCCESS, headers, true );
			}
		}
		else if ( method === "DELETE" && del ) {
			this.unregister( this.url( req ) );

			fs.unlink( path, ( e ) => {
				if ( e ) {
					self.error( req, req, CODES.SERVER_ERROR );
				}
				else {
					self.respond( req, res, MESSAGES.NO_CONTENT, CODES.NO_CONTENT, {} );
				}
			} );
		}
		else if ( method === "PUT" && write ) {
			this.write( req, res, path );
		}
		else {
			this.error( req, req, CODES.SERVER_ERROR );
		}
	}
	// Directory request
	else {
		if ( ( method === "POST" || method === "PUT" ) && write ) {
			this.write( req, res, path );
		}
		else if ( method === "DELETE" && del ) {
			this.unregister( req.parsed.href );

			fs.unlink( path, ( e ) => {
				if ( e ) {
					self.error( req, req, CODES.SERVER_ERROR );
				}
				else {
					self.respond( req, res, MESSAGES.NO_CONTENT, CODES.NO_CONTENT, {} );
				}
			} );
		}
		else {
			this.error( req, req, CODES.NOT_ALLOWED );
		}
	}

	return this;
}
