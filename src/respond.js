/**
 * Constructs a response
 * 
 * @param  {Object}  res             Response object
 * @param  {Object}  req             Request object
 * @param  {Mixed}   output          [Optional] Response
 * @param  {Number}  status          [Optional] HTTP status code, default is 200
 * @param  {Object}  responseHeaders [Optional] HTTP headers to decorate the response with
 * @param  {Boolean} compress        [Optional] Enable compression of the response (if supported)
 * @return {Objet}                   Instance
 */
factory.prototype.respond = function (res, req, output, status, responseHeaders, compress) {
	if (typeof status === "undefined")        status          = codes.SUCCESS;
	if (!(responseHeaders instanceof Object)) responseHeaders = {};

	var body      = !REGEX_HEAD.test(req.method),
	    encoding  = this.compression(req.headers["user-agent"], req.headers["accept-encoding"]),
	    self      = this,
	    nth;

	// Determining wether compression is supported
	compress = compress || (body && encoding !== null);

	// Converting JSON or XML to a String
	if (body) {
		switch (true) {
			case output instanceof Array:
			case output instanceof Object:
				responseHeaders["Content-Type"] = "application/json";
				output = $.encode(output);
				break;
			/*case output instanceof Document:
				responseHeaders["Content-Type"] = "application/xml";
				output = $.xml.decode(output);
				break;*/
		}
	}

	if (compress) {
		responseHeaders["Content-Encoding"] = encoding;
		zlib[encoding](output, function (err, compressed) {
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
