/**
 * Route handler
 *
 * @method handler
 * @private
 * @param  {Object}   req HTTP(S) request Object
 * @param  {Object}   res HTTP(S) response Object
 * @param  {Function} fn  Request handler
 * @return {Object}       Instance
 */
var handler = function ( req, res, fn ) {
	var self  = this,
	    host  = req.headers.host.replace( /:.*/, "" ),
	    timer = new Date(),
	    op;

	// Setting up request handler
	op = function () {
		var url = self.url( req ),
		    cached, payload;

		try {
			// Decorating session
			req.session = self.session.get( req, res );

			// Setting listeners if expecting a body
			if ( REGEX_BODY.test( req.method ) ) {
				req.setEncoding( "utf-8" );

				req.on( "data", function ( data ) {
					payload = payload === undefined ? data : payload + data;
				});

				req.on( "end", function () {
					req.body = payload;
					fn.call( self, req, res, timer );
				});
			}
			// Looking in LRU cache for Etag
			else if ( REGEX_GET.test( req.method ) ) {
				cached = self.registry.get( url );

				// Sending a 304 if Client is making a GET & has current representation
				if ( cached && !REGEX_HEAD.test( req.method ) && req.headers["if-none-match"] && req.headers["if-none-match"].replace( /\"/g, "" ) === cached.etag ) {
					self.respond( req, res, messages.NO_CONTENT, codes.NOT_MODIFIED, {"Content-Type": cached.mimetype, Etag: "\"" + cached.etag + "\""}, timer, false );
				}
				else {
					fn.call( self, req, res, timer );
				}
			}
			else {
				fn.call( self, req, res, timer );
			}
		}
		catch ( e ) {
			self.error( req, res, e, timer );
		}

		dtp.fire( "handler", function () {
			return [req.headers.host, req.url, diff( timer )];
		});
	};

	// Setting listener for unexpected close
	res.on( "close", function () {
		self.log( prep.call( self, req, res ) );
	});

	// Handling request or wrapping it with HTTP Authentication
	if ( this.config.auth === undefined || !this.config.auth.hasOwnProperty( host ) ) {
		op();
	}
	else {
		if ( typeof this.config.auth[host].auth === "undefined" ) {
			this.config.auth[host].auth = http_auth( this.config.auth[host] );
		}
		this.config.auth[host].auth.apply( req, res, op );
	}
};
