/**
 * Routes a request to a handler
 *
 * @method route
 * @param  {Object} req Request Object
 * @param  {Object} res Response Object
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.route = function ( req, res ) {
	var url    = this.url( req ),
	    parsed = $.parse( url ),
	    method = req.method.toLowerCase(),
	    cached, handler, host, payload, route;

	/**
	 * Operation
	 *
	 * @method op
	 * @private
	 * @return {Undefined} undefined
	 */
	function op () {
		if ( handler ) {
			req.cookies = {};
			req.session = null;

			// Decorating valid cookies
			if ( req.headers.cookie !== undefined ) {
				req.headers.cookie.explode( ";" ).map(function ( i ) {
					return i.split( "=" );
				} ).each( function ( i ) {
					req.cookies[i[0]] = i[1];
				} );
			}

			// Decorates a session
			if ( req.cookies[this.config.session.id] ) {
				req.session = this.session.get( req, res );
			}

			// Setting listeners if expecting a body
			if ( REGEX_BODY.test( method ) ) {
				req.setEncoding( "utf-8" );

				req.on( "data", function ( data ) {
					payload = payload === undefined ? data : payload + data;
				} );

				req.on( "end", function () {
					req.body = payload;
					handler( req, res, host );
				} );
			}
			// Looking in LRU cache for Etag
			else if ( REGEX_GET.test( method ) ) {
				cached = this.etags.get( url );

				// Sending a 304 if Client is making a GET & has current representation
				if ( cached && !REGEX_HEAD.test( method ) && req.headers["if-none-match"] && req.headers["if-none-match"].replace( /\"/g, "" ) === cached.etag ) {
					this.respond( req, res, this.messages.NO_CONTENT, this.codes.NOT_MODIFIED, {"Content-Type": cached.mimetype, Etag: "\"" + cached.etag + "\""} );
				}
				else {
					handler( req, res, host );
				}
			}
			else {
				handler( req, res, host );
			}
		}
		else {
			this.error( req, res );
		}
	}

	// Finding a matching vhost
	this.vhostsRegExp.each( function ( i, idx ) {
		if ( i.test( parsed.hostname ) ) {
			return !( host = this.vhosts[idx] );
		}
	}.bind( this ) );

	if ( !host ) {
		host = this.config["default"] || "all";
	}

	if ( REGEX_HEAD.test( method ) ) {
		method = "get";
	}

	// Looking for a match
	this.handlers[method].regex.each( function ( i, idx ) {
		var x = this.handlers[method].routes[idx];

		if ( ( x in this.handlers[method].hosts[host] || x in this.handlers[method].hosts.all ) && i.test( parsed.pathname ) ) {
			route   = i;
			handler = ( this.handlers[method].hosts[host][x] || this.handlers[method].hosts.all[x] ).bind( this );
			return false;
		}
	}.bind( this ) );

	// Looking for a match against generic routes
	if ( !route ) {
		this.handlers.all.regex.each( function ( i, idx ) {
			var x = this.handlers.all.routes[idx];

			if ( ( x in this.handlers.all.hosts[host] || x in this.handlers.all.hosts.all ) && i.test( parsed.pathname ) ) {
				route   = i;
				handler = ( this.handlers.all.hosts[host][x] || this.handlers.all.hosts.all[x] ).bind( this );
				return false;
			}
		}.bind( this ) );
	}

	// Handling authentication
	this.auth( req, res, host, op.bind( this ) );

	return this;
};
