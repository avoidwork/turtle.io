/**
 * Restarts instance
 * 
 * @method restart
 * @return {Object} instance
 */
factory.prototype.restart = function () {
	var config;

	if ( cluster.isMaster ) {
		config = this.config;
		this.stop().start( config );
	}

	return this;
};
