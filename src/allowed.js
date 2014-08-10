/**
 * Verifies a method is allowed on a URI
 *
 * @method allowed
 * @param  {String} method HTTP verb
 * @param  {String} uri    URI to query
 * @param  {String} host   Hostname
 * @return {Boolean}       Boolean indicating if method is allowed
 */
TurtleIO.prototype.allowed = function ( method, uri, host ) {
	var timer  = precise().start(),
	    result = this.routes( uri, host, method );

	timer.stop();

	this.dtp.fire( "allowed", function () {
		return [host, uri, method.toUpperCase(), timer.diff()];
	} );

	return result.length > 0;
};
