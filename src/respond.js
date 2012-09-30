/**
 * Echoes a response
 * 
 * @param  {Object}  res             Response object
 * @param  {Object}  req             Request object
 * @param  {Mixed}   output          [Optional] String or Object (automatically encoded as JSON, triggers application/json content-type header)
 * @param  {Number}  status          [Optional] HTTP status code, default is 200
 * @param  {Object}  responseHeaders [Optional] HTTP headers to decorate the response with
 * @param  {Boolean} end             Signal the end of transmission, default is true
 * @return {Undefined}               undefined
 */
factory.prototype.respond = function (res, req, output, status, responseHeaders, end) {
	var body = !REGEX_BODY.test(req.method),
	    get  = REGEX_GET.test(req.method);

	// Setting optional params
	if (typeof status === "undefined") status = codes.SUCCESSFUL;
	if (!(responseHeaders instanceof Object)) responseHeaders = {};
	end = (end !== false);

	// Merging default headers for response
	$.merge(responseHeaders, headers);

	// Setting headers
	responseHeaders["Date"] = new Date().toUTCString();
	if (body && get && end && status === codes.SUCCESSFUL) responseHeaders.Etag = crypto.createHash("md5").update(entity).digest("hex");
	if (body && get && !end) responseHeaders["Data"] = "chunked";

	// Setting the response status code
	res.statusCode = status;

	// Removing cache centric header, we don't want these responses cached
	if (!get || status >= codes.INVALID_ARGUMENTS) delete responseHeaders["Cache-Control"];

	// Decorating response with headers
	$.iterate(responseHeaders, function (v, k) {
		res.setHeader(k, v);
	});

	// Writing Entity body if valid
	if (body) res.write(output);

	// Signally the end, send it to the Client
	if (end) res.end();
};
