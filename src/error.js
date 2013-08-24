/**
 * Error handler for requests
 *
 * @method error
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} res   HTTP(S) response Object
 * @return {Object}       TurtleIO instance
 */
TurtleIO.prototype.error = function ( req, res ) {
	var body   = "",
	    status = this.codes.NOT_FOUND,
	    method = req.method.toLowerCase(),
	    host   = this.hostname( req );

	// If valid, determine what kind of error to respond with
	if ( !REGEX_GET.test( method ) && !REGEX_HEAD.test( method ) ) {
		if ( this.allowed( req.method, req.url, host ) ) {
			status = this.codes.SERVER_ERROR;
		}
		else {
			status = this.codes.NOT_ALLOWED;
		}
	}

	body = this.page( status, host );

	this.respond( req, res, body, status, {"Cache-Control": "no-cache"}, false );

	return this;
};
