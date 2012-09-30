/**
 * Bootstraps instance
 *
 * Loads configuration, applies optional args & sets listeners
 * 
 * @param  {Object} args Overrides or optional properties to set
 * @return {Object} Instance
 */
var bootstrap = function (args) {
	// Loading config
	config.call(this, args);

	// Hooking the observer
	$.observer.hook(this);

	// Start listener
	this.on("beforeStart", function (newArgs) {
		var params = {};

		config.call(this, (newArgs || args));

		params.port = this.config.port;
		if (typeof this.config.csr !== "undefined") params.csr = this.config.csr;
		if (typeof this.config.key !== "undefined") params.csr = this.config.key;

		this.server = $.route.server(params, this.error);
		this.active = true;
	}, "server");

	// After start listener
	this.on("afterStart", function () {
		if (this.config.debug) $.log("Started turtle.io (" + this.id + ") on port " + this.config.port);
	}, "logging");

	// Restart listener
	this.on("beforeRestart", function () {
		this.stop().start();
	});

	// After restart listener
	this.on("afterRestart", function () {
		if (this.config.debug) $.log("Restarted turtle.io instance: " + this.id);
	});

	// Stop listener
	this.on("beforeStop", function () {
		if (this.server !== null) {
			$.route.del("/.*");
			this.active = false;
			this.server.close();
			this.server = null;
		}
	}, "vhosts");

	// After stop listener
	this.on("afterStop", function () {
		if (this.config.debug) $.log("Stopped turtle.io instance: " + this.id);
	}, "logging");

	return this;
};
