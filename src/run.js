/**
 * Runs middleware in a chain
 *
 * @method run
 * @param  {Object} req    Request Object
 * @param  {Object} res    Response Object
 * @param  {String} host   [Optional] Host
 * @param  {String} method HTTP method
 * @return {Object}        TurtleIO instance
 */
run ( req, res, host, method ) {
	let self = this,
		middleware = this.routes( req.parsed.pathname, host, method ),
		nth = middleware.length,
		i = -1;

	let stop = ( timer ) => {
		if ( timer.stopped === null ) {
			timer.stop();
			self.signal( "middleware", () => {
				return [ host, req.url, timer.diff() ];
			} );
		}
	};

	let last = ( timer, err ) => {
		let status;

		stop( timer );

		if ( !err ) {
			if ( regex.get.test( method ) ) {
				self.request( req, res );
			}
			else if ( self.allowed( "get", req.parsed.pathname, req.vhost ) ) {
				self.error( req, res, CODES.NOT_ALLOWED );
			}
			else {
				self.error( req, res, CODES.NOT_FOUND );
			}
		}
		else {
			status = res.statusCode >= CODES.BAD_REQUEST ? res.statusCode : CODES[ ( err.message || err ).toUpperCase() ] || CODES.SERVER_ERROR;
			self.error( req, res, status, err );
		}
	};

	let next = ( err ) => {
		let timer = precise().start(),
			arity = 3;

		if ( ++i < nth && typeof middleware[ i ] == "function" ) {
			try {
				if ( err ) {
					// Finding the next error handling middleware
					arity = middleware[ i ].toString().replace( /(^.*\()|(\).*)|(\n.*)/g, "" ).split( "," ).length;

					if ( arity < 4 ) {
						while ( arity < 4 && ++i < nth && middleware[ i ] == "function" ) {
							arity = middleware[ i ].toString().replace( /(^.*\()|(\).*)|(\n.*)/g, "" ).split( "," ).length;
						}
					}
				}

				stop( timer );

				if ( i < nth ) {
					if ( err ) {
						arity === 4 ? middleware[ i ]( err, req, res, next ) : last( timer, err );
					}
					else {
						middleware[ i ]( req, res, next );
					}
				}
				else {
					last( timer, err );
				}
			}
			catch ( e ) {
				next( e );
			}
		}
		else if ( !res._header && self.config.catchAll ) {
			last( timer, err );
		}

		return self;
	};

	return next();
}
