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

	msg = msg.replace( "{{host}}",       req.headers.host )
	         .replace( "{{time}}",       moment().format( this.config.logs.time ) )
	         .replace( "{{ip}}",         ip )
	         .replace( "{{method}}",     req.method )
	         .replace( "{{path}}",       req.parsed.path )
	         .replace( "{{status}}",     res.statusCode )
	         .replace( "{{length}}",     headers["Content-Length"] || "-" )
	         .replace( "{{referer}}",    refer )
	         .replace( "{{user}}",       user )
	         .replace( "{{user-agent}}", req.headers["user-agent"] || "-" );

	return msg;
};
