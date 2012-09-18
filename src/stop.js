/**
 * Stops instance
 * 
 * @return {Object} Instance
 */
factory.prototype.stop = function () {
	// Announcing intention
	this.fire("beforeStop");

	// Tearing down server (if applicable)
	if (this.server !== null) {
		this.active = false;
		this.server.close();
		this.server = null;
	}

	// Wiping config & observer
	this.vhosts.data.teardown();

	// Announcing shut down
	this.fire("afterStop");
	if (this.debug) $.log("Stopped turtle.io instance: " + this.id);

	return this;
};
