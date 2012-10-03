/**
 * Sets a DELETE route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @return {Object}         Instance
 */
factory.prototype.delete = function (route, fn) {
	$.route.set(route, fn, "delete");
	return this;
};

/**
 * Sets a GET route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @return {Object}         Instance
 */
factory.prototype.get = function (route, fn) {
	$.route.set(route, fn, "get");
	return this;
};

/**
 * Sets a POST route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @return {Object}         Instance
 */
factory.prototype.post = function (route, fn) {
	$.route.set(route, fn, "post");
	return this;
};

/**
 * Sets a DELETE route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @return {Object}         Instance
 */
factory.prototype.put = function (route, fn) {
	$.route.set(route, fn, "put");
	return this;
};
