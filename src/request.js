/**
 * Default request handler
 *
 * @method request
 * @param  {Object} req Request Object
 * @param  {Object} res Response Object
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.request = function ( req, res ) {
	this.respond( req, res, "hi!", 200 );

	return this;
};
