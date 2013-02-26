/**
 * Redirects GETs for a route to another URL
 * 
 * @param  {String}  route     Route to redirect
 * @param  {String}  url       URL to redirect the Client to
 * @param  {String}  host      [Optional] Hostname this route is for (default is all)
 * @param  {Boolean} permanent [Optional] `true` will indicate the redirection is permanent
 * @return {Object}            instance
 */
factory.prototype.redirect = function (route, url, host, permanent) {
	var self   = this,
	    code   = codes[permanent === true ? "MOVED" : "REDIRECT"],
	    output = messages.NO_CONTENT;

	this.get(route, function (res, req) {
		// Firing probe
		dtp.fire("redirect", function (p) {
			return [req.headers.host, route, url, permanent];
		});

		self.respond(res, req, output, code, {"Location": url});
	}, host);

	return this;
};
