/**
 * Default error handler
 *
 * @method errorHandler
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} res   HTTP(S) response Object
 * @param  {Object} timer [Optional] Date instance
 * @return {undefined}    Undefined
 */
var errorHandler = function ( req, res, timer ) {
	timer      = timer || new Date();
	var body   = "",
	    status = codes.NOT_FOUND,
	    method = req.method.toLowerCase(),
	    host   = this.hostname( req );

	// If valid, determine what kind of error to respond with
	if ( !REGEX_GET.test( method ) && !REGEX_HEAD.test( method ) ) {
		if ( this.allowed( req.method, req.url, host ) ) {
			status = codes.ERROR_APPLICATION;
		}
		else {
			status = codes.NOT_ALLOWED;
		}
	}

	body = this.page( status, host );

	this.respond( req, res, body, status, {"Cache-Control": "no-cache"}, timer, false );
};
