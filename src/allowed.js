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
	var result = false;

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

	return result;
};
