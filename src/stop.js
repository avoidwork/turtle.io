/**
 * Stops instance
 *
 * @method stop
 * @public
 * @return {Object} Instance
 */
factory.prototype.stop = function () {
	if ( cluster.isMaster ) {
		console.log( "Stopping turtle.io on port " + this.config.port );

		$.array.cast( cluster.workers ).each( function ( i ) {
			process.kill( i.process.pid, TERM_SIG );
		});

		this.registry = null;
		this.watching = {};
	}

	return this;
};
