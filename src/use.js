/**
 * Adds middleware to processing chain
 *
 * @method use
 * @param  {String}   path [Optional] Path the middleware applies to, default is `/*`
 * @param  {Function} fn   Middlware to chain
 * @param  {String}   host [Optional] Host
 * @return {Object}        TurtleIO instance
 */
TurtleIO.prototype.use = function ( path, fn, host ) {
	if ( typeof path == "function" ) {
		host = fn;
		fn   = path;
		path = "/*";
	}

	host = host || "all";

	if ( typeof fn != "function" ) {
		throw new Error( "Invalid middleware" );
	}

	if ( host !== "all" && !this.config.vhosts[host] ) {
		throw new Error( "Invalid virtual host" );
	}

	if ( !this.middleware[host] ) {
		this.middleware[host] = {};
	}

	if ( !this.middleware[host][path] ) {
		this.middleware[host][path] = [];
	}

	this.middleware[host][path].push( fn );

	return this;
};
