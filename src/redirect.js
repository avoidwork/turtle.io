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
	var self  = this,
	    code  = codes[permanent === true ? "MOVED" : "REDIRECT"],
	    timer = new Date();

	this.get( route, function ( res, req, timer ) {
		self.respond( res, req, messages.NO_CONTENT, code, {"Location": url}, timer, false );
	}, host);

	dtp.fire( "redirect-set", function () {
		return [host || "*", route, url, permanent, diff( timer )];
	});

	return this;
};
