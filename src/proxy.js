/**
 * Proxies a request to a Server
 * 
 * @param  {String} origin Host to proxy (e.g. http://hostname)
 * @param  {String} route  Route to proxy
 * @return {Object}        Instance
 */
factory.prototype.proxy = function (origin, route) {
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
		xhr = xhr || {status: 502, getAllResponseHeaders: function () { return ""; }};
		self.respond(res, req, arg, xhr.status, headers(xhr.getAllResponseHeaders()));
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
		});
	});

	return this;
};
