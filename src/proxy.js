/**
 * Proxies a request to another host
 * 
 * @param  {Object} res    HTTP response Object
 * @param  {Object} req    HTTP request Object
 * @param  {String} origin Host to proxy (e.g. http://hostname)
 * @return {Undefined}  undefined
 */
factory.prototype.proxy = function (res, req, origin) {
	var uri = origin + req.url,
	    headers, handle;

	/**
	 * Response handler
	 * 
	 * @param  {Mixed}  arg  Proxy response
	 * @param  {Object} xhr  XmlHttpRequest
	 * @param  {Number} code Default status code
	 * @return {Undefined}   undefined
	 */
	handle = function (arg, xhr, code) {
		var headerz;

		xhr     = xhr || {};
		headerz = typeof xhr.getAllResponseHeaders === "function" ? headers(xhr.getAllResponseHeaders()) : {};

		server.respond(res, req, arg, xhr.status || code, headerz);
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

	// Making proxy request - uri.verb(success, failure)
	uri[req.method.toLowerCase()](function (arg, xhr) { handle(arg, xhr, 200); }, function (arg, xhr) { handle(arg, xhr, 500); });
};
