/**
 * Logs a message
 * 
 * @param  {Mixed} msg Error Object or String
 * @return {Object}    Instance
 */
factory.prototype.log = function (msg) {
	var self = this,
	    err  = typeof msg.callstack !== "undefined";

	// Determining what to log
	msg = msg.callstack || msg;

	// Dispatching to syslog server
	syslog.log(syslog[!err ? "LOG_INFO" : "LOG_ERR"], msg);

	// Dispatching to STDOUT
	console.log(msg);

	// Unrecoverable error
	if (REGEX_HALT.test(msg)) {
		syslog.close();
		process.exit(0);
	};

	return this;
};
