/**
 * Logs a message
 *
 * @method log
 * @param  {Mixed} msg Error Object or String
 * @return {Object}    TurtleIO instance
 */
TurtleIO.prototype.log = function ( msg ) {
	var e = msg instanceof Error;

	// Determining what to log & dispatching to STDOUT
	if ( e ) {
		msg = msg.callstack || msg;
		console.error( msg );
	}
	else if ( this.config.logs.stdout ) {
		console.log( msg );
	}

	// Dispatching to syslog server
	syslog.log( syslog[!e ? "LOG_INFO" : "LOG_ERR"], msg );

	return this;
};
