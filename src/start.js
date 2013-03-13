/**
 * Starts instance
 * 
 * @method start
 * @param  {Object} args Parameters to set
 * @return {Object}      Instance
 */
factory.prototype.start = function ( args ) {
	var self    = this,
	    params  = {},
	    headers = {};

	// Default headers
	headers = {
		"Server"       : "turtle.io/{{VERSION}}",
		"X-Powered-By" : (function () { return ("abaaso/" + $.version + " node.js/" + process.versions.node.replace( /^v/, "" ) + " (" + process.platform.capitalize() + " V8/" + process.versions.v8 + ")"); })()
	};

	// Capturing exceptions
	process.on( "uncaughtException", function ( err ) {
		self.log( err );
	});

	// Loading config
	config.call( this, args );

	// Applying default headers (if not overridden)
	$.iterate( headers, function ( v, k ) {
		if ( self.config.headers[k] === undefined ) {
			self.config.headers[k] = v;
		}
	});

	// Preparing parameters
	params.port = this.config.port;

	if ( this.config.csr !== undefined ) {
		params.csr = this.config.csr;
	}

	if ( this.config.key !== undefined ) {
		params.csr = this.config.key;
	}

	// Setting error route
	$.route.set( "error", function ( res, req ) {
		self.error( res, req );
	});

	// Setting default response route
	this.get( "/.*", this.request );

	// Creating a server
	this.server = $.route.server( params, function ( e ) { self.log( e, true ); } );
	this.active = true;

	// Setting acceptable lag
	toobusy.maxLag( this.config.lag );

	// Socket probe
	this.server.on( "connection", function () {
		dtp.fire( "connection", function ( p ) {
			return [self.server.connections];
		});
	});

	// Announcing state
	this.log( "Started turtle.io on port " + this.config.port );

	return this;
};
