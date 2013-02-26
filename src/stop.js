/**
 * Stops instance
 * 
 * @method stop
 * @return {Object} Instance
 */
factory.prototype.stop = function () {
	if (this.server !== null) {
		try { this.server.close(); }
		catch (e) { void 0; }
		this.active = false;
		this.server = null;
		this.unset("*");
	}

	// DTrace probe
	$.clearTimer("status");

	this.log("Stopped turtle.io on port " + this.config.port);
	return this;
};
