/**
 * Logs an exception
 * 
 * @param  {Mixed}   err     Error Object or String
 * @param  {Boolean} display [Optional] Displays error on the console
 * @return {Undefined}       undefined
 */
factory.prototype.log = function (err, display) {
	var date, filename, text;

	// Displaying on the console
	if (display) $.log(err);

	// Writing to log file if config is loaded
	if (typeof this.config !== "undefined") {
		date     = new Date();
		text     = moment(date).format("HH:MM:SS") + " " + err + "\n" + (typeof err.stack !== "undefined" ? err.stack + "\n" : "");
		filename = this.config.logs.file.replace(/\{\{date\}\}/, moment(date).format(this.config.logs.date));
		fs.appendFile(filename, text);
	}
};
