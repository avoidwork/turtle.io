/**
 * Stops instance
 * 
 * @return {Object} Instance
 */
factory.prototype.stop = function () {
	this.fire("beforeStop");
	this.active = false;
	if (this.debug) $.log("Stopped turtle.io instance: " + this.id);
	this.config.data.teardown();
	this.vhosts.data.teardown();
	this.fire("afterStop");
	return this;
};
