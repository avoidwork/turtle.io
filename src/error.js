/**
 * Error handler for requests
 *
 * @method error
 * @param  {Object} req    Request Object
 * @param  {Object} res    Response Object
 * @param  {Number} status [Optional] HTTP status code
 * @param  {String} msg    [Optional] Response body
 * @return {Object}        TurtleIO instance
 */
error ( req, res, status, msg ) {
	let timer = precise().start(),
		deferred = defer(),
		method = req.method.toLowerCase(),
		host = req.parsed ? req.parsed.hostname : ALL,
		kdx = -1,
		body;

	if ( isNaN( status ) ) {
		status = CODES.NOT_FOUND;

		// If valid, determine what kind of error to respond with
		if ( !regex.get.test( method ) ) {
			if ( this.allowed( method, req.parsed.pathname, req.vhost ) ) {
				status = CODES.SERVER_ERROR;
			}
			else {
				status = CODES.NOT_ALLOWED;
			}
		}
	}

	body = this.page( status, host );

	array.each( array.cast( CODES ), function ( i, idx ) {
		if ( i === status ) {
			kdx = idx;
			return false;
		}
	} );

	if ( msg === undefined ) {
		msg = kdx ? array.cast( MESSAGES )[ kdx ] : "Unknown error";
	}

	timer.stop();

	this.signal( "error", function () {
		return [ req.vhost, req.parsed.path, status, msg, timer.diff() ];
	} );

	this.respond( req, res, body, status, {
		"cache-control": "no-cache",
		"content-length": Buffer.byteLength( body )
	} ).finally( function () {
		this.log( new Error( "[client " + ( req.headers[ "x-forwarded-for" ] ? array.last( string.explode( req.headers[ "x-forwarded-for" ] ) ) : req.connection.remoteAddress ) + "] " + msg ), "debug" );
		deferred.resolve( true );
	} );

	return deferred.promise;
}
