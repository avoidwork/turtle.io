/**
 * Adds a function the middleware 'no action' hash
 *
 * @method blacklist
 * @param  {Function} fn Function to add
 * @return {Object}      TurtleIO instance
 */
TurtleIO.prototype.blacklist = function ( fn ) {
	var hfn = fn.hash || this.hash( fn.toString() );

	if ( this.config.noaction === undefined ) {
		this.config.noaction = {};
	}

	if ( !this.config.noaction[ hfn ] ) {
		this.config.noaction[ hfn ] = 1;
	}

	return this;
};
