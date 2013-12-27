/**
 * Logs a message
 *
 * @method log
 * @param  {Mixed}   arg    Error Object or String
 * @param  {Boolean} stdout [Optional] `arg` should be emitted, default is `true`
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype.log = function ( arg, stdout ) {
	var e = arg instanceof Error;

	if ( e ) {
		arg = arg.stack || arg.message || arg;
	}

	stdout = ( stdout !== false );

	if ( stdout && this.config.logs.stdout ) {
		console[ e ? "error" : "log"]( arg );
	}

	syslog.log( syslog[!e ? "LOG_INFO" : "LOG_ERR"], arg );

	return this;
};
