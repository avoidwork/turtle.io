/**
 * Writes files to disk
 *
 * @method write
 * @param  {Object} req  HTTP request Object
 * @param  {Object} res  HTTP response Object
 * @param  {String} path File path
 * @return {Object}      Promise
 */
write ( req, res, path ) {
	let timer = precise().start(),
		deferred = defer(),
		put = regex.put.test( req.method ),
		body = req.body,
		allow = req.allow,
		del = this.allowed( "DELETE", req.parsed.pathname, req.vhost ),
		status;

	if ( !put && regex.end_slash.test( req.url ) ) {
		status = del ? CODES.CONFLICT : CODES.SERVER_ERROR;
		timer.stop();

		this.signal( "write", function () {
			return [ req.vhost, req.url, req.method, path, timer.diff() ];
		} );

		deferred.resolve( this.respond( req, res, this.page( status, this.hostname( req ) ), status, { allow: allow }, false ) );
	} else {
		allow = array.remove( string.explode( allow ), "POST" ).join( ", " );

		fs.lstat( path, ( e, stat ) => {
			let etag;

			if ( e ) {
				deferred.reject( new Error( CODES.NOT_FOUND ) );
			} else {
				etag = "\"" + this.etag( req.parsed.href, stat.size, stat.mtime ) + "\"";

				if ( !req.headers.hasOwnProperty( "etag" ) || req.headers.etag === etag ) {
					fs.writeFile( path, body, e => {
						if ( e ) {
							deferred.reject( new Error( CODES.SERVER_ERROR ) );
						} else {
							status = put ? CODES.NO_CONTENT : CODES.CREATED;
							deferred.resolve( this.respond( req, res, this.page( status, this.hostname( req ) ), status, { allow: allow }, false ) );
						}
					} );
				} else if ( req.headers.etag !== etag ) {
					deferred.resolve( this.respond( req, res, MESSAGES.NO_CONTENT, CODES.FAILED, {}, false ) );
				}
			}
		} );

		timer.stop();
		this.signal( "write", function () {
			return [ req.vhost, req.url, req.method, path, timer.diff() ];
		} );
	}

	return deferred.promise;
}
