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
	    encoding = req.headers["accept-encoding"],
	    compress = body && (REGEX_DEF.test(encoding) || REGEX_GZIP.test(encoding)),
	    encoding = "",
	    self     = this;

	// Encoding as JSON if not prepared
	if (body && ((output instanceof Array) || String(output) === "[object Object]")) {
		responseHeaders["Content-Type"] = "application/json";
		output = $.encode(output);
	}

	if (compress) {
		encoding = REGEX_DEF.test(encoding) ? "deflate" : "gzip";
		responseHeaders["Content-Encoding"] = encoding;
		zlib.deflate(output, function (err, compressed) {
			if (err) self.error(res, req);
			else {
				self.headers(res, req, status, responseHeaders);
				res.write(compressed);
				res.end();
			}
		});
	}
	else {
		this.headers(res, req, status, responseHeaders);
		if (body) res.write(output);
		res.end();
	}

	return this;
};
