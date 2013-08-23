/**
 * Error handler for requests
 *
 * @method error
 * @public
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} res   HTTP(S) response Object
 * @param  {Object} timer Date instance
 * @return {Object}       Instance
 */
factory.prototype.error = function ( req, res, e, timer ) {
	e     = e.message || e;
	timer = timer     || new Date();

	$.route.load( "error", req, res );

	if ( this.config.probes ) {
		dtp.fire( "error", function () {
			return [req.headers.host, req.url, codes.SERVER_ERROR, e || messages.SERVER_ERROR, diff( timer )];
		});
	}
};
