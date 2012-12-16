/**
 * Starts instance
 * 
 * @param  {Object} args Parameters to set
 * @return {Object}      Instance
 */
factory.prototype.start = function (args) {
	var self    = this,
	    params  = {},
	    headers = {};

	// Default headers
	headers = {
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

	// Announcing state
	this.log("Started turtle.io on port " + this.config.port);

	return this;
};
