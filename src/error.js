/**
 * Error handler for requests
 * 
 * @method error
 * @param  {Object} res Response Object
 * @param  {Object} req Request Object
 * @return {Object}     Instance
 */
factory.prototype.error = function (res, req) {
	var host = req.headers.host.replace(/:.*/, ""),
	    get  = REGEX_GET.test(req.method),
	    msg  = get ? messages.NOT_FOUND : messages.NOT_ALLOWED,
	    code = get ? codes.NOT_FOUND    : codes.NOT_ALLOWED;

	// Firing probe
	dtp.fire("error", function (p) {
		return [req.headers.host, req.url, code, msg];
	});

	this.respond(res, req, msg, code, {"Allow": allows(req.url, host)});
};
