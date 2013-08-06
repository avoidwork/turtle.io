/**
 * Retrieves routes
 *
 * @method routes
 * @public
 * @param  {String} method [Optional] HTTP method/verb
 * @param  {String} host   [Optional] Host to lookup, defaults to `all`
 * @return {Object}        Hash of routes
 */
factory.prototype.routes = function ( method, host ) {
	return $.route.list( method, host );
};
