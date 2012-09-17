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

var $    = require("abaaso"),
    util = require("util"),
    fs   = require("fs"),
    factory;

/**
 * Factory
 * 
 * @param  {Object} args [Optional] Properties to set
 * @return {Object}      Instance
 */
var factory = function (args) {
	var config  = require("../config.json"),
	    self    = this,
	    regex   = /^vhosts$/;

	args        = args    || {};
	this.active = false;
	this.id     = args.id || $.genId();
	this.config = $.store({id: this.id + "-config"}, null, {key: "name"});
	this.params = args;
	this.vhosts = $.store({id: this.id + "-vhosts"}, null, {key: "hostname"});

	$.iterate(config, function (v, k) {
		if (!regex.test(k)) this[k] = v;
	});

	if (this.vhosts.data.total === 0 && config.vhosts instanceof Array) this.vhosts.data.batch("set", config.vhosts);

	return this;
};

/**
 * Restarts instance
 * 
 * @return {Object} instance
 */
factory.prototype.restart = function () {
	if (this.debug) $.log("Restarting turtle.io instance: " + this.id);
	this.stop();
	this.config.data.teardown();
	this.vhosts.data.teardown();
	this.start();
};

/**
 * Starts instance
 * 
 * @param  {Object} args Parameters to set
 * @return {Object}      Instance
 */
factory.prototype.start = function () {
	var args = this.params;

	process.argv.each(function (i) {
		var val = [];

		if (i.indexOf("=") > -1) {
			val = i.explode("=");
			args[val[0]] = val[1];
		}
		else args[i] = true;
	});

	this.config.data.batch("set", args);
	this.active = true;

	if (this.debug) $.log("Started turtle.io instance: " + this.id);

	return this;
};

/**
 * Returns an Object describing the instance's status
 * 
 * @return {Object} Status
 */
factory.prototype.status = function () {
	var state = {config: {}};

	// Startup parameters
	this.config.data.get().each(function (rec) {
		state.config[rec.key] = rec.data.value;
	});

	state.memory = process.memoryUsage();
	state.pid    = process.pid;

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
	this.active = false;
	if (this.debug) $.log("Stopped turtle.io instance: " + this.id);
	return this;
};

module.exports = factory;
})(this);
