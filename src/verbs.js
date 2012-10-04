/**
 * Sets a route for all methods
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @return {Object}         Instance
 */
factory.prototype.all = function (route, fn) {
	var self = this;

	$.route.set(route, function (res, req) { fn.call(self, res, req); }, "all");
	return this;
};

/**
 * Sets a DELETE route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @return {Object}         Instance
 */
factory.prototype.delete = function (route, fn) {
	var self = this;

	$.route.set(route, function (res, req) { fn.call(self, res, req); }, "delete");
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
	var self = this;

	$.route.set(route, function (res, req) { fn.call(self, res, req); }, "get");
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
	var self = this;

	$.route.set(route, function (res, req) { fn.call(self, res, req); }, "post");
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
	var self = this;

	$.route.set(route, function (res, req) { fn.call(self, res, req); }, "put");
	return this;
};
