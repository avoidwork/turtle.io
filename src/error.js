/**
 * Error handler for all requests
 * 
 * @param  {Object} res Response Object
 * @param  {Object} req Request Object
 * @return {Object}     Instance
 */
factory.prototype.error = function (res, req) {
	var parsed = url.parse(req.url),
	    uri    = "";

	if (!parsed.hasOwnProperty("host"))     parsed.host     = req.headers.host;
	if (!parsed.hasOwnProperty("protocol")) parsed.protocol = "http:";

	uri = parsed.protocol + "//" + req.headers.host.replace(/:.*/, "") + ":" + this.config.port + req.url;

	REGEX_GET.test(req.method) ? this.respond(res, req, messages.NOT_FOUND,   codes.NOT_FOUND)
	                           : this.respond(res, req, messages.NOT_ALLOWED, codes.NOT_ALLOWED, {"Allow": allows(req.url)});

	if (this.config.debug) this.log("[" + req.method.toUpperCase() + "] " + uri);
};
