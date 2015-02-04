/**
 * Routes a request to a handler
 *
 * @method route
 * @param  {Object} req Request Object
 * @param  {Object} res Response Object
 * @return {Object}     TurtleIO instance
 */
route ( req, res ) {
	let self = this,
		url = this.url( req ),
		method = req.method.toLowerCase(),
		parsed = parse( url ),
		update = false,
		payload;

	if ( REGEX.head.test( method ) ) {
		method = "get";
	}

	// Decorating parsed Object on request
	req.parsed = parsed;
	req.query = parsed.query;
	req.ip = req.headers[ "x-forwarded-for" ] ? array.last( string.explode( req.headers[ "x-forwarded-for" ] ) ) : req.connection.remoteAddress;
	req.server = this;
	req.timer = precise().start();

	// Finding a matching vhost
	array.each( this.vhostsRegExp, ( i, idx ) => {
		if ( i.test( parsed.hostname ) ) {
			return !( req.vhost = self.vhosts[ idx ] );
		}
	} );

	req.vhost = req.vhost || this.config[ "default" ];

	// Adding middleware to avoid the round trip next time
	if ( !this.allowed( "get", req.parsed.pathname, req.vhost ) ) {
		this.get( req.parsed.pathname, ( req, res ) => {
			self.request( req, res );
		}, req.vhost );

		update = true;
	}

	req.allow = this.allows( req.parsed.pathname, req.vhost, update );
	req.body = "";

	// Decorating response
	res.redirect = ( uri ) => {
		self.respond( req, res, MESSAGES.NO_CONTENT, CODES.FOUND, { location: uri } );
	};

	res.respond = ( arg, status, headers ) => {
		self.respond( req, res, arg, status, headers );
	};

	res.error = ( status, arg ) => {
		self.error( req, res, status, arg );
	};

	// Mimic express for middleware interoperability
	res.locals = {};
	res.header = res.setHeader;

	// Setting listeners if expecting a body
	if ( REGEX.body.test( method ) ) {
		req.setEncoding( "utf-8" );

		req.on( "data", ( data ) => {
			payload = payload === undefined ? data : payload + data;

			if ( self.config.maxBytes > 0 && Buffer.byteLength( payload ) > self.config.maxBytes ) {
				req.invalid = true;
				self.error( req, res, CODES.REQ_TOO_LARGE );
			}
		} );

		req.on( "end", () => {
			if ( !req.invalid ) {
				if ( payload ) {
					req.body = payload;
				}

				self.run( req, res, req.vhost, method );
			}
		} );
	}
	// Running middleware
	else {
		self.run( req, res, req.vhost, method );
	}

	return this;
}
