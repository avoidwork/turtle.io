/**
 * Writes files to disk
 *
 * @method write
 * @param  {String} path  File path
 * @param  {Object} req   HTTP request Object
 * @param  {Object} res   HTTP response Object
 * @param  {Object} timer Date instance
 * @return {Object}       Instance
 */
factory.prototype.write = function ( path, req, res, timer ) {
	var self  = this,
	    put   = ( req.method === "PUT" ),
	    body  = req.body,
	    allow = this.allows( req.url ),
	    del   = this.allowed( "DELETE", req.url ),
	    url   = this.url( req ),
	    status;

	// Updating LRU position
	self.registry.get( url );

	if ( !put && $.regex.endslash.test( req.url ) ) {
		status = del ? codes.CONFLICT : codes.SERVER_ERROR;
		this.respond( req, res, self.page( status, self.hostname( req ) ), status, {Allow: allow}, timer, false );
	}
	else {
		allow = allow.explode().remove( "POST" ).join(", ");

		fs.stat( path, function ( e, stat ) {
			if ( e ) {
				self.error( req, res, e, timer );
			}
			else {
				var etag = "\"" + self.etag( url, stat.size, stat.mtime ) + "\"";

				if ( !req.headers.hasOwnProperty( "etag" ) || req.headers.etag === etag ) {
					fs.writeFile( path, body, function ( e ) {
						if ( e ) {
							self.error( req, req, e, timer );
						}
						else {
							fs.stat( path, function ( e, stat ) {
								if ( e ) {
									self.error( req, res, e, timer );
								}
								else {
									self.register( url, {etag: self.etag( url, stat.size, stat.mtime ), mimetype: mime.lookup( path )}, true );

									dtp.fire( "write", function () {
										return [req.headers.host, req.url, req.method, path, diff( timer )];
									});

									status = put ? codes.NO_CONTENT : codes.CREATED;
									self.respond( req, res, self.page( status, self.hostname( req ) ), status, {Allow: allow}, timer, false );
								}
							});
						}
					});
				}
				else if ( req.headers.etag !== etag ) {
					self.respond( req, res, messages.NO_CONTENT, codes.FAILED, {}, timer, false );
				}
			}
		});
	}

	return this;
};
