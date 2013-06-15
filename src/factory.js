/**
 * turtle.io factory
 *
 * @method factory
 * @return {Object} Instance
 */
var factory = function () {
	this.active       = false;
	this.bootstrapped = false;
	this.config       = require(__dirname + "/../config.json");
	this.requestQueue = {
		items    : [],
		last     : null,
		times    : [],
		registry : {}
	};
	this.logQueue     = [];
	this.server       = null;
	this.sessions     = {};
	this.version      = "{{VERSION}}";
};
