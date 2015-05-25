/**
 * Runs middleware in a chain
 *
 * @method route
 * @param  {Array} args [req, res]
 * @return {Object}     Promise
 */
route ( args ) {
	let deferred = defer(),
		req = args[ 0 ],
		res = args[ 1 ],
		method = req.method.toLowerCase(),
		middleware;

	function get_arity ( arg ) {
		return arg.toString().replace( /(^.*\()|(\).*)|(\n.*)/g, "" ).split( "," ).length;
	}

	let last = ( err ) => {
		let error, status;

		if ( !err ) {
			if ( regex.get.test( method ) ) {
				deferred.resolve( args );
			} else if ( this.allowed( "get", req.parsed.pathname, req.vhost ) ) {
				deferred.reject( new Error( CODES.NOT_ALLOWED ) );
			} else {
				deferred.reject( new Error( CODES.NOT_FOUND ) );
			}
		} else {
			status = res.statusCode >= CODES.BAD_REQUEST ? res.statusCode : ( !isNaN( err.message ) ? err.message : ( CODES[ ( err.message || err ).toUpperCase() ] || CODES.SERVER_ERROR ) );
			error = new Error( status );
			error.extended = isNaN( err.message ) ? err.message : undefined;

			deferred.reject( error );
		}
	};

	let next = err => {
		let arity = 3,
			item = middleware.next();

		if ( !item.done ) {
			if ( err ) {
				// Finding the next error handling middleware
				arity = get_arity( item.value );
				do {
					arity = get_arity( item.value );
				} while ( arity < 4 && ( item = middleware.next() ) && !item.done )
			}

			if ( !item.done ) {
				if ( err ) {
					if ( arity === 4 ) {
						try {
							item.value( err, req, res, next );
						} catch ( e ) {
							next( e );
						}
					} else {
						last( err );
					}
				} else {
					try {
						item.value( req, res, next );
					} catch ( e ) {
						next( e );
					}
				}
			} else {
				last( err );
			}
		} else if ( !res._header && this.config.catchAll ) {
			last( err );
		} else if ( res._header ) {
			deferred.resolve( args );
		}
	};

	if ( regex.head.test( method ) ) {
		method = "get";
	}

	middleware = array.iterator( this.routes( req.parsed.pathname, req.vhost, method ) );
	delay( next );

	return deferred.promise;
}
