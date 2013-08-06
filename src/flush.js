/**
 * Flushes log queue
 *
 * @method flush
 * @public
 * @param {String} file File path
 * @return {Object}     Instance
 */
factory.prototype.flush = function ( file ) {
	var msg = this.logQueue.join( "\n" );

	// Writing to file
	if ( !msg.isEmpty() ) {
		// Clearing queue
		this.logQueue = [];

		// Batch append to log file to avoid `Error: EMFILE errno:20`
		fs.appendFile( file, msg + "\n", function ( e ) {
			if ( e ) {
				console.log( "Couldn't write to log file" );
			}
		});
	}
};
