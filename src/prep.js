/**
 * Preparing log message
 *
 * @method prep
 * @param  {Object} req     HTTP(S) request Object
 * @param  {Object} res     HTTP(S) response Object
 * @param  {Object} headers HTTP(S) response headers
 * @return {String}         Log message
 */
TurtleIO.prototype.prep = function ( req, res, headers ) {
	var msg   = this.config.logs.format,
	    user  = req.parsed.auth.split( ":" )[0] || "-",
	    refer = req.headers.referer ? ( "\"" + req.headers.referer + "\"" ) : "-",
	    ip    = req.headers["x-forwarded-for"] ? req.headers["x-forwarded-for"].explode().last() : req.connection.remoteAddress;

	msg = msg.replace( "%v",             req.headers.host )
	         .replace( "%h",             ip )
	         .replace( "%l",             "-" )
	         .replace( "%u",             user )
	         .replace( "%t",             ( "[" + moment().format( this.config.logs.time ) + "]" ) )
	         .replace( "%r",             req.method + " " + req.parsed.path + " HTTP/1.1" )
	         .replace( "%>s",            res.statusCode )
	         .replace( "%b",             headers["Content-Length"] || "-" )
	         .replace( "%{Referer}i",    refer )
	         .replace( "%{User-agent}i", req.headers["user-agent"] || "-" );

	return msg;
};
