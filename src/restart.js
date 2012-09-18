/**
 * Restarts instance
 * 
 * @return {Object} instance
 */
factory.prototype.restart = function () {
	if (this.debug) $.log("Restarting turtle.io instance: " + this.id);
	this.fire("beforeRestart");
	this.stop().start();
	this.fire("afterRestart");
};
