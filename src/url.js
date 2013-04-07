/**
 * Concatinates the requst URL
 * 
 * @param  {Object} req HTTP(S) request Object
 * @return {String}     Complete request URL
 */
factory.prototype.url = function ( req ) {
	return "http" + ( this.config.cert !== undefined ? "s" : "" ) + "://" + req.headers.host + req.url;
};
