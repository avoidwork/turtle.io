/**
 * Writes files to disk
 *
 * @method write
 * @param  {String} path  File path
 * @param  {Object} req   HTTP request Object
 * @param  {Object} res   HTTP response Object
 * @return {Object}       TurtleIO instance
 */
TurtleIO.prototype.write = function ( path, req, res ) {
	var self  = this,
	    put   = ( req.method === "PUT" ),
	    body  = req.body,
	    allow = this.allows( req.url ),
	    del   = this.allowed( "DELETE", req.url ),
	    url   = this.url( req ),
	    status;

	if ( !put && $.regex.endslash.test( req.url ) ) {
		status = del ? this.codes.CONFLICT : this.codes.SERVER_ERROR;
		this.respond( req, res, this.page( status, this.hostname( req ) ), status, {Allow: allow}, false );
	}
	else {
		allow = allow.explode().remove( "POST" ).join( ", " );

		fs.lstat( path, function ( e, stat ) {
			if ( e ) {
				self.error( req, res, self.codes.NOT_FOUND );
			}
			else {
				var etag = "\"" + self.etag( url, stat.size, stat.mtime ) + "\"";

				if ( !req.headers.hasOwnProperty( "etag" ) || req.headers.etag === etag ) {
					fs.writeFile( path, body, function ( e ) {
						if ( e ) {
							self.error( req, req, self.codes.SERVER_ERROR );
						}
						else {
							status = put ? self.codes.NO_CONTENT : self.codes.CREATED;
							self.respond( req, res, self.page( status, self.hostname( req ) ), status, {Allow: allow}, false );
						}
					} );
				}
				else if ( req.headers.etag !== etag ) {
					self.respond( req, res, self.messages.NO_CONTENT, self.codes.FAILED, {}, false );
				}
			}
		} );
	}

	return this;
};
