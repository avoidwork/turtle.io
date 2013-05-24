/**
 * Starts instance
 * 
 * @method start
 * @param  {Object}   args Parameters to set
 * @param  {Function} fn   [Optional] Error handler
 * @return {Object}        Instance
 */
factory.prototype.start = function ( args, fn ) {
	var self    = this,
	    params  = {},
	    headers = {},
	    error;

	// Setting error handler
	if (typeof fn === "function") {
		error = fn;
	}
	else {
		error = function ( res, req, timer ) {
			var body   = messages.NOT_FOUND,
			    status = codes.NOT_FOUND,
			    method = req.method.toLowerCase(),
			    host   = req.headers.host.replace( /:.*/, "" );

			if ( !REGEX_GET.test( method ) ) {
				if ( allowed( req.method, req.url, host ) ) {
					body   = messages.ERROR_APPLICATION;
					status = codes.ERROR_APPLICATION;
				}
				else {
					body   = messages.NOT_ALLOWED;
					status = codes.NOT_ALLOWED;
				}
			}

			self.respond( res, req, body, status, {"Cache-Control": "no-cache"}, timer, false );
		}
	}

	// Default headers
	headers = {
		"Server"       : "turtle.io/{{VERSION}}",
		"X-Powered-By" : ( function () { return ( "abaaso/" + $.version + " node.js/" + process.versions.node.replace( /^v/, "" ) + " (" + process.platform.capitalize() + " V8/" + process.versions.v8.toString().trim() + ")" ); } )()
	};

	// Loading config
	config.call( this, args );

	// Applying default headers (if not overridden)
	$.iterate( headers, function ( v, k ) {
		if ( self.config.headers[k] === undefined ) {
			self.config.headers[k] = v;
		}
	});

	// Preparing parameters
	params.port           = this.config.port;
	params.maxConnections = this.config.maxConnections;

	if ( this.config.csr !== undefined ) {
		params.csr = this.config.csr;
	}

	if ( this.config.key !== undefined ) {
		params.csr = this.config.key;
	}

	// Registering dtrace probes
	if (this.config.probes) {
		probes();
	}

	// Setting error route
	$.route.set( "error", function ( res, req, timer ) {
		error( res, req, timer );
	});

	// Setting optional queue status route
	if ( this.config.queue.status ) {
		this.get( "/queue", function ( res, req, timer ) {
			this.respond( res, req, {next: "/queue/:item", items: $.array.cast( this.requestQueue.registry, true )}, 200, {"Cache-Control": "no-cache"}, timer, false );
		});

		this.get( "/queue/.*", function ( res, req, timer ) {
			var uuid = req.url.replace(/.*\/queue\/?/, "");

			if ( uuid.indexOf( "/" ) > -1 ) {
				self.error( res, req, timer );
			}
			else {
				self.queueStatus( res, req, uuid, timer );
			}
		});
	}

	// Setting default response route
	this.get( "/.*", this.request );

	// Creating a server
	this.active = true;
	this.server = $.route.server( params, function ( e ) {
		self.log( e, true );
	});

	// Setting acceptable lag
	toobusy.maxLag( this.config.lag );

	// Socket probe
	this.server.on( "connection", function () {
		dtp.fire( "connection", function ( p ) {
			return [self.server.connections];
		});
	});

	// Starting queue processor
	this.mode( true );

	// This is only meant to capture Errors emitted from node.js,
	// such as a Stream Error in stream.js, which allows toobusy to do it's job
	process.on("uncaughtException", function ( e ) {
		self.log( e );
	});

	// Flushing logs to disk on a timer
	fs.appendFile( "/var/log/" + this.config.logs.file, "", function ( e ) {
		if ( e ) {
			fs.exists( __dirname + "/../log/" + self.config.logs.file, function ( exists ) {
				var file = __dirname + "/../log/" + self.config.logs.file;

				if ( !exists ) {
					fs.writeFileSync( file, "" );
				}

				$.repeat( function () {
					self.flush( file );
				}, self.config.logs.flush, "logs");
			});
		}
		else {
			$.repeat( function () {
				self.flush( "/var/log/" + self.config.logs.file );
			}, self.config.logs.flush, "logs");
		}
	});

	// Setting internal reference
	this.session.server = this;

	// Announcing state
	console.log( "Started turtle.io on port " + this.config.port );

	return this;
};
