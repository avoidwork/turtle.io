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
	    bootstrap, error, msg, sig;

	// Merging config
	if ( args !== undefined ) {
		$.merge( this.config, args );
	}

	// Setting `Server` HTTP header
	if ( this.config.headers.Server === undefined ) {
		this.config.headers.Server = ( function () { return ( "turtle.io/{{VERSION}} (abaaso/" + $.version + " node.js/" + process.versions.node.replace( /^v/, "" ) + process.platform.capitalize() + " V8/" + process.versions.v8.toString().trim() + ")" ); } )();
	}

	if ( cluster.isMaster ) {
		// Message passing
		msg = function ( msg ) {
			pass.call( self, msg );
		};

		// Signal handler
		sig = function ( code, signal ) {
			var worker;

			if ( signal !== "SIGHUP" ) {
				// Queue worker was killed, re-route!
				if ( cluster.workers[self.config.queueWorker] === undefined ) {
					self.config.queueWorker = ( parseInt( $.array.keys( cluster.workers ).sort( $.array.sort ).last(), 10 ) + 1 ).toString();
				}

				worker = cluster.fork();

				worker.on( "message", msg);
				worker.on( "exit",    sig);
			}
		};

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
			i.on( "message", msg);
			i.on( "exit",    sig);
		});
	}
	else {
		this.sendMessage( MSG_READY, cluster.worker.id );
	}

	return this;
};
