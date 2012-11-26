/**
 * Proxies a request to a Server
 * 
 * @param  {String} origin Host to proxy (e.g. http://hostname)
 * @param  {String} route  Route to proxy
 * @param  {String} host   [Optional] Hostname this route is for (default is all)
 * @return {Object}        Instance
 */
factory.prototype.proxy = function (origin, route, host) {
	var self  = this,
	    verbs = ["delete", "get", "post", "put"],
	    handle, headers, wrapper;

	/**
	 * Response handler
	 * 
	 * @param  {Mixed}  arg Proxy response
	 * @param  {Object} xhr XmlHttpRequest
	 * @param  {Object} res HTTP response Object
	 * @param  {Object} req HTTP request Object
	 * @return {Undefined}  undefined
	 */
	handle = function (arg, xhr, res, req) {
		var resHeaders = {},
		    etag       = "",
		    date       = "",
		    nth, raw;

		try {
			// Getting or creating an Etag
			resHeaders = headers(xhr.getAllResponseHeaders());
			date       = (resHeaders["Last-Modified"] || resHeaders["Date"]) || undefined;
			if (isNaN(new Date(date).getFullYear())) date = undefined;
			etag       = resHeaders.Etag || "\"" + self.hash(resHeaders["Content-Length"] + "-" + new Date(date).getTime()) + "\"";

			// Setting header
			if (resHeaders.Etag !== etag) resHeaders.Etag = etag;

			// Determining if a 304 response is valid based on Etag only (no timestamp is kept)
			switch (true) {
				case req.headers["if-none-match"] === etag:
					self.headers(res, req, codes.NOT_MODIFIED, headers);
					res.end();
					break;
				default:
					resHeaders["Transfer-Encoding"] = "chunked";
					etag = etag.replace(/\"/g, "");
					self.compressed(res, req, etag, arg, xhr.status, resHeaders);
			}
		}
		catch (e) {
			self.log(e);
			self.respond(res, req, arg, 502, {});
		}
	};

	/**
	 * Capitalizes HTTP headers
	 * 
	 * @param  {Object} args Response headers
	 * @return {Object}      Reshaped response headers
	 */
	headers = function (args) {
		var result = {},
			rvalue  = /.*:\s+/,
			rheader = /:.*/;

		args.trim().split("\n").each(function (i) {
			var header, value;

			value          = i.replace(rvalue, "");
			header         = i.replace(rheader, "");
			header         = header.indexOf("-") === -1 ? header.capitalize() : (function () { var x = []; header.explode("-").each(function (i) { x.push(i.capitalize()) }); return x.join("-"); })();
			result[header] = value;
		});

		return result;
	};

	/**
	 * Wraps the proxy request
	 * 
	 * @param  {Object} res HTTP response Object
	 * @param  {Object} req HTTP request Object
	 * @return {Undefined}  undefined
	 */
	wrapper = function (res, req) {
		var url = origin + req.url.replace(new RegExp("^" + route), ""),
		    fn  = function (arg, xhr) {
		    	handle(arg, xhr, res, req);
		    };

		url[req.method.toLowerCase()](fn, fn);
	};

	// Setting route
	verbs.each(function (i) {
		self[REGEX_DEL.test(i) ? "delete" : i](route, wrapper, host);
		self[REGEX_DEL.test(i) ? "delete" : i](route + "/.*", wrapper, host);
	});

	return this;
};
