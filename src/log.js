/**
 * Logs a message
 *
 * @method log
 * @param  {Mixed} msg Error Object or String
 * @return {Object}    TurtleIO instance
 */
TurtleIO.prototype.log = function ( msg ) {
	var err = !!msg.callstack;

	// Determining what to log
	msg = msg.callstack || msg;

	// Dispatching to syslog server
	syslog.log( syslog[!err ? "LOG_INFO" : "LOG_ERR"], msg );

	// Dispatching to STDOUT
	if ( this.config.logs.stdout ) {
		console[!err ? "log" : "error"]( msg );
	}

	return this;
};
