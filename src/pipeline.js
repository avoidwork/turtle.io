/**
 * Monadic pipeline for the request
 *
 * @type {Function}
 */
let pipeline = monad()
	.lift( decorate )
	.lift( connect )
	.lift( route )
	.lift( request )
	.lift( headers )
	.lift( respond )
	.lift( log );
