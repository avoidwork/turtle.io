/**
 * Runs middleware in a chain
 *
 * @method run
 * @param  {Object} req  Request Object
 * @param  {Object} res  Response Object
 * @param  {String} host [Optional] Host
 * @return {Object}      TurtleIO instance
 */
TurtleIO.prototype.run = function ( req, res, host ) {
	var self       = this,
	    all        = this.middleware.all   || {},
	    h          = this.middleware[host] || {},
	    middleware = ( all["/*"] || [] ).concat( all[req.parsed.pathname] || [] ).concat( h["/*"] || [] ).concat( h[req.parsed.pathname] || [] ),
	    nth        = middleware.length;

	// Chains middleware execution
	function chain ( idx, err ) {
		var timer = precise().start(),
		    i     = idx + 1,
		    find  = err !== undefined,
		    found = false,
		    arity;

		// Chain passed to middleware
		function next ( arg ) {
			if ( middleware[i] ) {
				return chain( i, arg );
			}
			else if ( !res.finished ) {
				if ( !( arg instanceof Error ) ) {
					self.respond( req, res );
				}
				else {
					self.error( req, res, self.codes.SERVER_ERROR, arg.stack || arg.message );
				}
			}
		}

		try {
			arity = middleware[idx].toString().replace( /(^.*\()|(\).*)|(\n.*)/g, "" ).split( "," ).length;

			if ( find ) {
				if ( arity < 4 ) {
					while ( ++idx < nth ) {
						arity = middleware[idx].toString().replace( /(^.*\()|(\).*)|(\n.*)/g, "" ).split( "," ).length;

						if ( arity === 4 ) {
							found = true;
							i     = idx + 1;
							break;
						}
					}
				}
				else {
					found = true;
				}
			}

			if ( timer.stopped === null ) {
				timer.stop();
			}

			self.dtp.fire( "middleware", function () {
				return [host, req.url, timer.diff()];
			} );

			if ( find ) {
				if ( found ) {
					return middleware[idx]( err, req, res, next );
				}
				else {
					self.error( req, res, self.codes.SERVER_ERROR );
					return false;
				}
			}
			else {
				return middleware[idx]( req, res, next );
			}
		}
		catch ( e ) {
			return next( e );
		}
	}

	if ( nth > 0 ) {
		return !!chain( 0 );
	}

	return true;
};
