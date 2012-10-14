/**
 * Unsets a route
 * 
 * @param  {String} route URI Route
 * @param  {String} verb  HTTP method
 * @return {Object}       Instance
 */
factory.prototype.unset = function (route, verb, host) {
	var verbs = ["all", "delete", "get", "post", "put"];

	if (route === "*") {
		verbs.each(function (verb) {
			$.route.list(verb, host).each(function (route) {
				// Can't delete error route, only override it
				if (route === "error" && verb === "all" && host === "all") return;
				$.route.del(route, verb, host);
			});
		});
	}
 	else $.route.del(route, verb, host);
 	return this;
};
