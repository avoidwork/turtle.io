/**
 * Request handler which provides RESTful CRUD operations
 *
 * @method request
 * @public
 * @param  {Object} req HTTP(S) request Object
 * @param  {Object} res HTTP(S) response Object
 * @return {Object}     TurtleIO instance
 */
request ( req, res ) {
	let self = this,
		timer = precise().start(),
		method = req.method,
		handled = false,
		host = req.vhost,
		pathname = req.parsed.pathname.replace( regex.root, "" ),
		invalid = ( pathname.replace( regex.dir, "" ).split( "/" ).filter( ( i ) => {
				return i != ".";
			} )[ 0 ] || "" ) == "..",
		out_dir = !invalid ? ( pathname.match( /\.{2}\//g ) || [] ).length : 0,
		in_dir = !invalid ? ( pathname.match( /\w+?(\.\w+|\/)+/g ) || [] ).length : 0,
		count, path, nth, root;

	let end = () => {
		timer.stop();
		self.signal( "request", () => {
			return [ req.parsed.href, timer.diff() ];
		} );
	};

	// If an expectation can't be met, don't try!
	if ( req.headers.expect ) {
		end();
		return this.error( req, res, CODES.EXPECTATION_FAILED );
	}

	// Are we still in the virtual host root?
	if ( invalid || ( out_dir > 0 && out_dir >= in_dir ) ) {
		end();
		return this.error( req, res, CODES.NOT_FOUND );
	}

	// Preparing file path
	root = this.config.root + "/" + this.config.vhosts[ host ];
	path = ( root + req.parsed.pathname ).replace( regex.dir, "" );

	// Determining if the request is valid
	fs.lstat( path, ( e, stats ) => {
		if ( e ) {
			end();
			self.error( req, res, CODES.NOT_FOUND );
		}
		else if ( !stats.isDirectory() ) {
			end();
			self.handle( req, res, path, req.parsed.href, false, stats );
		}
		else if ( regex.get.test( method ) && !regex.dir.test( req.parsed.pathname ) ) {
			end();
			self.respond( req, res, MESSAGES.NO_CONTENT, CODES.REDIRECT, { "Location": ( req.parsed.pathname != "/" ? req.parsed.pathname : "" ) + "/" + req.parsed.search } );
		}
		else if ( !regex.get.test( method ) ) {
			end();
			self.handle( req, res, path, req.parsed.href, true );
		}
		else {
			count = 0;
			nth = self.config.index.length;
			path += "/";

			array.iterate( self.config.index, ( i ) => {
				fs.lstat( path + i, ( e, stats ) => {
					if ( !e && !handled ) {
						handled = true;
						end();
						self.handle( req, res, path + i, ( req.parsed.pathname != "/" ? req.parsed.pathname : "" ) + "/" + i + req.parsed.search, false, stats );
					}
					else if ( ++count === nth && !handled ) {
						end();
						self.error( req, res, CODES.NOT_FOUND );
					}
				} );
			} );
		}
	} );

	return this;
}
