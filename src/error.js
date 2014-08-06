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
TurtleIO.prototype.error = function ( req, res, status, msg ) {
	var timer  = precise().start(),
	    method = req.method.toLowerCase(),
	    host   = req.parsed ? req.parsed.hostname : ALL,
	    kdx    = -1,
		body;

	if ( isNaN( status ) ) {
		status = this.codes.NOT_FOUND;

		// If valid, determine what kind of error to respond with
		if ( !REGEX_GET.test( method ) && !REGEX_HEAD.test( method ) ) {
			if ( this.allowed( method, req.url, host ) ) {
				status = this.codes.SERVER_ERROR;
			}
			else {
				status = this.codes.NOT_ALLOWED;
			}
		}
	}

	body = this.page( status, host );

	array.each( array.cast( this.codes ), function ( i, idx ) {
		if ( i === status ) {
			kdx = idx;
			return false;
		}
	} );

	if ( msg === undefined ) {
		msg = kdx ? array.cast( this.messages )[kdx] : "Unknown error";
	}

	this.log( new Error( "[client " + ( req.headers["x-forwarded-for"] ? array.last( string.explode( req.headers["x-forwarded-for"] ) ) : req.connection.remoteAddress ) + "] " + msg ), "debug" );

	timer.stop();

	this.dtp.fire( "error", function () {
		return [req.headers.host, req.parsed.path, status, msg, timer.diff()];
	} );

	return this.respond( req, res, body, status, {"cache-control": "no-cache", "content-length": Buffer.byteLength( body )} );
};
