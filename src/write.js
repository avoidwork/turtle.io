/**
 * Writes files to disk
 *
 * @method write
 * @param  {String} path  File path
 * @param  {Object} res   HTTP response Object
 * @param  {Object} req   HTTP request Object
 * @param  {Object} timer Date instance
 * @return {Object}       Instance
 */
factory.prototype.write = function ( path, res, req, timer ) {
	var self  = this,
	    put   = ( req.method === "PUT" ),
	    body  = req.body,
	    allow = this.allows( req.url ),
	    del   = this.allowed( "DELETE", req.url ),
	    status;

	if ( !put && /\/$/.test( req.url ) ) {
		status = del ? codes.CONFLICT : codes.ERROR_APPLICATION;
		this.respond( res, req, self.page( status, self.hostname( req ) ), status, {Allow: allow}, timer, false );
	}
	else {
		allow = allow.explode().remove( "POST" ).join(", ");

		fs.readFile( path, function ( e, data ) {
			var hash = "\"" + self.hash( data ) + "\"";

			if ( e ) {
				self.error( res, req, e, timer );
			}
			else {
				if ( !req.headers.hasOwnProperty( "etag" ) || req.headers.etag === hash ) {
					fs.writeFile( path, body, function ( e ) {
						if ( e ) {
							self.error( req, req, e, timer );
						}
						else {
							dtp.fire( "write", function () {
								return [req.headers.host, req.url, req.method, path, diff( timer )];
							});

							status = put ? codes.NO_CONTENT : codes.CREATED;
							self.respond( res, req, self.page( status, self.hostname( req ) ), status, {Allow: allow, Etag: hash}, timer, false );
						}
					});
				}
				else if ( req.headers.etag !== hash ) {
					self.respond( res, req, messages.NO_CONTENT, codes.FAILED, {}, timer, false );
				}
			}
		});
	}

	return this;
};
