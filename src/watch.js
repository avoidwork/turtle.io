/**
 * Watches `path` for changes & updated LRU
 *
 * @method watcher
 * @param  {String} url      LRUItem url
 * @param  {String} path     File path
 * @param  {String} mimetype Mimetype of URL
 * @return {Object}          TurtleIO instance
 */
watch ( url, path ) {
	let watcher;

	/**
	 * Cleans up caches
	 *
	 * @method cleanup
	 * @private
	 * @return {Undefined} undefined
	 */
	let cleanup = () => {
		watcher.close();
		this.unregister( url );
		delete this.watching[ path ];
	}

	if ( !( this.watching[ path ] ) ) {
		// Tracking
		this.watching[ path ] = 1;

		// Watching path for changes
		watcher = fs.watch( path, ( ev ) => {
			if ( regex.rename.test( ev ) ) {
				cleanup();
			}
			else {
				fs.lstat( path, ( e, stat ) => {
					let value;

					if ( e ) {
						this.log( e );
						cleanup();
					}
					else if ( this.etags.cache[ url ] ) {
						value = this.etags.cache[ url ].value;
						value.etag = this.etag( url, stat.size, stat.mtime );
						value.timestamp = parseInt( new Date().getTime() / 1000, 10 );
						this.register( url, value, true );
					}
					else {
						cleanup();
					}
				} );
			}
		} );
	}

	return this;
}
