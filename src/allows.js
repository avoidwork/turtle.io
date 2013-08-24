/**
 * Determines which verbs are allowed against a URL
 *
 * @method allows
 * @param  {String} uri  URL to query
 * @param  {String} host Hostname
 * @return {String}      Allowed methods
 */
TurtleIO.prototype.allows = function ( uri, host ) {
	var self   = this,
	    result = [],
	    verbs  = ["DELETE", "GET", "POST", "PUT", "PATCH"];

	verbs.each( function ( i ) {
		if ( self.allowed( i, uri, host ) ) {
			result.push( i );
		}
	});

	result = result.join( ", " ).replace( "GET", "GET, HEAD, OPTIONS" );

	return result;
};
