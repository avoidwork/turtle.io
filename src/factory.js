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
