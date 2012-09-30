/**
 * Instance Factory
 * 
 * @param  {Object} args [Optional] Properties to set
 * @return {Object}      Instance of turtle.io
 */
var factory = function (args) {
	var self = this;

	this.active   = false;
	this.id       = "";
	this.settings = {};
	this.server   = null;
	this.version  = "{{VERSION}}";

	bootstrap.call(self, args);

	return this;
};
