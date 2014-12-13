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
	    in_dir  = 0,
	    out_dir = 0,
	    invalid = false,
	    count, path, nth, root;

	function end () {
		timer.stop();

		self.signal( "request", function () {
			return [req.parsed.href, timer.diff()];
		});
	}

	// If an expectation can't be met, don't try!
	if ( req.headers.expect ) {
		end();
		return this.error( req, res, this.codes.EXPECTATION_FAILED );
	}

	// Are we still in the virtual host root?
	array.each( req.parsed.pathname.replace( REGEX_ROOT, "" ).replace( REGEX_DIR, "" ).split( "/" ).filter( function ( i ) {
		return i != ".";
	} ), function ( i, idx ) {
		if ( i == ".." ) {
			if ( idx === 0 ) {
				invalid = true;
				return false;
			}
			out_dir++;
		}
		else {
			in_dir++;
		}
	} );

	if ( invalid || out_dir >= REGEX_DIR.test( req.parsed.pathname ) ? in_dir : ( in_dir - 1 ) ) {
		end();
		return this.error( req, res, this.codes.NOT_FOUND );
	}

	// Preparing file path
	root = this.config.root + "/" + this.config.vhosts[host];
	path = ( root + req.parsed.pathname ).replace( REGEX_DIR, "" );

	// Determining if the request is valid
	fs.lstat( path, function ( e, stats ) {
		if ( e ) {
			end();
			self.error( req, res, self.codes.NOT_FOUND );
		}
		else if ( !stats.isDirectory() ) {
			end();
			self.handle( req, res, path, req.parsed.href, false, stats );
		}
		else if ( REGEX_GET.test( method ) && !REGEX_DIR.test( req.parsed.pathname ) ) {
			end();
			self.respond( req, res, self.messages.NO_CONTENT, self.codes.REDIRECT, {"Location": ( req.parsed.pathname != "/" ? req.parsed.pathname : "" ) + "/" + req.parsed.search} );
		}
		else if ( !REGEX_GET.test( method ) ) {
			end();
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
						end();
						self.handle( req, res, path + i, ( req.parsed.pathname != "/" ? req.parsed.pathname : "" ) + "/" + i + req.parsed.search, false, stats );
					}
					else if ( ++count === nth && !handled ) {
						end();
						self.error( req, res, self.codes.NOT_FOUND );
					}
				} );
			} );
		}
	} );

	return this;
};
