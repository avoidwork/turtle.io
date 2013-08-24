/**
 * Routes a request to a handler
 *
 * @method route
 * @param  {Object} req Request Object
 * @param  {Object} res Response Object
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.route = function ( req, res ) {
	var self   = this,
	    url    = this.url( req ),
	    parsed = $.parse( url ),
	    method = req.method.toLowerCase(),
	    cached, handler, host, payload, route;

	// Finding a matching vhost
	this.vhosts.each( function ( i ) {
		if ( i.test( parsed.hostname ) ) {
			return ! ( host = i.toString().replace( /^\/\^|\$\/$/g, "" ) );
		}
	} );

	if ( !host ) {
		host = this.config["default"] || "all";
	}

	// Looking for a match
	this.handlers[method].regex.each( function ( i, idx ) {
		var x = self.handlers[method].routes[idx];

		if ( ( x in self.handlers[method].hosts[host] || x in self.handlers[method].hosts.all ) && i.test( parsed.path ) ) {
			route   = i;
			handler = self.handlers[method].hosts[host][x] || self.handlers[method].hosts.all[x];
			return false;
		}
	} );

	// Looking for a match against generic routes
	if ( !route ) {
		this.handlers.all.regex.each( function ( i, idx ) {
			var x = self.handlers.all.routes[idx];

			if ( ( x in self.handlers.all.hosts[host] || x in self.handlers.all.hosts.all ) && i.test( parsed.path ) ) {
				route   = i;
				handler = self.handlers.all.hosts[host][x] || self.handlers.all.hosts.all[x];
				return false;
			}
		} );
	}

	if ( handler ) {
		// Decorating session
		req.session = {}; //self.session.get( req, res );

		// Setting listeners if expecting a body
		if ( REGEX_BODY.test( req.method ) ) {
			req.setEncoding( "utf-8" );

			req.on( "data", function ( data ) {
				payload = payload === undefined ? data : payload + data;
			});

			req.on( "end", function () {
				req.body = payload;
				handler.call( self, req, res );
			});
		}
		// Looking in LRU cache for Etag
		else if ( REGEX_GET.test( req.method ) ) {
			cached = self.etags.get( url );

			// Sending a 304 if Client is making a GET & has current representation
			if ( cached && !REGEX_HEAD.test( req.method ) && req.headers["if-none-match"] && req.headers["if-none-match"].replace( /\"/g, "" ) === cached.etag ) {
				self.respond( req, res, messages.NO_CONTENT, self.codes.NOT_MODIFIED, {"Content-Type": cached.mimetype, Etag: "\"" + cached.etag + "\""}, false );
			}
			else {
				handler.call( self, req, res );
			}
		}
		else {
			handler.call( self, req, res );
		}
	}
	else {
		this.error( req, res );
	}

	return this;
};
