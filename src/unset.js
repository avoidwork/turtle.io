/**
 * Unsets a route
 *
 * @method unset
 * @public
 * @param  {String} route URI Route
 * @param  {String} verb  HTTP method
 * @return {Object}       Instance
 */
factory.prototype.unset = function ( route, verb, host ) {
	var timer = new Date();

	route === "*" ? $.route.reset() : $.route.del( route, verb, host );

	if ( this.config.probes ) {
		dtp.fire( "route-unset", function () {
			return [host || "*", route, verb || "ALL", diff( timer )];
		});
	}

	return this;
};
