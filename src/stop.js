/**
 * Stops instance
 * 
 * @return {Object} Instance
 */
factory.prototype.stop = function () {
	this.fire("beforeStop");
	this.active = false;
	if (this.server !== null) this.server.close();
	this.config.data.teardown();
	this.vhosts.data.teardown();
	this.fire("afterStop");
	if (this.debug) $.log("Stopped turtle.io instance: " + this.id);
	return this;
};
