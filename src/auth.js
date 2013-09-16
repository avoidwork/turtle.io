/**
 * Determines what authentication is valid (if any), and applies it to the request
 *
 * @method auth
 * @param  {Object}   req  Request Object
 * @param  {Object}   res  Response Object
 * @param  {String}   host Virtual host
 * @param  {Function} next Function to execute after applying optional authenication wrapper
 * @return {Object}        TurtleIO instance
 */
TurtleIO.prototype.auth = function ( req, res, host, next ) {
	// No authentication
	if ( !this.config.auth || ( this.config.auth && !this.config.auth[host] ) ) {
		next();
	}
	// Basic
	else if ( this.config.auth && this.config.auth[host] ) {
		if ( !this.config.auth[host].auth ) {
			this.config.auth[host].auth = http_auth( this.config.auth[host] );
		}

		this.config.auth[host].auth.apply( req, res, next );
	}

	return this;
};
