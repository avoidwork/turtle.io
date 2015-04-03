/**
 * Unregisters an Etag in the LRU cache and
 * removes stale representation from disk
 *
 * @method unregister
 * @param  {String} url URL requested
 * @return {Object}     TurtleIO instance
 */
unregister ( url ) {
	let cached = this.etags.cache[ url ],
		lpath = this.config.tmp,
		ext = [ "gz", "zz" ];

	if ( cached ) {
		lpath = path.join( lpath, cached.value.etag );
		this.etags.remove( url );
		array.each( ext, ( i ) => {
			let lfile = lpath + "." + i;

			fs.exists( lfile, ( exists ) => {
				if ( exists ) {
					fs.unlink( lfile, ( e ) => {
						if ( e ) {
							this.log( e );
						}
					} );
				}
			} );
		} );
	}

	return this;
}
