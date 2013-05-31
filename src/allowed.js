/**
 * Verifies a method is allowed on a URI
 * 
 * @method allowed
 * @param  {String} method HTTP verb
 * @param  {String} uri    URI to query
 * @param  {String} host   Hostname
 * @return {Boolean}       Boolean indicating if method is allowed
 */
factory.prototype.allowed = function ( method, uri, host ) {
	host       = host || "all";
	var result = false,
	    timer  = new Date(),
	    routes = this.routes( method, host ).merge( this.routes( "all", host ) );

	if ( host !== undefined ) {
		routes.merge( this.routes( method, "all" ) ).merge( this.routes( "all", "all" ) );
	}

	routes.each( function ( i ) {
		if ( RegExp( "^" + i + "$" ).test( uri ) ) {
			return !( result = true );
		}
	});

	dtp.fire( "allowed", function ( p ) {
		return [host, uri, method.toUpperCase(), diff( timer )];
	});

	return result;
};
