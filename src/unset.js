/**
 * Unsets a route
 * 
 * @method unset
 * @param  {String} route URI Route
 * @param  {String} verb  HTTP method
 * @return {Object}       Instance
 */
factory.prototype.unset = function (route, verb, host) {
	var timer = new Date();

	route === "*" ? $.route.reset() : $.route.del(route, verb, host);

	dtp.fire("route-unset", function (p) {
		return [host || "*", route, verb || "ALL", diff(timer)];
	});

 	return this;
};
