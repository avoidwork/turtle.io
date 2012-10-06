/**
 * Echoes a response
 * 
 * @param  {Object}  res             Response object
 * @param  {Object}  req             Request object
 * @param  {Mixed}   output          [Optional] Response
 * @param  {Number}  status          [Optional] HTTP status code, default is 200
 * @param  {Object}  responseHeaders [Optional] HTTP headers to decorate the response with
 * @param  {Boolean} end             Signal the end of transmission, default is true
 * @return {Objet}                   Instance
 */
factory.prototype.respond = function (res, req, output, status, responseHeaders, end) {
	var body    = !REGEX_BODY.test(req.method),
	    get     = REGEX_GET.test(req.method),
	    headers = $.clone(this.config.headers);

	// Setting optional params
	if (typeof status === "undefined") status = codes.SUCCESS;
	if (!(responseHeaders instanceof Object)) responseHeaders = {};
	end = (end !== false);

	// Decorating response headers
	$.merge(headers, responseHeaders);

	// Setting headers
	headers["Date"]                         = new Date().toUTCString();
	headers["Access-Control-Allow-Methods"] = headers.Allow;

	// Encoding as JSON if not prepared
	if ((output instanceof Array) || String(output) === "[object Object]") {
		headers["Content-Type"] = "application/json";
		output = $.encode(output);
	}

	if (body && get) {
		switch (true) {
			case end && status === codes.SUCCESS:
				headers.Etag = "\"" + this.hash(output) + "\"";
				break;
			case !end:
				headers["Transfer-Encoding"] = "chunked";
				break;
		}
	}

	// Setting the response status code
	res.statusCode = status;

	// Removing headers not wanted in the response
	if (!get || status >= codes.INVALID_ARGUMENTS) delete headers["Cache-Control"];
	switch (true) {
		case status >= codes.FORBIDDEN && status < codes.NOT_FOUND:
		case status >= codes.ERROR_APPLICATION:
			delete headers.Allow;
			delete headers["Access-Control-Allow-Methods"];
			delete headers["Last-Modified"];
			break;
	}

	// Decorating response with headers
	$.iterate(headers, function (v, k) {
		res.setHeader(k, v);
	});

	// Writing Entity body if valid
	if (body) res.write(output);

	// Signally the end, send it to the Client
	if (end) res.end();

	return this;
};
