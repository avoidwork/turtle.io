/**
 * Determines which verbs are allowed against a URL
 *
 * @method allows
 * @param  {String} uri  URL to query
 * @param  {String} host Hostname
 * @return {String}      Allowed methods
 */
TurtleIO.prototype.allows = function ( uri, host ) {
	var result = [],
	    verbs  = ["delete", "get", "post", "put", "patch"];

	verbs.each( function ( i ) {
		if ( this.allowed( i, uri, host ) ) {
			result.push( i );
		}
	}.bind( this ) );

	result = result.join( ", " ).toUpperCase().replace( "GET", "GET, HEAD, OPTIONS" );

	return result;
};
