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
