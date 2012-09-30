/**
 * Stops instance
 * 
 * @return {Object} Instance
 */
factory.prototype.stop = function () {
	return this.fire("beforeStop, afterStop");
};
