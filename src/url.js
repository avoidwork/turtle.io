/**
 * Constructs a URL
 *
 * @method url
 * @param  {Object} req Request Object
 * @return {String}     Requested URL
 */
TurtleIO.prototype.url = function ( req ) {
	var header = req.headers.authorization || "",
		auth = "",
		token;

	if ( !string.isEmpty( header ) ) {
		token = header.split( REGEX_SPACE ).pop() || "",
			auth = new Buffer( token, "base64" ).toString();

		if ( !string.isEmpty( auth ) ) {
			auth += "@";
		}
	}

	return "http" + ( this.config.ssl.cert ? "s" : "" ) + "://" + auth + req.headers.host + req.url;
};
