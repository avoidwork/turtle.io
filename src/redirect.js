/**
 * Redirects GETs for a route to another URL
 * 
 * @param  {String}  route     Route to redirect
 * @param  {String}  url       URL to redirect the Client to
 * @param  {String}  host      [Optional] Hostname this route is for (default is all)
 * @param  {Boolean} permanent [Optional] `true` will indicate the redirection is permanent
 * @return {Object}            instance
 */
factory.prototype.redirect = function ( route, url, host, permanent ) {
	var self   = this,
	    code   = codes[permanent === true ? "MOVED" : "REDIRECT"],
	    output = messages.NO_CONTENT,
	    timer  = new Date();

	this.get( route, function ( res, req ) {
		self.respond( res, req, output, code, {"Location": url}, new Date() );
	}, host);

	dtp.fire( "redirect-set", function ( p ) {
		return [req.headers.host, route, url, permanent, diff( timer )];
	});

	return this;
};
