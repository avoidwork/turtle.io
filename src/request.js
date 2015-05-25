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
		deferred = defer(),
		method = req.method,
		handled = false,
		host = req.vhost,
		pathname = req.parsed.pathname.replace( regex.root, "" ),
		count, lpath, nth, root;

	let end = () => {
		timer.stop();
		this.signal( "request", function () {
			return [ req.parsed.href, timer.diff() ];
		} );
	};

	// If an expectation can't be met, don't try!
	if ( req.headers.expect ) {
		end();
		deferred.reject( new Error( CODES.EXPECTATION_FAILED ) );
	}

	// Preparing file path
	root = path.join( this.config.root, this.config.vhosts[ host ] );
	lpath = path.join( root, req.parsed.pathname.replace( regex.dir, "" ) );

	// Determining if the request is valid
	fs.lstat( lpath, ( e, stats ) => {
		if ( e ) {
			end();
			deferred.reject( new Error( CODES.NOT_FOUND ) );
		} else if ( !stats.isDirectory() ) {
			end();
			this.handle( req, res, lpath, req.parsed.href, false, stats ).then( function ( arg ) {
				deferred.resolve( arg );
			}, function ( e ) {
				deferred.reject( e );
			} );
		} else if ( regex.get.test( method ) && !regex.dir.test( req.parsed.pathname ) ) {
			end();
			this.respond( req, res, MESSAGES.NO_CONTENT, CODES.REDIRECT, { "Location": ( req.parsed.pathname != "/" ? req.parsed.pathname : "" ) + "/" + req.parsed.search } ).then( function ( arg ) {
				deferred.resolve( arg );
			}, function ( e ) {
				deferred.reject( e );
			} );
		}
		else if ( !regex.get.test( method ) ) {
			end();
			this.handle( req, res, lpath, req.parsed.href, true ).then( function ( arg ) {
				deferred.resolve( arg );
			}, function ( e ) {
				deferred.reject( e );
			} );
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
						this.handle( req, res, npath, ( req.parsed.pathname != "/" ? req.parsed.pathname : "" ) + "/" + i + req.parsed.search, false, stats ).then( function ( arg ) {
							deferred.resolve( arg );
						}, function ( e ) {
							deferred.reject( e );
						} );
					}
					else if ( ++count === nth && !handled ) {
						end();
						deferred.reject( new Error( CODES.NOT_FOUND ) );
					}
				} );
			} );
		}
	} );

	return deferred.promise;
}
