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
	    i       = -1,
	    bootstrap, error;

	// Merging config
	if ( args !== undefined ) {
		$.merge( this.config, args );
	}

	// Setting `Server` HTTP header
	if ( this.config.headers.Server === undefined ) {
		this.config.headers.Server = ( function () { return ( "turtle.io/{{VERSION}} (abaaso/" + $.version + " node.js/" + process.versions.node.replace( /^v/, "" ) + process.platform.capitalize() + " V8/" + process.versions.v8.toString().trim() + ")" ); } )();
	}

	if ( cluster.isMaster ) {
		// Minimum thread count is 3 [master, queue, (www - n)]
		if ( this.config.ps < 2 ) {
			this.config.ps = 2;
		}

		// Setting queueWorker to worker 1
		this.config.queueWorker = "1";

		// Announcing state
		console.log( "Starting turtle.io on port " + this.config.port );

		// Spawning child processes
		while ( ++i < this.config.ps ) {
			cluster.fork();
		}

		// Setting up worker events
		$.array.cast( cluster.workers ).each( function ( i, idx ) {
			i.on( "message", function ( msg ) {
				pass.call( self, msg );
			});

			i.on( "exit", function ( code, signal ) {
				var worker;

				if ( signal !== "SIGHUP" ) {
					// Queue worker was killed, re-route!
					if ( cluster.workers[self.config.queueWorker] === undefined ) {
						self.config.queueWorker = ( parseInt( $.array.keys( cluster.workers ).sort( $.array.sort ).last(), 10 ) + 1 ).toString();
					}

					worker = cluster.fork();
				}
			});
		});
	}
	else {
		// Starting queue processor
		// @todo exec mode() when re-routing
		if ( cluster.worker.id === "1" ) {
			this.mode( true );
		}
		// Starting http workers
		else {
			// Setting error handler
			if ( typeof fn === "function" ) {
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

			// Bootstrapping instance
			self.bootstrap.call( self, error );
		}
	}

	return this;
};
