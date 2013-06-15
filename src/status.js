/**
 * Returns an Object describing the instance's status
 *
 * @method status
 * @return {Object} Status
 */
factory.prototype.status = function () {
	var ram    = process.memoryUsage(),
	    uptime = process.uptime(),
	    state  = {config: {}, process: {}, queue: {}, server: {}};

	// Startup parameters
	$.iterate( this.config, function ( v, k ) {
		state.config[k] = v;
	});

	// Process information
	state.process = {
		memory : ram,
		pid    : process.pid
	};

	// Queue
	state.queue = {
		average : Math.ceil( this.requestQueue.times.mean() || 0 ),
		last    : this.requestQueue.last,
		total   : this.requestQueue.items.length
	};

	// Server information
	state.server = {
		address     : this.server.address(),
		connections : this.server.connections,
		uptime      : uptime
	};

	dtp.fire( "status", function () {
		return [state.server.connections, uptime, ram.heapUsed, ram.heapTotal];
	});

	return state;
};
