/**
 * Writes files to disk
 *
 * @method write
 * @param  {Object} req  HTTP request Object
 * @param  {Object} res  HTTP response Object
 * @param  {String} path File path
 * @return {Object}      TurtleIO instance
 */
TurtleIO.prototype.write = function ( req, res, path ) {
	var self  = this,
	    timer = precise().start(),
	    put   = ( req.method === "PUT" ),
	    body  = req.body,
	    allow = req.allows || this.allows( req.parsed.pathname, req.vhost ),
	    del   = this.allowed( "DELETE", req.parsed.pathname, req.vhost ),
	    status;

	if ( !put && REGEX_ENDSLSH.test( req.url ) ) {
		status = del ? this.codes.CONFLICT : this.codes.SERVER_ERROR;

		timer.stop();

		this.dtp.fire( "write", function () {
			return [req.headers.host, req.url, req.method, path, timer.diff()];
		});

		this.respond( req, res, this.page( status, this.hostname( req ) ), status, {allow: allow}, false );
	}
	else {
		allow = array.remove( string.explode( allow ), "POST" ).join( ", " );

		fs.lstat( path, function ( e, stat ) {
			if ( e ) {
				self.error( req, res, self.codes.NOT_FOUND );
			}
			else {
				var etag = "\"" + self.etag( req.parsed.href, stat.size, stat.mtime ) + "\"";

				if ( !req.headers.hasOwnProperty( "etag" ) || req.headers.etag === etag ) {
					fs.writeFile( path, body, function ( e ) {
						if ( e ) {
							self.error( req, req, self.codes.SERVER_ERROR );
						}
						else {
							status = put ? self.codes.NO_CONTENT : self.codes.CREATED;
							self.respond( req, res, self.page( status, self.hostname( req ) ), status, {allow: allow}, false );
						}
					} );
				}
				else if ( req.headers.etag !== etag ) {
					self.respond( req, res, self.messages.NO_CONTENT, self.codes.FAILED, {}, false );
				}
			}
		} );

		timer.stop();

		this.dtp.fire( "write", function () {
			return [req.headers.host, req.url, req.method, path, timer.diff()];
		});
	}

	return this;
};
