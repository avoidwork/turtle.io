/**
 * Determines which verbs are allowed against a URL
 *
 * @method allows
 * @param  {String} uri  URL to query
 * @param  {String} host Hostname
 * @return {String}      Allowed methods
 */
TurtleIO.prototype.allows = function ( uri, host ) {
	var verbs = ["delete", "get", "post", "put", "patch"],
	    result;

	result = verbs.map( function ( i ) {
		if ( this.allowed( i, uri, host ) ) {
			return i;
		}
	}.bind( this ) );

	result = result.join( ", " ).toUpperCase().replace( "GET", "GET, HEAD, OPTIONS" );

	return result;
};
