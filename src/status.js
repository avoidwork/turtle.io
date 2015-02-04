/**
 * Returns an Object describing the instance's status
 *
 * @method status
 * @public
 * @return {Object} Status
 */
status () {
	let timer = precise().start(),
		ram = process.memoryUsage(),
		uptime = process.uptime(),
		state = { config: {}, etags: {}, process: {}, server: {} },
		invalid = /^(auth|session|ssl)$/;

	// Startup parameters
	iterate( this.config, ( v, k ) => {
		if ( !invalid.test( k ) ) {
			state.config[ k ] = v;
		}
	} );

	// Process information
	state.process = {
		memory: ram,
		pid: process.pid
	};

	// Server information
	state.server = {
		address: this.server.address(),
		uptime: uptime
	};

	// LRU cache
	state.etags = {
		items: this.etags.length,
		bytes: Buffer.byteLength( array.cast( this.etags.cache ).map( ( i ) => {
			return i.value;
		} ).join( "" ) )
	};

	timer.stop();

	this.signal( "status", () => {
		return [ state.server.connections, uptime, ram.heapUsed, ram.heapTotal, timer.diff() ];
	} );

	return state;
}
