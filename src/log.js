/**
 * Logs a message
 * 
 * @param  {Mixed} msg Error Object or String
 * @return {Object}    Instance
 */
factory.prototype.log = function ( msg ) {
	var self = this,
	    err  = msg.callstack !== undefined,
	    file = self.config.logs.file.replace("{{ext}}", new moment().format( this.config.logs.ext ) ),
	    exit;

	// Exist application when unrecoverable error occurs
	exit = function () {
		syslog.close();
		toobusy.shutdown();
		process.exit( 0 );
	};

	// Determining what to log
	msg = msg.callstack || msg;

	// Dispatching to syslog server
	syslog.log( syslog[!err ? "LOG_INFO" : "LOG_ERR"], msg );

	// Writing to log file
	fs.appendFile( "/var/log/" + file, msg + "\n", function ( e ) {
		if ( e ) {
			fs.appendFile( __dirname + "/../" + file, msg + "\n", function ( e ) {
				if ( e ) {
					// Couldn't write to the log, no need to spam the terminal
					void 0;
				}

				if ( REGEX_HALT.test( msg ) ) {
					exit();
				}
			});
		}
		else if ( REGEX_HALT.test( msg ) ) {
			exit();
		}
	});

	// Dispatching to STDOUT
	if ( self.config.logs.stdout ) {
		console.log( msg );
	}

	return this;
};
