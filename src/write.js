/**
 * Writes files to disk
 *
 * @method write
 * @param  {Object} req  HTTP request Object
 * @param  {Object} res  HTTP response Object
 * @param  {String} path File path
 * @return {Object}      TurtleIO instance
 */
write ( req, res, path ) {
	let self = this,
		timer = precise().start(),
		put = ( req.method === "PUT" ),
		body = req.body,
		allow = req.allow,
		del = this.allowed( "DELETE", req.parsed.pathname, req.vhost ),
		status;

	if ( !put && regex.end_slash.test( req.url ) ) {
		status = del ? CODES.CONFLICT : CODES.SERVER_ERROR;

		timer.stop();

		this.signal( "write", () => {
			return [ req.headers.host, req.url, req.method, path, timer.diff() ];
		} );

		this.respond( req, res, this.page( status, this.hostname( req ) ), status, { allow: allow }, false );
	}
	else {
		allow = array.remove( string.explode( allow ), "POST" ).join( ", " );

		fs.lstat( path, ( e, stat ) => {
			if ( e ) {
				self.error( req, res, CODES.NOT_FOUND );
			}
			else {
				let etag = "\"" + self.etag( req.parsed.href, stat.size, stat.mtime ) + "\"";

				if ( !req.headers.hasOwnProperty( "etag" ) || req.headers.etag === etag ) {
					fs.writeFile( path, body, ( e ) => {
						if ( e ) {
							self.error( req, req, CODES.SERVER_ERROR );
						}
						else {
							status = put ? CODES.NO_CONTENT : CODES.CREATED;
							self.respond( req, res, self.page( status, self.hostname( req ) ), status, { allow: allow }, false );
						}
					} );
				}
				else if ( req.headers.etag !== etag ) {
					self.respond( req, res, MESSAGES.NO_CONTENT, CODES.FAILED, {}, false );
				}
			}
		} );

		timer.stop();

		this.signal( "write", () => {
			return [ req.headers.host, req.url, req.method, path, timer.diff() ];
		} );
	}

	return this;
}
}
