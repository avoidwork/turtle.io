/**
 * Preparing log message
 *
 * @method prep
 * @param  {Object} req HTTP(S) request Object
 * @param  {Object} res HTTP(S) response Object
 * @return {String}     Log message
 */
TurtleIO.prototype.prep = function ( req, res ) {
	var msg    = this.config.logs.format,
	    time   = this.config.logs.time,
	    parsed = $.parse( this.url( req ) ),
	    header = req.headers.authorization || "",
	    token  = header.split( REGEX_SPACE ).pop()  || "",
	    auth   = new Buffer( token, "base64" ).toString(),
	    user   = auth.split( ":" )[0] || "-",
	    refer  = req.headers.referer !== undefined ? ( "\"" + req.headers.referer + "\"" ) : "-";

	msg = msg.replace( "{{host}}",       req.headers.host )
	         .replace( "{{time}}",       moment().format( time ) )
	         .replace( "{{ip}}",         req.connection.remoteAddress )
	         .replace( "{{method}}",     req.method )
	         .replace( "{{path}}",       parsed.path )
	         .replace( "{{status}}",     res.statusCode )
	         .replace( "{{length}}",     res.getHeader( "Content-Length" ) || "-")
	         .replace( "{{referer}}",    refer )
	         .replace( "{{user}}",       user )
	         .replace( "{{user-agent}}", req.headers["user-agent"] || "-" );

	return msg;
};
