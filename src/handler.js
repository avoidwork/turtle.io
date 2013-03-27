/**
 * Route handler
 * 
 * @method handler
 * @param  {Object}   res HTTP(S) response Object
 * @param  {Object}   req HTTP(S) request Object
 * @param  {Function} fn  Request handler
 * @return {Object}       Instance
 */
var handler = function ( res, req, fn ) {
	var self  = this,
	    host  = req.headers.host.replace( /:.*/, "" ),
	    timer = new Date(),
	    op;

	// Setting up request handler
	op = function () {
		var payload;

		try {
			// Setting listeners if expecting a body
			if ( REGEX_BODY.test( req.method ) ) {
				req.setEncoding( "utf-8" );

				req.on( "data", function ( data ) {
					payload = payload === undefined ? data : payload + data;
				});

				req.on( "end", function () {
					req.body = payload;
					fn.call( self, res, req, timer );
				});
			}
			else {
				fn.call( self, res, req, timer );
			}
		}
		catch ( e ) {
			self.error( res, req, e, timer );
		}

		dtp.fire( "handler", function ( p ) {
			return [req.headers.host, req.url, diff( timer )];
		});
	};

	// Setting listener for unexpected close
	res.on( "close", function () {
		self.log( prep.call( self, res, req ) );
	});

	// Handling request or wrapping it with HTTP Authentication
	switch ( true ) {
		case this.config.auth === undefined:
		case !this.config.auth.hasOwnProperty( host ):
			op();
			break;
		default:
			if ( typeof this.config.auth[host].auth === "undefined" ) {
				this.config.auth[host].auth = http_auth( this.config.auth[host] );
			}
			this.config.auth[host].auth.apply( req, res, op );
	}
};
