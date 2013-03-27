/**
 * Error handler for requests
 * 
 * @method error
 * @param  {Object} res   HTTP(S) response Object
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} timer Date instance
 * @return {Object}       Instance
 */
factory.prototype.error = function ( res, req, e, timer ) {
	e     = e.message || e;
	timer = timer     || new Date();

	$.route.load( "error", res, req );

	dtp.fire( "error", function ( p ) {
		return [req.headers.host, req.url, codes.ERROR_APPLICATION, e || messages.ERROR_APPLICATION, diff( timer )];
	});
};
