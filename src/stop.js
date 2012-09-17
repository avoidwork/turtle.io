/**
 * Stops instance
 * 
 * @return {Object} Instance
 */
factory.prototype.stop = function () {
	this.active = false;
	if (this.debug) $.log("Stopped turtle.io instance: " + this.id);
	return this;
};
