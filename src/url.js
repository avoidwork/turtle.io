/**
 * Constructs a URL
 *
 * @method url
 * @param  {Object} req Request Object
 * @return {String}     Requested URL
 */
TurtleIO.prototype.url = function ( req ) {
	var header = req.headers.authorization || "",
	    auth   = "",
	    token;

	if ( !header.isEmpty() ) {
		token = header.split( REGEX_SPACE ).pop()  || "",
		auth  = new Buffer( token, "base64" ).toString();

		if ( !auth.isEmpty() ) {
			auth += "@";
		}
	}

	return "http" + ( this.config.ssl.cert ? "s" : "" ) + "://" + auth + req.headers.host + req.url;
};
