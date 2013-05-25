/**
 * Stops instance
 * 
 * @method stop
 * @return {Object} Instance
 */
factory.prototype.stop = function () {
	if ( cluster.isMaster ) {
		console.log( "Stopping turtle.io on port " + this.config.port );
	}
	else {
		process.kill( process.pid, "SIGHUP" );
	}

	return this;
};
