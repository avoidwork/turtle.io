/**
 * Error handler for requests
 *
 * @method error
 * @param  {Object} req HTTP(S) request Object
 * @param  {Object} res HTTP(S) response Object
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.error = function ( req, res ) {
	var method = req.method.toLowerCase(),
	    status = this.codes.NOT_FOUND,
	    url    = this.url( req ),
	    host   = $.parse( url ).hostname;

	// If valid, determine what kind of error to respond with
	if ( !REGEX_GET.test( method ) && !REGEX_HEAD.test( method ) ) {
		if ( this.allowed( req.method, req.url, host ) ) {
			status = this.codes.SERVER_ERROR;
		}
		else {
			status = this.codes.NOT_ALLOWED;
		}
	}

	return this.respond( req, res, this.page( status, host ), status, {"Cache-Control": "no-cache"} );
};
