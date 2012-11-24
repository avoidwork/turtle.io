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
	    handle, headers;

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
		    ie         = REGEX_IE.test(req.headers["user-agent"]);

		try {
			// Getting or creating an Etag
			resHeaders = headers(xhr.getAllResponseHeaders());
			date       = (resHeaders["Last-Modified"] || resHeaders["Date"]) || undefined;
			etag       = resHeaders.Etag || "\"" + self.hash(resHeaders["Content-Length"] + "-" + new Date(date).getTime()) + "\"";

			// Setting headers
			resHeaders["Transfer-Encoding"] = "chunked";
			if (resHeaders.Etag !== etag) resHeaders.Etag = etag;

			// Looking for a cached version
			etag = etag.replace(/\"/g, "");
			switch (true) {
				case !ie && REGEX_DEF.test(req.headers["accept-encoding"]):
					res.setHeader("Content-Encoding", "deflate");
					self.cached(etag, "deflate", function (ready, npath) {
						if (ready) {
							self.headers(res, req, codes.SUCCESS, resHeaders);
							raw = fs.createReadStream(npath);
							raw.pipe(res);
						}
						else {
							self.cache(etag, arg, "deflate", true);
							self.respond(res, req, arg, xhr.status, resHeaders);
						}
					});
					break;
				case !ie && REGEX_GZIP.test(req.headers["accept-encoding"]):
					res.setHeader("Content-Encoding", "gzip");
					self.cached(etag, "gzip", function (ready, npath) {
						if (ready) {
							self.headers(res, req, codes.SUCCESS, resHeaders);
							raw = fs.createReadStream(npath);
							raw.pipe(res);
						}
						else {
							self.cache(etag, arg, "gzip", true);
							self.respond(res, req, arg, xhr.status, resHeaders);
						}
					});
					break;
				default:
					self.respond(res, req, arg, xhr.status, resHeaders);
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

	// Setting route
	verbs.each(function (i) {
		self[REGEX_DEL.test(i) ? "delete" : i](route, function (res, req) {
			var url = origin + req.url;

			url[req.method.toLowerCase()](function (arg, xhr) { handle (arg, xhr, res, req); }, function (arg, xhr) { handle (arg, xhr, res, req); });
		}, host);
	});

	return this;
};
