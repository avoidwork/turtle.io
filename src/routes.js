/**
 * Retrieves routes
 *
 * @method routes
 * @public
 * @param  {String} method HTTP method/verb (lower case), or `all`
 * @param  {String} host   Host to lookup, or `all`
 * @return {Array}         Routes
 */
factory.prototype.routes = function ( method, host ) {
	return this.config.routesHash[host][method];
};
