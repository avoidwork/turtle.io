/**
 * Redirects GETs for a route to another URL
 *
 * @method redirect
 * @param  {String}  route     Route to redirect
 * @param  {String}  url       URL to redirect the Client to
 * @param  {String}  host      [Optional] Hostname this route is for (default is all)
 * @param  {Boolean} permanent [Optional] `true` will indicate the redirection is permanent
 * @return {Object}            instance
 * @todo Make it faster!
 */
TurtleIO.prototype.redirect = function ( route, url, host, permanent ) {
	var self    = this,
	    code    = this.codes[permanent === true ? "MOVED" : "REDIRECT"],
	    pattern = new RegExp( "^" + route + "$" );

	this.get( route, function ( req, res ) {
		var rewrite = ( pattern.exec( req.url ) || [] ).length > 0;

		self.respond( req, res, self.messages.NO_CONTENT, code, {"Location": ( rewrite ? req.url.replace( pattern, url ) : url )}, false );
	}, host);

	return this;
};
