/**
 * Adds a function the middleware 'no action' hash
 *
 * @method blacklist
 * @param  {Function} fn Function to add
 * @return {Object}      TurtleIO instance
 */
TurtleIO.prototype.blacklist = function ( fn ) {
	var hfn = fn.base64 || new Buffer( fn.toString() ).toString( "base64" );

	if ( this.config.noaction === undefined ) {
		this.config.noaction = {};
	}

	if ( !this.config.noaction[hfn] ) {
		this.config.noaction[hfn] = 1;
	}

	return this;
};
