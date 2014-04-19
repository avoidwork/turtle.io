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
		var i = idx + 1,
			args;

		// Chain passed to middleware
		function next ( arg ) {
			if ( middleware[i] ) {
				chain( i, arg );
			}
			else if ( !res.finished ) {
				if ( !( arg instanceof Error ) ) {
					self.respond( req, res );
				}
				else {
					self.error( req, res, self.codes.SERVER_ERROR );
				}
			}
		}

		try {
			args = middleware[idx].toString().replace( /(^.*\()|(\).*)|(\n.*)/g, "" ).split( "," ).length;

			if ( args === 4 ) {
				if ( !( err instanceof Error ) ) {
					err = null;
				}

				middleware[idx]( err, req, res, next );
			}
			else {
				middleware[idx]( req, res, next );
			}
		}
		catch ( e ) {
			next( e );
		}
	}

	if ( middleware.length > 0 ) {
		chain( 0 );

		return false;
	}

	return true;
};
