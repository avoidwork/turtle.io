/**
 * Error handler for requests
 * 
 * @param  {Object} res Response Object
 * @param  {Object} req Request Object
 * @return {Object}     Instance
 */
factory.prototype.error = function (res, req) {
	var parsed = url.parse(req.url),
	    uri    = "",
	    msg    = this.config.logs.format,
	    host   = req.headers.host.replace(/:.*/, "");

	if (!parsed.hasOwnProperty("host"))     parsed.host     = req.headers.host;
	if (!parsed.hasOwnProperty("protocol")) parsed.protocol = "http:";

	uri = parsed.protocol + "//" + host+ ":" + this.config.port + req.url;

	REGEX_GET.test(req.method) ? this.respond(res, req, messages.NOT_FOUND, codes.NOT_FOUND, (allowed("POST") ? {"Allow": "POST"} : undefined))
	                           : this.respond(res, req, messages.NOT_ALLOWED, codes.NOT_ALLOWED, {"Allow": allows(req.url, host)});

	// Preparing log message
	msg = msg.replace("{{host}}", req.headers.host)
	         .replace("{{time}}", new Date().toUTCString())
	         .replace("{{method}}", req.method)
	         .replace("{{path}}", parsed.pathname)
	         .replace("{{status}}", (REGEX_GET.test(req.method) ? codes.NOT_FOUND : codes.NOT_ALLOWED))
	         .replace("{{length}}", "-")
	         .replace("{{user-agent}}", req.headers["user-agent"] || "-");
	
	// Writing log
	this.log(msg, true, this.config.debug);
};
