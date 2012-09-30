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
