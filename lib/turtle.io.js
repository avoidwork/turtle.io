/**
 * turtle.io
 *
 * Easy to use web server with virtual hosts
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright Jason Mulligan 2012
 * @license BSD-3 <http://opensource.org/licenses/BSD-3-Clause>
 * @link https://github.com/avoidwork/turtle.io
 * @version 0.0.2a
 */

(function (global) {
"use strict";

var $          = require("abaaso"),
    crypto     = require("crypto"),
    fs         = require("fs"),
    mmm        = require("mmmagic"),
    moment     = require("moment"),
    url        = require("url"),
    util       = require("util"),
    Magic      = mmm.Magic,
    magic      = new Magic(mmm.MAGIC_MIME_TYPE),
    REGEX_HALT = new RegExp("ReferenceError|" + $.label.error.invalidArguments),
    REGEX_BODY = /head|options/i,
    REGEX_GET  = /get|head|options/i;

/**
 * Verifies a method is allowed on a URI
 * 
 * @param  {String} method HTTP verb
 * @param  {String} uri    URI to query
 * @return {Boolean}       Boolean indicating if method is allowed
 */
var allowed = function (method, uri) {
	var result = true;

	return result;
};

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
		this.get("/.*", function (res, req) { self.request(res, req); });

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

/**
 * HTTP (semantic) status codes
 * 
 * @type {Object}
 */
var codes = {
	SUCCESS           : 200,
	CREATED           : 201,
	ACCEPTED          : 202,
	NO_CONTENT        : 204,
	INVALID_ARGUMENTS : 400,
	INVALID_AUTH      : 401,
	FORBIDDEN         : 403,
	NOT_FOUND         : 404,
	NOT_ALLOWED       : 405,
	CONFLICT          : 409,
	ERROR_APPLICATION : 500,
	ERROR_SERVICE     : 503
};

/**
 * Loads & applies the configuration file
 * 
 * @param  {Object} args [Optional] Overrides or optional properties to set
 * @return {Object}      Instance
 */
var config = function (args) {
	if (!(args instanceof Object)) args = {};

	var config = require("../config.json"),
	    id     = this.id || (args.id || (config.id || $.genId()));

	// Merging args into config
	$.merge(config, args);
	delete config.id;

	// Loading if first execution or config has changed
	if (this.id !== id || $.encode(this.config) !== $.encode(config)) {
		this.id     = id;
		this.config = config;
	}

	return this;
};

/**
 * Instance Factory
 * 
 * @param  {Object} args [Optional] Properties to set
 * @return {Object}      Instance of turtle.io
 */
var factory = function (args) {
	var self = this;

	this.active  = false;
	this.id      = "";
	this.config  = {};
	this.server  = null;
	this.version = "0.0.2a";

	bootstrap.call(self, args);

	return this;
};

/**
 * Error handler for all requests
 * 
 * @param  {Object} res Response Object
 * @param  {Object} req Request Object
 * @return {Object}     Instance
 */
factory.prototype.error = function (res, req) {
	REGEX_GET.test(req.method) ? this.respond(res, req, messages.NOT_FOUND,   codes.NOT_FOUND)
	                           : this.respond(res, req, messages.NOT_ALLOWED, codes.NOT_ALLOWED);
};

/**
 * Logs a message
 * 
 * @param  {Mixed}   msg     Error Object or String
 * @param  {Boolean} error   [Optional] Write to error log (default: false)
 * @param  {Boolean} display [Optional] Displays msgor on the console (default: true)
 * @return {Undefined}       undefined
 */
factory.prototype.log = function (msg, error, display) {
	error   = (error   === true);
	display = (display !== false);

	var date, filename, text;

	// Displaying on the console
	if (display) $.log(msg);

	// Writing to log file if config is loaded
	if (typeof this.config.logs !== "undefined") {
		date     = new Date();
		text     = moment(date).format("HH:MM:SS") + " " + msg + "\n" + (typeof msg.stack !== "undefined" ? msg.stack + "\n" : "");
		filename = this.config.logs[error ? "error" : "daemon"].replace(/\{\{date\}\}/, moment(date).format(this.config.logs.date));
		fs.appendFile(("./logs/" + filename), text, function (e) {
			if (e) return $.log("Could not write to msgor log");

			// Halting on fundamental msgor
			if (REGEX_HALT.test(msg)) process.exit(0);
		});
	}
	else if (REGEX_HALT.test(msg)) process.exit(0);

	return this;
};

/**
 * Request handler
 * 
 * @param  {Object} req HTTP(S) request Object
 * @param  {Object} res HTTP(S) response Object
 * @return {Object}     Instance
 * @todo  Implement POST & PUT
 */
factory.prototype.request = function (res, req) {
	var self    = this,
	    host    = req.headers.host.indexOf(":") > -1 ? (/(.*)?:/.exec(req.headers.host)[1]) : req.headers.host,
	    parsed  = url.parse(req.url, true),
	    method  = REGEX_GET.test(req.method) ? "get" : req.method,
	    error   = function (err) {
	    	if (typeof err !== "undefined") self.log(err, true, true);
	    	self.respond(res, req, messages.ERROR_APPLICATION, codes.ERROR_APPLICATION);
	    },
	    path    = [],
	    handled = false,
	    port    = this.config.port,
	    root, handle, nth, count;

	if (!this.config.vhosts.hasOwnProperty(host)) return error();

	root = this.config.root + "/" + this.config.vhosts[host];

	if (!parsed.hasOwnProperty("host"))     parsed.host     = req.headers.host;
	if (!parsed.hasOwnProperty("protocol")) parsed.protocol = "http:";

	// Handles the request after determining the path
	handle = function (path, url) {
		handled = true;
		url     = parsed.protocol + "//" + req.headers.host.replace(/:.*/, "") + ":" + port + url;

		if (self.config.debug) self.log("[" + method.toUpperCase() + "] " + url);
		if (!allowed(method, url)) self.respond(res, req, messages.NOT_ALLOWED, codes.NOT_ALLOWED);
		else fs.exists(path, function (exists) {
			if (!exists) self.respond(res, req, messages.NOT_FOUND, codes.NOT_FOUND);
			else {
				switch (req.method.toLowerCase()) {
					case "delete":
						fs.unlink(path, function (err) {
							if (err) error(err);
							else self.respond(res, req, messages.NO_CONTENT, codes.NO_CONTENT)
						});
						break;

					case "get":
					case "head":
					case "options":
						magic.detectFile(path, function (err, mimetype) {
							if (err) error(err);
							else {
								if (req.method.toLowerCase() === "get") {
									fs.readFile(path, function (err, data) {
										if (err) error(err);
										else self.respond(res, req, data, codes.SUCCESS, {"Content-Type": mimetype});
									});
								}
								else self.respond(res, req, null, codes.SUCCESS, {"Content-Type": mimetype});
							}
						});
						break;

					default:
						self.error(res, req);
				}
			}
		});
	}

	if (!/\/$/.test(parsed.pathname)) handle(root + parsed.pathname, parsed.pathname);
	else {
		nth   = this.config.index.length;
		count = 0;
		this.config.index.each(function (i) {
			fs.exists(root + parsed.pathname + i, function (exists) {
				if (exists && !handled) handle(root + parsed.pathname + i, parsed.pathname + i);
				else if (!exists && ++count === nth) self.respond(res, req, messages.NOT_FOUND, codes.NOT_FOUND);
			});
		});
	}

	return this;
};
/**
 * Echoes a response
 * 
 * @param  {Object}  res             Response object
 * @param  {Object}  req             Request object
 * @param  {Mixed}   output          [Optional] String or Object (automatically encoded as JSON, triggers application/json content-type header)
 * @param  {Number}  status          [Optional] HTTP status code, default is 200
 * @param  {Object}  responseHeaders [Optional] HTTP headers to decorate the response with
 * @param  {Boolean} end             Signal the end of transmission, default is true
 * @return {Objet}                   Instance
 */
factory.prototype.respond = function (res, req, output, status, responseHeaders, end) {
	var body = !REGEX_BODY.test(req.method),
	    get  = REGEX_GET.test(req.method);

	// Setting optional params
	if (typeof status === "undefined") status = codes.SUCCESS;
	if (!(responseHeaders instanceof Object)) responseHeaders = {};
	end = (end !== false);

	// Setting default headers
	$.merge(responseHeaders, this.config.headers instanceof Object ? this.config.headers : headers);

	// Setting headers
	responseHeaders["Date"] = new Date().toUTCString();
	if (body && get) {
		switch (true) {
			case end && status === codes.SUCCESS:
				responseHeaders.Etag = crypto.createHash("md5").update(output).digest("hex");
				break;
			case !end:
				responseHeaders["Transfer-Encoding"] = "chunked";
				break;
		}
		responseHeaders["Content-Length"] = String(output).length;
	}

	// Setting the response status code
	res.statusCode = status;

	// Removing cache centric header, we don't want these responses cached
	if (!get || status >= codes.INVALID_ARGUMENTS) delete responseHeaders["Cache-Control"];

	// Decorating response with headers
	$.iterate(responseHeaders, function (v, k) {
		res.setHeader(k, v);
	});

	// Writing Entity body if valid
	if (body) res.write(output);

	// Signally the end, send it to the Client
	if (end) res.end();

	return this;
};

/**
 * Restarts instance
 * 
 * @return {Object} instance
 */
factory.prototype.restart = function () {
	return this.fire("beforeRestart, afterRestart");
};

/**
 * Starts instance
 * 
 * @param  {Object} args Parameters to set
 * @return {Object}      Instance
 */
factory.prototype.start = function (args) {
	return this.fire("beforeStart, afterStart", args);
};

/**
 * Returns an Object describing the instance's status
 * 
 * @return {Object} Status
 */
factory.prototype.status = function () {
	var state = {
		config  : {},
		process : {},
		server  : {}
	};

	// Startup parameters
	$.iterate(this.config, function (v, k) {
		state.config[k] = v;
	});

	// Process information
	state.process.memory = process.memoryUsage();
	state.process.pid    = process.pid;

	// Server information
	state.server.address        = this.server.address();
	state.server.connections    = this.server.connections;
	state.server.maxConnections = this.server.macConnections;

	return state;
};

/**
 * Stops instance
 * 
 * @return {Object} Instance
 */
factory.prototype.stop = function () {
	return this.fire("beforeStop, afterStop");
};

/**
 * Unsets a route
 * 
 * @param  {String} route URI Route
 * @param  {String} verb  HTTP method
 * @return {Object}       Instance
 */
factory.prototype.unset = function (route, verb) {
	var verbs = ["all", "delete", "get", "post", "put"];

	if (route === "*") {
		verbs.each(function (verb) {
			$.route.list(verb).each(function (route) {
				// Can't delete error route, only override it
				if (route === "error" && verb === "all") return;
				$.route.del(route, verb);
			});
		});
	}
 	else $.route.del(route, verb);
 	return this;
};

/**
 * Sets a DELETE route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @return {Object}         Instance
 */
factory.prototype.delete = function (route, fn) {
	$.route.set(route, fn, "delete");
	return this;
};

/**
 * Sets a GET route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @return {Object}         Instance
 */
factory.prototype.get = function (route, fn) {
	$.route.set(route, fn, "get");
	return this;
};

/**
 * Sets a POST route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @return {Object}         Instance
 */
factory.prototype.post = function (route, fn) {
	$.route.set(route, fn, "post");
	return this;
};

/**
 * Sets a DELETE route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @return {Object}         Instance
 */
factory.prototype.put = function (route, fn) {
	$.route.set(route, fn, "put");
	return this;
};

/**
 * Default response headers
 * 
 * @type {Object}
 */
var headers = {
	"Accept"                       : "text/html, text/plain",
	"Allow"                        : "GET, HEAD, OPTIONS",
	"Content-Type"                 : "text/html",
	"Date"                         : "",
	"Server"                       : "turtle.io/0.0.2a abaaso/" + $.version + " node.js/" + process.versions.node.replace(/^v/, "") + " (" + process.platform.capitalize() + " V8/" + process.versions.v8 + ")",
	"Access-Control-Allow-Methods" : "GET, HEAD, OPTIONS",
	"Access-Control-Allow-Origin"  : "*",
	"Access-Control-Allow-Headers" : "Accept, Allow, Cache-Control, Content-Type, Date, Etag, Transfer-Encoding, Server"
};

/**
 * HTTP (semantic) status messages
 * 
 * @type {Object}
 */
var messages = {
	SUCCESS           : "Successful",
	CREATED           : "Created",
	ACCEPTED          : "Accepted",
	NO_CONTENT        : "No content",
	INVALID_ARGUMENTS : "Invalid arguments",
	INVALID_AUTH      : "Invalid authorization or OAuth token",
	FORBIDDEN         : "Forbidden",
	NOT_FOUND         : "Not found",
	NOT_ALLOWED       : "Method not allowed",
	CONFLICT          : "Conflict",
	ERROR_APPLICATION : "Application error",
	ERROR_SERVICE     : "Service is unavailable"
};

module.exports = factory;
})(this);
