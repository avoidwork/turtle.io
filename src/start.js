/**
 * Starts instance
 * 
 * @param  {Object} args Parameters to set
 * @return {Object}      Instance
 */
factory.prototype.start = function () {
	this.fire("beforeStart");
	this.active = true;
	//this.server = $.route.server(); // Pass in the args properly
	if (this.debug) $.log("Started turtle.io instance: " + this.id);
	this.fire("afterStart");
	return this;
};
