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
	let middleware = array.iterator( this.routes( req.parsed.pathname, host, method ) );

	let get_arity = ( arg ) => {
		return arg.toString().replace( /(^.*\()|(\).*)|(\n.*)/g, "" ).split( "," ).length;
	};

	let stop = ( timer ) => {
		if ( timer.stopped === null ) {
			timer.stop();
			this.signal( "middleware", () => {
				return [ host, req.url, timer.diff() ];
			} );
		}
	};

	let last = ( timer, err ) => {
		let status;

		stop( timer );

		if ( !err ) {
			if ( regex.get.test( method ) ) {
				this.request( req, res );
			}
			else if ( this.allowed( "get", req.parsed.pathname, req.vhost ) ) {
				this.error( req, res, CODES.NOT_ALLOWED );
			}
			else {
				this.error( req, res, CODES.NOT_FOUND );
			}
		}
		else {
			status = res.statusCode >= CODES.BAD_REQUEST ? res.statusCode : CODES[ ( err.message || err ).toUpperCase() ] || CODES.SERVER_ERROR;
			this.error( req, res, status, err );
		}
	};

	let next = ( err ) => {
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
						}
						catch ( e ) {
							next( e );
						}
					}
					else {
						last( timer, err );
					}
				}
				else {
					try {
						item.value( req, res, next );
					}
					catch ( e ) {
						next( e );
					}
				}
			}
			else {
				last( timer, err );
			}
		}
		else if ( !res._header && this.config.catchAll ) {
			last( timer, err );
		}
	};

	next();

	return this;
}
