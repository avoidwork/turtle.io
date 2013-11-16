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
	var put   = ( req.method === "PUT" ),
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
				this.error( req, res, this.codes.NOT_FOUND );
			}
			else {
				var etag = "\"" + this.etag( url, stat.size, stat.mtime ) + "\"";

				if ( !req.headers.hasOwnProperty( "etag" ) || req.headers.etag === etag ) {
					fs.writeFile( path, body, function ( e ) {
						if ( e ) {
							this.error( req, req, this.codes.SERVER_ERROR );
						}
						else {
							status = put ? this.codes.NO_CONTENT : this.codes.CREATED;
							this.respond( req, res, this.page( status, this.hostname( req ) ), status, {Allow: allow}, false );
						}
					}.bind( this ) );
				}
				else if ( req.headers.etag !== etag ) {
					this.respond( req, res, this.messages.NO_CONTENT, this.codes.FAILED, {}, false );
				}
			}
		}.bind( this ) );
	}

	return this;
};
