/**
 * Logs a message
 *
 * @method log
 * @param  {Mixed} msg Error Object or String
 * @return {Object}    TurtleIO instance
 */
TurtleIO.prototype.log = function ( msg ) {
	var e = msg instanceof Error;

	if ( this.config.logs.stdout ) {
		if ( e ) {
			msg = msg.stack || msg.message || msg;
			console.error( msg );
		}
		else {
			console.log( msg );
		}
	}

	syslog.log( syslog[!e ? "LOG_INFO" : "LOG_ERR"], msg );

	return this;
};
