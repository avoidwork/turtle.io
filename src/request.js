/**
 * Request handler which provides RESTful CRUD operations
 *
 * @method request
 * @public
 * @param  {Object} req HTTP(S) request Object
 * @param  {Object} res HTTP(S) response Object
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.request = function ( req, res ) {
	var self    = this,
		timer   = precise().start(),
	    method  = req.method,
	    handled = false,
	    host    = req.vhost,
	    count, path, nth, root;

	// If an expectation can't be met, don't try!
	if ( req.headers.expect ) {
		timer.stop();

		this.dtp.fire( "request", function () {
			return [req.parsed.href, timer.diff()];
		});

		return this.error( req, res, this.codes.EXPECTATION_FAILED );
	}

	// Preparing file path
	root = this.config.root + "/" + this.config.vhosts[host];
	path = ( root + req.parsed.pathname ).replace( REGEX_DIR, "" );

	// Determining if the request is valid
	fs.lstat( path, function ( e, stats ) {
		if ( e ) {
			self.error( req, res, self.codes.NOT_FOUND );
		}
		else if ( !stats.isDirectory() ) {
			self.handle( req, res, path, req.parsed.href, false, stats );
		}
		else if ( REGEX_GET.test( method ) && !REGEX_DIR.test( req.parsed.pathname ) ) {
			self.respond( req, res, self.messages.NO_CONTENT, self.codes.REDIRECT, {"Location": ( req.parsed.pathname != "/" ? req.parsed.pathname : "" ) + "/" + req.parsed.search} );
		}
		else if ( !REGEX_GET.test( method ) ) {
			self.handle( req, res, path, req.parsed.href, true );
		}
		else {
			count = 0;
			nth   = self.config.index.length;
			path += "/";

			array.each( self.config.index, function ( i ) {
				fs.lstat( path + i, function ( e, stats ) {
					if ( !e && !handled ) {
						handled = true;
						self.handle( req, res, path + i, ( req.parsed.pathname != "/" ? req.parsed.pathname : "" ) + "/" + i + req.parsed.search, false, stats );
					}
					else if ( ++count === nth && !handled ) {
						self.error( req, res, self.codes.NOT_FOUND );
					}
				} );
			} );
		}

		timer.stop();

		self.dtp.fire( "request", function () {
			return [req.parsed.href, timer.diff()];
		});
	} );

	return this;
};
