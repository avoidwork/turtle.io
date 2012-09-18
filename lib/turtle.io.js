/**
 * turtle.io
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright Jason Mulligan 2012
 * @license BSD-3 <http://opensource.org/licenses/BSD-3-Clause>
 * @link https://github.com/avoidwork/turtle.io
 * @version 0.0.1
 */

(function (global) {
"use strict";

var $      = require("abaaso"),
    util   = require("util"),
    fs     = require("fs"),
    mmm    = require('mmmagic'),
    Magic  = mmm.Magic,
    magic  = new Magic(mmm.MAGIC_MIME_TYPE),
    moment = require("moment"),
    factory;

/**
 * Factory
 * 
 * @param  {Object} args [Optional] Properties to set
 * @return {Object}      Instance
 */
var factory = function (args) {
	args      = args || {};
	var self  = this,
	    regex = /^vhosts$/,
	    config, id;

	// Capturing exceptions
	process.on("uncaughtException", function (err) {
		self.log(err, true);
	});

	// Loading external config & setting id
	config = require("../config.json");
	id     = args.id || (config.id || $.genId()),

	// Merging args into config
	$.merge(config, args);
	delete config.id;

	// Decorating properties
	this.active = false;
	this.id     = id;
	this.config = config;
	this.server = null;

	// Removing vhost declarations
	delete this.config.vhosts;

	// Creating a data store for virtual hosts
	this.vhosts = $.store({id: this.id + "-vhosts"}, null, {key: "hostname"});

	// Hooking the observer
	$.observer.hook(this);

	// Populating vhosts if applicable
	if (this.vhosts.data.total === 0 && config.vhosts instanceof Array) this.vhosts.data.batch("set", config.vhosts);

	return this;
};

/**
 * Error handler for all requests
 * 
 * @param  {Object} req Request Object
 * @param  {Object} res Response Object
 * @return {Undefined}  undefined
 */
factory.prototype.error = function (req, res) {

};

/**
 * Request handler
 * 
 * @param  {Object} req Request object
 * @param  {Object} res Response object
 * @return {Undefined}  undefined
 */
factory.prototype.handler = function (req, res) {

};

/**
 * Logs an exception
 * 
 * @param  {Mixed}   err     Error Object or String
 * @param  {Boolean} display [Optional] Displays error on the console
 * @return {Undefined}       undefined
 */
factory.prototype.log = function (err, display) {
	var date, filename, text;

	// Displaying on the console
	if (display) $.log(err);

	// Writing to log file if config is loaded
	if (typeof this.config !== "undefined") {
		date     = new Date();
		text     = moment(date).format("HH:MM:SS") + " " + err + "\n" + (typeof err.stack !== "undefined" ? err.stack + "\n" : "");
		filename = this.config.logs.file.replace(/\{\{date\}\}/, moment(date).format(this.config.logs.date));
		fs.appendFile(filename, text);
	}
};

/**
 * Restarts instance
 * 
 * @return {Object} instance
 */
factory.prototype.restart = function () {
	if (this.debug) $.log("Restarting turtle.io instance: " + this.id);
	this.fire("beforeRestart");
	this.stop().start();
	this.fire("afterRestart");
};

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
	// Announcing intention
	this.fire("beforeStop");

	// Tearing down server (if applicable)
	if (this.server !== null) {
		this.active = false;
		this.server.close();
		this.server = null;
	}

	// Wiping config & observer
	this.config = {};
	this.vhosts.data.teardown();

	// Announcing shut down
	this.fire("afterStop");
	if (this.debug) $.log("Stopped turtle.io instance: " + this.id);

	return this;
};

module.exports = factory;
})(this);
