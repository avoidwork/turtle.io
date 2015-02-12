/**
 * Logs a message
 *
 * @method log
 * @param  {Mixed}  arg   Error Object or String
 * @param  {String} level [Optional] `level` must match a valid LogLevel - http://httpd.apache.org/docs/1.3/mod/core.html#loglevel, default is `notice`
 * @return {Object}       TurtleIO instance
 */
log ( arg, level ) {
	let self, timer, e;

	if ( LOGGING ) {
		self = this;
		timer = precise().start();
		e = arg instanceof Error;
		level = level || "notice";

		if ( this.config.logs.stdout && LEVELS.indexOf( level ) <= LOGLEVEL ) {
			if ( e ) {
				console.error( "[" + moment().format( this.config.logs.time ) + "] [" + level + "] " + ( arg.stack || arg.message || arg ) );
			}
			else {
				console.log( arg );
			}
		}

		timer.stop();

		this.signal( "log", () => {
			return [ level, self.config.logs.stdout, false, timer.diff() ];
		} );
	}

	return this;
}
