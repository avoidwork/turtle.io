/**
 * Logs a message
 *
 * @method log
 * @param  {Mixed}  arg   Error Object or String
 * @param  {String} level [Optional] `level` must match a valid LogLevel - http://httpd.apache.org/docs/1.3/mod/core.html#loglevel, default is `notice`
 * @return {Object}       TurtleIO instance
 */
TurtleIO.prototype.log = function ( arg, level ) {
	var self  = this,
		timer = precise().start(),
		e     = arg instanceof Error,
	    syslogMethod;

	level = level || "notice";

	if ( this.config.logs.stdout && this.levels.indexOf( level ) <= this.levels.indexOf( this.config.logs.level ) ) {
		if ( e ) {
			console.error( "[" + moment().format( this.config.logs.time ) + "] [" + level + "] " + ( arg.stack || arg.message || arg ) );
		}
		else {
			console.log( arg );
		}
	}

	if ( this.config.logs.syslog ) {
		if ( level === "error" ) {
			syslogMethod = "LOG_ERR";
		}
		else if ( level === "warn" ) {
			syslogMethod = "LOG_WARNING";
		}
		else {
			syslogMethod = "LOG_" + level.toUpperCase();
		}

		syslog.log( syslog[syslogMethod], arg.stack || arg.message || arg );
	}

	timer.stop();

	this.dtp.fire( "log", function () {
		return [level, self.config.logs.stdout, self.config.logs.syslog, timer.diff()];
	} );

	return this;
};
