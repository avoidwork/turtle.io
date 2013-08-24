/**
 * Starts the instance
 *
 * @method start
 * @param  {Object}   config Configuration
 * @param  {Function} err    Error handler
 * @return {Object}          TurtleIO instance
 */
TurtleIO.prototype.start = function ( config, err ) {
	var self = this;

	config = config || {};

	if ( typeof err === "function" ) {
		this.error = err;
	}

	// Setting configuration
	if ( !config.port ) {
		config.port = 8000;
	}

	if ( !config.ip ) {
		config.ip = "127.0.0.1";
	}

	this.config = config;

	// Setting default routes
	this.host( "all" );

	// Registering virtual hosts
	$.array.cast( config.vhosts, true ).each( function ( i ) {
		self.host( i );
	} );

	// Setting a default GET route
	if ( !this.handlers.get.routes.contains( ".*" ) ) {
		this.get( ".*", function ( req, res ) {
			self.request( req, res );
		}, "all" );
	}

	// Starting server
	if ( this.config.cert !== undefined ) {
		console.log("ssl!");
	}
	else {
		this.server = http.createServer( function ( req, res ) {
			self.route( req, res );
		} ).listen( config.port, config.ip );
	}

	console.log( "Started turtle.io on port " + config.port );

	return this;
};
