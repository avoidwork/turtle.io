/**
 * Determines which verbs are allowed against a URL
 *
 * @method allows
 * @public
 * @param  {String} uri  URL to query
 * @param  {String} host Hostname
 * @return {String}      Allowed methods
 */
factory.prototype.allows = function ( uri, host ) {
	var self   = this,
	    result = [],
	    verbs  = ["DELETE", "GET", "POST", "PUT", "PATCH"],
	    timer  = new Date();

	verbs.each( function ( i ) {
		if ( self.allowed( i, uri, host ) ) {
			result.push( i );
		}
	});

	result = result.join( ", " ).replace( "GET", "GET, HEAD, OPTIONS" );

	if ( this.config.probes ) {
		dtp.fire( "allows", function () {
			return [host, uri, diff( timer )];
		});
	}

	return result;
};
