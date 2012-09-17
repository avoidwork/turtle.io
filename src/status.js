/**
 * Returns an Object describing the instance's status
 * 
 * @return {Object} Status
 */
factory.prototype.status = function () {
	var state = {config: {}};

	// Startup parameters
	this.config.data.get().each(function (rec) {
		state.config[rec.key] = rec.data.value;
	});

	state.memory = process.memoryUsage();
	state.pid    = process.pid;

	// Virtual hosts
	state.vhosts = {
		servers : this.vhosts.data.get(),
		total   : this.vhosts.data.total
	};

	return state;
};
