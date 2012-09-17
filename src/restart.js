/**
 * Restarts instance
 * 
 * @return {Object} instance
 */
factory.prototype.restart = function () {
	if (this.debug) $.log("Restarting turtle.io instance: " + this.id);
	this.stop();
	this.config.data.teardown();
	this.vhosts.data.teardown();
	this.start();
};
