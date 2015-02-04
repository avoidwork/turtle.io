/**
 * Restarts the instance
 *
 * @method restart
 * @return {Object} TurtleIO instance
 */
restart () {
	let config = this.config;

	return this.stop().start( config );
}
