/**
 * Prepares request host name
 *
 * @method hostname
 * @public
 * @param  {Object} req HTTP(S) request Object
 * @return {String}     Hostname
 */
factory.prototype.hostname = function ( req ) {
	return req.headers.host.replace( REGEX_PORT, "" );
};
