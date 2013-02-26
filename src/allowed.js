/**
 * Verifies a method is allowed on a URI
 * 
 * @method allowed
 * @param  {String} method HTTP verb
 * @param  {String} uri    URI to query
 * @param  {String} host   Hostname
 * @return {Boolean}       Boolean indicating if method is allowed
 */
var allowed = function (method, uri, host) {
	host       = host || "all";
	var result = false,
	    timer  = new Date();

	$.route.list(method, host).each(function (route) {
		if (RegExp("^" + route + "$").test(uri)) return !(result = true);
	});

	if (!result) $.route.list("all", host).each(function (route) {
		if (RegExp("^" + route + "$").test(uri)) return !(result = true);
	});

	if (!result && host !== "all") {
		$.route.list(method, "all").each(function (route) {
			if (RegExp("^" + route + "$").test(uri)) return !(result = true);
		});

		if (!result) $.route.list("all", "all").each(function (route) {
			if (RegExp("^" + route + "$").test(uri)) return !(result = true);
		});		
	}

	dtp.fire("allowed", function (p) {
		return [host, uri, method.toUpperCase(), diff(timer)];
	});

	return result;
};
