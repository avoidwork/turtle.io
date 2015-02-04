/**
 * Redirects GETs for a route to another URL
 *
 * @method redirect
 * @param  {String}  route     Route to redirect
 * @param  {String}  url       URL to redirect the Client to
 * @param  {String}  host      [Optional] Hostname this route is for (default is all)
 * @param  {Boolean} permanent [Optional] `true` will indicate the redirection is permanent
 * @return {Object}            instance
 */
redirect ( route, url, host, permanent ) {
	let code = CODES[ permanent === true ? "MOVED" : "REDIRECT" ],
		pattern = new RegExp( "^" + route + "$" );

	this.get( route, ( req, res ) => {
		let rewrite = ( pattern.exec( req.url ) || [] ).length > 0;

		this.respond( req, res, MESSAGES.NO_CONTENT, code, {
			"Location": ( rewrite ? req.url.replace( pattern, url ) : url ),
			"Cache-Control": "no-cache"
		} );
	}, host );

	return this;
}
