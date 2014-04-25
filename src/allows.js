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
	    verbs  = ["delete", "get", "post", "put", "patch"],
		time   = process.hrtime(),
	    result;

	result = verbs.filter( function ( i ) {
		return self.allowed( i, uri, host );
	} );

	result = result.join( ", " ).toUpperCase().replace( "GET", "GET, HEAD, OPTIONS" );

	this.dtp.fire( "allows", function () {
		return [host, uri, diff( time )];
	});

	return result;
};
