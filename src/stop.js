/**
 * Stops instance
 * 
 * @method stop
 * @return {Object} Instance
 */
factory.prototype.stop = function () {
	// Shutting down the server
	if ( this.server !== null ) {
		try {
			this.server.close();
		}
		catch (e) {
			void 0;
		}

		// Resetting flags
		this.active = false;
		this.server = this.session.server = null;

		// Purging sessions
		this.sessions.data.clear( true );

		// Resetting queue
		this.mode( false );
		this.requestQueue = {
			flushing : false,
			items    : [],
			last     : null,
			times    : [],
			registry : {}
		};

		// Unsetting routes
		this.unset( "*" );
	}

	// Removing hooks to process
	process.removeAllListeners( "on" );

	// Stopping log flush
	$.clearTimer( "logs" );

	console.log( "Stopped turtle.io on port " + this.config.port );

	return this;
};
