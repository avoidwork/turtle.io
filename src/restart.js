/**
 * Restarts instance
 * 
 * @return {Object} instance
 */
factory.prototype.restart = function () {
	return this.fire("beforeRestart, afterRestart");
};
