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
		var self   = this,
		    params = {};

		// Loading config
		config.call(this, (newArgs || args));

		// Preparing parameters
		params.port = this.config.port;
		if (typeof this.config.csr !== "undefined") params.csr = this.config.csr;
		if (typeof this.config.key !== "undefined") params.csr = this.config.key;

		// Setting up server
		$.route.set("/.*",   function (res, req) { self.request(res, req); });
		$.route.set("error", function (res, req) { self.error(res, req); });
		this.server = $.route.server(params, this.error);
		this.active = true;
	}, "server");

	// After start listener
	this.on("afterStart", function () {
		if (this.config.debug) $.log("Started turtle.io on port " + this.config.port);
	}, "logging");

	// Restart listener
	this.on("beforeRestart", function () {
		this.stop().start();
	});

	// After restart listener
	this.on("afterRestart", function () {
		if (this.config.debug) $.log("Restarted turtle.io: " + this.id);
	});

	// Stop listener
	this.on("beforeStop", function () {
		if (this.server !== null) {
			$.route.del("/.*");
			$.route.del("error");
			this.server.close();
			this.server = null;
			this.active = false;
		}
	}, "vhosts");

	// After stop listener
	this.on("afterStop", function () {
		if (this.config.debug) $.log("Stopped turtle.io: " + this.id);
	}, "logging");

	return this;
};
