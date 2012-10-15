/**
 * Preparing log message
 * 
 * @param  {Object} res HTTP response Object
 * @param  {Object} req HTTP request Object
 * @return {String}     Log message
 */
var prep = function (res, req) {
	var msg    = this.config.logs.format,
	    parsed = url.parse(req.url);

	msg = msg.replace("{{host}}", req.headers.host)
	         .replace("{{time}}", new Date().toUTCString())
	         .replace("{{method}}", req.method)
	         .replace("{{path}}", parsed.pathname)
	         .replace("{{status}}", res.statusCode)
	         .replace("{{length}}", res.getHeader("Content-Length") || "-")
	         .replace("{{user-agent}}", req.headers["user-agent"] || "-");

	return msg;
}