/**
 * Retrieves routes
 * 
 * @param  {String} method [Optional] HTTP method/verb
 * @param  {String} host   [Optional] Host to lookup, defaults to `all`
 * @return {Object}        Hash of routes
 */
factory.prototype.routes = function ( method, host ) {
	var result = $.route.list( method, "all" );

	if ( host !== undefined ) {
		$.merge( result, $.route.list( method, host ) );
	}

	return result;
};
