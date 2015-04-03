/**
 * Starts the instance
 *
 * @method start
 * @param  {Object}   config Configuration
 * @param  {Function} err    Error handler
 * @return {Object}          TurtleIO instance
 */
start ( cfg, err ) {
	let config, headers, pages;

	config = clone( defaultConfig, true );

	// Merging custom with default config
	merge( config, cfg || {} );

	this.dtp = dtrace.createDTraceProvider( config.id || "turtle-io" );

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

	// Setting temp folder
	this.config.tmp = this.config.tmp || os.tmpdir();

	pages = this.config.pages ? path.join( this.config.root, this.config.pages ) : path.join( __dirname, "../pages" );
	LOGLEVEL = LEVELS.indexOf( this.config.logs.level );
	LOGGING = this.config.logs.dtrace || this.config.logs.stdout;

	// Looking for required setting
	if ( !this.config[ "default" ] ) {
		this.log( new Error( "[client 0.0.0.0] Invalid default virtual host" ), "error" );
		process.exit( 1 );
	}

	// Lowercasing default headers
	delete this.config.headers;
	this.config.headers = {};

	iterate( headers, ( value, key ) => {
		this.config.headers[ key.toLowerCase() ] = value;
	} );

	// Setting `Server` HTTP header
	if ( !this.config.headers.server ) {
		this.config.headers.server = "turtle.io/{{VERSION}}";
		this.config.headers[ "x-powered-by" ] = "node.js/" + process.versions.node.replace( /^v/, "" ) + " " + string.capitalize( process.platform ) + " V8/" + string.trim( process.versions.v8.toString() );
	}

	// Creating regex.rewrite
	regex.rewrite = new RegExp( "^(" + this.config.proxy.rewrite.join( "|" ) + ")$" );

	// Setting default routes
	this.host( ALL );

	// Registering DTrace probes
	this.probes();

	// Registering virtual hosts
	array.each( array.cast( config.vhosts, true ), ( i ) => {
		this.host( i );
	} );

	// Loading default error pages
	fs.readdir( pages, ( e, files ) => {
		if ( e ) {
			this.log( new Error( "[client 0.0.0.0] " + e.message ), "error" );
		}
		else if ( array.keys( this.config ).length > 0 ) {
			array.each( files, ( i ) => {
				this.pages.all[ i.replace( regex.next, "" ) ] = fs.readFileSync( path.join( pages, i ), "utf8" );
			} );

			// Starting server
			if ( this.server === null ) {
				// For proxy behavior
				if ( https.globalAgent.maxSockets < this.config.proxy.maxConnections ) {
					https.globalAgent.maxConnections = this.config.proxy.maxConnections;
				}

				if ( http.globalAgent.maxSockets < this.config.proxy.maxConnections ) {
					http.globalAgent.maxConnections = this.config.proxy.maxConnections;
				}

				if ( this.config.ssl.cert !== null && this.config.ssl.key !== null ) {
					// POODLE
					this.config.secureProtocol = "SSLv23_method";
					this.config.secureOptions = constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2;

					// Reading files
					this.config.ssl.cert = fs.readFileSync( this.config.ssl.cert );
					this.config.ssl.key = fs.readFileSync( this.config.ssl.key );

					// Starting server
					this.server = https.createServer( merge( this.config.ssl, {
						port: this.config.port,
						host: this.config.address,
						secureProtocol: this.config.secureProtocol,
						secureOptions: this.config.secureOptions
					} ), ( req, res ) => {
						this.route( req, res );
					} ).listen( this.config.port, this.config.address );
				}
				else {
					this.server = http.createServer( ( req, res ) => {
						this.route( req, res );
					} ).listen( this.config.port, this.config.address );
				}
			}
			else {
				this.server.listen( this.config.port, this.config.address );
			}

			// Dropping process
			if ( this.config.uid && !isNaN( this.config.uid ) ) {
				process.setuid( this.config.uid );
			}

			this.log( "Started " + this.config.id + " on port " + this.config.port, "debug" );
		}
	} );

	// Something went wrong, server must restart
	process.on( "uncaughtException", ( e ) => {
		this.log( e, "error" );
		process.exit( 1 );
	} );

	return this;
}
