/**
 * Gets an HTTP status page
 *
 * @method page
 * @param  {Number} code HTTP status code
 * @param  {String} host Virtual hostname
 * @return {String}      Response body
 */
TurtleIO.prototype.page = function ( code, host ) {
	host = host && this.pages[ host ] ? host : ALL;

	return this.pages[ host ][ code ] || this.pages[ host ][ "500" ] || this.pages.all[ "500" ];
};
