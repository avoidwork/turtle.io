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
