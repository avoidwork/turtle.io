/**
 * Restarts instance
 * 
 * @method restart
 * @return {Object} instance
 */
factory.prototype.restart = function () {
	return this.stop().start();
};
