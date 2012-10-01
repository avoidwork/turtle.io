/**
 * Error handler for all requests
 * 
 * @param  {Object} res Response Object
 * @param  {Object} req Request Object
 * @return {Object}     Instance
 */
factory.prototype.error = function (res, req) {
	REGEX_GET.test(req.method) ? this.respond(req, res, messages.NOT_FOUND,   codes.NOT_FOUND)
	                           : this.respond(req, res, messages.NOT_ALLOWED, codes.NOT_ALLOWED);
	return this.log("Server could not respond to request");
};
