/**
 * Starts instance
 * 
 * @param  {Object} args Parameters to set
 * @return {Object}      Instance
 */
factory.prototype.start = function () {
	var params = {};

	// Announcing intention
	this.fire("beforeStart");

	// Setting up server parameters
	params.port = this.config.port;
	if (typeof this.config.csr !== "undefined") params.csr = this.config.csr;
	if (typeof this.config.key !== "undefined") params.csr = this.config.key;

	// Starting the server
	$.route.set("/.*", this.handler);
	this.server = $.route.server(params, this.error);
	this.active = true;

	// Announcing status
	this.fire("afterStart");

	if (this.debug) $.log("Started turtle.io (" + this.id + ") on port " + this.config.port);
	return this;
};
