/**
 * Unsets a route
 * 
 * @param  {String} route URI Route
 * @param  {String} verb  HTTP method
 * @return {Object}       Instance
 */
factory.prototype.unset = function (route, verb, host) {
	route === "*" ? $.route.reset() : $.route.del(route, verb, host);
 	return this;
};
