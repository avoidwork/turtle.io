/**
 * Logs a message
 *
 * @method log
 * @param  {Mixed} msg Error Object or String
 * @return {Object}    TurtleIO instance
 */
TurtleIO.prototype.log = function ( msg ) {
	var e = msg instanceof Error;

	// Determining what to log
	if ( e ) {
		msg = msg.callstack;
	}

	// Dispatching to syslog server
	syslog.log( syslog[!e ? "LOG_INFO" : "LOG_ERR"], msg );

	// Dispatching to STDOUT
	if ( this.config.logs.stdout ) {
		console[!e ? "log" : "error"]( msg );
	}

	return this;
};
