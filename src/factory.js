/**
 * Instance Factory
 * 
 * @method factory
 * @param  {Object} args [Optional] Properties to set
 * @return {Object}      Instance of turtle.io
 */
var factory = function ( args ) {
	var self = this;

	this.active       = false;
	this.id           = "";
	this.config       = {};
	this.requestQueue = {
		flushing : false,
		items    : [],
		last     : null,
		times    : [],
		registry : {}
	};
	this.logQueue     = [];
	this.server       = null;
	this.sessions     = {};
	this.version      = "{{VERSION}}";

	// Loading config
	config.call( this, args );

	return this;
};
