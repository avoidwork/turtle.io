/**
 * Verifies a method is allowed on a URI
 * 
 * @param  {String} method HTTP verb
 * @param  {String} uri    URI to query
 * @return {Boolean}       Boolean indicating if method is allowed
 */
var allowed = function (method, uri) {
	var result = false;

	$.route.list(method).each(function (route) {
		if (RegExp("^" + route + "$").test(uri)) return !(result = true);
	});

	if (!result) $.route.list("all").each(function (route) {
		if (RegExp("^" + route + "$").test(uri)) return !(result = true);
	});

	return result;
};
