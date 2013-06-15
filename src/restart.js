/**
 * Restarts instance
 *
 * @method restart
 * @return {Object} instance
 */
factory.prototype.restart = function () {
	if ( cluster.isMaster ) {
		this.stop().start();
	}

	return this;
};
