/**
 * Returns an Object describing the instance's status
 *
 * @method status
 * @public
 * @return {Object} Status
 */
TurtleIO.prototype.status = function () {
	var ram    = process.memoryUsage(),
	    uptime = process.uptime(),
	    state  = {config: {}, etags: {}, process: {}, server: {}},
	    invalid = /^(auth|session|ssl)$/;

	// Startup parameters
	iterate( this.config, function ( v, k ) {
		if ( !invalid.test( k ) ) {
			state.config[k] = v;
		}
	} );

	// Process information
	state.process = {
		memory  : ram,
		pid     : process.pid
	};

	// Server information
	state.server = {
		address : this.server.address(),
		uptime  : uptime
	};

	// LRU cache
	state.etags = {
		items   : this.etags.length,
		bytes   : Buffer.byteLength( array.cast( this.etags.cache ).map( function ( i ){ return i.value; } ).join( "" ) )
	};

	return state;
};
