/**
 * Logs a message
 * 
 * @param  {Mixed}   msg     Error Object or String
 * @param  {Boolean} error   [Optional] Write to error log (default: false)
 * @param  {Boolean} display [Optional] Displays msgor on the console (default: true)
 * @return {Undefined}       undefined
 */
factory.prototype.log = function (msg, error, display) {
	error   = (error   === true);
	display = (display !== false);

	var date, filename, text;

	// Displaying on the console
	if (display) $.log(msg);

	// Writing to log file if config is loaded
	if (typeof this.config.logs !== "undefined") {
		date     = new Date();
		text     = moment(date).format("HH:MM:SS") + " " + msg + "\n" + (typeof msg.stack !== "undefined" ? msg.stack + "\n" : "");
		filename = this.config.logs[error ? "error" : "daemon"].replace(/\{\{date\}\}/, moment(date).format(this.config.logs.date));
		fs.appendFile(("./logs/" + filename), text, function (e) {
			if (e) return $.log("Could not write to msgor log");

			// Halting on fundamental msgor
			if (REGEX_HALT.test(msg)) process.exit(0);
		});
	}
	else if (REGEX_HALT.test(msg)) process.exit(0);

	return this;
};
