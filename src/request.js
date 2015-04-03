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
	let timer = precise().start(),
		method = req.method,
		handled = false,
		host = req.vhost,
		pathname = req.parsed.pathname.replace( regex.root, "" ),
		invalid = ( pathname.replace( regex.dir, "" ).split( "/" ).filter( ( i ) => {
				return i != ".";
			} )[ 0 ] || "" ) == "..",
		out_dir = !invalid ? ( pathname.match( /\.{2}\//g ) || [] ).length : 0,
		in_dir = !invalid ? ( pathname.match( /\w+?(\.\w+|\/)+/g ) || [] ).length : 0,
		count, lpath, nth, root;

	let end = () => {
		timer.stop();
		this.signal( "request", () => {
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
	root = path.join( this.config.root, this.config.vhosts[ host ] );
	lpath = path.join( root, req.parsed.pathname.replace( regex.dir, "" ) );

	// Determining if the request is valid
	fs.lstat( lpath, ( e, stats ) => {
		if ( e ) {
			end();
			this.error( req, res, CODES.NOT_FOUND );
		}
		else if ( !stats.isDirectory() ) {
			end();
			this.handle( req, res, lpath, req.parsed.href, false, stats );
		}
		else if ( regex.get.test( method ) && !regex.dir.test( req.parsed.pathname ) ) {
			end();
			this.respond( req, res, MESSAGES.NO_CONTENT, CODES.REDIRECT, { "Location": ( req.parsed.pathname != "/" ? req.parsed.pathname : "" ) + "/" + req.parsed.search } );
		}
		else if ( !regex.get.test( method ) ) {
			end();
			this.handle( req, res, lpath, req.parsed.href, true );
		}
		else {
			count = 0;
			nth = this.config.index.length;

			array.each( this.config.index, ( i ) => {
				let npath = path.join( lpath, i );

				fs.lstat( npath, ( e, stats ) => {
					if ( !e && !handled ) {
						handled = true;
						end();
						this.handle( req, res, npath, ( req.parsed.pathname != "/" ? req.parsed.pathname : "" ) + "/" + i + req.parsed.search, false, stats );
					}
					else if ( ++count === nth && !handled ) {
						end();
						this.error( req, res, CODES.NOT_FOUND );
					}
				} );
			} );
		}
	} );

	return this;
}
