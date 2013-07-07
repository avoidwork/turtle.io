/**
 * Error handler for requests
 *
 * @method error
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} res   HTTP(S) response Object
 * @param  {Object} timer Date instance
 * @return {Object}       Instance
 */
factory.prototype.error = function ( req, res, e, timer ) {
	e     = e.message || e;
	timer = timer     || new Date();

	$.route.load( "error", req, res );

	dtp.fire( "error", function () {
		return [req.headers.host, req.url, codes.ERROR_APPLICATION, e || messages.ERROR_APPLICATION, diff( timer )];
	});
};
