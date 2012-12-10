/**
 * Logs a message
 * 
 * @param  {Mixed} msg Error Object or String
 * @return {Object}    Instance
 */
factory.prototype.log = function (msg) {
	msg      = msg.callstack || msg;
	var self = this;

	// Dispatching to STDOUT
	console.log(msg);

	// Writing to log file
	fs.appendFile("/var/log/turtle_io.log", msg + "\n", function (e) {
		if (e) {
			fs.appendFile(self.config.logs.file, msg + "\n", function (e) {
				if (e) console.log(e);
				if (REGEX_HALT.test(msg)) process.exit(0);
			});
		}
		else if (REGEX_HALT.test(msg)) process.exit(0);
	});

	return this;
};
