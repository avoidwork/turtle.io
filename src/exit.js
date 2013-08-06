/**
 * Exits application when unrecoverable error occurs
 *
 * @method exit
 * @private
 * @return {Undefined} undefined
 */
var exit = function () {
	syslog.close();
	toobusy.shutdown();
	process.exit( 0 );
};
