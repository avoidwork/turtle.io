/**
 * Default error handler
 * 
 * @method errorHandler
 * @param  {Object} res   HTTP(S) response Object
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} timer [Optional] Date instance
 * @return {undefined}    Undefined
 */
var errorHandler = function ( res, req, timer ) {
	timer      = timer || new Date();
	var body   = messages.NOT_FOUND,
	    status = codes.NOT_FOUND,
	    method = req.method.toLowerCase(),
	    host   = req.headers.host.replace( REGEX_PORT, "" );

	// If valid, determine what kind of error to respond with
	if ( !REGEX_GET.test( method ) && !REGEX_HEAD.test( method ) ) {
		if ( allowed( req.method, req.url, host ) ) {
			body   = messages.ERROR_APPLICATION;
			status = codes.ERROR_APPLICATION;
		}
		else {
			body   = messages.NOT_ALLOWED;
			status = codes.NOT_ALLOWED;
		}
	}

	this.respond( res, req, body, status, {"Cache-Control": "no-cache"}, timer, false );
};
