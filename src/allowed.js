/**
 * Verifies a method is allowed on a URI
 *
 * @method allowed
 * @param  {String} method HTTP verb
 * @param  {String} uri    URI to query
 * @param  {String} host   Hostname
 * @return {Boolean}       Boolean indicating if method is allowed
 */
TurtleIO.prototype.allowed = function ( method, uri, host ) {
	host       = host || "all";
	var result = false,
	    routes = this.routes( method, host ).concat( this.routes( "all", host ) );

	if ( host !== "all" ) {
		routes = routes.concat( this.routes( method, "all" ).concat( this.routes( "all", "all" ) ) );
	}

	routes.each( function ( i ) {
		if ( new RegExp( "^" + i + "$" ).test( uri ) ) {
			return !( result = true );
		}
	});

	return result;
};
