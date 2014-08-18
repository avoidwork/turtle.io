/**
 * Adds middleware to processing chain
 *
 * @method use
 * @param  {String}   path   [Optional] Path the middleware applies to, default is `/*`
 * @param  {Function} fn     Middlware to chain
 * @param  {String}   host   [Optional] Host
 * @param  {String}   method [Optional] HTTP method
 * @return {Object}          TurtleIO instance
 */
TurtleIO.prototype.use = function ( path, fn, host, method ) {
	if ( typeof path != "string" ) {
		host = fn;
		fn   = path;
		path = "/.*";
	}

	host   = host   || ALL;
	method = method || ALL;

	if ( typeof fn != "function" && ( fn && typeof fn.handle != "function" ) ) {
		throw new Error( "Invalid middleware" );
	}

	if ( !this.middleware[host] ) {
		this.middleware[host] = {};
	}

	if ( !this.middleware[host][method] ) {
		this.middleware[host][method] = {};
	}

	if ( !this.middleware[host][method][path] ) {
		this.middleware[host][method][path] = [];
	}

	if ( fn.handle ) {
		fn = fn.handle;
	}

	// Base64 encoding for permission checks
	fn.base64 = new Buffer( fn.toString() ).toString( "base64" );

	this.middleware[host][method][path].push( fn );

	return this;
};
