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

	if ( all.all ) {
		array.each( array.keys( all.all ).filter( function ( i ) {
			return new RegExp( "^" + i + "$", "i" ).test( uri );
		} ), function ( i ) {
			result = result.concat( all.all[i] );
		} );
	}

	if ( all[method] ) {
		array.each( array.keys( all[method] ).filter( function ( i ) {
			return new RegExp( "^" + i + "$", "i" ).test( uri );
		} ), function ( i ) {
			result = result.concat( all[method][i] );
		} );
	}

	if ( h.all ) {
		array.each( array.keys( h.all ).filter( function ( i ) {
			return new RegExp( "^" + i + "$", "i" ).test( uri );
		} ), function ( i ) {
			result = result.concat( h.all[i] );
		} );
	}

	if ( h[method] ) {
		array.each( array.keys( h[method] ).filter( function ( i ) {
			return new RegExp( "^" + i + "$", "i" ).test( uri );
		} ), function ( i ) {
			result = result.concat( h[method][i] );
		} );
	}

	this.routeCache.set( id, result );

	return result;
};
