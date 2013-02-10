/**
 * Error handler for requests
 * 
 * @method error
 * @param  {Object} res Response Object
 * @param  {Object} req Request Object
 * @return {Object}     Instance
 */
factory.prototype.error = function (res, req) {
	var host = req.headers.host.replace(/:.*/, "");

	REGEX_GET.test(req.method) ? this.respond(res, req, messages.NOT_FOUND,   codes.NOT_FOUND,   {"Allow": allows(req.url, host)})
	                           : this.respond(res, req, messages.NOT_ALLOWED, codes.NOT_ALLOWED, {"Allow": allows(req.url, host)});
};
