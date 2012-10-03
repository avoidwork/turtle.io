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

		// Applying default headers (if not overridden)
		$.iterate(headers, function (v, k) {
			if (typeof self.config.headers[k] === "undefined") self.config.headers[k] = v;
		});

		// Preparing parameters
		params.port = this.config.port;
		if (typeof this.config.csr !== "undefined") params.csr = this.config.csr;
		if (typeof this.config.key !== "undefined") params.csr = this.config.key;

		// Setting error route
		$.route.set("error", function (res, req) { self.error(res, req); });

		// Setting default response route
		this.get("/.*", this.request);

		// Creating a server
		this.server = $.route.server(params, function (e) { self.log(e, true); });
		this.active = true;
	}, "server");

	// After start listener
	this.on("afterStart", function () {
		this.log("Started turtle.io on port " + this.config.port);
	}, "logging");

	// Restart listener
	this.on("beforeRestart", function () {
		this.stop().start();
	});

	// After restart listener
	this.on("afterRestart", function () {
		this.log("Restarted turtle.io on port " + this.config.port);
	});

	// Stop listener
	this.on("beforeStop", function () {
		if (this.server !== null) {
			try { this.server.close(); }
			catch (e) { void 0; }
			this.active = false;
			this.server = null;
			this.unset("*");
		}
	}, "vhosts");

	// After stop listener
	this.on("afterStop", function () {
		this.log("Stopped turtle.io on port " + this.config.port);
	}, "logging");

	return this;
};
