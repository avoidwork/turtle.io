/**
 * Instance Factory
 * 
 * @method factory
 * @param  {Object} args [Optional] Properties to set
 * @return {Object}      Instance of turtle.io
 */
var factory = function (args) {
	var self = this;

	this.active  = false;
	this.id      = "";
	this.config  = {};
	this.server  = null;
	this.version = "{{VERSION}}";

	// Loading config
	config.call(this, args);

	return this;
};
