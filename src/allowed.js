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
	var self   = this,
	    timer  = precise().start(),
	    result = this.routes( uri, host, method, override );

	/**
	 * Base64 encodes the argument
	 *
	 * @method base64
	 * @private
	 * @param {Function} fn Function to encode
	 * @return {String}     Base 64 encoded argument
 	 */
	function base64 ( fn ) {
		return new Buffer( fn.toString() ).toString( "base64" );
	}

	result = result.filter( function ( i ) {
		return self.config.noaction[i.base64 || base64( i )] === undefined;
	} );

	timer.stop();

	this.dtp.fire( "allowed", function () {
		return [host, uri, method.toUpperCase(), timer.diff()];
	} );

	return result.length > 0;
};
