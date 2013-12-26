/**
 * Logs a message
 *
 * @method log
 * @param  {Mixed} arg Error Object or String
 * @return {Object}    TurtleIO instance
 */
TurtleIO.prototype.log = function ( arg ) {
	var e = arg instanceof Error;

	if ( e ) {
		arg = arg.stack || arg.message || arg;
	}

	if ( this.config.logs.stdout ) {
		if ( e ) {
			console.error( arg );
		}
		else {
			console.log( arg );
		}
	}

	syslog.log( syslog[!e ? "LOG_INFO" : "LOG_ERR"], arg );

	return this;
};
