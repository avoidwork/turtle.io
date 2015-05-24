/**
 * Runs middleware in a chain
 *
 * @method run
 * @param  {Object} req    Request Object
 * @param  {Object} res    Response Object
 * @param  {String} host   [Optional] Host
 * @param  {String} method HTTP method
 * @return {Object}        Promise
 */
route ( promise ) {
	let deferred = defer();

	promise.then( args => {
		let req = args[ 0 ],
			res = args[ 1 ],
			method = req.parsed.method.toLowerCase(),
			middleware;

		function get_arity ( arg ) {
			return arg.toString().replace( /(^.*\()|(\).*)|(\n.*)/g, "" ).split( "," ).length;
		}

		let last = ( timer, err ) => {
			let status;

			stop( timer );

			if ( !err ) {
				if ( regex.get.test( method ) ) {
					deferred.resolve( [ req, res ] );
				} else if ( this.allowed( "get", req.parsed.pathname, req.vhost ) ) {
					deferred.reject( new Error( CODES.NOT_ALLOWED ) );
				} else {
					deferred.reject( new Error( CODES.NOT_FOUND ) );
				}
			} else {
				status = res.statusCode >= CODES.BAD_REQUEST ? res.statusCode : CODES[ ( err.message || err ).toUpperCase() ] || CODES.SERVER_ERROR;
				deferred.reject( new Error( status ) );
			}
		};

		let next = err => {
			let timer = precise().start(),
				arity = 3,
				item = middleware.next();

			if ( !item.done ) {
				if ( err ) {
					// Finding the next error handling middleware
					arity = get_arity( item.value );
					do {
						arity = get_arity( item.value );
					} while ( arity < 4 && ( item = middleware.next() ) && !item.done )
				}

				stop( timer );

				if ( !item.done ) {
					if ( err ) {
						if ( arity === 4 ) {
							try {
								item.value( err, req, res, next );
							} catch ( e ) {
								next( e );
							}
						} else {
							last( timer, err );
						}
					} else {
						try {
							item.value( req, res, next );
						} catch ( e ) {
							next( e );
						}
					}
				} else {
					last( timer, err );
				}
			} else if ( !res._header && this.config.catchAll ) {
				last( timer, err );
			}
		};

		let stop = timer => {
			if ( timer.stopped === null ) {
				timer.stop();
				this.signal( "middleware", function () {
					return [ req.vhost, req.url, timer.diff() ];
				} );
			}
		};

		if ( reqex.head.test( method ) ) {
			method = "get";
		}

		middleware = array.iterator( this.routes( req.parsed.pathname, req.vhost, method ) );
		next();
	} );

	return deferred.promise;
}
