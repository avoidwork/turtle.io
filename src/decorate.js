/**
 * Decorates the Request & Response
 *
 * @method decorate
 * @param  {Object} req Request Object
 * @param  {Object} res Response Object
 * @return {Object}     Promise
 */
decorate ( req, res ) {
	let timer = precise().start(), // Assigning as early as possible
		deferred = defer(),
		url = this.url( req ),
		parsed = parse( url ),
		hostname = parsed.hostname,
		update = false;

	// Decorating parsed Object on request
	req.timer = timer;
	req.parsed = parsed;
	req.query = parsed.query;
	req.ip = req.headers[ "x-forwarded-for" ] ? array.last( string.explode( req.headers[ "x-forwarded-for" ] ) ) : req.connection.remoteAddress;
	req.server = this;

	// Finding a matching virtual host
	array.each( this.vhostsRegExp, ( i, idx ) => {
		if ( i.test( hostname ) ) {
			return !( req.vhost = this.vhosts[ idx ] );
		}
	} );

	req.vhost = req.vhost || this.config[ "default" ];

	// Adding middleware to avoid the round trip next time
	if ( !this.allowed( "get", req.parsed.pathname, req.vhost ) ) {
		this.get( req.parsed.pathname, ( req, res, next ) => {
			this.request( req, res ).then( next, next );
		}, req.vhost );

		update = true;
	}

	req.allow = this.allows( req.parsed.pathname, req.vhost, update );
	req.body = "";

	// Adding methods
	res.redirect = uri => {
		this.respond( req, res, MESSAGES.NO_CONTENT, CODES.FOUND, { location: uri } );
	};

	res.respond = ( arg, status, headers ) => {
		this.respond( req, res, arg, status, headers );
	};

	res.error = ( status, arg ) => {
		this.error( req, res, status, arg );
	};

	// Mimic express for middleware interoperability
	res.locals = {};
	res.header = res.setHeader;

	deferred.resolve( [ req, res ] );

	return deferred.promise;
}
