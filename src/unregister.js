/**
 * Unregisters an Etag in the LRU cache and
 * removes stale representation from disk
 *
 * @method unregister
 * @param  {String} url URL requested
 * @return {Object}     TurtleIO instance
 */
unregister ( url ) {
	let self = this,
		cached = this.etags.cache[ url ],
		path = this.config.tmp + "/",
		gz, df;

	if ( cached ) {
		this.etags.remove( url );

		path += cached.value.etag;
		gz = path + ".gz";
		df = path + ".zz";

		fs.exists( gz, ( exists ) => {
			if ( exists ) {
				fs.unlink( gz, ( e ) => {
					if ( e ) {
						self.log( e );
					}
				} );
			}
		} );

		fs.exists( df, ( exists ) => {
			if ( exists ) {
				fs.unlink( df, ( e ) => {
					if ( e ) {
						self.log( e );
					}
				} );
			}
		} );
	}

	return this;
}
