/**
 * Returns an Object describing the instance's status
 * 
 * @return {Object} Status
 */
factory.prototype.status = function () {
	var state = {
		config  : {},
		process : {}
	};

	// Startup parameters
	$.iterate(this.config, function (v, k) {
		state.config[k] = v;
	});

	// Process information
	state.process.memory = process.memoryUsage();
	state.process.pid    = process.pid;

	return state;
};
