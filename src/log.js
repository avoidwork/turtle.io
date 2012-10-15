/**
 * Logs a message
 * 
 * @param  {Mixed}   msg     Error Object or String
 * @param  {Boolean} error   [Optional] Write to error log (default: false)
 * @param  {Boolean} display [Optional] Displays msgor on the console (default: true)
 * @return {Object}          Instance
 */
factory.prototype.log = function (msg, error, display) {
	error   = (error   === true);
	display = (display !== false);

	if (error) console.log("error")

	var err = "Could not write to msg to log",
	    dir = this.config.logs.dir,
	    date, filename, text, append;

	// Appends text to the log file
	append = function (filename, text) {
		fs.appendFile((dir + "/" + filename), text, function (e) {
			if (e) $.log(e);
			if (REGEX_HALT.test(text)) process.exit(0);
		});
	};

	// Displaying on the console
	if (display) $.log(msg);

	// Writing to log file if config is loaded
	if (typeof this.config.logs !== "undefined") {
		date     = new Date();
		text     = msg + "\n" + (typeof msg.stack !== "undefined" ? msg.stack + "\n" : "");
		filename = this.config.logs[error ? "error" : "daemon"].replace(/\{\{date\}\}/, moment(date).format(this.config.logs.date));

		fs.exists(dir, function (exists) {
			if (exists) append(filename, text);
			else fs.mkdir(dir, function (e) {
				if (e) $.log(e);
				else append(filename, text);
			});
		});
	}
	else if (REGEX_HALT.test(msg)) process.exit(0);

	return this;
};
