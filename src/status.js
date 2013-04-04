/**
 * Returns an Object describing the instance's status
 * 
 * @method status
 * @return {Object} Status
 */
factory.prototype.status = function () {
	var ram    = process.memoryUsage(),
	    uptime = process.uptime(),
	    state  = {
	    	config  : {},
	    	process : {},
	    	server  : {}
	    };

	// Startup parameters
	$.iterate( this.config, function ( v, k ) {
		state.config[k] = v;
	});

	// Process information
	state.process.memory = ram;
	state.process.pid    = process.pid;

	// Server information
	state.server.address     = this.server.address();
	state.server.connections = typeof this.server.getConnections === "function" ? this.server.getConnections() : this.server.connections;
	state.server.uptime      = uptime;

	dtp.fire( "status", function ( p ) {
		return [state.server.connections, uptime, ram.heapUsed, ram.heapTotal];
	});

	return state;
};
