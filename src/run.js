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
		middleware = ( this.middleware[host] || [] ).concat( this.middleware.all );

	function chain ( idx ) {
		middleware[idx]( req, res, function ( err ) {
			if ( !( err instanceof Error ) ) {
				if ( !res.headersSent && middleware[idx + 1] ) {
					chain( idx + 1 );
				}
			}
			else {
				self.error( req, res, self.codes.SERVER_ERROR );
			}
		} );
	}

	if ( middleware.length > 0 ) {
		chain( 0 );
	}

	return this;
};
