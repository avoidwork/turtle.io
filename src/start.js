/**
 * Starts the instance
 *
 * @method start
 * @param  {Object}   config Configuration
 * @param  {Function} err    Error handler
 * @return {Object}          TurtleIO instance
 */
TurtleIO.prototype.start = function ( config, err ) {
	var self = this,
	    pages;

	config = config || {};

	// Merging custom with default config
	$.merge( config, defaultConfig );

	// Overriding default error handler
	if ( typeof err === "function" ) {
		this.error = err;
	}

	// Setting configuration
	if ( !config.port ) {
		config.port = 8000;
	}

	if ( !config.address ) {
		config.address = "127.0.0.1";
	}

	this.config = config;
	pages       = this.config.pages ? ( this.config.root + this.config.pages ) : ( __dirname + "/../pages" );

	// Setting `Server` HTTP header
	if ( !this.config.headers.Server ) {
		this.config.headers.Server = "turtle.io/{{VERSION}} (abaaso/" + $.version + " node.js/" + process.versions.node.replace( /^v/, "" ) + process.platform.capitalize() + " V8/" + process.versions.v8.toString().trim() + ")";
	}

	// Setting default routes
	this.host( "all" );

	// Registering virtual hosts
	$.array.cast( config.vhosts, true ).each( function ( i ) {
		self.host( i );
	} );

	// Setting a default GET route
	if ( !this.handlers.get.routes.contains( ".*" ) ) {
		this.get( "/.*", function ( req, res ) {
			self.request( req, res );
		}, "all" );
	}

	// Loading default error pages
	fs.readdir( pages, function ( e, files ) {
		if ( e ) {
			console.log( e );
		}
		else {
			files.each(function ( i ) {
				self.pages.all[i.replace( REGEX_NEXT, "" )] = fs.readFileSync( pages + "/" + i, "utf8" );
			});

			// Starting server
			if ( self.server === null ) {
				if ( config.ssl.cert !== null && config.ssl.key !== null ) {
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

			console.log( "Started turtle.io on port " + config.port );
		}
	});

	return this;
};
