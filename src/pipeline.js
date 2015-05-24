/**
 * Monadic pipeline for the request
 *
 * @type {Function}
 */
pipeline ( req, res ) {
	return this.decorate( req, res ).then( args => {
		return this.connect( args );
	} ).then( args => {
		return this.route( args );
	} );
}
