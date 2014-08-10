/**
 * Returns middleware for the uri
 *
 * @method result
 * @param  {String} uri    URI
 * @param  {String} host   Host
 * @param  {String} method HTTP method
 * @return {Array}
 */
TurtleIO.prototype.routes = function ( uri, host, method ) {
	var all    = this.middleware.all   || {},
	    h      = this.middleware[host] || {},
	    result = [];

	if ( all.all ) {
		array.each( array.keys( all.all ).filter( function ( i ) {
			return new RegExp( "^" + i, "i" ).test( uri );
		} ), function ( i ) {
			result = result.concat( all.all[i] );
		} );
	}

	if ( all[method] ) {
		array.each( array.keys( all[method] ).filter( function ( i ) {
			return new RegExp( "^" + i, "i" ).test( uri );
		} ), function ( i ) {
			result = result.concat( all[method][i] );
		} );
	}

	if ( h.all ) {
		array.each( array.keys( h.all ).filter( function ( i ) {
			return new RegExp( "^" + i, "i" ).test( uri );
		} ), function ( i ) {
			result = result.concat( h.all[i] );
		} );
	}

	if ( h[method] ) {
		array.each( array.keys( h[method] ).filter( function ( i ) {
			return new RegExp( "^" + i, "i" ).test( uri );
		} ), function ( i ) {
			result = result.concat( h[method][i] );
		} );
	}

	return result;
};
