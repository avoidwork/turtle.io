/**
 * Logs a message
 * 
 * @param  {Mixed} msg Error Object or String
 * @return {Object}    Instance
 */
factory.prototype.log = function (msg) {
	var self = this,
	    err  = typeof msg.callstack !== "undefined",
	    exit;

	/**
	 * Exist application when unrecoverable error occurs
	 */
	exit = function () {
		syslog.close();
		process.exit(0);
	};

	// Determining what to log
	msg = msg.callstack || msg;

	// Dispatching to syslog server
	syslog.log(syslog[!err ? "LOG_INFO" : "LOG_ERR"], msg);

	// Dispatching to STDOUT
	console.log(msg);

	// Writing to log file
	fs.appendFile("/var/log/turtle_io.log", msg + "\n", function (e) {
		if (e) {
			fs.appendFile(self.config.logs.file, msg + "\n", function (e) {
				if (e) console.log(e);
				if (REGEX_HALT.test(msg)) exit();
			});
		}
		else if (REGEX_HALT.test(msg)) exit();
	});

	return this;
};
