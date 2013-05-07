/**
 * Logs a message
 * 
 * @param  {Mixed} msg Error Object or String
 * @return {Object}    Instance
 */
factory.prototype.log = function ( msg ) {
	var err = msg.callstack !== undefined;

	// Determining what to log
	msg = msg.callstack || msg;

	// Dispatching to syslog server
	syslog.log( syslog[!err ? "LOG_INFO" : "LOG_ERR"], msg );

	// Unrecoverable error, restarting process
	if ( REGEX_HALT.test( msg ) ) {
		exit();
	}
	// Adding message to log queue
	else {
		this.logQueue.push( msg );
	}

	// Dispatching to STDOUT
	if ( this.config.logs.stdout ) {
		console.log( msg );
	}

	return this;
};
