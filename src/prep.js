/**
 * Preparing log message
 * 
 * @param  {Object} res HTTP(S) response Object
 * @param  {Object} req HTTP(S) request Object
 * @return {String}     Log message
 */
var prep = function ( res, req ) {
	var msg    = this.config.logs.format,
	    time   = this.config.logs.time,
	    parsed = url.parse( req.url ),
	    header = req.headers["authorization"] || "",
	    token  = header.split( /\s+/ ).pop()  || "",
	    auth   = new Buffer( token, "base64" ).toString(),
	    user   = auth.split( /:/ )[0] || "-",
	    refer  = req.headers.referer !== undefined ? ( "\"" + req.headers.referer + "\"" ) : "-";

	msg = msg.replace( "{{host}}",       req.headers.host )
	         .replace( "{{time}}",       new moment().format( time ) )
	         .replace( "{{ip}}",         req.connection.remoteAddress )
	         .replace( "{{method}}",     req.method )
	         .replace( "{{path}}",       parsed.pathname )
	         .replace( "{{status}}",     res.statusCode )
	         .replace( "{{length}}",     res.getHeader( "Content-Length" ) || "-")
	         .replace( "{{referer}}",    refer )
	         .replace( "{{user}}",       user )
	         .replace( "{{user-agent}}", req.headers["user-agent"] || "-" );

	return msg;
}