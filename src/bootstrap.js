/**
 * Bootstraps instance
 *
 * Loads configuration, applies optional args & sets listeners
 * 
 * @param  {Object} args Overrides or optional properties to set
 * @return {Object} Instance
 */
var bootstrap = function (args) {
	var headers = {
		"Accept"                       : "text/html, text/plain",
		"Allow"                        : "",
		"Content-Type"                 : "text/html; charset=utf-8",
		"Date"                         : "",
		"Last-Modified"                : "",
		"Server"                       : "turtle.io/{{VERSION}}",
		"X-Powered-By"                 : (function () { return ("abaaso/" + $.version + " node.js/" + process.versions.node.replace(/^v/, "") + " (" + process.platform.capitalize() + " V8/" + process.versions.v8 + ")"); })(),
		"Access-Control-Allow-Headers" : "Accept, Allow, Cache-Control, Content-Type, Date, Etag, Transfer-Encoding, Server",
		"Access-Control-Allow-Methods" : "",
		"Access-Control-Allow-Origin"  : ""
	};

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
		console.log("Started turtle.io on port " + this.config.port);
	}, "logging");

	// Restart listener
	this.on("beforeRestart", function () {
		this.stop().start();
	});

	// After restart listener
	this.on("afterRestart", function () {
		console.log("Restarted turtle.io on port " + this.config.port);
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
		console.log("Stopped turtle.io on port " + this.config.port);
	}, "logging");

	return this;
};
