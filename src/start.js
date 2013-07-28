/**
 * Starts instance
 *
 * @method start
 * @param  {Object}   args         Parameters to set
 * @param  {Function} errorHandler [Optional] Error handler
 * @return {Object}                Instance
 */
factory.prototype.start = function ( args, errorHandler ) {
	var self  = this,
	    i     = -1,
	    pages, msg, sig;

	// Merging config
	if ( args !== undefined ) {
		$.merge( this.config, args );
	}

	// Setting `Server` HTTP header
	if ( this.config.headers.Server === undefined ) {
		this.config.headers.Server = ( function () { return ( "turtle.io/{{VERSION}} (abaaso/" + $.version + " node.js/" + process.versions.node.replace( /^v/, "" ) + process.platform.capitalize() + " V8/" + process.versions.v8.toString().trim() + ")" ); } )();
	}

	// Setting error handler
	if ( errorHandler !== undefined ) {
		this.config.errorHandler = errorHandler;
	}

	// Setting error page path
	pages = this.config.pages ? ( this.config.root + this.config.pages ) : ( __dirname + "/../pages" );

	// Creating LRU cache to hold Etags
	this.registry = $.lru( this.config.cache || 1000 );

	if ( cluster.isMaster ) {
		// Message passing
		msg = function ( msg ) {
			pass.call( self, msg );
		};

		// Signal handler
		sig = function ( code, signal ) {
			var newQueue = false,
			    worker;

			// Only restarting if a SIGTERM wasn't received, e.g. SIGKILL or SIGHUP
			if ( signal !== TERM_SIG && code !== TERM_CODE ) {
				// Queue worker was killed, re-route!
				if ( cluster.workers[self.config.queue.id.toString()] === undefined ) {
					newQueue = true;
					self.config.queue.id = $.array.keys( cluster.workers ).map( function ( i ) {
						return parseInt( i, 10 );
					}).sorted().last() + 1;
				}

				// Forking new queue process
				worker = cluster.fork();
				worker.on( "message", msg );
				worker.on( "exit",    sig );

				// Announcing new queue worker
				if ( newQueue ) {
					msg( {ack: false, cmd: MSG_ALL, altCmd: MSG_QUE_ID, id: $.uuid( true ), arg: self.config.queue.id, worker: MSG_MASTER} );
				}
			}
		};

		// Minimum process count is 3 [master, queue, www(1+)]
		if ( this.config.ps < 2 ) {
			this.config.ps = 2;
		}

		// Loading default error pages
		fs.readdir( pages, function ( e, files ) {
			if ( e ) {
				console.log( e );
			}
			else {
				files.each(function ( i ) {
					self.pages.all[i.replace( REGEX_NEXT, "" )] = fs.readFileSync( pages + "/" + i, "utf8"/*{encoding: "utf8"}*/ );
				});

				// Announcing state
				console.log( "Starting turtle.io on port " + self.config.port );

				// Spawning child processes
				while ( ++i < self.config.ps ) {
					cluster.fork();
				}

				// Setting up worker events
				$.array.cast( cluster.workers ).each( function ( i ) {
					i.on( "message", msg );
					i.on( "exit",    sig );
				});
			}
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
