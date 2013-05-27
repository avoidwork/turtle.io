/**
 * Starts instance
 * 
 * @method start
 * @param  {Object}   args         Parameters to set
 * @param  {Function} errorHandler [Optional] Error handler
 * @return {Object}                Instance
 */
factory.prototype.start = function ( args, errorHandler ) {
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

	// Setting error handler
	this.config.errorHandler  = errorHandler;

	if ( cluster.isMaster ) {
		// Message passing
		msg = function ( msg ) {
			pass.call( self, msg );
		};

		// Signal handler
		sig = function ( code, signal ) {
			var worker;

			// Only restarting if a SIGTERM wasn't received, e.g. SIGKILL or SIGHUP
			if ( signal !== TERM_SIG && code !== TERM_CODE ) {
				// Queue worker was killed, re-route!
				if ( cluster.workers[self.config.queue.id.toString()] === undefined ) {
					self.config.queue.id = parseInt( $.array.keys( cluster.workers ).sort( $.array.sort ).last(), 10 ) + 1;
				}

				// Forking new queue process
				worker = cluster.fork();
				worker.on( "message", msg );
				worker.on( "exit",    sig );

				// Announcing new queue worker
				msg( {ack: false, cmd: MSG_ALL, altCmd: MSG_QUE_ID, id: $.uuid( true ), arg: self.config.queue.id, worker: MSG_MASTER} );
			}
		};

		// Minimum process count is 3 [master, queue, www(1+)]
		if ( this.config.ps < 2 ) {
			this.config.ps = 2;
		}

		// Announcing state
		console.log( "Starting turtle.io on port " + this.config.port );

		// Spawning child processes
		while ( ++i < this.config.ps ) {
			cluster.fork();
		}

		// Setting up worker events
		$.array.cast( cluster.workers ).each( function ( i, idx ) {
			i.on( "message", msg );
			i.on( "exit",    sig );
		});
	}
	else {
		// This is only meant to capture Errors emitted from node.js,
		// such as a Stream Error in stream.js, which allows toobusy to do it's job
		process.on("uncaughtException", function ( e ) {
			self.log( e );
		});

		// Setting message listener
		process.on( "message", function ( arg ) {
			self.receiveMessage.call( self, arg );
		});

		// Notifying master
		this.sendMessage( MSG_READY, null );
	}

	return this;
};
