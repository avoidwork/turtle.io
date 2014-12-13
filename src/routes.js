/**
 * Returns middleware for the uri
 *
 * @method result
 * @param  {String}  uri      URI to query
 * @param  {String}  host     Hostname
 * @param  {String}  method   HTTP verb
 * @param  {Boolean} override Overrides cached version
 * @return {Array}
 */
TurtleIO.prototype.routes = function ( uri, host, method, override ) {
	var id     = method + ":" + host + ":" + uri,
	    cached = override !== true && this.routeCache.get( id ),
	    all, h, result;

	if ( cached ) {
		return cached;
	}

	all    = this.middleware.all   || {};
	h      = this.middleware[host] || {};
	result = [];

	try {
		array.each( [ all.all, all[method], h.all, h[method] ], function ( c ) {
			if ( c ) {
				array.each( array.keys( c ).filter( function ( i ) {
					return new RegExp( "^" + i + "$", "i" ).test( uri );
				} ), function ( i ) {
					result = result.concat( c[ i ] );
				} );
			}
		} );
	}
	catch ( e ) {
		result = [];
	}

	this.routeCache.set( id, result );

	return result;
};
