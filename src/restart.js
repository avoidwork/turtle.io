/**
 * Restarts instance
 *
 * @method restart
 * @public
 * @return {Object} instance
 */
factory.prototype.restart = function () {
	if ( cluster.isMaster ) {
		this.stop().start();
	}

	return this;
};
