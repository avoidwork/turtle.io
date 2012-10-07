/**
 * Proxies a request to another host
 * 
 * @param  {Object} res    HTTP response Object
 * @param  {Object} req    HTTP request Object
 * @param  {String} origin Host to proxy (e.g. http://hostname)
 * @return {Undefined}  undefined
 */
factory.prototype.proxy = function (origin, route) {
	var self = this,
	    headers, handle;

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
		var headerz = {};

		if (typeof xhr === "undefined") xhr = {};
		if (typeof xhr.getAllResponseHeaders === "function") headerz = headers(xhr.getAllResponseHeaders())

		self.respond(res, req, arg, xhr.status || 500, headerz);
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
	this.all(route, function (res, req) {
		var fn = function (arg, xhr) { handle(arg, xhr, res, req); };

		(origin + req.url)[req.method.toLowerCase()](fn, fn);
	});
};
