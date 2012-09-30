/**
 * Logs an exception
 * 
 * @param  {Mixed}   err     Error Object or String
 * @param  {Boolean} display [Optional] Displays error on the console
 * @return {Undefined}       undefined
 */
factory.prototype.log = function (err, display) {
	display = (display !== false);

	var date, filename, text;

	// Displaying on the console
	if (display) $.log(err);

	// Writing to log file if config is loaded
	if (typeof this.config.logs !== "undefined") {
		date     = new Date();
		text     = moment(date).format("HH:MM:SS") + " " + err + "\n" + (typeof err.stack !== "undefined" ? err.stack + "\n" : "");
		filename = this.config.logs.file.replace(/\{\{date\}\}/, moment(date).format(this.config.logs.date));
		fs.appendFile(("./logs/" + filename), text, function (e) {
			if (e) return $.log("Could not write to error log");

			// Halting on fundamental error
			if (REGEX_HALT.test(err)) process.exit(0);
		});
	}
	else if (REGEX_HALT.test(err)) process.exit(0);

	return this;
};
