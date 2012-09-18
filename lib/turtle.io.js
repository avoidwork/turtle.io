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

var $     = require("abaaso"),
    util  = require("util"),
    fs    = require("fs"),
    mmm   = require('mmmagic'),
    Magic = mmm.Magic,
    magic = new Magic(mmm.MAGIC_MIME_TYPE),
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

	$.merge(config, (args || {}));

	this.active = false;
	this.id     = config.id || $.genId();
	this.config = $.store({id: this.id + "-config"}, null, {key: "name"});
	this.params = config;
	this.server = null;
	this.vhosts = $.store({id: this.id + "-vhosts"}, null, {key: "hostname"});

	$.iterate(this.params, function (v, k) {
		if (!regex.test(k)) self[k] = v;
	});

	$.observer.hook(this);

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
	this.fire("beforeStart");
	this.active = true;
	//this.server = $.route.server(); // Pass in the args properly
	if (this.debug) $.log("Started turtle.io instance: " + this.id);
	this.fire("afterStart");
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
	this.fire("beforeStop");
	this.active = false;
	if (this.server !== null) this.server.close();
	this.config.data.teardown();
	this.vhosts.data.teardown();
	this.fire("afterStop");
	if (this.debug) $.log("Stopped turtle.io instance: " + this.id);
	return this;
};

module.exports = factory;
})(this);
