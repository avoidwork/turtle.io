/**
 * Starts the instance
 *
 * @method start
 * @param  {Object}   config Configuration
 * @param  {Function} err    Error handler
 * @return {Object}          TurtleIO instance
 */
TurtleIO.prototype.start = function ( cfg, err ) {
	var self = this,
	    config, headers, pages;

	config = clone( defaultConfig, true );

	// Merging custom with default config
	merge( config, cfg || {} );

	// Duplicating headers for re-decoration
	headers = clone( config.headers, true );

	// Overriding default error handler
	if ( typeof err == "function" ) {
		this.error = err;
	}

	// Setting configuration
	if ( !config.port ) {
		config.port = 8000;
	}

	merge( this.config, config );

	pages    = this.config.pages ? ( this.config.root + this.config.pages ) : ( __dirname + "/../pages" );
	LOGLEVEL = this.levels.indexOf( this.config.logs.level );

	// Looking for required setting
	if ( !this.config["default"] ) {
		this.log( new Error( "[client 0.0.0.0] Invalid default virtual host" ), "error" );
		syslog.close();
		process.exit( 1 );
	}

	// Lowercasing default headers
	delete this.config.headers;
	this.config.headers = {};

	iterate( headers, function ( value, key ) {
		self.config.headers[key.toLowerCase()] = value;
	} );

	// Setting `Server` HTTP header
	if ( !this.config.headers.server ) {
		this.config.headers.server = "turtle.io/{{VERSION}}";
		this.config.headers["x-powered-by"] = "node.js/" + process.versions.node.replace( /^v/, "" ) + " " + string.capitalize( process.platform ) + " V8/" + string.trim( process.versions.v8.toString() );
	}

	// Creating REGEX_REWRITE
	REGEX_REWRITE = new RegExp( "^(" + this.config.proxy.rewrite.join( "|" ) + ")$" );

	// Setting default routes
	this.host( ALL );

	// Registering DTrace probes
	this.probes();

	// Registering virtual hosts
	array.each( array.cast( config.vhosts, true ), function ( i ) {
		self.host( i );
	} );

	// Loading default error pages
	fs.readdir( pages, function ( e, files ) {
		if ( e ) {
			self.log( new Error( "[client 0.0.0.0] " + e.message ), "error" );
		}
		else if ( array.keys( self.config ).length > 0 ) {
			array.each( files, function ( i ) {
				self.pages.all[i.replace( REGEX_NEXT, "" )] = fs.readFileSync( pages + "/" + i, "utf8" );
			} );

			// Starting server
			if ( self.server === null ) {
				// For proxy behavior
				if ( https.globalAgent.maxSockets < self.config.proxy.maxConnections ) {
					https.globalAgent.maxConnections = self.config.proxy.maxConnections;
				}

				if ( http.globalAgent.maxSockets < self.config.proxy.maxConnections ) {
					http.globalAgent.maxConnections = self.config.proxy.maxConnections;
				}

				if ( self.config.ssl.cert !== null && self.config.ssl.key !== null ) {
					// POODLE
					self.config.secureProtocol = "SSLv23_method";
					self.config.secureOptions  = constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2;

					// Reading files
					self.config.ssl.cert = fs.readFileSync( self.config.ssl.cert );
					self.config.ssl.key  = fs.readFileSync( self.config.ssl.key );

					// Starting server
					self.server = https.createServer( merge( self.config.ssl, {port: self.config.port, host: self.config.address, secureProtocol: self.config.secureProtocol, secureOptions: self.config.secureOptions} ), function ( req, res ) {
						self.route( req, res );
					} ).listen( self.config.port, self.config.address );
				}
				else {
					self.server = http.createServer( function ( req, res ) {
						self.route( req, res );
					} ).listen( self.config.port, self.config.address );
				}
			}
			else {
				self.server.listen( self.config.port, self.config.address );
			}

			// Dropping process
			if ( self.config.uid && !isNaN( self.config.uid ) ) {
				process.setuid( self.config.uid );
			}

			self.log( "Started turtle.io on port " + self.config.port, "debug" );
		}
	} );

	// Something went wrong, server must restart
	process.on( "uncaughtException", function ( e ) {
		self.log( e, "error" );
		process.exit( 1 );
	} );

	return this;
};
