/**
 * turtle.io
 *
 * Webserver built on  abaaso & node.js
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright Jason Mulligan 2012
 * @license BSD-3 <http://opensource.org/licenses/BSD-3-Clause>
 * @link https://github.com/avoidwork/turtle.io
 * @version 0.0.1
 */

(function (global) {
"use strict";

var $          = require("abaaso"),
    util       = require("util"),
    crypto     = require("crypto"),
    fs         = require("fs"),
    mmm        = require('mmmagic'),
    Magic      = mmm.Magic,
    magic      = new Magic(mmm.MAGIC_MIME_TYPE),
    moment     = require("moment"),
    REGEX_HALT = new RegExp("ReferenceError|" + $.label.error.invalidArguments),
    REGEX_BODY = /head|options/i,
    REGEX_GET  = /get|head|options/i;

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
	    id     = args.id || (config.id || $.genId());

	// Merging args into config
	$.merge(config, args);
	delete config.id;

	// Initial execution
	if (this.id.isEmpty()) {
		this.id     = id;
		this.config = config;
	}

	if (this.config.debug) this.log("Loaded configuration");

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
	this.version = "0.0.1";

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
	REGEX_GET.test(req.method) ? this.respond(req, res, messages.NOT_FOUND,   codes.NOT_FOUND)
	                           : this.respond(req, res, messages.NOT_ALLOWED, codes.NOT_ALLOWED);
	return this.log("Server could not respond to request");
};

/**
 * Logs an exception
 * 
 * @param  {Mixed}   err     Error Object or String
 * @param  {Boolean} display [Optional] Displays error on the console
 * @return {Undefined}       undefined
 */
factory.prototype.log = function (err, display) {
	display = (display !== false);

	var date, filename, text;

	// Displaying on the console
	if (display) $.log(err);

	// Writing to log file if config is loaded
	if (typeof this.config.logs !== "undefined") {
		date     = new Date();
		text     = moment(date).format("HH:MM:SS") + " " + err + "\n" + (typeof err.stack !== "undefined" ? err.stack + "\n" : "");
		filename = this.config.logs.file.replace(/\{\{date\}\}/, moment(date).format(this.config.logs.date));
		fs.appendFile(("./logs/" + filename), text, function (e) {
			if (e) return $.log("Could not write to error log");

			// Halting on fundamental error
			if (REGEX_HALT.test(err)) process.exit(0);
		});
	}
	else if (REGEX_HALT.test(err)) process.exit(0);

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
		process : {}
	};

	// Startup parameters
	$.iterate(this.config, function (v, k) {
		state.config[k] = v;
	});

	// Process information
	state.process.memory = process.memoryUsage();
	state.process.pid    = process.pid;

	// Virtual hosts
	state.vhosts = {
		servers : this.vhosts.data.get(),
		total   : this.vhosts.data.total
	};

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
 * Default response headers
 * 
 * @type {Object}
 */
var headers = {
	"Accept"        : "text/html, application/json, text/plain",
	"Allow"         : "GET, HEAD, OPTIONS",
	"Cache-Control" : "max-age=3600 must-revalidate",
	"Content-Type"  : "text/html",
	"Date"          : "",
	"Server"        : "turtle.io/0.0.1 abaaso/" + $.version + " node.js/" + process.versions.node.replace(/^v/, "") + " (" + process.platform.capitalize() + " V8/" + process.versions.v8 + ")",
	"Access-Control-Allow-Methods" : "GET, HEAD, OPTIONS",
	"Access-Control-Allow-Origin"  : "*",
	"Access-Control-Allow-Headers" : "Allow, Cache-Control, Content-Type, Etag",
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
