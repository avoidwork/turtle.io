/**
 * Constructs a response
 * 
 * @param  {Object}  res             Response object
 * @param  {Object}  req             Request object
 * @param  {Mixed}   output          [Optional] Response
 * @param  {Number}  status          [Optional] HTTP status code, default is 200
 * @param  {Object}  responseHeaders [Optional] HTTP headers to decorate the response with
 * @return {Objet}                   Instance
 */
factory.prototype.respond = function (res, req, output, status, responseHeaders) {
	if (typeof status === "undefined")        status          = codes.SUCCESS;
	if (!(responseHeaders instanceof Object)) responseHeaders = {};

	var body     = !REGEX_BODY.test(req.method),
	    compress = false,
	    get      = REGEX_GET.test(req.method);

	// Encoding as JSON if not prepared
	if (get && ((output instanceof Array) || String(output) === "[object Object]")) {
		responseHeaders["Content-Type"] = "application/json";
		output = $.encode(output);
	}

	if (compress) {
		void 0;
	}
	else {
		this.headers(res, req, status, responseHeaders);
		if (body) res.write(output);
		res.end();
	}

	return this;
};
