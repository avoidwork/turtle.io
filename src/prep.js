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
	var msg = this.config.logs.format,
		user = req.parsed ? ( req.parsed.auth.split( ":" )[ 0 ] || "-" ) : "-";

	msg = msg.replace( "%v", req.headers.host )
		.replace( "%h", req.ip || "-" )
		.replace( "%l", "-" )
		.replace( "%u", user )
		.replace( "%t", ( "[" + moment().format( this.config.logs.time ) + "]" ) )
		.replace( "%r", req.method + " " + req.url + " HTTP/1.1" )
		.replace( "%>s", res.statusCode )
		.replace( "%b", headers[ "content-length" ] || "-" )
		.replace( "%{Referer}i", req.headers.referer || "-" )
		.replace( "%{User-agent}i", req.headers[ "user-agent" ] || "-" );

	return msg;
};
