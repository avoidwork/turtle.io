/**
 * Request handler which provides RESTful CRUD operations
 *
 * @method request
 * @public
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} res   HTTP(S) response Object
 * @return {Object}       Instance
 */
TurtleIO.prototype.request = function ( req, res ) {
	var self    = this,
	    parsed  = $.parse( this.url( req ) ),
	    host    = parsed.hostname,
	    method  = req.method,
	    handled = false,
	    found   = false,
	    count, path, nth, root;

	// Can't find the hostname in vhosts, try the default (if set) or send a 500
	if ( ! ( host in this.config.vhosts ) ) {
		this.config.vhostsList.each( function ( i, idx ) {
			if ( self.config.vhostsRegExp[idx].test( host ) ) {
				found = true;
				host  = i;
				return false;
			}
		});

		if ( !found ) {
			if ( this.config["default"] !== null ) {
				host = this.config["default"];
			}
			else {
				this.error( req, res, messages.SERVER_ERROR );
			}
		}
	}

	// Preparing file path
	root = this.config.root + "/" + this.config.vhosts[host];
	path = ( root + parsed.pathname ).replace( REGEX_DIR, "" );

	// Determining if the request is valid
	fs.lstat( path, function ( e, stats ) {
		if ( e ) {
			self.error( req, res, e );
		}
		else if ( !stats.isDirectory() ) {
			self.handle( path, parsed.href, false, stats );
		}
		else if ( stats.isDirectory() && !REGEX_GET.test( method ) ) {
			self.handle( path, parsed.href, true );
		}
		else {
			count = 0;
			nth   = self.config.indexes;
			path += "/";

			self.config.index.each( function ( i ) {
				fs.exists( path + i, function ( exists ) {
					if ( !handled ) {
						if ( exists ) {
							handled = true;
							fs.lstat( path + i, function ( e, stats ) {
								if ( e ) {
									self.error( req, res, messages.SERVER_ERROR );
								}
								else {
									self.handle( path + i, parsed.href + i, false, stats );
								}
							} );
						}
						else if ( ++count === nth ) {
							self.error( req, res, messages.NOT_FOUND );
						}
					}
				});
			});
		}
	});

	return this;
};