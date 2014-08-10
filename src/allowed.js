/**
 * Verifies a method is allowed on a URI
 *
 * @method allowed
 * @param  {String}  method   HTTP verb
 * @param  {String}  uri      URI to query
 * @param  {String}  host     Hostname
 * @param  {Boolean} override Overrides cached version
 * @return {Boolean}          Boolean indicating if method is allowed
 */
TurtleIO.prototype.allowed = function ( method, uri, host, override ) {
	var timer  = precise().start(),
	    result = this.routes( uri, host, method, override ),
	    nth    = result.length;

	timer.stop();

	if ( REGEX_GET.test( method ) && nth > 0 ) {
		--nth;
	}

	this.dtp.fire( "allowed", function () {
		return [host, uri, method.toUpperCase(), timer.diff()];
	} );

	return nth > 0;
};
