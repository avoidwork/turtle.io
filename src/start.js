/**
 * Starts instance
 * 
 * @param  {Object} args Parameters to set
 * @return {Object}      Instance
 */
factory.prototype.start = function () {
	var args = this.params;

	process.argv.each(function (i) {
		var val = [];

		if (i.indexOf("=") > -1) {
			val = i.explode("=");
			args[val[0]] = val[1];
		}
		else args[i] = true;
	});

	this.config.data.batch("set", args);
	this.active = true;

	if (this.debug) $.log("Started turtle.io instance: " + this.id);

	return this;
};
