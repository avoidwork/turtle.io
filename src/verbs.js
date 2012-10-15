/**
 * Sets a route for all verbs
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.all = function (route, fn, host) {
	var self = this;

	$.route.set(route, function (res, req) {
		handler.call(self, res, req, fn);
	}, "all", host);
	return this;
};

/**
 * Sets a DELETE route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.delete = function (route, fn, host) {
	var self = this;

	$.route.set(route, function (res, req) {
		handler.call(self, res, req, fn);
	}, "delete", host);
	return this;
};

/**
 * Sets a GET route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.get = function (route, fn, host) {
	var self = this;

	$.route.set(route, function (res, req) {
		handler.call(self, res, req, fn);
	}, "get", host);
	return this;
};

/**
 * Sets a POST route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.post = function (route, fn, host) {
	var self = this;

	$.route.set(route, function (res, req) {
		handler.call(self, res, req, fn);
	}, "post", host);
	return this;
};

/**
 * Sets a DELETE route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.put = function (route, fn, host) {
	var self = this;

	$.route.set(route, function (res, req) {
		handler.call(self, res, req, fn);
	}, "put", host);
	return this;
};
