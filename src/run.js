/**
 * Runs middleware in a chain
 *
 * @method run
 * @param  {Object} req  Request Object
 * @param  {Object} res  Response Object
 * @param  {String} host [Optional] Host
 * @return {Object}      TurtleIO instance
 */
TurtleIO.prototype.run = function ( req, res, host ) {
	var self       = this,
		middleware = this.middleware.all.concat( this.middleware[host] || [] );

	// Chains middleware execution
	function chain ( idx, err ) {
		var i = idx + 1;

		try {
			middleware[idx]( err || null, req, res, function ( arg ) {
				if ( !res.headersSent && middleware[i] ) {
					return chain( i, arg );
				}
				else if ( !res.headersSent && !middleware[i] && arg instanceof Error ) {
					self.error( req, res, self.codes.SERVER_ERROR );

					return false;
				}
			} );
		}
		catch ( e ) {
			if ( !res.headersSent && middleware[i] ) {
				return chain( i, e );
			}
			else if ( !res.headersSent ) {
				self.error( req, res, self.codes.SERVER_ERROR );

				return false;
			}
		}
	}

	if ( middleware.length > 0 ) {
		return chain( 0 );
	}

	return true;
};
