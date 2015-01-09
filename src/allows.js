/**
 * Determines which verbs are allowed against a URL
 *
 * @method allows
 * @param  {String}  uri      URI to query
 * @param  {String}  host     Hostname
 * @param  {Boolean} override Overrides cached version
 * @return {String}           Allowed methods
 */
TurtleIO.prototype.allows = function ( uri, host, override ) {
	var self = this,
		timer = precise().start(),
		result = !override ? this.permissions.get( host + "_" + uri ) : undefined;

	if ( override || !result ) {
		result = VERBS.filter( function ( i ) {
			return self.allowed( i, uri, host, override );
		} );

		result = result.join( ", " ).toUpperCase().replace( "GET", "GET, HEAD, OPTIONS" );
		this.permissions.set( host + "_" + uri, result );
	}

	timer.stop();

	this.signal( "allows", function () {
		return [ host, uri, timer.diff() ];
	} );

	return result;
};
