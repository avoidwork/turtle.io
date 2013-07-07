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
	var self    = this,
	    code    = codes[permanent === true ? "MOVED" : "REDIRECT"],
	    pattern = new RegExp( "^" + route + "$" ),
	    timer   = new Date();

	this.get( route, function ( req, res, timer ) {
		var rewrite = ( pattern.exec( req.url ) || [] ).length > 0;

		self.respond( req, res, messages.NO_CONTENT, code, {"Location": ( rewrite ? req.url.replace( pattern, url ) : url )}, timer, false );
	}, host);

	dtp.fire( "redirect-set", function () {
		return [host || "*", route, url, permanent, diff( timer )];
	});

	return this;
};
