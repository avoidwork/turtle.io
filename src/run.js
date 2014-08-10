/**
 * Runs middleware in a chain
 *
 * @method run
 * @param  {Object} req    Request Object
 * @param  {Object} res    Response Object
 * @param  {String} host   [Optional] Host
 * @param  {String} method HTTP method
 * @return {Object}        TurtleIO instance
 */
TurtleIO.prototype.run = function ( req, res, host, method ) {
	var self       = this,
	    all        = this.middleware.all   || {},
	    h          = this.middleware[host] || {},
	    path       = req.parsed.pathname,
	    middleware = [],
	    i          = -1,
	    nth;

	function next ( err ) {
		var timer = precise().start(),
		    arity = 3;

		if ( err ) {
			// Finding the next error handling middleware
			arity = middleware[++i].toString().replace( /(^.*\()|(\).*)|(\n.*)/g, "" ).split( "," ).length;

			if ( arity < 4 ) {
				while ( arity < 4 && ++i < nth ) {
					arity = middleware[i].toString().replace( /(^.*\()|(\).*)|(\n.*)/g, "" ).split( "," ).length;
				}
			}

			--i;
		}

		if ( timer.stopped === null ) {
			timer.stop();
		}

		self.dtp.fire( "middleware", function () {
			return [host, req.url, timer.diff()];
		} );

		if ( ++i < nth ) {
			try {
				arity === 3 ? middleware[i]( req, res, next ) : middleware[i]( err, req, res, next );
			}
			catch ( e ) {
				next( e );
			}
		}
		else if ( !res._header && self.config.catchAll ) {
			if ( !err ) {
				self.request( req, res );
			}
			else {
				self.error( req, res, ( self.codes[( err.message || err ).toUpperCase()] || self.codes.SERVER_ERROR ), ( err.stack || err.message || err ) );
			}
		}
	}

	if ( all.all ) {
		array.each( array.keys( all.all ).filter( function ( i ) {
			return new RegExp( "^" + i, "i" ).test( path );
		} ), function ( i ) {
			middleware = middleware.concat( all.all[i] );
		} );
	}

	if ( all[method] ) {
		array.each( array.keys( all[method] ).filter( function ( i ) {
			return new RegExp( "^" + i, "i" ).test( path );
		} ), function ( i ) {
			middleware = middleware.concat( all[method][i] );
		} );
	}

	if ( h.all ) {
		array.each( array.keys( h.all ).filter( function ( i ) {
			return new RegExp( "^" + i, "i" ).test( path );
		} ), function ( i ) {
			middleware = middleware.concat( h.all[i] );
		} );
	}

	if ( h[method] ) {
		array.each( array.keys( h[method] ).filter( function ( i ) {
			return new RegExp( "^" + i, "i" ).test( path );
		} ), function ( i ) {
			middleware = middleware.concat( h[method][i] );
		} );
	}

	nth = middleware.length;
	next();

	return this;
};
