/**
 * Adds middleware to processing chain
 *
 * @method use
 * @param {Function} fn   Middlware to chain
 * @param  {String}  host [Optional] Host
 * @return {Object}       TurtleIO instance
 */
TurtleIO.prototype.use = function ( fn, host ) {
	host = host || "all";

	if ( typeof fn != "function" ) {
		throw new Error( "Invalid middleware" );
	}

	if ( host !== "all" && !this.config.vhosts[host] ) {
		throw new Error( "Invalid virtual host" );
	}

	if ( !this.middleware[host] ) {
		this.middleware[host] = [];
	}

	this.middleware[host].push( fn );

	return this;
};
