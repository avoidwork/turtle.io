/**
 * Constructs a URL
 *
 * @method url
 * @param  {Object} req Request Object
 * @return {String}     Requested URL
 */
TurtleIO.prototype.url = function ( req ) {
	return "http" + ( this.config.ssl.cert ? "s" : "" ) + "://" + req.headers.host + req.url;
};
