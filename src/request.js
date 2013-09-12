/**
 * Request handler which provides RESTful CRUD operations
 *
 * @method request
 * @public
 * @param  {Object} req  HTTP(S) request Object
 * @param  {Object} res  HTTP(S) response Object
 * @param  {String} host [Optional] Virtual host
 * @return {Object}      TurtleIO instance
 */
TurtleIO.prototype.request = function ( req, res, host ) {
	var self    = this,
	    url     = this.url( req ),
	    parsed  = $.parse( url ),
	    method  = req.method,
	    handled = false,
	    found   = false,
	    count, path, nth, root;

	// Can't find the hostname in vhosts, try the default (if set) or send a 500
	if ( !host || !( host in this.config.vhosts ) ) {
		this.vhostsRegExp.each( function ( i, idx ) {
			if ( i.test( req.host ) ) {
				found = true;
				host  = self.vhosts[idx];
				return false;
			}
		} );

		if ( !found ) {
			if ( this.config["default"] !== null ) {
				host = this.config["default"];
			}
			else {
				this.error( req, res );
			}
		}
	}

	// Preparing file path
	root = this.config.root + "/" + this.config.vhosts[host];
	path = ( root + parsed.pathname ).replace( REGEX_DIR, "" );

	// Determining if the request is valid
	fs.lstat( path, function ( e, stats ) {
		if ( e ) {
			self.error( req, res );
		}
		else if ( !stats.isDirectory() ) {
			self.handle( req, res, path, parsed.href, false, stats );
		}
		else if ( stats.isDirectory() && REGEX_GET.test( method ) && !REGEX_DIR.test( req.url ) ) {
			self.respond( req, res, self.messages.NO_CONTENT, self.codes.REDIRECT, {"Location": parsed.href + "/"} );
		}
		else if ( stats.isDirectory() && !REGEX_GET.test( method ) ) {
			self.handle( req, res, path, parsed.href, true );
		}
		else {
			count = 0;
			nth   = self.config.indexes;
			path += "/";

			self.config.index.each( function ( i ) {
				fs.lstat( path + i, function ( e, stats ) {
					if ( !e && !handled ) {
						handled = true;
						self.handle( req, res, path + i, parsed.href + i, false, stats );
					}
					else if ( ++count === nth && !handled ) {
						self.error( req, res );
					}
				} );
			});
		}
	});

	return this;
};