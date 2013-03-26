/**
 * Error handler for requests
 * 
 * @method error
 * @param  {Object} res   HTTP(S) response Object
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} timer Date instance
 * @return {Object}       Instance
 */
factory.prototype.error = function ( res, req, timer ) {
	var host = req.headers.host.replace( /:.*/, "" ),
	    get  = REGEX_GET.test( req.method ),
	    msg  = messages[get ? "NOT_FOUND" : "NOT_ALLOWED"],
	    code = codes[get ? "NOT_FOUND" : "NOT_ALLOWED"];

	this.respond( res, req, msg, code, {Allow: allows( req.url, host )}, timer );

	dtp.fire( "error", function ( p ) {
		return [req.headers.host, req.url, code, msg, diff( timer )];
	});
};
