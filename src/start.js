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
	    config, pages;

	config = $.clone( defaultConfig );

	// Merging custom with default config
	$.merge( config, cfg || {} );

	// Overriding default error handler
	if ( typeof err == "function" ) {
		this.error = err;
	}

	// Setting configuration
	if ( !config.port ) {
		config.port = 8000;
	}

	this.config = config;
	pages       = this.config.pages ? ( this.config.root + this.config.pages ) : ( __dirname + "/../pages" );

	// Looking for required setting
	if ( !this.config["default"] ) {
		this.log( new Error( "Invalid default virtual host" ) );
		process.exit( 1 );
	}

	// Setting session.expires
	this.session.valid = this.config.session.valid;

	// Setting `Server` HTTP header
	if ( !this.config.headers.Server ) {
		this.config.headers.Server = "turtle.io/{{VERSION}} (abaaso/" + $.version + " node.js/" + process.versions.node.replace( /^v/, "" ) + process.platform.capitalize() + " V8/" + process.versions.v8.toString().trim() + ")";
	}

	// Creating REGEX_REWRITE
	REGEX_REWRITE = new RegExp( "^(" + this.config.proxy.rewrite.join( "|" ) + ")$" );

	// Setting acceptable lag
	toobusy.maxLag( this.config.lag );

	// Setting default routes
	this.host( "all" );

	// Registering virtual hosts
	$.array.cast( config.vhosts, true ).each( function ( i ) {
		self.host( i );
	} );

	// Setting a default GET route
	if ( !this.handlers.get.routes.contains( ".*" ) ) {
		this.get( "/.*", function ( req, res, host ) {
			this.request( req, res, host );
		}, "all" );
	}

	// Loading default error pages
	fs.readdir( pages, function ( e, files ) {
		if ( e ) {
			console.log( e );
		}
		else {
			files.each( function ( i ) {
				self.pages.all[i.replace( REGEX_NEXT, "" )] = fs.readFileSync( pages + "/" + i, "utf8" );
			} );

			// Starting server
			if ( self.server === null ) {
				if ( config.ssl.cert !== null && config.ssl.key !== null ) {
					// Reading files
					config.ssl.cert = fs.readFileSync( config.ssl.cert );
					config.ssl.key  = fs.readFileSync( config.ssl.key );

					// Starting server
					self.server = https.createServer( $.merge( config.ssl, {port: config.port, host: config.address} ), function ( req, res ) {
						self.route( req, res );
					} ).listen( config.port, config.address );
				}
				else {
					self.server = http.createServer( function ( req, res ) {
						self.route( req, res );
					} ).listen( config.port, config.address );
				}
			}
			else {
				self.server.listen( config.port, config.address );
			}

			// Dropping process
			if ( self.config.uid && !isNaN( self.config.uid ) ) {
				process.setuid( self.config.uid );
			}

			console.log( "Started turtle.io on port " + config.port );
		}
	} );

	// For toobusy()
	process.on( "uncaughtException", function ( e ) {
		self.log( e.stack || e );
	} );

	return this;
};
