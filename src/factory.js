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
	this.vhosts = $.store({id: this.id + "-vhosts"}, null, {key: "hostname"});

	$.iterate(this.params, function (v, k) {
		if (!regex.test(k)) self[k] = v;
	});

	$.observer.hook(this);

	if (this.vhosts.data.total === 0 && config.vhosts instanceof Array) this.vhosts.data.batch("set", config.vhosts);

	return this;
};
