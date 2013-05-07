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

		this.active = false;
		this.server = null;

		this.mode( false );
		this.unset( "*" );
	}

	// Removing hooks to process
	process.removeAllListeners("on");

	// Stopping log flush
	$.clearTimer( "logs" );

	console.log( "Stopped turtle.io on port " + this.config.port );

	return this;
};
