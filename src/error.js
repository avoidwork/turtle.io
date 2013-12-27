/**
 * Error handler for requests
 *
 * @method error
 * @param  {Object} req    Request Object
 * @param  {Object} res    Response Object
 * @param  {Number} status [Optional] HTTP status code
 * @return {Object}        TurtleIO instance
 */
TurtleIO.prototype.error = function ( req, res, status ) {
	var method = req.method.toLowerCase(),
	    host   = req.parsed.hostname,
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

	return this.respond( req, res, body, status, {"Cache-Control": "no-cache", "Content-Length": Buffer.byteLength( body )} );
};
